#!/usr/bin/env node
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const home = os.homedir();
const settingsFile = path.join(home, '.claude', 'settings.json');
const statusline = path.join(home, '.claude', 'asel-statusline.sh');
fs.mkdirSync(path.dirname(settingsFile), { recursive: true });

let s = {};
if (fs.existsSync(settingsFile)) {
  try {
    s = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
  } catch (err) {
    console.error(`asel-setup: ${settingsFile} is not valid JSON (${err.message}). Fix or move the file, then rerun. Nothing was changed.`);
    process.exit(1);
  }
}
if (!s || typeof s !== 'object' || Array.isArray(s)) { console.error(`asel-setup: ${settingsFile} must contain a JSON object. Nothing was changed.`); process.exit(1); }

const report = [];

const ALLOW = ['Bash(git:*)', 'Bash(node:*)', 'Bash(npm:*)', 'Bash(npx:*)', 'Bash(docker:*)', 'Bash(make:*)', 'Bash(curl:*)', 'WebFetch', 'WebSearch'];
if (!s.permissions || typeof s.permissions !== 'object') s.permissions = {};
const allow = new Set(s.permissions.allow || []);
let added = 0;
for (const a of ALLOW) if (!allow.has(a)) { allow.add(a); added++; }
s.permissions.allow = [...allow];
report.push(`Permissions: +${added} (total ${allow.size})`);

if (!s.statusLine) {
  fs.copyFileSync(path.join(__dirname, 'statusline.sh'), statusline);
  s.statusLine = { type: 'command', command: `bash "${statusline.replace(/\\/g, '/')}"` };
  report.push('Statusline: installed asel-statusline.sh');
} else {
  report.push(`Statusline: kept existing (${s.statusLine.command}). To switch: set statusLine.command to bash "${statusline.replace(/\\/g, '/')}"`);
}

if (!s.env || typeof s.env !== 'object' || Array.isArray(s.env)) s.env = {};
if (!s.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS) s.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS = '64000';
if (s.alwaysThinkingEnabled === undefined) s.alwaysThinkingEnabled = true;
if (!s.effortLevel) s.effortLevel = 'high';
report.push('Settings: max output tokens, always-thinking, effort (only if missing)');

fs.writeFileSync(settingsFile, JSON.stringify(s, null, 2) + '\n');
console.log('═══ ASEL SETUP COMPLETE ═══\n' + report.map((r) => '  ' + r).join('\n') + '\n  Restart Claude Code to activate.');
