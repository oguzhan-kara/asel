'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { finish } = require('../.claude/hooks/lib/exit');

function fake() {
  const io = { out: '', code: null };
  io.stderr = { write: (s) => { io.out += s; } };
  io.exit = (c) => { io.code = c; };
  return io;
}

test('finish blocks with exit 2 and message on stderr', () => {
  const io = fake();
  finish('block', 'BLOCKED: x', io);
  assert.strictEqual(io.code, 2);
  assert.strictEqual(io.out, 'BLOCKED: x\n');
});

test('finish warns with exit 0', () => {
  const io = fake();
  finish('warn', 'careful', io);
  assert.strictEqual(io.code, 0);
  assert.strictEqual(io.out, 'careful\n');
});

test('finish with empty message exits 0 silently', () => {
  const io = fake();
  finish('block', '', io);
  assert.strictEqual(io.code, 0);
  assert.strictEqual(io.out, '');
});
