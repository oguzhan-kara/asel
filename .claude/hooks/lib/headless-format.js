#!/usr/bin/env node
'use strict';

// Reads `claude -p --output-format=stream-json` events from stdin (one JSON object per
// line) and writes the same human-readable lines the old jq filter (headless-format.jq)
// produced. No external binaries required — this replaces the jq dependency so headless
// mode works without any tool beyond `node` (already required to run Claude Code itself).
//
// Mapping:
//   assistant text block   -> the text, verbatim
//   assistant tool_use     -> "🔧 [name] <first 180 chars of input JSON>"
//   user tool_result block -> "↳ <first 200 chars>"
//   result event           -> "═══ RESULT <subtype> ═══"
//   system/init event      -> "═══ HEADLESS session started ═══"
//   anything else          -> ignored
//   lines that aren't valid JSON -> skipped silently

const readline = require('readline');

function truncate(str, max) {
  const s = String(str == null ? '' : str);
  return s.length > max ? s.slice(0, max) : s;
}

function toolResultText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((block) => (block && typeof block.text === 'string' ? block.text : ''))
      .filter(Boolean)
      .join(' ');
  }
  if (content && typeof content === 'object') {
    try {
      return JSON.stringify(content);
    } catch (e) {
      return '';
    }
  }
  return '';
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
          lines.push(block.text);
        } else if (block.type === 'tool_use') {
          let inputJson = '';
          try {
            inputJson = JSON.stringify(block.input || {});
          } catch (e) {
            inputJson = '';
          }
          lines.push(`🔧 [${block.name}] ${truncate(inputJson, 180)}`);
        }
      }
      break;
    }
    case 'user': {
      const blocks = (evt.message && Array.isArray(evt.message.content)) ? evt.message.content : [];
      for (const block of blocks) {
        if (block && block.type === 'tool_result') {
          lines.push(`↳ ${truncate(toolResultText(block.content), 200)}`);
        }
      }
      break;
    }
    case 'result': {
      lines.push(`═══ RESULT ${evt.subtype || 'unknown'} ═══`);
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
