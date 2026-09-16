#!/usr/bin/env node
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const sep = process.argv.indexOf('--');
const [cmd, ...args] = process.argv.slice(sep + 1);
if (!cmd) { console.error('usage: node spawn-detached.js -- <cmd> [args…]'); process.exit(1); }
const win = process.platform === 'win32';
const q = (s) => (/[\s"]/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s);

// Windows: find the real executable so we can spawn it directly (no shell).
function resolveTarget(name) {
  if (path.extname(name) || name.includes('/') || name.includes(path.sep)) return name;
  const dirs = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
  for (const dir of dirs) {
    for (const ext of ['', '.exe', '.cmd', '.bat']) {
      const candidate = path.join(dir, name + ext);
      try { if (fs.statSync(candidate).isFile()) return candidate; } catch { /* keep looking */ }
    }
  }
  return name;
}

function spawnWin() {
  const target = resolveTarget(cmd);
  // .cmd/.bat are scripts: only cmd.exe can run them, and cmd.exe has no way
  // to carry a newline inside an argument.
  if (/\.(cmd|bat)$/i.test(target)) {
    if ([target, ...args].some((a) => /[\r\n]/.test(a))) {
      console.error('spawn-detached: .cmd/.bat targets cannot take multi-line arguments');
      process.exit(1);
    }
    const line = `"${[target, ...args].map(q).join(' ')}"`;
    return spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', line], {
      detached: true, stdio: 'ignore', windowsVerbatimArguments: true,
    });
  }
  return spawn(target, args, { detached: true, stdio: 'ignore' });
}

const child = win ? spawnWin() : spawn(cmd, args, { detached: true, stdio: 'ignore' });
child.unref();
console.log(String(child.pid));
