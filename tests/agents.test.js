'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { AGENTS } = require('../scripts/agent-manifest');
const { ROOT } = require('./helpers/walk');

test('19 agent files exist with valid frontmatter and placeholders', () => {
  assert.strictEqual(AGENTS.length, 19);
  for (const a of AGENTS) {
    const f = path.join(ROOT, '.claude', 'agents', `asel-${a.role}.md`);
    assert.ok(fs.existsSync(f), f);
    const text = fs.readFileSync(f, 'utf8');
    const fm = text.match(/^---\n([\s\S]*?)\n---\n/);
    assert.ok(fm, `${a.role}: frontmatter`);
    assert.match(fm[1], new RegExp(`^name: asel-${a.role}$`, 'm'));
    assert.match(fm[1], /^description: .+/m);
    // `tools: *` is not a documented value: those agents omit the key and inherit every tool.
    if (a.tools === '*') assert.doesNotMatch(fm[1], /^tools:/m, `${a.role}: tools: * must not be written out`);
    else assert.match(fm[1], /^tools: .+/m);
    assert.match(fm[1], new RegExp(`^model: \\{\\{agents\\.${a.role}\\.model\\}\\}$`, 'm'));
    assert.match(fm[1], new RegExp(`^effort: \\{\\{agents\\.${a.role}\\.effort\\}\\}$`, 'm'));
    assert.ok(!/^---\n[\s\S]*^---\n[\s\S]*^---/m.test(text.slice(fm[0].length)), `${a.role}: nested frontmatter left in body`);
  }
});
