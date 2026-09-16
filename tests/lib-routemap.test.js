'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { parseRoutemap, inProgressPhase, progress, doneIdsIn } = require('../.claude/hooks/lib/routemap');

const text = fs.readFileSync(path.join(__dirname, 'fixtures', 'routemap-basic.md'), 'utf8');

test('parseRoutemap extracts header, phases and stories', () => {
  const rm = parseRoutemap(text);
  assert.strictEqual(rm.project, 'Demo App');
  assert.strictEqual(rm.macroPhase, 'DEVELOPMENT');
  assert.strictEqual(rm.planning.length, 3);
  assert.strictEqual(rm.phases.length, 2);
  assert.deepStrictEqual(rm.phases.map((p) => p.status), ['DONE', 'IN PROGRESS']);
  const s3 = rm.stories.find((s) => s.id === 'STORY-003');
  assert.strictEqual(s3.title, 'Users CRUD');
  assert.strictEqual(s3.inProgress, true);
  assert.strictEqual(s3.step, 'Dev');
  assert.strictEqual(rm.stories.find((s) => s.id === 'STORY-004').escalated, true);
  assert.strictEqual(rm.stories.find((s) => s.id === 'STORY-005').failed, true);
  assert.deepStrictEqual(rm.e2e, [{ id: 'E0', done: true }, { id: 'E1', done: false }]);
});

test('inProgressPhase and progress', () => {
  const rm = parseRoutemap(text);
  assert.strictEqual(inProgressPhase(rm).number, 2);
  assert.deepStrictEqual(progress(rm), { total: 5, done: 2, pct: 40 });
});

test('doneIdsIn finds ids only on DONE lines', () => {
  assert.deepStrictEqual(
    doneIdsIn('| STORY-007 | x | S | [x] DONE | — |\n| STORY-008 | y | S | [ ] PENDING | — | STORY-007 |'),
    ['STORY-007'],
  );
});
