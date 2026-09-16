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

const target = path.isAbsolute(input.filePath) ? input.filePath : path.join(input.cwd, input.filePath);
const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';

let proposed;
if (input.tool === 'Write' || (!input.oldString && input.content)) {
  proposed = input.content || '';
} else {
  if (!input.oldString || !current.includes(input.oldString)) finish('warn', ''); // Edit will fail on its own
  const replaceAll = !!(input.raw.tool_input && input.raw.tool_input.replace_all);
  proposed = replaceAll ? current.split(input.oldString).join(input.newString) : current.replace(input.oldString, () => input.newString);
}

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
