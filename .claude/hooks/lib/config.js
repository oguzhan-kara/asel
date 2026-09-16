'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const agent = (model, effort, extra = {}) => ({ model, effort, ...extra });

const DEFAULTS = {
  language: { conversation: 'tr', documents: 'en' },
  paths: {
    docs: 'docs', routemap: 'docs/ROUTEMAP.md', stories: 'docs/stories',
    reports: 'docs/reports', usertest: 'docs/USERTEST.md', claudeMd: 'CLAUDE.md',
  },
  workflow: {
    autopilot: false, reviewBeforeCommit: true, phaseGateRequired: true,
    maxRedispatch: 3, coAuthor: 'Claude <noreply@anthropic.com>',
  },
  agents: {
    planner: agent('opus', 'xhigh'),
    developer: agent('sonnet', 'high', { escalationModel: 'opus' }),
    'gate-lead': agent('opus', 'high'),
    'gate-scout-analysis': agent('sonnet', 'medium'),
    'gate-scout-testbuild': agent('sonnet', 'medium'),
    'gate-scout-ui': agent('sonnet', 'medium'),
    reviewer: agent('sonnet', 'medium'),
    'phase-gate': agent('opus', 'high'),
    devops: agent('opus', 'high'),
    'setup-verifier': agent('opus', 'medium'),
    'deploy-engineer': agent('sonnet', 'medium'),
    'seed-generator': agent('opus', 'medium'),
    'e2e-tester': agent('opus', 'high'),
    'test-hardener': agent('opus', 'high'),
    'perf-optimizer': agent('opus', 'high'),
    'ui-polisher': agent('opus', 'high'),
    'acceptance-tester': agent('opus', 'high'),
    'compliance-auditor': agent('opus', 'xhigh'),
    'legacy-gate': agent('opus', 'high'),
  },
  guards: {
    qualityScan: { enabled: true, level: 'block', skipPaths: ['**/__tests__/**', '**/*.test.*', '**/fixtures/**', 'docs/**'] },
    gateGuard: { enabled: true, level: 'block' },
    storyDoneGuard: { enabled: true, level: 'block' },
    setupGuard: { enabled: true, level: 'block' },
    phaseGateGuard: { enabled: true, level: 'warn' },
    skillGuard: {
      enabled: true, level: 'block',
      userOnlySkills: ['asel-setup', 'asel-help', 'asel-changelog', 'asel-commit', 'asel-checkup', 'asel-codex-review'],
    },
    stopCheck: { enabled: true, level: 'warn' },
  },
  notifications: {
    telegram: { enabled: false, tokenEnv: 'ASEL_TELEGRAM_BOT_TOKEN', chatIdsEnv: 'ASEL_TELEGRAM_CHAT_IDS', timeoutMs: 5000 },
  },
  rules: {
    backend: ['backend/**', 'sdk/**', '**/*.java', '**/*.go', '**/*.py'],
    frontend: ['frontend/**', '**/*.tsx', '**/*.jsx'],
    infra: ['infra/**', 'docker-compose*.yml', 'Makefile', '.env*', 'package.json'],
  },
};

const POST_EVENTS = new Set(['PostToolUse', 'PostToolUseFailure', 'PermissionRequest']);

function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }

function deepMerge(base, over) {
  if (!isObj(base) || !isObj(over)) return over === undefined ? base : over;
  const out = { ...base };
  for (const k of Object.keys(over)) out[k] = isObj(base[k]) && isObj(over[k]) ? deepMerge(base[k], over[k]) : over[k];
  return out;
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; }
}

function loadConfig(cwd, home = os.homedir()) {
  const candidates = [path.join(cwd, 'asel.config.json'), path.join(home, '.claude', 'asel.config.json')];
  for (const file of candidates) {
    if (fs.existsSync(file)) return { config: deepMerge(DEFAULTS, readJson(file)), source: file };
  }
  return { config: deepMerge(DEFAULTS, {}), source: 'defaults' };
}

function guard(config, name, event) {
  const g = (config.guards && config.guards[name]) || null;
  if (!g) return { enabled: false, level: 'warn', note: '' };
  let level = g.level === 'block' ? 'block' : 'warn';
  let note = '';
  if (level === 'block' && POST_EVENTS.has(event)) {
    level = 'warn';
    note = `asel: guard "${name}" cannot block on ${event}; downgraded to warn`;
  }
  return { ...g, enabled: g.enabled !== false, level, note };
}

module.exports = { DEFAULTS, deepMerge, loadConfig, guard };
