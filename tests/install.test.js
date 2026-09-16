'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { install, check } = require('../install');
const { walk } = require('./helpers/walk');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'asel-'));

test('project install renders placeholders, writes config template, is idempotent', () => {
  const target = tmp();
  const r1 = install({ target, mode: 'project', hooksMode: 'always', playwrightPrefix: 'mcp__pw', home: tmp() });
  assert.ok(r1.copied.length > 0);
  assert.ok(fs.existsSync(path.join(target, 'asel.config.json')));
  assert.ok(fs.existsSync(path.join(target, '.env.example')));
  const rendered = walk(path.join(target, '.claude'), (f) => /\.(md|js|json)$/.test(f)).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  assert.ok(!/\{\{[a-zA-Z.,]+\}\}/.test(rendered), 'placeholders remain');
  const settings = JSON.parse(fs.readFileSync(path.join(target, '.claude', 'settings.json'), 'utf8'));
  assert.ok(settings.hooks.PreToolUse.some((h) => JSON.stringify(h).includes('quality-scan.js')));
  fs.writeFileSync(path.join(target, 'asel.config.json'), JSON.stringify({ language: { conversation: 'en' } }));
  const r2 = install({ target, mode: 'project', hooksMode: 'always', playwrightPrefix: 'mcp__pw', home: tmp() });
  assert.strictEqual(JSON.parse(fs.readFileSync(path.join(target, 'asel.config.json'), 'utf8')).language.conversation, 'en', 'config must not be overwritten');
  const settings2 = JSON.parse(fs.readFileSync(path.join(target, '.claude', 'settings.json'), 'utf8'));
  assert.deepStrictEqual(settings2.hooks, settings.hooks, 'second install must not duplicate hooks');
  assert.deepStrictEqual(check({ target, mode: 'project', home: tmp(), playwrightPrefix: 'mcp__pw' }), { added: [], removed: [], modified: [] });
  assert.deepStrictEqual(r2.copied.sort(), r1.copied.sort());
});

test('settings merge keeps foreign hooks and allow entries', () => {
  const target = tmp();
  fs.mkdirSync(path.join(target, '.claude'));
  fs.writeFileSync(path.join(target, '.claude', 'settings.json'), JSON.stringify({
    permissions: { allow: ['Bash(git:*)'] },
    hooks: { PostToolUse: [{ hooks: [{ type: 'command', command: 'node other.js' }] }] },
  }));
  install({ target, mode: 'project', hooksMode: 'always', playwrightPrefix: 'mcp__pw', home: tmp() });
  const s = JSON.parse(fs.readFileSync(path.join(target, '.claude', 'settings.json'), 'utf8'));
  assert.deepStrictEqual(s.permissions.allow, ['Bash(git:*)']);
  assert.ok(s.hooks.PostToolUse.some((h) => JSON.stringify(h).includes('other.js')));
  assert.ok(s.hooks.PostToolUse.some((h) => JSON.stringify(h).includes('notify-hook.js')));
});

test('global install goes under home and skips rules; check reports drift', () => {
  const home = tmp();
  install({ mode: 'global', hooksMode: 'skill', playwrightPrefix: 'mcp__pw', home });
  assert.ok(fs.existsSync(path.join(home, '.claude', 'skills', 'asel', 'SKILL.md')));
  assert.ok(fs.existsSync(path.join(home, '.claude', 'hooks', 'asel', 'quality-scan.js')));
  assert.ok(!fs.existsSync(path.join(home, '.claude', 'rules')));
  fs.appendFileSync(path.join(home, '.claude', 'skills', 'asel', 'SKILL.md'), '\nlocal edit\n');
  const d = check({ mode: 'global', home, playwrightPrefix: 'mcp__pw' });
  assert.deepStrictEqual(d.modified, ['skills/asel/SKILL.md']);
});
