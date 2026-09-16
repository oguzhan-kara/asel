'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { runHook } = require('./helpers/run-hook');

function proj() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'asel-'));
  const p1 = path.join(d, 'docs', 'stories', 'phase-1');
  fs.mkdirSync(p1, { recursive: true });
  fs.writeFileSync(path.join(d, 'docs', 'ROUTEMAP.md'), '| STORY-001 | A | S | [x] DONE | — |\n| STORY-002 | B | S | [~] IN PROGRESS | Commit |\n');
  fs.writeFileSync(path.join(p1, 'STORY-002-b.md'), '# STORY-002');
  return { d, p1 };
}
const edit = (d, oldS, newS) => ({ hook_event_name: 'PreToolUse', tool_name: 'Edit', cwd: d, tool_input: { file_path: path.join(d, 'docs/ROUTEMAP.md'), old_string: oldS, new_string: newS } });

test('blocks transition to DONE without evidence, listing what is missing', () => {
  const { d } = proj();
  const r = runHook('story-done-guard', edit(d, '| STORY-002 | B | S | [~] IN PROGRESS | Commit |', '| STORY-002 | B | S | [x] DONE | — |'));
  assert.strictEqual(r.code, 2);
  assert.match(r.stderr, /STORY-002/);
  assert.match(r.stderr, /plan:/);
  assert.match(r.stderr, /step-log:/);
});

test('ignores already-DONE stories, non-ROUTEMAP files and non-DONE edits', () => {
  const { d } = proj();
  assert.strictEqual(runHook('story-done-guard', edit(d, '| STORY-001 | A | S | [x] DONE | — |', '| STORY-001 | A | S | [x] DONE | — | 2026 |')).code, 0);
  assert.strictEqual(runHook('story-done-guard', edit(d, 'x', '| STORY-002 | B | S | [~] IN PROGRESS | Dev |')).code, 0);
  const other = edit(d, 'a', '| STORY-002 | B | S | [x] DONE | — |');
  other.tool_input.file_path = path.join(d, 'docs/OTHER.md');
  assert.strictEqual(runHook('story-done-guard', other).code, 0);
});

test('Write tool: compares against current file; passes with full evidence', () => {
  const { d, p1 } = proj();
  for (const f of ['plan', 'gate']) fs.writeFileSync(path.join(p1, `STORY-002-${f}.md`), 'x');
  fs.writeFileSync(path.join(p1, 'STORY-002-review.md'), '| F | ok | FIXED |');
  fs.writeFileSync(path.join(p1, 'STORY-002-step-log.txt'), ['STEP_1 PLAN: EXECUTED', 'STEP_2 DEV: EXECUTED', 'STEP_3 GATE: EXECUTED', 'STEP_4 REVIEW: EXECUTED', 'STEP_5 COMMIT: EXECUTED'].join('\n'));
  const write = { hook_event_name: 'PreToolUse', tool_name: 'Write', cwd: d, tool_input: { file_path: path.join(d, 'docs/ROUTEMAP.md'), content: '| STORY-001 | A | S | [x] DONE | — |\n| STORY-002 | B | S | [x] DONE | — |\n' } };
  assert.strictEqual(runHook('story-done-guard', write).code, 0);
});

test('a surgical status-cell edit is still detected', () => {
  const { d } = proj();
  const r = runHook('story-done-guard', edit(d, '[~] IN PROGRESS | Commit', '[x] DONE | —'));
  assert.strictEqual(r.code, 2);
  assert.match(r.stderr, /STORY-002/);
});

test('an edit whose old_string is not in the file passes (Edit itself will fail)', () => {
  const { d } = proj();
  assert.strictEqual(runHook('story-done-guard', edit(d, 'NOT IN FILE', '| STORY-002 | B | S | [x] DONE | — |')).code, 0);
});

test('a transitioning story with no story file passes but warns on stderr', () => {
  const { d } = proj();
  const edited = edit(d, '| STORY-002 | B | S | [~] IN PROGRESS | Commit |',
    '| STORY-002 | B | S | [~] IN PROGRESS | Commit |\n| STORY-099 | Onboarded | S | [x] DONE | — |');
  const r = runHook('story-done-guard', edited);
  assert.strictEqual(r.code, 0);
  assert.match(r.stderr, /story-done-guard: no story file found for STORY-099 under docs\/stories; evidence not checked/);
});

test('config warnings reach stderr without changing the exit code', () => {
  const { d } = proj();
  fs.writeFileSync(path.join(d, 'asel.config.json'), '{ not json');
  const r = runHook('story-done-guard', edit(d, 'NOT IN FILE', 'x'), { home: d });
  assert.strictEqual(r.code, 0);
  assert.match(r.stderr, /^asel: .*invalid JSON/m);
});
