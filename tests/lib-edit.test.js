'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { resolveTarget, readCurrent, proposeDocument } = require('../.claude/hooks/lib/edit');

test('resolveTarget: absolute filePath returned unchanged', () => {
  const abs = path.resolve(os.tmpdir(), 'file.md');
  const input = { cwd: '/elsewhere', filePath: abs };
  assert.strictEqual(resolveTarget(input, 'x'), abs);
});

test('resolveTarget: relative filePath joined to cwd', () => {
  const input = { cwd: '/home/user', filePath: 'docs/ROUTEMAP.md' };
  const result = resolveTarget(input);
  assert.strictEqual(result, path.join('/home/user', 'docs/ROUTEMAP.md'));
});

test('resolveTarget: empty filePath uses fallback', () => {
  const input = { cwd: '/home/user', filePath: '' };
  const result = resolveTarget(input, 'docs/ROUTEMAP.md');
  assert.strictEqual(result, path.join('/home/user', 'docs/ROUTEMAP.md'));
});

test('readCurrent: returns file contents when exists', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'edit-test-'));
  const f = path.join(d, 'test.md');
  fs.writeFileSync(f, 'hello');
  assert.strictEqual(readCurrent(f), 'hello');
});

test('readCurrent: returns empty string when file missing', () => {
  assert.strictEqual(readCurrent('/nonexistent/file.md'), '');
});

test('proposeDocument: Write tool returns content', () => {
  const input = { tool: 'Write', content: 'new content' };
  assert.strictEqual(proposeDocument(input, 'old content'), 'new content');
});

test('proposeDocument: Edit with oldString replaces first occurrence', () => {
  const input = { tool: 'Edit', oldString: 'foo', newString: 'bar', raw: {} };
  assert.strictEqual(proposeDocument(input, 'foo baz foo'), 'bar baz foo');
});

test('proposeDocument: Edit with replace_all replaces all occurrences', () => {
  const input = { tool: 'Edit', oldString: 'foo', newString: 'bar', raw: { tool_input: { replace_all: true } } };
  assert.strictEqual(proposeDocument(input, 'foo baz foo'), 'bar baz bar');
});

test('proposeDocument: returns null when oldString absent', () => {
  const input = { tool: 'Edit', oldString: 'foo', newString: 'bar', raw: {} };
  assert.strictEqual(proposeDocument(input, 'baz qux'), null);
});

test('proposeDocument: Edit with no oldString but with content is treated as Write', () => {
  const input = { tool: 'Edit', oldString: '', newString: 'x', content: 'content-value', raw: {} };
  const result = proposeDocument(input, 'current');
  assert.strictEqual(result, 'content-value');
});

test('proposeDocument: Write with no oldString returns content', () => {
  const input = { tool: 'Write', content: 'new', raw: {} };
  assert.strictEqual(proposeDocument(input, 'old'), 'new');
});
