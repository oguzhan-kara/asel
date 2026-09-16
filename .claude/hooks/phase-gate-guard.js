#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { readInput } = require('./lib/input');
const { finish } = require('./lib/exit');
const { loadConfig, guard } = require('./lib/config');
const { parseRoutemap, inProgressPhase } = require('./lib/routemap');
const { findPhaseGateReport } = require('./lib/evidence');
const { resolveTarget, readCurrent } = require('./lib/edit');

const input = readInput();
const { config } = loadConfig(input.cwd);
const g = guard(config, 'phaseGateGuard', input.event || 'PostToolUse');
if (!g.enabled || !/routemap/i.test(input.filePath)) finish('warn', '');

const target = resolveTarget(input, config.paths.routemap);
const current = readCurrent(target);
const phase = inProgressPhase(parseRoutemap(current));
if (!phase || phase.stories.length === 0 || !phase.stories.every((s) => s.done)) finish('warn', '');
if (findPhaseGateReport(input.cwd, config.paths, phase.number)) finish('warn', '');

const prefix = g.note ? g.note + '\n' : '';
finish('warn', `${prefix}All ${phase.stories.length} stories in Phase ${phase.number} (${phase.name}) are DONE. Dispatch the asel-phase-gate subagent before starting the next phase; expected report: ${config.paths.reports}/phase-${phase.number}-gate-<date>.md`);
