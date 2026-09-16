'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { DEFAULTS } = require('../.claude/hooks/lib/config');
const { ROOT } = require('./helpers/walk');

test('asel.config.json equals DEFAULTS (run npm run config:template to refresh)', () => {
  const onDisk = fs.readFileSync(path.join(ROOT, 'asel.config.json'), 'utf8').replace(/\r\n/g, '\n');
  assert.strictEqual(onDisk, JSON.stringify(DEFAULTS, null, 2) + '\n');
});
