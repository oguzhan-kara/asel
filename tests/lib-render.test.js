'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { DEFAULTS } = require('../.claude/hooks/lib/config');
const { renderPlaceholders } = require('../.claude/hooks/lib/render');

const ctx = { config: DEFAULTS, hookRoot: '$CLAUDE_PROJECT_DIR/.claude/hooks', aselRoot: '.claude/skills/asel', playwrightPrefix: 'mcp__plugin_playwright_playwright' };

test('renders agent, rules, paths and root placeholders', () => {
  assert.strictEqual(renderPlaceholders('model: {{agents.planner.model}}\neffort: {{agents.planner.effort}}', ctx), 'model: opus\neffort: xhigh');
  assert.strictEqual(renderPlaceholders('paths: {{rules.infra}}', ctx), 'paths: ' + JSON.stringify(DEFAULTS.rules.infra));
  const both = JSON.parse(renderPlaceholders('{{rules.frontend,backend}}', ctx));
  assert.deepStrictEqual(both, [...DEFAULTS.rules.frontend, ...DEFAULTS.rules.backend]);
  assert.strictEqual(renderPlaceholders('{{paths.routemap}}', ctx), '["docs/ROUTEMAP.md"]');
  assert.strictEqual(renderPlaceholders('node "{{hookRoot}}/x.js" {{aselRoot}} {{playwrightPrefix}}__browser_click', ctx), 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/x.js" .claude/skills/asel mcp__plugin_playwright_playwright__browser_click');
});

test('unknown placeholder throws', () => {
  assert.throws(() => renderPlaceholders('{{nope.x}}', ctx), /unknown placeholder/);
});
