'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { ROOT } = require('./helpers/walk');

test('CLI install into a temp project renders a working hook set', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'asel-e2e-'));
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'asel-home-'));
  const env = { ...process.env, HOME: home, USERPROFILE: home };
  execFileSync(process.execPath, [path.join(ROOT, 'install.js'), '--project', target, '--hooks=always'], { env });
  const out = execFileSync(process.execPath, [path.join(ROOT, 'install.js'), '--check', '--project', target], { env, encoding: 'utf8' });
  assert.deepStrictEqual(JSON.parse(out), { added: [], removed: [], modified: [] });
  const hook = path.join(target, '.claude', 'hooks', 'skill-guard.js');
  const r = require('child_process').spawnSync(process.execPath, [hook], { input: JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Skill', cwd: target, tool_input: { skill: 'asel-help' } }), encoding: 'utf8', env });
  assert.strictEqual(r.status, 2);
  const skill = fs.readFileSync(path.join(target, '.claude', 'skills', 'asel', 'SKILL.md'), 'utf8');
  assert.match(skill, /node "\$CLAUDE_PROJECT_DIR\/\.claude\/hooks\/quality-scan\.js"/);
  const agent = fs.readFileSync(path.join(target, '.claude', 'agents', 'asel-planner.md'), 'utf8');
  assert.match(agent, /^model: opus$/m);
  assert.match(agent, /^effort: xhigh$/m);
});
