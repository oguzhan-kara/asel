'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SCRIPT = path.join(__dirname, '..', '.claude', 'hooks', 'lib', 'headless-format.js');

function runFormatter(input) {
  const result = spawnSync(process.execPath, [SCRIPT], { input, encoding: 'utf8' });
  assert.strictEqual(result.status, 0, `formatter exited non-zero: ${result.stderr}`);
  return result.stdout.split('\n').filter((l) => l.length > 0);
}

test('formats four representative stream-json event kinds via a single CLI run', () => {
  const lines = [
    { type: 'assistant', message: { content: [{ type: 'text', text: 'Working on STORY-042 now.' }] } },
    { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash', input: { command: 'npm test' } }] } },
    { type: 'user', message: { content: [{ type: 'tool_result', content: 'PASS 84/85' }] } },
    { type: 'result', subtype: 'success' },
  ];
  const input = lines.map((l) => JSON.stringify(l)).join('\n') + '\n';
  const out = runFormatter(input);

  assert.strictEqual(out.length, 4);
  assert.strictEqual(out[0], 'Working on STORY-042 now.');
  assert.strictEqual(out[1], '🔧 [Bash] {"command":"npm test"}');
  assert.strictEqual(out[2], '↳ PASS 84/85');
  assert.strictEqual(out[3], '═══ RESULT success ═══');
});

test('tool_use input JSON is truncated to first 180 chars', () => {
  const longCommand = 'echo ' + 'x'.repeat(250);
  const line = { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash', input: { command: longCommand } }] } };
  const out = runFormatter(JSON.stringify(line) + '\n');
  assert.strictEqual(out.length, 1);
  const prefix = '🔧 [Bash] ';
  assert.ok(out[0].startsWith(prefix));
  assert.strictEqual(out[0].length - prefix.length, 180);
});

test('tool_result content is truncated to first 200 chars', () => {
  const longText = 'x'.repeat(250);
  const line = { type: 'user', message: { content: [{ type: 'tool_result', content: longText }] } };
  const out = runFormatter(JSON.stringify(line) + '\n');
  assert.strictEqual(out.length, 1);
  assert.ok(out[0].startsWith('↳ '));
  assert.strictEqual(out[0].length, '↳ '.length + 200);
});

test('system/init event formats as a session-started banner', () => {
  const out = runFormatter(JSON.stringify({ type: 'system', subtype: 'init' }) + '\n');
  assert.deepStrictEqual(out, ['═══ HEADLESS session started ═══']);
});

test('unrecognized event types are ignored', () => {
  const out = runFormatter(JSON.stringify({ type: 'ping' }) + '\n');
  assert.deepStrictEqual(out, []);
});

test('malformed JSON lines are skipped without crashing the CLI', () => {
  const input = 'not json\n{"type":"result","subtype":"success"}\n';
  const out = runFormatter(input);
  assert.deepStrictEqual(out, ['═══ RESULT success ═══']);
});
