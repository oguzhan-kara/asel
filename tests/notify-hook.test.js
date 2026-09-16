'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseRoutemap } = require('../.claude/hooks/lib/routemap');
const { DEFAULTS } = require('../.claude/hooks/lib/config');
const { computeEvents, seedState } = require('../.claude/hooks/notify-hook');
const { runHook } = require('./helpers/run-hook');

const basic = fs.readFileSync(path.join(__dirname, 'fixtures', 'routemap-basic.md'), 'utf8');

test('seedState lists existing DONE stories, complete phases and macro markers', () => {
  const s = seedState(parseRoutemap(basic));
  assert.ok(s.includes('STORY:STORY-001') && s.includes('STORY:STORY-002'));
  assert.ok(s.includes('PHASE:1'));
  assert.ok(s.includes('MACRO:PLANNING'));
  assert.ok(!s.includes('MACRO:DEVELOPMENT'));
});

test('computeEvents emits story, escalated/failed, phase and macro events once', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'asel-'));
  const p1 = path.join(d, 'docs', 'stories', 'phase-1');
  fs.mkdirSync(p1, { recursive: true });
  fs.writeFileSync(path.join(p1, 'STORY-002-plan.md'), 'p');
  const rm = parseRoutemap(basic);
  const state = new Set(['STORY:STORY-001', 'PHASE:1', 'MACRO:PLANNING']);
  const { events } = computeEvents(rm, state, d, DEFAULTS.paths);
  const keys = events.map((e) => e.key);
  assert.deepStrictEqual(keys, ['STORY:STORY-002', 'ESCALATED:STORY-004', 'FAILED:STORY-005']);
  assert.match(events[0].message, /Demo App[\s\S]*STORY-002: Auth/);
  assert.match(events[0].message, /Plan ✓ \| Gate ✗/);
  const again = computeEvents(rm, new Set([...state, ...keys]), d, DEFAULTS.paths);
  assert.deepStrictEqual(again.events, []);
});

test('hook seeds state on first run and exits 0; disabled notifications still maintain state', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'asel-'));
  fs.mkdirSync(path.join(d, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(d, 'docs', 'ROUTEMAP.md'), basic);
  const input = { hook_event_name: 'PostToolUse', tool_name: 'Edit', cwd: d, tool_input: { file_path: 'docs/ROUTEMAP.md' } };
  assert.strictEqual(runHook('notify-hook', input).code, 0);
  const state = fs.readFileSync(path.join(d, '.asel-notify-state'), 'utf8');
  assert.match(state, /STORY:STORY-001/);
  assert.strictEqual(runHook('notify-hook', input).code, 0);
});

test('hook resolves absolute file_path and seeds state', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'asel-'));
  fs.mkdirSync(path.join(d, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(d, 'docs', 'ROUTEMAP.md'), basic);
  const absPath = path.join(d, 'docs', 'ROUTEMAP.md');
  const input = { hook_event_name: 'PostToolUse', tool_name: 'Edit', cwd: d, tool_input: { file_path: absPath } };
  assert.strictEqual(runHook('notify-hook', input).code, 0);
  const state = fs.readFileSync(path.join(d, '.asel-notify-state'), 'utf8');
  assert.match(state, /STORY:STORY-001/);
});

test('computeEvents handles orphan DONE stories', () => {
  const orphan = `# Project Roadmap: Demo App

## Development Phase

### Phase 1: Setup
| # | Story | Effort | Status | Step |
|---|-------|--------|--------|------|
| STORY-001 | Setup | S | [x] DONE | — |

## Orphan Stories

| # | Story | Effort | Status | Step |
|---|-------|--------|--------|------|
| STORY-050 | Orphan | S | [x] DONE | — |
`;
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'asel-'));
  const p1 = path.join(d, 'docs', 'stories', 'phase-1');
  fs.mkdirSync(p1, { recursive: true });
  fs.writeFileSync(path.join(p1, 'STORY-050-plan.md'), 'p');
  const rm = parseRoutemap(orphan);
  const { events } = computeEvents(rm, new Set(), d, DEFAULTS.paths);
  assert.ok(events.some((e) => e.key === 'STORY:STORY-050'));
  const orphanEvent = events.find((e) => e.key === 'STORY:STORY-050');
  assert.match(orphanEvent.message, /Phase —/);
});
