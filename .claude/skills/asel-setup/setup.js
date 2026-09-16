#!/usr/bin/env node
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const home = os.homedir();
const settingsFile = path.join(home, '.claude', 'settings.json');
const statusline = path.join(home, '.claude', 'asel-statusline.sh');
const s = fs.existsSync(settingsFile) ? JSON.parse(fs.readFileSync(settingsFile, 'utf8')) : {};
const report = [];

const ALLOW = ['Bash(git:*)', 'Bash(node:*)', 'Bash(npm:*)', 'Bash(npx:*)', 'Bash(docker:*)', 'Bash(make:*)', 'Bash(curl:*)', 'WebFetch', 'WebSearch'];
s.permissions = s.permissions || {};
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

s.env = s.env || {};
if (!s.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS) s.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS = '64000';
if (s.alwaysThinkingEnabled === undefined) s.alwaysThinkingEnabled = true;
if (!s.effortLevel) s.effortLevel = 'high';
report.push('Settings: max output tokens, always-thinking, effort (only if missing)');

fs.mkdirSync(path.dirname(settingsFile), { recursive: true });
fs.writeFileSync(settingsFile, JSON.stringify(s, null, 2) + '\n');
console.log('═══ ASEL SETUP COMPLETE ═══\n' + report.map((r) => '  ' + r).join('\n') + '\n  Restart Claude Code to activate.');
