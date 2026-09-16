'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// headless-format.js must reproduce the legacy jq filter byte-for-byte:
// .superpowers/sdd/2026-09-16-asel-implementation/legacy-headless-format.jq
//   assistant text   -> "\n" + text
//   assistant tool_use -> "\n🔧 [name] " + (input tostring, newlines->space, [0:180])
//   user tool_result -> "↳ " + (content[0].text // tostring(content), newlines->space, [0:200])  (NO leading \n)
//   result           -> "\n═══ RESULT <subtype> ═══"
//   system/init      -> "═══ HEADLESS session started ═══"  (NO leading \n)

const SCRIPT = path.join(__dirname, '..', '.claude', 'hooks', 'lib', 'headless-format.js');

function runFormatter(input) {
  const result = spawnSync(process.execPath, [SCRIPT], { input, encoding: 'utf8' });
  assert.strictEqual(result.status, 0, `formatter exited non-zero: ${result.stderr}`);
  return result.stdout;
}

function eventLine(evt) {
  return JSON.stringify(evt) + '\n';
}

test('formats four representative stream-json event kinds, matching the legacy jq output exactly', () => {
  const lines = [
    { type: 'assistant', message: { content: [{ type: 'text', text: 'Working on STORY-042 now.' }] } },
    { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash', input: { command: 'npm test' } }] } },
    { type: 'user', message: { content: [{ type: 'tool_result', content: [{ type: 'text', text: 'PASS 84/85' }] }] } },
    { type: 'result', subtype: 'success' },
  ];
  const input = lines.map(eventLine).join('');
  const out = runFormatter(input);

  const expected =
    '\nWorking on STORY-042 now.\n' +
    '\n🔧 [Bash] {"command":"npm test"}\n' +
    '↳ PASS 84/85\n' +
    '\n═══ RESULT success ═══\n';

  assert.strictEqual(out, expected);
});

test('system/init event formats as a session-started banner with NO leading newline', () => {
  const out = runFormatter(eventLine({ type: 'system', subtype: 'init' }));
  assert.strictEqual(out, '═══ HEADLESS session started ═══\n');
});

test('tool_use input JSON is collapsed and truncated to first 180 chars', () => {
  const longCommand = 'echo ' + 'x'.repeat(250);
  const line = { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash', input: { command: longCommand } }] } };
  const out = runFormatter(eventLine(line));

  const prefix = '\n🔧 [Bash] ';
  assert.ok(out.startsWith(prefix), `expected output to start with ${JSON.stringify(prefix)}, got ${JSON.stringify(out)}`);
  const body = out.slice(prefix.length, -1); // strip prefix and trailing \n
  assert.strictEqual(body.length, 180);
  const fullJson = JSON.stringify({ command: longCommand });
  assert.strictEqual(body, fullJson.slice(0, 180));
});

test('tool_result content is collapsed and truncated to first 200 chars', () => {
  const longText = 'y'.repeat(250);
  const line = { type: 'user', message: { content: [{ type: 'tool_result', content: [{ type: 'text', text: longText }] }] } };
  const out = runFormatter(eventLine(line));

  assert.strictEqual(out, `↳ ${longText.slice(0, 200)}\n`);
});

test('multi-line tool_result content is collapsed to a single line before the arrow prefix', () => {
  const multilineText = 'line1\nline2\nline3';
  const line = { type: 'user', message: { content: [{ type: 'tool_result', content: [{ type: 'text', text: multilineText }] }] } };
  const out = runFormatter(eventLine(line));

  assert.strictEqual(out, '↳ line1 line2 line3\n');
  // The only newline in the output is the CLI's own trailing record separator.
  assert.strictEqual(out.indexOf('\n'), out.length - 1);
});

test('unrecognized event types are ignored (no output)', () => {
  const out = runFormatter(eventLine({ type: 'ping' }));
  assert.strictEqual(out, '');
});

test('malformed JSON lines are skipped without crashing the CLI', () => {
  const input = 'not json\n' + eventLine({ type: 'result', subtype: 'success' });
  const out = runFormatter(input);
  assert.strictEqual(out, '\n═══ RESULT success ═══\n');
});
