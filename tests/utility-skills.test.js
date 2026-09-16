'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { ROOT } = require('./helpers/walk');
const { DEFAULTS } = require('../.claude/hooks/lib/config');

test('every user-only skill is flagged user-invocable and not model-invocable', () => {
  for (const s of DEFAULTS.guards.skillGuard.userOnlySkills) {
    const t = fs.readFileSync(path.join(ROOT, '.claude', 'skills', s, 'SKILL.md'), 'utf8');
    const fm = t.match(/^---\n([\s\S]*?)\n---\n/)[1];
    assert.match(fm, new RegExp(`^name: ${s}$`, 'm'));
    assert.match(fm, /^user-invocable: true$/m, s);
    assert.match(fm, /^disable-model-invocation: true$/m, s);
    assert.ok(!/user_invocable|auto_trigger/.test(fm), s);
  }
});

test('asel-setup uses valid permission syntax and no removed tools', () => {
  const t = fs.readFileSync(path.join(ROOT, '.claude', 'skills', 'asel-setup', 'setup.js'), 'utf8');
  assert.ok(!/"(Git|Curl|NPM|Pip|Bash):\*"/.test(t));
  assert.match(t, /Bash\(git:\*\)/);
});
