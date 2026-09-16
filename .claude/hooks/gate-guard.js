#!/usr/bin/env node
'use strict';
const { readInput } = require('./lib/input');
const { finish, emitWarnings } = require('./lib/exit');
const { loadConfig, guard } = require('./lib/config');
const { readSession } = require('./lib/session');
const { findGateReport } = require('./lib/evidence');

const PAST_GATE = new Set(['Commit', 'Close', 'Done', 'Review', 'Handoff']);

const input = readInput();
const { config, warnings } = loadConfig(input.cwd);
emitWarnings(warnings);
const g = guard(config, 'gateGuard', input.event || 'PreToolUse');
if (!g.enabled || !/git\s+commit/.test(input.command)) finish('warn', '');

const s = readSession(input.cwd, config.paths.claudeMd);
if (!s.story || PAST_GATE.has(s.step)) finish('warn', '');
if (findGateReport(input.cwd, config.paths, s.story)) finish('warn', '');

finish(g.level, `BLOCKED: no gate report for ${s.story} (step: ${s.step}). Dispatch the asel-gate-lead subagent (with the three asel-gate-scout-* results) before committing.`);
