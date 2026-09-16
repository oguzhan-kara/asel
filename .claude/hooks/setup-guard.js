#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { readInput } = require('./lib/input');
const { finish } = require('./lib/exit');
const { loadConfig, guard } = require('./lib/config');
const { parseRoutemap } = require('./lib/routemap');
const { resolveTarget, readCurrent, proposeDocument } = require('./lib/edit');

const input = readInput();
const { config } = loadConfig(input.cwd);
const g = guard(config, 'setupGuard', input.event || 'PreToolUse');
if (!g.enabled || !/routemap/i.test(input.filePath)) finish('warn', '');

const target = resolveTarget(input, config.paths.routemap);
const current = readCurrent(target);
const proposed = proposeDocument(input, current);
if (proposed === null) finish('warn', '');

const before = new Set(parseRoutemap(current).stories.filter((s) => s.inProgress).map((s) => s.id));
const starting = parseRoutemap(proposed).stories.some((s) => s.inProgress && !before.has(s.id));
if (!starting) finish('warn', '');

const rm = parseRoutemap(current);
const phase1 = rm.phases.find((p) => p.number === 1);
if (!phase1 || !phase1.stories.some((s) => s.done)) finish('warn', '');

const reports = path.join(input.cwd, config.paths.reports);
const tuning = path.join(reports, 'infra-tuning.md');
const setup = path.join(reports, 'setup-verification.md');
if (fs.existsSync(tuning) && fs.existsSync(setup)) finish('warn', '');

const rel = (f) => path.relative(input.cwd, f).replace(/\\/g, '/');
if (!fs.existsSync(tuning)) finish(g.level, `BLOCKED: infrastructure tuning not completed. Dispatch the asel-devops subagent before starting the next story. Expected report: ${rel(tuning)}`);
finish(g.level, `BLOCKED: setup verification not completed. Dispatch the asel-setup-verifier subagent before starting the next story. Expected report: ${rel(setup)}`);
