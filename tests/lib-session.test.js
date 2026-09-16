'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { readSession } = require('../.claude/hooks/lib/session');

function tmpWith(text) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'asel-'));
  fs.writeFileSync(path.join(d, 'CLAUDE.md'), text);
  return d;
}

test('readSession parses story/step/mode', () => {
  const d = tmpWith('# P\n\n## Asel Session\n- Story: STORY-003\n- Step: Dev\n- Mode: Normal\n');
  assert.deepStrictEqual(readSession(d), { story: 'STORY-003', step: 'Dev', mode: 'Normal' });
});

test('readSession normalises dashes and missing file', () => {
  const d = tmpWith('## Asel Session\n- Story: —\n- Step: -\n');
  assert.deepStrictEqual(readSession(d), { story: '', step: '', mode: '' });
  assert.deepStrictEqual(readSession(path.join(d, 'nope')), { story: '', step: '', mode: '' });
});
