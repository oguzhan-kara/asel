'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { runHook } = require('./helpers/run-hook');

const call = (skill) => ({ hook_event_name: 'PreToolUse', tool_name: 'Skill', tool_input: { skill } });

test('blocks user-only skills, allows others', () => {
  const r = runHook('skill-guard', call('asel-setup'));
  assert.strictEqual(r.code, 2);
  assert.match(r.stderr, /user-only/);
  assert.strictEqual(runHook('skill-guard', call('asel')).code, 0);
  assert.strictEqual(runHook('skill-guard', call('frontend-design')).code, 0);
  assert.strictEqual(runHook('skill-guard', { hook_event_name: 'PreToolUse', tool_name: 'Skill', tool_input: {} }).code, 0);
});
