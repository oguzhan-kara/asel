'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { walk, ROOT } = require('./helpers/walk');

const FORBIDDEN = [
  'Amil', 'amil-', '/amil', 'dev-browser', 'MultiEdit', 'Task tool', 'jq -r',
  'model: "opus"', 'model: "sonnet"', 'Task dispatch', 'Task call', 'Task prompt', 'Task-based', '(Task,',
  // Agents are dispatched by subagent_type; prose must not tell the orchestrator to read a
  // prompt file, point at an install path, or restate a model the agent definition already pins.
  'Read `asel-', '{{aselRoot}}/asel-', '{{aselRoot}}/agents/',
  '(Agent tool, opus', '(Agent tool, sonnet', '(model: opus', '(model: sonnet', '~/{{aselRoot}}',
];

test('no stale Amil-era terms under .claude/', () => {
  const files = walk(path.join(ROOT, '.claude'), (f) => /\.(md|js|sh|json)$/.test(f));
  const hits = [];
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    for (const term of FORBIDDEN) {
      if (text.includes(term)) hits.push(`${path.relative(ROOT, f)}: "${term}"`);
    }
  }
  assert.deepStrictEqual(hits, []);
});

test('no stale legacy-project terms anywhere in the repo (word-boundary)', () => {
  const EXCLUDED_DIRS = new Set(['.git', 'node_modules', '.superpowers']);
  const SELF = path.resolve(__filename);
  const STALE = /\b([Aa]mil|lena-[a-z]+|aril\.com)\b/;
  const files = walk(ROOT, (f) => path.resolve(f) !== SELF, [], EXCLUDED_DIRS);
  const hits = [];
  for (const f of files) {
    let text;
    try { text = fs.readFileSync(f, 'utf8'); } catch { continue; }
    if (STALE.test(text)) hits.push(path.relative(ROOT, f));
  }
  assert.deepStrictEqual(hits, []);
});
