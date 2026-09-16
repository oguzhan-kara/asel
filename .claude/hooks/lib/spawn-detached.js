#!/usr/bin/env node
'use strict';
const { spawn } = require('child_process');
const sep = process.argv.indexOf('--');
const [cmd, ...args] = process.argv.slice(sep + 1);
if (!cmd) { console.error('usage: node spawn-detached.js -- <cmd> [args…]'); process.exit(1); }
const child = spawn(cmd, args, { detached: true, stdio: 'ignore', shell: process.platform === 'win32' });
child.unref();
console.log(String(child.pid));
