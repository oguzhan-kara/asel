#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { readInput } = require('./lib/input');
const { finish } = require('./lib/exit');
const { loadConfig, guard } = require('./lib/config');
const { parseRoutemap, inProgressPhase } = require('./lib/routemap');
const { findPhaseGateReport } = require('./lib/evidence');

const input = readInput();
const { config } = loadConfig(input.cwd);
const g = guard(config, 'phaseGateGuard', input.event || 'PostToolUse');
if (!g.enabled || !/routemap/i.test(input.filePath)) finish('warn', '');

const rmFile = input.filePath ? path.join(input.cwd, input.filePath) : path.join(input.cwd, config.paths.routemap);
if (!fs.existsSync(rmFile)) finish('warn', '');
const phase = inProgressPhase(parseRoutemap(fs.readFileSync(rmFile, 'utf8')));
if (!phase || phase.stories.length === 0 || !phase.stories.every((s) => s.done)) finish('warn', g.note);
if (findPhaseGateReport(input.cwd, config.paths, phase.number)) finish('warn', g.note);

const prefix = g.note ? g.note + '\n' : '';
finish('warn', `${prefix}All ${phase.stories.length} stories in Phase ${phase.number} (${phase.name}) are DONE. Dispatch the asel-phase-gate subagent before starting the next phase; expected report: ${config.paths.reports}/phase-${phase.number}-gate-<date>.md`);
