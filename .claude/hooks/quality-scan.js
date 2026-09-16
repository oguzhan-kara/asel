#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { readInput } = require('./lib/input');
const { finish, emitWarnings } = require('./lib/exit');
const { loadConfig, guard } = require('./lib/config');
const { scanFiles, formatReport } = require('./lib/scan-rules');

const input = readInput();
const { config, warnings } = loadConfig(input.cwd);
emitWarnings(warnings);
const g = guard(config, 'qualityScan', input.event || 'PreToolUse');
if (!g.enabled || !/git\s+commit/.test(input.command)) finish('warn', '');

let staged = [];
try {
  staged = execSync('git -c core.quotePath=false diff --cached --name-only --diff-filter=ACMR -z', { cwd: input.cwd, encoding: 'utf8' }).split('\0').filter(Boolean);
} catch { finish('warn', ''); }

const files = staged
  .map((rel) => ({ rel: rel.replace(/\\/g, '/'), abs: path.join(input.cwd, rel) }))
  .filter((f) => fs.existsSync(f.abs))
  .map((f) => ({ rel: f.rel, text: fs.readFileSync(f.abs, 'utf8') }));

const result = scanFiles(files, { skipPaths: g.skipPaths || [] });
const report = formatReport(result);
finish(result.blockers.length ? g.level : 'warn', report);
