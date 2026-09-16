'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { walk, ROOT } = require('./helpers/walk');
const { scanFiles } = require('../.claude/hooks/lib/scan-rules');

test('the repo itself has no blockers', () => {
  const files = walk(ROOT, (f) => /\.(js|md|json|sh)$/.test(f) && !f.includes(`${path.sep}tests${path.sep}`) && !f.includes(`${path.sep}docs${path.sep}`))
    .map((f) => ({ rel: path.relative(ROOT, f).replace(/\\/g, '/'), text: fs.readFileSync(f, 'utf8') }));
  const r = scanFiles(files, { skipPaths: [] });
  assert.deepStrictEqual(r.blockers, []);
});
