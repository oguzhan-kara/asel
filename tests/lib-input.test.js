'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { parseInput } = require('../.claude/hooks/lib/input');

test('parseInput flattens Claude Code hook JSON', () => {
  const raw = JSON.stringify({
    hook_event_name: 'PreToolUse', tool_name: 'Edit', cwd: '/p',
    tool_input: { file_path: 'docs/ROUTEMAP.md', old_string: 'a', new_string: 'b' },
  });
  const i = parseInput(raw);
  assert.strictEqual(i.event, 'PreToolUse');
  assert.strictEqual(i.tool, 'Edit');
  assert.strictEqual(i.cwd, '/p');
  assert.strictEqual(i.filePath, 'docs/ROUTEMAP.md');
  assert.strictEqual(i.oldString, 'a');
  assert.strictEqual(i.newString, 'b');
});

test('parseInput tolerates filePath camelCase, skill name and garbage', () => {
  assert.strictEqual(parseInput(JSON.stringify({ tool_input: { filePath: 'x' } })).filePath, 'x');
  assert.strictEqual(parseInput(JSON.stringify({ tool_input: { skill: 'asel-help' } })).skill, 'asel-help');
  assert.strictEqual(parseInput('not json').command, '');
  assert.strictEqual(parseInput('').cwd, process.cwd());
});
