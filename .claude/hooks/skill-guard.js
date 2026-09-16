#!/usr/bin/env node
'use strict';
const { readInput } = require('./lib/input');
const { finish } = require('./lib/exit');
const { loadConfig, guard } = require('./lib/config');

const input = readInput();
const { config } = loadConfig(input.cwd);
const g = guard(config, 'skillGuard', input.event || 'PreToolUse');
if (!g.enabled || !input.skill) finish('warn', '');
const userOnly = new Set(g.userOnlySkills || []);
if (!userOnly.has(input.skill)) finish('warn', '');
finish(g.level, `BLOCKED: ${input.skill} is a user-only utility skill. The orchestrator must never invoke it; the user runs /${input.skill} directly.`);
