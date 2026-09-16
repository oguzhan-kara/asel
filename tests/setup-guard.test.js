'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { runHook } = require('./helpers/run-hook');

const CURRENT = '## Development Phase\n\n### Phase 1: F [IN PROGRESS]\n\n| STORY-001 | A | S | [x] DONE | — |\n| STORY-002 | B | S | [ ] PENDING | — |\n';
function proj() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'asel-'));
  fs.mkdirSync(path.join(d, 'docs', 'reports'), { recursive: true });
  fs.writeFileSync(path.join(d, 'docs', 'ROUTEMAP.md'), CURRENT);
  return d;
}
const edit = (d, newS) => ({ hook_event_name: 'PreToolUse', tool_name: 'Edit', cwd: d, tool_input: { file_path: 'docs/ROUTEMAP.md', old_string: '| STORY-002 | B | S | [ ] PENDING | — |', new_string: newS } });

test('blocks starting STORY-002 when Phase 1 has a DONE story but no infra/setup reports', () => {
  const d = proj();
  const r = runHook('setup-guard', edit(d, '| STORY-002 | B | S | [~] IN PROGRESS | Plan |'));
  assert.strictEqual(r.code, 2);
  assert.match(r.stderr, /infra-tuning\.md/);
  fs.writeFileSync(path.join(d, 'docs', 'reports', 'infra-tuning.md'), 'x');
  const r2 = runHook('setup-guard', edit(d, '| STORY-002 | B | S | [~] IN PROGRESS | Plan |'));
  assert.strictEqual(r2.code, 2);
  assert.match(r2.stderr, /setup-verification\.md/);
  fs.writeFileSync(path.join(d, 'docs', 'reports', 'setup-verification.md'), 'x');
  assert.strictEqual(runHook('setup-guard', edit(d, '| STORY-002 | B | S | [~] IN PROGRESS | Plan |')).code, 0);
});

test('passes when the edit does not start a story or Phase 1 has no DONE story', () => {
  const d = proj();
  assert.strictEqual(runHook('setup-guard', edit(d, '| STORY-002 | B | S | [ ] PENDING | Plan |')).code, 0);
  fs.writeFileSync(path.join(d, 'docs', 'ROUTEMAP.md'), CURRENT.replace('[x] DONE', '[~] IN PROGRESS'));
  assert.strictEqual(runHook('setup-guard', edit(d, '| STORY-002 | B | S | [~] IN PROGRESS | Plan |')).code, 0);
});
