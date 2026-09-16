'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { DEFAULTS, loadConfig, guard, deepMerge } = require('../.claude/hooks/lib/config');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'asel-'));

test('DEFAULTS has the spec shape', () => {
  assert.strictEqual(DEFAULTS.paths.routemap, 'docs/ROUTEMAP.md');
  assert.strictEqual(DEFAULTS.workflow.autopilot, false);
  assert.strictEqual(DEFAULTS.notifications.telegram.enabled, false);
  assert.strictEqual(Object.keys(DEFAULTS.agents).length, 19);
  assert.deepStrictEqual(Object.keys(DEFAULTS.guards).sort(), [
    'gateGuard', 'phaseGateGuard', 'qualityScan', 'setupGuard', 'skillGuard', 'stopCheck', 'storyDoneGuard',
  ]);
});

test('loadConfig prefers project, then home, then defaults; merges deeply', () => {
  const home = tmp(); const proj = tmp();
  assert.strictEqual(loadConfig(proj, home).source, 'defaults');
  fs.mkdirSync(path.join(home, '.claude'));
  fs.writeFileSync(path.join(home, '.claude', 'asel.config.json'), JSON.stringify({ language: { conversation: 'en' } }));
  let r = loadConfig(proj, home);
  assert.strictEqual(r.source, path.join(home, '.claude', 'asel.config.json'));
  assert.strictEqual(r.config.language.conversation, 'en');
  assert.strictEqual(r.config.language.documents, 'en');
  fs.writeFileSync(path.join(proj, 'asel.config.json'), JSON.stringify({ guards: { qualityScan: { enabled: false } } }));
  r = loadConfig(proj, home);
  assert.strictEqual(r.source, path.join(proj, 'asel.config.json'));
  assert.strictEqual(r.config.guards.qualityScan.enabled, false);
  assert.strictEqual(r.config.guards.qualityScan.level, 'block');
});

test('deepMerge replaces arrays and merges objects', () => {
  assert.deepStrictEqual(deepMerge({ a: [1, 2], b: { c: 1, d: 2 } }, { a: [3], b: { d: 3 } }), { a: [3], b: { c: 1, d: 3 } });
});

test('guard downgrades block to warn on PostToolUse and reports note', () => {
  assert.strictEqual(guard(DEFAULTS, 'phaseGateGuard', 'PostToolUse').level, 'warn');
  const forced = deepMerge(DEFAULTS, { guards: { phaseGateGuard: { level: 'block' } } });
  const g2 = guard(forced, 'phaseGateGuard', 'PostToolUse');
  assert.strictEqual(g2.level, 'warn');
  assert.match(g2.note, /cannot block on PostToolUse/);
  assert.strictEqual(guard(DEFAULTS, 'storyDoneGuard', 'PreToolUse').level, 'block');
  assert.strictEqual(guard(DEFAULTS, 'nope', 'PreToolUse').enabled, false);
});
