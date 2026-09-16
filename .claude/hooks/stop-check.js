#!/usr/bin/env node
'use strict';
const { readInput } = require('./lib/input');
const { finish } = require('./lib/exit');
const { loadConfig, guard } = require('./lib/config');
const { readSession } = require('./lib/session');

const input = readInput();
const { config } = loadConfig(input.cwd);
const g = guard(config, 'stopCheck', 'Stop');
if (!g.enabled) finish('warn', '');
const s = readSession(input.cwd, config.paths.claudeMd);
if (!s.story || !s.step) finish('warn', '');
finish('warn', `WARNING: ${s.story} is still in progress (step: ${s.step}). Resume with /asel to continue.`);
