'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { runHook } = require('./helpers/run-hook');

function proj(rows) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'asel-'));
  fs.mkdirSync(path.join(d, 'docs', 'reports'), { recursive: true });
  fs.writeFileSync(path.join(d, 'docs', 'ROUTEMAP.md'), `### Phase 2: Core [IN PROGRESS]\n\n${rows}\n`);
  return d;
}
const post = (d) => ({ hook_event_name: 'PostToolUse', tool_name: 'Edit', cwd: d, tool_input: { file_path: 'docs/ROUTEMAP.md' } });

test('warns when all stories of the in-progress phase are DONE and no phase gate report exists', () => {
  const d = proj('| STORY-003 | A | S | [x] DONE | — |\n| STORY-004 | B | S | [x] DONE | — |');
  const r = runHook('phase-gate-guard', post(d));
  assert.strictEqual(r.code, 0);
  assert.match(r.stderr, /Phase 2/);
  fs.writeFileSync(path.join(d, 'docs', 'reports', 'phase-2-gate-2026-09-16.md'), 'ok');
  assert.strictEqual(runHook('phase-gate-guard', post(d)).stderr, '');
});

test('silent when phase incomplete, and never exits 2 even if configured block', () => {
  const d = proj('| STORY-003 | A | S | [x] DONE | — |\n| STORY-004 | B | S | [ ] PENDING | — |');
  assert.strictEqual(runHook('phase-gate-guard', post(d)).stderr, '');
  const d2 = proj('| STORY-003 | A | S | [x] DONE | — |');
  fs.writeFileSync(path.join(d2, 'asel.config.json'), JSON.stringify({ guards: { phaseGateGuard: { level: 'block' } } }));
  const r = runHook('phase-gate-guard', post(d2));
  assert.strictEqual(r.code, 0);
  assert.match(r.stderr, /downgraded to warn/);
});

test('with block configured and incomplete phase, stderr is empty', () => {
  const d = proj('| STORY-003 | A | S | [x] DONE | — |\n| STORY-004 | B | S | [ ] PENDING | — |');
  fs.writeFileSync(path.join(d, 'asel.config.json'), JSON.stringify({ guards: { phaseGateGuard: { level: 'block' } } }));
  assert.strictEqual(runHook('phase-gate-guard', post(d)).stderr, '');
});

test('complete phase with absolute file_path prints warning', () => {
  const d = proj('| STORY-003 | A | S | [x] DONE | — |');
  const absPath = path.join(d, 'docs', 'ROUTEMAP.md');
  const input = { hook_event_name: 'PostToolUse', tool_name: 'Edit', cwd: d, tool_input: { file_path: absPath } };
  const r = runHook('phase-gate-guard', input);
  assert.strictEqual(r.code, 0);
  assert.match(r.stderr, /Phase 2/);
});
