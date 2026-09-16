'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { walk, ROOT } = require('./helpers/walk');

const LIMIT = 400;

test('every file under .claude/ is at most 400 lines', () => {
  const files = walk(path.join(ROOT, '.claude'), (f) => /\.(md|js|sh)$/.test(f));
  const offenders = files
    .map((f) => ({ f: path.relative(ROOT, f), n: fs.readFileSync(f, 'utf8').split(/\r?\n/).length }))
    .filter((x) => x.n > LIMIT);
  assert.deepStrictEqual(offenders, [], `over ${LIMIT} lines: ${JSON.stringify(offenders, null, 2)}`);
});
