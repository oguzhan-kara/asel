#!/usr/bin/env node
'use strict';
const { readInput } = require('./lib/input');
const { finish, emitWarnings } = require('./lib/exit');
const { loadConfig, guard } = require('./lib/config');
const { readSession } = require('./lib/session');

const input = readInput();
const { config, warnings } = loadConfig(input.cwd);
emitWarnings(warnings);
const g = guard(config, 'stopCheck', 'Stop');
if (!g.enabled) finish('warn', '');
const s = readSession(input.cwd, config.paths.claudeMd);
if (!s.story || !s.step) finish('warn', '');
finish('warn', `WARNING: ${s.story} is still in progress (step: ${s.step}). Resume with /asel to continue.`);
