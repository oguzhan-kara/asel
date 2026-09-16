#!/usr/bin/env node
'use strict';
const path = require('path');
const { readInput } = require('./lib/input');
const { finish } = require('./lib/exit');
const { loadConfig, guard } = require('./lib/config');
const { doneIdsIn } = require('./lib/routemap');
const { checkStoryEvidence } = require('./lib/evidence');
const { resolveTarget, readCurrent, proposeDocument } = require('./lib/edit');

const input = readInput();
const { config } = loadConfig(input.cwd);
const g = guard(config, 'storyDoneGuard', input.event || 'PreToolUse');
if (!g.enabled || !/routemap/i.test(input.filePath)) finish('warn', '');

const target = resolveTarget(input, config.paths.routemap);
const current = readCurrent(target);
const proposed = proposeDocument(input, current);
if (proposed === null) finish('warn', '');

const oldDone = new Set(doneIdsIn(current));
const transitioning = doneIdsIn(proposed).filter((id) => !oldDone.has(id));
if (transitioning.length === 0) finish('warn', '');

const failures = [];
for (const id of transitioning) {
  const r = checkStoryEvidence(input.cwd, config.paths, id);
  if (r.missing.length) failures.push(`  ${id}:\n` + r.missing.map((m) => `    - ${m}`).join('\n'));
}
if (failures.length === 0) finish('warn', '');

finish(g.level, `STORY-DONE GUARD BLOCKED: cannot mark story(ies) [x] DONE without full evidence.\n\nMissing evidence:\n${failures.join('\n')}\n\nFix the missing items (re-dispatch the agent that writes the file, append the step-log entry, resolve the finding) then retry the ROUTEMAP edit.`);
