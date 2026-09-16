#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { readInput } = require('./lib/input');
const { finish } = require('./lib/exit');
const { loadConfig, guard } = require('./lib/config');
const { doneIdsIn } = require('./lib/routemap');
const { checkStoryEvidence } = require('./lib/evidence');

const input = readInput();
const { config } = loadConfig(input.cwd);
const g = guard(config, 'storyDoneGuard', input.event || 'PreToolUse');
if (!g.enabled || !/routemap/i.test(input.filePath)) finish('warn', '');

const proposed = input.newString || input.content || '';
const newDone = doneIdsIn(proposed);
if (newDone.length === 0) finish('warn', '');

let oldText = input.oldString;
if (!oldText) {
  const rm = path.join(input.cwd, config.paths.routemap);
  oldText = fs.existsSync(rm) ? fs.readFileSync(rm, 'utf8') : '';
}
const oldDone = new Set(doneIdsIn(oldText));
const transitioning = newDone.filter((id) => !oldDone.has(id));
if (transitioning.length === 0) finish('warn', '');

const failures = [];
for (const id of transitioning) {
  const r = checkStoryEvidence(input.cwd, config.paths, id);
  if (r.missing.length) failures.push(`  ${id}:\n` + r.missing.map((m) => `    - ${m}`).join('\n'));
}
if (failures.length === 0) finish('warn', '');

finish(g.level, `STORY-DONE GUARD BLOCKED: cannot mark story(ies) [x] DONE without full evidence.\n\nMissing evidence:\n${failures.join('\n')}\n\nFix the missing items (re-dispatch the agent that writes the file, append the step-log entry, resolve the finding) then retry the ROUTEMAP edit.`);
