'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { runHook } = require('./helpers/run-hook');

test('warns (exit 0) when a story is in progress, silent otherwise', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'asel-'));
  fs.writeFileSync(path.join(d, 'CLAUDE.md'), '## Asel Session\n- Story: STORY-002\n- Step: Gate\n');
  const r = runHook('stop-check', { hook_event_name: 'Stop', cwd: d });
  assert.strictEqual(r.code, 0);
  assert.match(r.stderr, /STORY-002 .*Gate/);
  fs.writeFileSync(path.join(d, 'CLAUDE.md'), '## Asel Session\n- Story: —\n- Step: —\n');
  assert.strictEqual(runHook('stop-check', { hook_event_name: 'Stop', cwd: d }).stderr, '');
});
