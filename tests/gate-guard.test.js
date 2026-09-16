'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { runHook } = require('./helpers/run-hook');

function proj(session) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'asel-'));
  fs.writeFileSync(path.join(d, 'CLAUDE.md'), `# P\n\n## Asel Session\n${session}\n`);
  fs.mkdirSync(path.join(d, 'docs', 'stories', 'phase-1'), { recursive: true });
  return d;
}
const commit = (d) => ({ hook_event_name: 'PreToolUse', tool_name: 'Bash', cwd: d, tool_input: { command: 'git commit -m "x"' } });

test('blocks commit when story active before Commit step and no gate report', () => {
  const d = proj('- Story: STORY-003\n- Step: Dev\n- Mode: Normal');
  const r = runHook('gate-guard', commit(d));
  assert.strictEqual(r.code, 2);
  assert.match(r.stderr, /asel-gate-lead/);
});

test('passes when gate report exists, when step is Commit, when no story, when not a commit', () => {
  const d = proj('- Story: STORY-003\n- Step: Dev');
  fs.writeFileSync(path.join(d, 'docs', 'stories', 'phase-1', 'STORY-003-gate.md'), 'ok');
  assert.strictEqual(runHook('gate-guard', commit(d)).code, 0);
  const d2 = proj('- Story: STORY-003\n- Step: Commit');
  assert.strictEqual(runHook('gate-guard', commit(d2)).code, 0);
  const d3 = proj('- Story: —\n- Step: —');
  assert.strictEqual(runHook('gate-guard', commit(d3)).code, 0);
  const d4 = proj('- Story: STORY-003\n- Step: Dev');
  assert.strictEqual(runHook('gate-guard', { ...commit(d4), tool_input: { command: 'git status' } }).code, 0);
});
