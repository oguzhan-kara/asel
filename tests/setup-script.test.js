'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('node:child_process');

const SCRIPT = path.join(__dirname, '..', '.claude', 'skills', 'asel-setup', 'setup.js');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'asel-setup-'));

function runSetup(home) {
  const env = { ...process.env };
  if (process.platform === 'win32') env.USERPROFILE = home;
  else env.HOME = home;
  return spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8', env });
}

function settingsPath(home) {
  return path.join(home, '.claude', 'settings.json');
}

test('no settings.json: creates one with ALLOW entries and a statusLine', () => {
  const home = tmp();
  const result = runSetup(home);
  assert.strictEqual(result.status, 0, `expected exit 0, got ${result.status}: ${result.stderr}`);

  const file = settingsPath(home);
  assert.ok(fs.existsSync(file), 'settings.json should be created');
  const s = JSON.parse(fs.readFileSync(file, 'utf8'));

  const ALLOW = ['Bash(git:*)', 'Bash(node:*)', 'Bash(npm:*)', 'Bash(npx:*)', 'Bash(docker:*)', 'Bash(make:*)', 'Bash(curl:*)', 'WebFetch', 'WebSearch'];
  for (const a of ALLOW) assert.ok(s.permissions.allow.includes(a), `missing allow entry: ${a}`);
  assert.ok(s.statusLine && s.statusLine.type === 'command', 'expected a statusLine to be installed');
  assert.ok(fs.existsSync(path.join(home, '.claude', 'asel-statusline.sh')), 'statusline script should be copied');
});

test('existing settings with custom statusLine and one allow entry: kept, ALLOW added, idempotent bytes', () => {
  const home = tmp();
  const file = settingsPath(home);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const existing = {
    permissions: { allow: ['Bash(git:*)'] },
    statusLine: { type: 'command', command: 'bash "/custom/statusline.sh"' },
  };
  fs.writeFileSync(file, JSON.stringify(existing, null, 2) + '\n');

  const result1 = runSetup(home);
  assert.strictEqual(result1.status, 0, `expected exit 0, got ${result1.status}: ${result1.stderr}`);

  const s1 = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.strictEqual(s1.statusLine.command, 'bash "/custom/statusline.sh"', 'custom statusLine must be kept');
  assert.ok(s1.permissions.allow.includes('Bash(git:*)'), 'pre-existing allow entry must be kept');
  const ALLOW = ['Bash(git:*)', 'Bash(node:*)', 'Bash(npm:*)', 'Bash(npx:*)', 'Bash(docker:*)', 'Bash(make:*)', 'Bash(curl:*)', 'WebFetch', 'WebSearch'];
  for (const a of ALLOW) assert.ok(s1.permissions.allow.includes(a), `missing allow entry: ${a}`);
  assert.ok(!fs.existsSync(path.join(home, '.claude', 'asel-statusline.sh')), 'existing statusLine must not be replaced');

  const bytesAfterFirst = fs.readFileSync(file);
  const result2 = runSetup(home);
  assert.strictEqual(result2.status, 0, `expected exit 0 on second run, got ${result2.status}: ${result2.stderr}`);
  const bytesAfterSecond = fs.readFileSync(file);
  assert.ok(bytesAfterFirst.equals(bytesAfterSecond), 'running setup.js twice must yield identical file bytes');
});

test('invalid settings.json: exits 1, stderr mentions "not valid JSON", file left unchanged', () => {
  const home = tmp();
  const file = settingsPath(home);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const original = '{ not json';
  fs.writeFileSync(file, original);

  const result = runSetup(home);
  assert.strictEqual(result.status, 1, `expected exit 1, got ${result.status}`);
  assert.match(result.stderr, /not valid JSON/);

  const bytesAfter = fs.readFileSync(file, 'utf8');
  assert.strictEqual(bytesAfter, original, 'invalid settings.json must be left untouched');
});
