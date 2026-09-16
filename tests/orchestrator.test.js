'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { ROOT } = require('./helpers/walk');
const { hookEntries } = require('../install');

const skill = fs.readFileSync(path.join(ROOT, '.claude', 'skills', 'asel', 'SKILL.md'), 'utf8');

test('orchestrator is short and declares every hook that install.js knows', () => {
  assert.ok(skill.split(/\r?\n/).length <= 300);
  const fm = skill.match(/^---\n([\s\S]*?)\n---\n/)[1];
  assert.match(fm, /^name: asel$/m);
  for (const groups of Object.values(hookEntries('{{hookRoot}}'))) {
    for (const g of groups) for (const h of g.hooks) assert.ok(fm.includes(h.command), h.command);
  }
});

test('orchestrator dispatches by subagent name and lists all 21 modes', () => {
  for (const m of ['ONBOARD', 'NEW', 'CONTINUE', 'CHANGE', 'ASK', 'DEV', 'POLISH', 'DOCS', 'DEPLOY', 'AUTOPILOT', 'HEADLESS', 'RELEASE', 'AUDIT', 'BUGFIX', 'GAP REVIEW', 'DEV-READINESS', 'UAT', 'SEED', 'ACCEPTANCE', 'E2E-CHECK', 'MAINTAIN']) {
    assert.ok(skill.includes(`**${m}**`), m);
  }
  assert.match(skill, /subagent_type: "asel-planner"/);
});

test('forked skills exist with context: fork and agent', () => {
  for (const [s, role] of [['asel-audit', 'compliance-auditor'], ['asel-seed', 'seed-generator'], ['asel-acceptance', 'acceptance-tester'], ['asel-e2e-check', 'e2e-tester']]) {
    const t = fs.readFileSync(path.join(ROOT, '.claude', 'skills', s, 'SKILL.md'), 'utf8');
    assert.match(t, /^context: fork$/m);
    assert.match(t, new RegExp(`^agent: asel-${role}$`, 'm'));
  }
});
