'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { ROOT } = require('./helpers/walk');

const EXPECT = {
  'immutable-architecture.md': null, 'production-grade.md': null, 'commit-conventions.md': null,
  'routemap-discipline.md': null, 'strict-protocol.md': null,
  'clean-code.md': '{{rules.backend,frontend}}', 'i18n-standards.md': '{{rules.frontend,backend}}',
  'naming-conventions.md': '{{rules.frontend,backend}}', 'env-configuration.md': '{{rules.infra}}',
  'makefile-standards.md': '{{rules.infra}}', 'telegram-notifications.md': '{{pathsList.routemap}}',
};

test('rules carry the expected paths: scoping', () => {
  for (const [file, scope] of Object.entries(EXPECT)) {
    const text = fs.readFileSync(path.join(ROOT, '.claude', 'rules', file), 'utf8');
    if (scope === null) assert.ok(!text.startsWith('---'), `${file} must be always-on`);
    else assert.ok(text.startsWith(`---\npaths: ${scope}\n---\n`), `${file} scope`);
  }
  assert.strictEqual(fs.readdirSync(path.join(ROOT, '.claude', 'rules')).length, 11);
});

test('clean-code keeps the waiting-and-locks section', () => {
  const text = fs.readFileSync(path.join(ROOT, '.claude', 'rules', 'clean-code.md'), 'utf8');
  assert.match(text, /Bekleme ve kilit/);
});
