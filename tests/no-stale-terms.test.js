'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { walk, ROOT } = require('./helpers/walk');

const FORBIDDEN = [
  'Amil', 'amil-', '/amil', 'dev-browser', 'MultiEdit', 'Task tool', 'jq -r',
  'model: "opus"', 'model: "sonnet"', 'Task dispatch', 'Task call', 'Task prompt', 'Task-based', '(Task,',
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
