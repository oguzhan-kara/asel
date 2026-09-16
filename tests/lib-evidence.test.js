'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { DEFAULTS } = require('../.claude/hooks/lib/config');
const { checkStoryEvidence, findGateReport, findPhaseGateReport, listFiles } = require('../.claude/hooks/lib/evidence');

function project() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'asel-'));
  const p1 = path.join(d, 'docs', 'stories', 'phase-1');
  fs.mkdirSync(p1, { recursive: true });
  fs.mkdirSync(path.join(d, 'docs', 'reports'), { recursive: true });
  return { d, p1 };
}
const w = (f, t) => fs.writeFileSync(f, t);

test('reports every missing artifact', () => {
  const { d, p1 } = project();
  w(path.join(p1, 'STORY-001-setup.md'), '# STORY-001\n');
  const r = checkStoryEvidence(d, DEFAULTS.paths, 'STORY-001');
  assert.ok(r.storyFile.endsWith('STORY-001-setup.md'));
  assert.deepStrictEqual(r.missing.map((m) => m.split(':')[0]), ['plan', 'gate', 'review', 'step-log']);
});

test('passes with full evidence and flags unresolved findings / ui marker', () => {
  const { d, p1 } = project();
  w(path.join(p1, 'STORY-002-auth.md'), '# STORY-002\n<!-- ui-story: true -->\n');
  w(path.join(p1, 'STORY-002-plan.md'), 'plan');
  w(path.join(p1, 'STORY-002-gate.md'), 'gate');
  w(path.join(p1, 'STORY-002-review.md'), '| F1 | x | OPEN |\n');
  w(path.join(p1, 'STORY-002-step-log.txt'), ['STEP_1 PLAN: EXECUTED', 'STEP_2 DEV: EXECUTED', 'STEP_3 GATE: EXECUTED', 'STEP_4 REVIEW: EXECUTED', 'STEP_5 COMMIT: EXECUTED'].join('\n'));
  w(path.join(d, 'docs', 'USERTEST.md'), '## STORY-001: x\n');
  let r = checkStoryEvidence(d, DEFAULTS.paths, 'STORY-002');
  assert.deepStrictEqual(r.missing.map((m) => m.split(':')[0]).sort(), ['review-unresolved', 'ui-story', 'usertest']);
  w(path.join(p1, 'STORY-002-review.md'), '| F1 | x | FIXED |\n');
  fs.appendFileSync(path.join(p1, 'STORY-002-step-log.txt'), '\nfrontend-design INVOKED');
  fs.appendFileSync(path.join(d, 'docs', 'USERTEST.md'), '## STORY-002: y\n');
  r = checkStoryEvidence(d, DEFAULTS.paths, 'STORY-002');
  assert.deepStrictEqual(r.missing, []);
});

test('unknown story is not blocked (no story file)', () => {
  const { d } = project();
  assert.deepStrictEqual(checkStoryEvidence(d, DEFAULTS.paths, 'STORY-999'), { storyFile: null, missing: [] });
});

test('gate report finders', () => {
  const { d, p1 } = project();
  w(path.join(p1, 'STORY-30-gate.md'), 'g');
  assert.strictEqual(findGateReport(d, DEFAULTS.paths, 'STORY-3'), null);
  assert.strictEqual(findGateReport(d, DEFAULTS.paths, 'STORY-003'), null);
  w(path.join(p1, 'STORY-003-gate.md'), 'g');
  assert.ok(findGateReport(d, DEFAULTS.paths, 'STORY-003').endsWith('STORY-003-gate.md'));
  w(path.join(d, 'docs', 'reports', 'BUG-004-gate.md'), 'g');
  assert.ok(findGateReport(d, DEFAULTS.paths, 'BUG-004'));
  assert.strictEqual(findPhaseGateReport(d, DEFAULTS.paths, 2), null);
  w(path.join(d, 'docs', 'reports', 'phase-2-gate.md'), 'g');
  assert.ok(findPhaseGateReport(d, DEFAULTS.paths, 2));
  assert.strictEqual(findPhaseGateReport(d, DEFAULTS.paths, 12), null);
});

test('listFiles returns absolute paths and [] for a missing dir', () => {
  const { d, p1 } = project();
  w(path.join(p1, 'a.md'), 'a');
  const files = listFiles(path.join(d, 'docs'));
  assert.strictEqual(files.length, 1);
  assert.ok(path.isAbsolute(files[0]) && files[0].endsWith('a.md'));
  assert.deepStrictEqual(listFiles(path.join(d, 'nope')), []);
});
