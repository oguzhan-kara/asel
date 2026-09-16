#!/usr/bin/env node
'use strict';
const { spawn } = require('child_process');
const sep = process.argv.indexOf('--');
const [cmd, ...args] = process.argv.slice(sep + 1);
if (!cmd) { console.error('usage: node spawn-detached.js -- <cmd> [args…]'); process.exit(1); }
const win = process.platform === 'win32';
const q = (s) => (/[\s"]/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s);
const child = win
  ? spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `"${[cmd, ...args].map(q).join(' ')}"`], { detached: true, stdio: 'ignore', windowsVerbatimArguments: true })
  : spawn(cmd, args, { detached: true, stdio: 'ignore' });
child.unref();
console.log(String(child.pid));
