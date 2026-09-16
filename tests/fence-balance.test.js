'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { walk, ROOT } = require('./helpers/walk');

// A fenced code block is opened/closed by a line whose first non-whitespace
// characters are ``` (optionally followed by a language tag on the opener).
// If a file's fence-marker count is odd, some fence never closes within that
// file — which, when the phase-file split moved a cut boundary through the
// middle of a fenced block, silently swallowed real headings as "code".
const FENCE_LINE = /^\s*```/;

test('every .md file under .claude/ has a balanced (even) fence-marker count', () => {
  const files = walk(path.join(ROOT, '.claude'), (f) => /\.md$/.test(f));
  const offenders = [];
  for (const f of files) {
    const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);
    const count = lines.filter((l) => FENCE_LINE.test(l)).length;
    if (count % 2 !== 0) {
      offenders.push({ f: path.relative(ROOT, f), fences: count });
    }
  }
  assert.deepStrictEqual(offenders, [], `odd fence count (unclosed fence): ${JSON.stringify(offenders, null, 2)}`);
});
