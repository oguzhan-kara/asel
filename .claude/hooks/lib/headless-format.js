#!/usr/bin/env node
'use strict';

// Reads `claude -p --output-format=stream-json` events from stdin (one JSON object per
// line) and writes the same human-readable lines the legacy jq filter produced (see
// .superpowers/sdd/2026-09-16-asel-implementation/legacy-headless-format.jq). No external
// binaries required — this replaces the jq dependency so headless mode works without any
// tool beyond `node` (already required to run Claude Code itself).
//
// Mapping (mirrors the legacy jq filter exactly):
//   assistant text block   -> "\n" + text                                   (no truncation)
//   assistant tool_use     -> "\n🔧 [name] " + <input JSON, newlines->space, first 180 chars>
//   user tool_result block -> "↳ " + <text, newlines->space, first 200 chars>   (NO leading \n)
//   result event           -> "\n═══ RESULT <subtype> ═══"
//   system/init event      -> "═══ HEADLESS session started ═══"               (NO leading \n)
//   anything else          -> ignored
//   lines that aren't valid JSON -> skipped silently

const readline = require('readline');

function collapseNewlines(str) {
  return String(str == null ? '' : str).replace(/\n/g, ' ');
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max) : str;
}

// Mirrors jq's `tostring` on a non-string value: compact JSON for objects/arrays/numbers/
// booleans/null, identity for an already-string value.
function tostring(value) {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value === undefined ? null : value);
  } catch (e) {
    return String(value);
  }
}

// Mirrors jq's `.content[0]?.text // (.content | tostring)`
function toolResultText(content) {
  if (Array.isArray(content) && content[0] && typeof content[0].text === 'string') {
    return content[0].text;
  }
  return tostring(content);
}

function formatEvent(evt) {
  if (!evt || typeof evt !== 'object') return [];
  const lines = [];

  switch (evt.type) {
    case 'assistant': {
      const blocks = (evt.message && Array.isArray(evt.message.content)) ? evt.message.content : [];
      for (const block of blocks) {
        if (!block || typeof block !== 'object') continue;
        if (block.type === 'text' && typeof block.text === 'string') {
          lines.push('\n' + block.text);
        } else if (block.type === 'tool_use') {
          const input = truncate(collapseNewlines(tostring(block.input)), 180);
          lines.push(`\n🔧 [${block.name}] ${input}`);
        }
      }
      break;
    }
    case 'user': {
      const blocks = (evt.message && Array.isArray(evt.message.content)) ? evt.message.content : [];
      for (const block of blocks) {
        if (block && block.type === 'tool_result') {
          const text = truncate(collapseNewlines(toolResultText(block.content)), 200);
          lines.push(`↳ ${text}`);
        }
      }
      break;
    }
    case 'result': {
      lines.push(`\n═══ RESULT ${evt.subtype} ═══`);
      break;
    }
    case 'system': {
      if (evt.subtype === 'init') {
        lines.push('═══ HEADLESS session started ═══');
      }
      break;
    }
    default:
      break; // ignore everything else
  }

  return lines;
}

function main() {
  const rl = readline.createInterface({ input: process.stdin, terminal: false });

  rl.on('line', (rawLine) => {
    const line = rawLine.trim();
    if (!line) return;

    let evt;
    try {
      evt = JSON.parse(line);
    } catch (e) {
      return; // malformed lines skipped
    }

    for (const out of formatEvent(evt)) {
      process.stdout.write(out + '\n');
    }
  });
}

main();
