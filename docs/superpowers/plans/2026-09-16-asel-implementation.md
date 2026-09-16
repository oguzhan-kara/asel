# Asel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Asel, a configurable Claude Code skill set that replaces Amil, with Node.js hooks, real subagent definitions, path-scoped rules and an idempotent installer.

**Architecture:** A standalone repo whose `.claude/` tree is the *source* (with `{{placeholders}}`); `install.js` renders it into a target project or `~/.claude` from `asel.config.json`. Hooks are small Node scripts over a shared `hooks/lib/`. Workflow markdown is ported from Amil by a script, then split to ≤400 lines by hand.

**Tech Stack:** Node.js ≥18 (CommonJS, no dependencies), `node --test`, git, Claude Code 2.1.x skill/agent/hook conventions.

**Spec:** `docs/superpowers/specs/2026-09-16-asel-design.md`

## Global Constraints

- Node ≥18, zero npm dependencies, CommonJS (`require`).
- Every file under `.claude/` ≤400 lines (`tests/line-limit.test.js` enforces).
- No file under `.claude/` contains `Amil`, `amil-`, `/amil`, `dev-browser`, `MultiEdit`, `Task tool`, `jq -r` (`tests/no-stale-terms.test.js` enforces).
- No secrets anywhere; the scanner runs on the repo itself (`tests/self-scan.test.js`).
- `block` level only on PreToolUse/Stop; PostToolUse guards are downgraded to `warn`.
- Notifications off by default; Telegram token/chat IDs only from env `ASEL_TELEGRAM_BOT_TOKEN` / `ASEL_TELEGRAM_CHAT_IDS`.
- Amil source for porting: `AMIL_SRC=E:/CORPORATE/Cvs/.claude/skills/amil`, sibling utility skills at `E:/CORPORATE/Cvs/.claude/skills/amil-*`, current rules at `E:/CORPORATE/Cvs/.claude/rules`.
- Repo root: `E:/CORPORATE/Cvs/asel`. All commands below run from the repo root. Commit after every task with Conventional Commits and the footer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Placeholders rendered by the installer: `{{agents.<role>.model}}`, `{{agents.<role>.effort}}`, `{{rules.<key>[,<key>]}}` (JSON array), `{{paths.<key>}}` (JSON array of one), `{{hookRoot}}`, `{{aselRoot}}`, `{{playwrightPrefix}}`.

---

## File map

| Path | Responsibility |
|---|---|
| `package.json`, `.gitignore`, `.env.example` | Repo scaffolding, test runner, env docs |
| `asel.config.json` | Config template generated from `hooks/lib/config.js` DEFAULTS |
| `.claude/hooks/lib/input.js` | Parse hook stdin JSON into a flat object |
| `.claude/hooks/lib/exit.js` | `finish(level, message)` → stderr + exit code |
| `.claude/hooks/lib/session.js` | Read `## Asel Session` block from CLAUDE.md |
| `.claude/hooks/lib/config.js` | DEFAULTS, `loadConfig(cwd)`, `guard(config, name, event)` |
| `.claude/hooks/lib/glob.js` | `globToRegExp(pattern)` for skip lists |
| `.claude/hooks/lib/routemap.js` | `parseRoutemap(text)`, `inProgressPhase`, `progress` |
| `.claude/hooks/lib/evidence.js` | `findStoryFile`, `checkStoryEvidence`, `findGateReport` |
| `.claude/hooks/lib/notify.js` | `sendTelegram(config, message)` |
| `.claude/hooks/lib/render.js` | `renderPlaceholders(text, ctx)` used by installer |
| `.claude/hooks/notify-cli.js` | CLI wrapper: `node notify-cli.js "message"` for LLM-sent notifications |
| `.claude/hooks/quality-scan.js` | PreToolUse Bash guard on `git commit` |
| `.claude/hooks/gate-guard.js` | PreToolUse Bash guard on `git commit` |
| `.claude/hooks/story-done-guard.js` | PreToolUse Edit/Write guard on ROUTEMAP |
| `.claude/hooks/setup-guard.js` | PreToolUse Edit/Write guard on ROUTEMAP |
| `.claude/hooks/phase-gate-guard.js` | PostToolUse Edit/Write warning on ROUTEMAP |
| `.claude/hooks/skill-guard.js` | PreToolUse Skill guard |
| `.claude/hooks/notify-hook.js` | PostToolUse Edit/Write notifier on ROUTEMAP |
| `.claude/hooks/stop-check.js` | Stop warning |
| `install.js` | CLI: `--project <dir>` / `--global` / `--check`, `--hooks=skill|always`, `--playwright-prefix` |
| `scripts/port-from-amil.js` | One-shot port of Amil markdown with renames and term fixes |
| `scripts/write-config-template.js` | Regenerates `asel.config.json` from DEFAULTS |
| `.claude/agents/asel-*.md` | 19 subagent definitions |
| `.claude/rules/*.md` | 11 rules with `paths:` placeholders |
| `.claude/skills/asel/**` | Orchestrator, phases, templates, references |
| `.claude/skills/asel-{help,setup,checkup,commit,changelog,deploy,codex-review}/` | User-only utility skills |
| `tests/**` | `node --test` suites and fixtures |

---

### Task 1: Repository scaffold and repo-wide guard tests

**Files:**
- Create: `package.json`, `.gitignore`, `.env.example`, `README.md`
- Create: `tests/line-limit.test.js`, `tests/no-stale-terms.test.js`, `tests/helpers/walk.js`

**Interfaces:**
- Produces: `walk(dir, filter)` → `string[]` absolute file paths (used by every later test).

- [ ] **Step 1: Write scaffold files**

`package.json`:
```json
{
  "name": "asel",
  "version": "0.1.0",
  "description": "Asel — configurable project lifecycle orchestrator for Claude Code",
  "private": true,
  "type": "commonjs",
  "engines": { "node": ">=18" },
  "scripts": {
    "test": "node --test tests/",
    "config:template": "node scripts/write-config-template.js",
    "install:project": "node install.js --project",
    "install:global": "node install.js --global",
    "check": "node install.js --check --project"
  }
}
```

`.gitignore`:
```
node_modules/
.env
.asel-notify-state
tmp/
```

`.env.example`:
```
# Telegram notifications (only read when notifications.telegram.enabled = true in asel.config.json)
ASEL_TELEGRAM_BOT_TOKEN=your-bot-token-here
ASEL_TELEGRAM_CHAT_IDS=123456789,987654321
```

`README.md` (initial, extended in Task 19):
```markdown
# Asel

Configurable project lifecycle orchestrator for Claude Code. Successor to Amil.

`.claude/` in this repo is the **source tree**; it contains `{{placeholders}}` and is
rendered into a project by `node install.js --project <dir>`. Do not use it unrendered.

See `docs/superpowers/specs/2026-09-16-asel-design.md`.
```

- [ ] **Step 2: Write the walker helper**

`tests/helpers/walk.js`:
```js
'use strict';
const fs = require('fs');
const path = require('path');

function walk(dir, filter = () => true, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      walk(full, filter, out);
    } else if (filter(full)) {
      out.push(full);
    }
  }
  return out;
}

module.exports = { walk, ROOT: path.resolve(__dirname, '..', '..') };
```

- [ ] **Step 3: Write the two repo-wide tests**

`tests/line-limit.test.js`:
```js
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
```

`tests/no-stale-terms.test.js`:
```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { walk, ROOT } = require('./helpers/walk');

const FORBIDDEN = ['Amil', 'amil-', '/amil', 'dev-browser', 'MultiEdit', 'Task tool', 'jq -r'];

test('no stale Amil-era terms under .claude/', () => {
  const files = walk(path.join(ROOT, '.claude'), (f) => /\.(md|js|sh|json)$/.test(f));
  const hits = [];
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    for (const term of FORBIDDEN) {
      if (text.includes(term)) hits.push(`${path.relative(ROOT, f)}: "${term}"`);
    }
  }
  assert.deepStrictEqual(hits, []);
});
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: both tests PASS (no `.claude/` files yet).

- [ ] **Step 5: Commit**

```bash
git add package.json .gitignore .env.example README.md tests/
git commit -m "chore: scaffold asel repo with repo-wide guard tests"
```

---

### Task 2: Hook input, exit and session helpers

**Files:**
- Create: `.claude/hooks/lib/input.js`, `.claude/hooks/lib/exit.js`, `.claude/hooks/lib/session.js`
- Test: `tests/lib-input.test.js`, `tests/lib-exit.test.js`, `tests/lib-session.test.js`

**Interfaces:**
- Produces: `parseInput(raw: string) → {event, tool, cwd, command, filePath, oldString, newString, content, skill, raw}`; `readInput()` reads stdin then calls `parseInput`.
- Produces: `finish(level: 'block'|'warn', message: string, io?) → never` (exit 2 for block with message, else exit 0).
- Produces: `readSession(cwd, claudeMdRel = 'CLAUDE.md') → {story, step, mode}` (empty strings when absent; `—`/`-` normalised to `''`).

- [ ] **Step 1: Write failing tests**

`tests/lib-input.test.js`:
```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { parseInput } = require('../.claude/hooks/lib/input');

test('parseInput flattens Claude Code hook JSON', () => {
  const raw = JSON.stringify({
    hook_event_name: 'PreToolUse', tool_name: 'Edit', cwd: '/p',
    tool_input: { file_path: 'docs/ROUTEMAP.md', old_string: 'a', new_string: 'b' },
  });
  const i = parseInput(raw);
  assert.strictEqual(i.event, 'PreToolUse');
  assert.strictEqual(i.tool, 'Edit');
  assert.strictEqual(i.cwd, '/p');
  assert.strictEqual(i.filePath, 'docs/ROUTEMAP.md');
  assert.strictEqual(i.oldString, 'a');
  assert.strictEqual(i.newString, 'b');
});

test('parseInput tolerates filePath camelCase, skill name and garbage', () => {
  assert.strictEqual(parseInput(JSON.stringify({ tool_input: { filePath: 'x' } })).filePath, 'x');
  assert.strictEqual(parseInput(JSON.stringify({ tool_input: { skill: 'asel-help' } })).skill, 'asel-help');
  assert.strictEqual(parseInput('not json').command, '');
  assert.strictEqual(parseInput('').cwd, process.cwd());
});
```

`tests/lib-exit.test.js`:
```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { finish } = require('../.claude/hooks/lib/exit');

function fake() {
  const io = { out: '', code: null };
  io.stderr = { write: (s) => { io.out += s; } };
  io.exit = (c) => { io.code = c; };
  return io;
}

test('finish blocks with exit 2 and message on stderr', () => {
  const io = fake();
  finish('block', 'BLOCKED: x', io);
  assert.strictEqual(io.code, 2);
  assert.strictEqual(io.out, 'BLOCKED: x\n');
});

test('finish warns with exit 0', () => {
  const io = fake();
  finish('warn', 'careful', io);
  assert.strictEqual(io.code, 0);
  assert.strictEqual(io.out, 'careful\n');
});

test('finish with empty message exits 0 silently', () => {
  const io = fake();
  finish('block', '', io);
  assert.strictEqual(io.code, 0);
  assert.strictEqual(io.out, '');
});
```

`tests/lib-session.test.js`:
```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { readSession } = require('../.claude/hooks/lib/session');

function tmpWith(text) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'asel-'));
  fs.writeFileSync(path.join(d, 'CLAUDE.md'), text);
  return d;
}

test('readSession parses story/step/mode', () => {
  const d = tmpWith('# P\n\n## Asel Session\n- Story: STORY-003\n- Step: Dev\n- Mode: Normal\n');
  assert.deepStrictEqual(readSession(d), { story: 'STORY-003', step: 'Dev', mode: 'Normal' });
});

test('readSession normalises dashes and missing file', () => {
  const d = tmpWith('## Asel Session\n- Story: —\n- Step: -\n');
  assert.deepStrictEqual(readSession(d), { story: '', step: '', mode: '' });
  assert.deepStrictEqual(readSession(path.join(d, 'nope')), { story: '', step: '', mode: '' });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/lib-input.test.js tests/lib-exit.test.js tests/lib-session.test.js`
Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Implement**

`.claude/hooks/lib/input.js`:
```js
'use strict';
const fs = require('fs');

function parseInput(raw) {
  let json = {};
  try { json = JSON.parse(raw || '{}'); } catch { json = {}; }
  if (!json || typeof json !== 'object') json = {};
  const ti = json.tool_input && typeof json.tool_input === 'object' ? json.tool_input : {};
  return {
    event: json.hook_event_name || '',
    tool: json.tool_name || '',
    cwd: json.cwd || process.cwd(),
    command: typeof ti.command === 'string' ? ti.command : '',
    filePath: ti.file_path || ti.filePath || '',
    oldString: ti.old_string || '',
    newString: ti.new_string || '',
    content: ti.content || '',
    skill: ti.skill || ti.name || '',
    raw: json,
  };
}

function readInput() {
  let raw = '';
  try { raw = fs.readFileSync(0, 'utf8'); } catch { raw = ''; }
  return parseInput(raw);
}

module.exports = { parseInput, readInput };
```

`.claude/hooks/lib/exit.js`:
```js
'use strict';

function finish(level, message, io = {}) {
  const stderr = io.stderr || process.stderr;
  const exit = io.exit || process.exit;
  if (!message) return exit(0);
  stderr.write(message.endsWith('\n') ? message : message + '\n');
  return exit(level === 'block' ? 2 : 0);
}

module.exports = { finish };
```

`.claude/hooks/lib/session.js`:
```js
'use strict';
const fs = require('fs');
const path = require('path');

const EMPTY = { story: '', step: '', mode: '' };

function norm(v) {
  const t = (v || '').trim();
  return t === '—' || t === '-' ? '' : t;
}

function readSession(cwd, claudeMdRel = 'CLAUDE.md') {
  const file = path.join(cwd, claudeMdRel);
  if (!fs.existsSync(file)) return { ...EMPTY };
  const text = fs.readFileSync(file, 'utf8');
  const m = text.match(/## Asel Session([\s\S]*?)(?:\n## |$)/);
  if (!m) return { ...EMPTY };
  const block = m[1];
  const pick = (key) => {
    const r = block.match(new RegExp(`^- ${key}:\\s*(.*)$`, 'mi'));
    return norm(r ? r[1] : '');
  };
  return { story: pick('Story'), step: pick('Step'), mode: pick('Mode') };
}

module.exports = { readSession };
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all PASS (line-limit and stale-terms still pass).

- [ ] **Step 5: Commit**

```bash
git add .claude/hooks/lib tests/
git commit -m "feat(hooks): add input, exit and session helpers"
```

---

### Task 3: Config loader, guard levels and config template

**Files:**
- Create: `.claude/hooks/lib/config.js`, `.claude/hooks/lib/glob.js`, `scripts/write-config-template.js`, `asel.config.json`
- Test: `tests/lib-config.test.js`, `tests/lib-glob.test.js`, `tests/config-template.test.js`

**Interfaces:**
- Produces: `DEFAULTS` (object, exact shape of spec §3.1), `loadConfig(cwd, home?) → {config, source}`, `guard(config, name, event) → {enabled, level, note, ...guardFields}`, `deepMerge(base, over)`.
- Produces: `globToRegExp(pattern) → RegExp`, `matchesAny(file, patterns) → boolean` (`**` any depth, `*` no slash, `?` one char; forward-slash paths).

- [ ] **Step 1: Write failing tests**

`tests/lib-glob.test.js`:
```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { globToRegExp, matchesAny } = require('../.claude/hooks/lib/glob');

test('globToRegExp handles ** and *', () => {
  assert.ok(globToRegExp('**/__tests__/**').test('src/a/__tests__/b.ts'));
  assert.ok(globToRegExp('**/*.test.*').test('src/x.test.ts'));
  assert.ok(!globToRegExp('docs/**').test('src/docs.ts'));
  assert.ok(globToRegExp('backend/**').test('backend/x/y.java'));
  assert.ok(globToRegExp('Makefile').test('Makefile'));
});

test('matchesAny returns true when any pattern matches', () => {
  assert.ok(matchesAny('docs/a.md', ['src/**', 'docs/**']));
  assert.ok(!matchesAny('lib/a.md', ['src/**', 'docs/**']));
});
```

`tests/lib-config.test.js`:
```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { DEFAULTS, loadConfig, guard, deepMerge } = require('../.claude/hooks/lib/config');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'asel-'));

test('DEFAULTS has the spec shape', () => {
  assert.strictEqual(DEFAULTS.paths.routemap, 'docs/ROUTEMAP.md');
  assert.strictEqual(DEFAULTS.workflow.autopilot, false);
  assert.strictEqual(DEFAULTS.notifications.telegram.enabled, false);
  assert.strictEqual(Object.keys(DEFAULTS.agents).length, 19);
  assert.deepStrictEqual(Object.keys(DEFAULTS.guards).sort(), [
    'gateGuard', 'phaseGateGuard', 'qualityScan', 'setupGuard', 'skillGuard', 'stopCheck', 'storyDoneGuard',
  ]);
});

test('loadConfig prefers project, then home, then defaults; merges deeply', () => {
  const home = tmp(); const proj = tmp();
  assert.strictEqual(loadConfig(proj, home).source, 'defaults');
  fs.mkdirSync(path.join(home, '.claude'));
  fs.writeFileSync(path.join(home, '.claude', 'asel.config.json'), JSON.stringify({ language: { conversation: 'en' } }));
  let r = loadConfig(proj, home);
  assert.strictEqual(r.source, path.join(home, '.claude', 'asel.config.json'));
  assert.strictEqual(r.config.language.conversation, 'en');
  assert.strictEqual(r.config.language.documents, 'en');
  fs.writeFileSync(path.join(proj, 'asel.config.json'), JSON.stringify({ guards: { qualityScan: { enabled: false } } }));
  r = loadConfig(proj, home);
  assert.strictEqual(r.source, path.join(proj, 'asel.config.json'));
  assert.strictEqual(r.config.guards.qualityScan.enabled, false);
  assert.strictEqual(r.config.guards.qualityScan.level, 'block');
});

test('deepMerge replaces arrays and merges objects', () => {
  assert.deepStrictEqual(deepMerge({ a: [1, 2], b: { c: 1, d: 2 } }, { a: [3], b: { d: 3 } }), { a: [3], b: { c: 1, d: 3 } });
});

test('guard downgrades block to warn on PostToolUse and reports note', () => {
  assert.strictEqual(guard(DEFAULTS, 'phaseGateGuard', 'PostToolUse').level, 'warn');
  const forced = deepMerge(DEFAULTS, { guards: { phaseGateGuard: { level: 'block' } } });
  const g2 = guard(forced, 'phaseGateGuard', 'PostToolUse');
  assert.strictEqual(g2.level, 'warn');
  assert.match(g2.note, /cannot block on PostToolUse/);
  assert.strictEqual(guard(DEFAULTS, 'storyDoneGuard', 'PreToolUse').level, 'block');
  assert.strictEqual(guard(DEFAULTS, 'nope', 'PreToolUse').enabled, false);
});
```

`tests/config-template.test.js`:
```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/lib-glob.test.js tests/lib-config.test.js tests/config-template.test.js`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement glob**

`.claude/hooks/lib/glob.js`:
```js
'use strict';

function globToRegExp(pattern) {
  let re = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '*' && pattern[i + 1] === '*') {
      i++;
      if (pattern[i + 1] === '/') { i++; re += '(?:.*/)?'; } else { re += '.*'; }
    } else if (c === '*') re += '[^/]*';
    else if (c === '?') re += '.';
    else if ('.+^$(){}[]|\\'.includes(c)) re += '\\' + c;
    else re += c;
  }
  return new RegExp('^' + re + '$');
}

function matchesAny(file, patterns = []) {
  const f = file.replace(/\\/g, '/');
  return patterns.some((p) => globToRegExp(p).test(f));
}

module.exports = { globToRegExp, matchesAny };
```

- [ ] **Step 4: Implement config**

`.claude/hooks/lib/config.js` (`DEFAULTS` is spec §3.1 with `rules.infra` extended by root config files):
```js
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const agent = (model, effort, extra = {}) => ({ model, effort, ...extra });

const DEFAULTS = {
  language: { conversation: 'tr', documents: 'en' },
  paths: {
    docs: 'docs', routemap: 'docs/ROUTEMAP.md', stories: 'docs/stories',
    reports: 'docs/reports', usertest: 'docs/USERTEST.md', claudeMd: 'CLAUDE.md',
  },
  workflow: {
    autopilot: false, reviewBeforeCommit: true, phaseGateRequired: true,
    maxRedispatch: 3, coAuthor: 'Claude <noreply@anthropic.com>',
  },
  agents: {
    planner: agent('opus', 'xhigh'),
    developer: agent('sonnet', 'high', { escalationModel: 'opus' }),
    'gate-lead': agent('opus', 'high'),
    'gate-scout-analysis': agent('sonnet', 'medium'),
    'gate-scout-testbuild': agent('sonnet', 'medium'),
    'gate-scout-ui': agent('sonnet', 'medium'),
    reviewer: agent('sonnet', 'medium'),
    'phase-gate': agent('opus', 'high'),
    devops: agent('opus', 'high'),
    'setup-verifier': agent('opus', 'medium'),
    'deploy-engineer': agent('sonnet', 'medium'),
    'seed-generator': agent('opus', 'medium'),
    'e2e-tester': agent('opus', 'high'),
    'test-hardener': agent('opus', 'high'),
    'perf-optimizer': agent('opus', 'high'),
    'ui-polisher': agent('opus', 'high'),
    'acceptance-tester': agent('opus', 'high'),
    'compliance-auditor': agent('opus', 'xhigh'),
    'legacy-gate': agent('opus', 'high'),
  },
  guards: {
    qualityScan: { enabled: true, level: 'block', skipPaths: ['**/__tests__/**', '**/*.test.*', '**/fixtures/**', 'docs/**'] },
    gateGuard: { enabled: true, level: 'block' },
    storyDoneGuard: { enabled: true, level: 'block' },
    setupGuard: { enabled: true, level: 'block' },
    phaseGateGuard: { enabled: true, level: 'warn' },
    skillGuard: {
      enabled: true, level: 'block',
      userOnlySkills: ['asel-setup', 'asel-help', 'asel-changelog', 'asel-commit', 'asel-checkup', 'asel-codex-review'],
    },
    stopCheck: { enabled: true, level: 'warn' },
  },
  notifications: {
    telegram: { enabled: false, tokenEnv: 'ASEL_TELEGRAM_BOT_TOKEN', chatIdsEnv: 'ASEL_TELEGRAM_CHAT_IDS', timeoutMs: 5000 },
  },
  rules: {
    backend: ['backend/**', 'sdk/**', '**/*.java', '**/*.go', '**/*.py'],
    frontend: ['frontend/**', '**/*.tsx', '**/*.jsx'],
    infra: ['infra/**', 'docker-compose*.yml', 'Makefile', '.env*', 'package.json'],
  },
};

const POST_EVENTS = new Set(['PostToolUse', 'PostToolUseFailure', 'PermissionRequest']);

function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }

function deepMerge(base, over) {
  if (!isObj(base) || !isObj(over)) return over === undefined ? base : over;
  const out = { ...base };
  for (const k of Object.keys(over)) out[k] = isObj(base[k]) && isObj(over[k]) ? deepMerge(base[k], over[k]) : over[k];
  return out;
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; }
}

function loadConfig(cwd, home = os.homedir()) {
  const candidates = [path.join(cwd, 'asel.config.json'), path.join(home, '.claude', 'asel.config.json')];
  for (const file of candidates) {
    if (fs.existsSync(file)) return { config: deepMerge(DEFAULTS, readJson(file)), source: file };
  }
  return { config: deepMerge(DEFAULTS, {}), source: 'defaults' };
}

function guard(config, name, event) {
  const g = (config.guards && config.guards[name]) || null;
  if (!g) return { enabled: false, level: 'warn', note: '' };
  let level = g.level === 'block' ? 'block' : 'warn';
  let note = '';
  if (level === 'block' && POST_EVENTS.has(event)) {
    level = 'warn';
    note = `asel: guard "${name}" cannot block on ${event}; downgraded to warn`;
  }
  return { ...g, enabled: g.enabled !== false, level, note };
}

module.exports = { DEFAULTS, deepMerge, loadConfig, guard };
```

`scripts/write-config-template.js`:
```js
'use strict';
const fs = require('fs');
const path = require('path');
const { DEFAULTS } = require('../.claude/hooks/lib/config');
const out = path.join(__dirname, '..', 'asel.config.json');
fs.writeFileSync(out, JSON.stringify(DEFAULTS, null, 2) + '\n');
console.log('wrote', out);
```

- [ ] **Step 5: Generate template, run tests**

Run: `npm run config:template && npm test`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add .claude/hooks/lib scripts asel.config.json tests/
git commit -m "feat(config): add defaults, loader, guard levels and config template"
```

---

### Task 4: ROUTEMAP parser

**Files:**
- Create: `.claude/hooks/lib/routemap.js`, `tests/fixtures/routemap-basic.md`
- Test: `tests/lib-routemap.test.js`

**Interfaces:**
- Produces: `parseRoutemap(text) → {project, macroPhase, planning:[{step, done}], phases:[{number, name, status, stories:[{id, title, status, step, done, inProgress, escalated, failed}]}], e2e:[{id, done}], stories:[all rows]}`, `inProgressPhase(rm) → phase|null`, `progress(rm) → {total, done, pct}`, `doneIdsIn(text) → string[]`, `STORY_ID` regex.

- [ ] **Step 1: Write fixture and failing test**

`tests/fixtures/routemap-basic.md`:
```markdown
# Project Roadmap: Demo App

> Last updated: 2026-09-16
> Current phase: DEVELOPMENT
> Overall progress: 33%

---

## Planning Phase

| Step | Name | Status | Completed |
|------|------|--------|-----------|
| 1 | Discovery | [x] DONE | 2026-09-01 |
| 2 | Gap Analysis | [x] DONE | 2026-09-01 |
| 9 | Development Readiness Audit | [x] DONE | 2026-09-02 |

---

## Development Phase [IN PROGRESS]

### Phase 1: Foundation [DONE]

| # | Story | Effort | Status | Step | Dependencies | Completed |
|---|-------|--------|--------|------|-------------|-----------|
| STORY-001 | Project setup | S | [x] DONE (2026-09-03) | — | — | 2026-09-03 |
| STORY-002 | Auth | M | [x] DONE (2026-09-04) | — | STORY-001 | 2026-09-04 |

### Phase 2: Core [IN PROGRESS]

| # | Story | Effort | Status | Step | Dependencies | Completed |
|---|-------|--------|--------|------|-------------|-----------|
| STORY-003 | Users CRUD | M | [~] IN PROGRESS | Dev | STORY-002 | — |
| STORY-004 | Roles | M | [ ] PENDING | Escalated | STORY-003 | — |
| STORY-005 | Audit log | S | [ ] PENDING | Failed | — | — |

---

## E2E & Polish Phase [NOT STARTED]

| Step | Name | Status | Completed |
|------|------|--------|-----------|
| E0 | Seed Data | [x] DONE | 2026-09-05 |
| E1 | E2E Browser Testing | [ ] PENDING | — |
```

`tests/lib-routemap.test.js`:
```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { parseRoutemap, inProgressPhase, progress, doneIdsIn } = require('../.claude/hooks/lib/routemap');

const text = fs.readFileSync(path.join(__dirname, 'fixtures', 'routemap-basic.md'), 'utf8');

test('parseRoutemap extracts header, phases and stories', () => {
  const rm = parseRoutemap(text);
  assert.strictEqual(rm.project, 'Demo App');
  assert.strictEqual(rm.macroPhase, 'DEVELOPMENT');
  assert.strictEqual(rm.planning.length, 3);
  assert.strictEqual(rm.phases.length, 2);
  assert.deepStrictEqual(rm.phases.map((p) => p.status), ['DONE', 'IN PROGRESS']);
  const s3 = rm.stories.find((s) => s.id === 'STORY-003');
  assert.strictEqual(s3.title, 'Users CRUD');
  assert.strictEqual(s3.inProgress, true);
  assert.strictEqual(s3.step, 'Dev');
  assert.strictEqual(rm.stories.find((s) => s.id === 'STORY-004').escalated, true);
  assert.strictEqual(rm.stories.find((s) => s.id === 'STORY-005').failed, true);
  assert.deepStrictEqual(rm.e2e, [{ id: 'E0', done: true }, { id: 'E1', done: false }]);
});

test('inProgressPhase and progress', () => {
  const rm = parseRoutemap(text);
  assert.strictEqual(inProgressPhase(rm).number, 2);
  assert.deepStrictEqual(progress(rm), { total: 5, done: 2, pct: 40 });
});

test('doneIdsIn finds ids only on DONE lines', () => {
  assert.deepStrictEqual(
    doneIdsIn('| STORY-007 | x | S | [x] DONE | — |\n| STORY-008 | y | S | [ ] PENDING | — | STORY-007 |'),
    ['STORY-007'],
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/lib-routemap.test.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`.claude/hooks/lib/routemap.js`:
```js
'use strict';

const STORY_ID = /STORY-\d+(?:\.\d+)*[a-z]?/;

function splitRow(line) {
  return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
}

function parseRoutemap(text) {
  const rm = { project: 'Project', macroPhase: '', planning: [], phases: [], e2e: [], stories: [] };
  let section = '';
  let phase = null;
  for (const line of text.split(/\r?\n/)) {
    let m;
    if ((m = line.match(/^# Project Roadmap:\s*(.+?)\s*$/))) { rm.project = m[1]; continue; }
    if ((m = line.match(/^> Current phase:\s*([A-Za-z_]+)/))) { rm.macroPhase = m[1]; continue; }
    if ((m = line.match(/^## (.+?)(?:\s*\[[^\]]*\])?\s*$/))) { section = m[1].trim(); phase = null; continue; }
    if ((m = line.match(/^### Phase (\d+):\s*(.*?)\s*(?:\[([^\]]+)\])?\s*$/))) {
      phase = { number: Number(m[1]), name: m[2].trim(), status: (m[3] || '').trim(), stories: [] };
      rm.phases.push(phase);
      continue;
    }
    if ((m = line.match(new RegExp(`^\\|\\s*(${STORY_ID.source})\\s*\\|`)))) {
      const c = splitRow(line);
      const row = { id: m[1], title: c[1] || '', status: c[3] || '', step: c[4] || '' };
      row.done = /\[x\]/.test(row.status);
      row.inProgress = /\[~\]/.test(row.status);
      row.escalated = /Escalated/i.test(row.step);
      row.failed = /Failed/i.test(row.step);
      (phase ? phase.stories : rm.stories).push(row);
      continue;
    }
    if (/^E2E/i.test(section) && (m = line.match(/^\|\s*(E\d+)\s*\|/))) {
      const c = splitRow(line);
      rm.e2e.push({ id: m[1], done: /\[x\]/.test(c[2] || '') });
      continue;
    }
    if (/^Planning/i.test(section) && (m = line.match(/^\|\s*(\d+(?:\.\d+)?)\s*\|/))) {
      const c = splitRow(line);
      rm.planning.push({ step: m[1], done: /\[x\]/.test(c[2] || '') });
    }
  }
  rm.stories = rm.phases.flatMap((p) => p.stories).concat(rm.stories);
  return rm;
}

function inProgressPhase(rm) {
  return rm.phases.find((p) => /IN PROGRESS/i.test(p.status)) || null;
}

function progress(rm) {
  const total = rm.stories.length;
  const done = rm.stories.filter((s) => s.done).length;
  return { total, done, pct: total ? Math.floor((done * 100) / total) : 0 };
}

function doneIdsIn(text) {
  const ids = new Set();
  for (const line of text.split(/\r?\n/)) {
    if (!/\[x\].*DONE/.test(line)) continue;
    const m = line.match(STORY_ID);
    if (m) ids.add(m[0]);
  }
  return [...ids].sort();
}

module.exports = { parseRoutemap, inProgressPhase, progress, doneIdsIn, STORY_ID };
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .claude/hooks/lib/routemap.js tests/
git commit -m "feat(hooks): add ROUTEMAP parser"
```

---

### Task 5: Evidence locator

**Files:**
- Create: `.claude/hooks/lib/evidence.js`
- Test: `tests/lib-evidence.test.js`

**Interfaces:**
- Consumes: `config.paths` from Task 3.
- Produces: `findStoryFile(cwd, paths, storyId) → string|null`; `checkStoryEvidence(cwd, paths, storyId) → {storyFile, missing: string[]}`; `findGateReport(cwd, paths, storyId) → string|null`; `findPhaseGateReport(cwd, paths, phaseNumber) → string|null`; `listFiles(dir) → string[]` (recursive, forward-slash relative paths).

- [ ] **Step 1: Write failing test**

`tests/lib-evidence.test.js`:
```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { DEFAULTS } = require('../.claude/hooks/lib/config');
const { checkStoryEvidence, findGateReport, findPhaseGateReport } = require('../.claude/hooks/lib/evidence');

function project() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'asel-'));
  const p1 = path.join(d, 'docs', 'stories', 'phase-1');
  fs.mkdirSync(p1, { recursive: true });
  fs.mkdirSync(path.join(d, 'docs', 'reports'), { recursive: true });
  return { d, p1 };
}
const w = (f, t) => fs.writeFileSync(f, t);

test('reports every missing artifact', () => {
  const { d, p1 } = project();
  w(path.join(p1, 'STORY-001-setup.md'), '# STORY-001\n');
  const r = checkStoryEvidence(d, DEFAULTS.paths, 'STORY-001');
  assert.ok(r.storyFile.endsWith('STORY-001-setup.md'));
  assert.deepStrictEqual(r.missing.map((m) => m.split(':')[0]), ['plan', 'gate', 'review', 'step-log']);
});

test('passes with full evidence and flags unresolved findings / ui marker', () => {
  const { d, p1 } = project();
  w(path.join(p1, 'STORY-002-auth.md'), '# STORY-002\n<!-- ui-story: true -->\n');
  w(path.join(p1, 'STORY-002-plan.md'), 'plan');
  w(path.join(p1, 'STORY-002-gate.md'), 'gate');
  w(path.join(p1, 'STORY-002-review.md'), '| F1 | x | OPEN |\n');
  w(path.join(p1, 'STORY-002-step-log.txt'), ['STEP_1 PLAN: EXECUTED', 'STEP_2 DEV: EXECUTED', 'STEP_3 GATE: EXECUTED', 'STEP_4 REVIEW: EXECUTED', 'STEP_5 COMMIT: EXECUTED'].join('\n'));
  w(path.join(d, 'docs', 'USERTEST.md'), '## STORY-001: x\n');
  let r = checkStoryEvidence(d, DEFAULTS.paths, 'STORY-002');
  assert.deepStrictEqual(r.missing.map((m) => m.split(':')[0]).sort(), ['review-unresolved', 'ui-story', 'usertest']);
  w(path.join(p1, 'STORY-002-review.md'), '| F1 | x | FIXED |\n');
  fs.appendFileSync(path.join(p1, 'STORY-002-step-log.txt'), '\nfrontend-design INVOKED');
  fs.appendFileSync(path.join(d, 'docs', 'USERTEST.md'), '## STORY-002: y\n');
  r = checkStoryEvidence(d, DEFAULTS.paths, 'STORY-002');
  assert.deepStrictEqual(r.missing, []);
});

test('unknown story is not blocked (no story file)', () => {
  const { d } = project();
  assert.deepStrictEqual(checkStoryEvidence(d, DEFAULTS.paths, 'STORY-999'), { storyFile: null, missing: [] });
});

test('gate report finders', () => {
  const { d, p1 } = project();
  assert.strictEqual(findGateReport(d, DEFAULTS.paths, 'STORY-003'), null);
  w(path.join(p1, 'STORY-003-gate.md'), 'g');
  assert.ok(findGateReport(d, DEFAULTS.paths, 'STORY-003').endsWith('STORY-003-gate.md'));
  w(path.join(d, 'docs', 'reports', 'BUG-004-gate.md'), 'g');
  assert.ok(findGateReport(d, DEFAULTS.paths, 'BUG-004'));
  assert.strictEqual(findPhaseGateReport(d, DEFAULTS.paths, 2), null);
  w(path.join(d, 'docs', 'reports', 'phase-2-gate.md'), 'g');
  assert.ok(findPhaseGateReport(d, DEFAULTS.paths, 2));
  assert.strictEqual(findPhaseGateReport(d, DEFAULTS.paths, 12), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/lib-evidence.test.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`.claude/hooks/lib/evidence.js`:
```js
'use strict';
const fs = require('fs');
const path = require('path');

const CORE_STEPS = ['PLAN', 'DEV', 'GATE', 'REVIEW', 'COMMIT'];
const ARTIFACT_SUFFIX = /-(plan|gate|review|step-log)\.(md|txt)$/;

function listFiles(dir, out = [], base = dir) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) listFiles(full, out, base);
    else out.push(full);
  }
  return out;
}

function exists(f) { try { return fs.statSync(f).size > 0; } catch { return false; } }
function read(f) { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } }

function findStoryFile(cwd, paths, storyId) {
  const root = path.join(cwd, paths.stories);
  const hit = listFiles(root).find((f) => {
    const b = path.basename(f);
    return b.startsWith(storyId + '-') && b.endsWith('.md') && !ARTIFACT_SUFFIX.test(b);
  });
  return hit || null;
}

function findGateReport(cwd, paths, storyId) {
  const dirs = [path.join(cwd, paths.stories), path.join(cwd, paths.reports), path.join(cwd, paths.docs)];
  for (const d of dirs) {
    const hit = listFiles(d).find((f) => path.basename(f).startsWith(storyId) && /gate/i.test(path.basename(f)));
    if (hit) return hit;
  }
  return null;
}

function findPhaseGateReport(cwd, paths, phaseNumber) {
  const re = new RegExp(`^phase-${phaseNumber}-gate[^/]*\\.md$`, 'i');
  return listFiles(path.join(cwd, paths.reports)).find((f) => re.test(path.basename(f))) || null;
}

function checkStoryEvidence(cwd, paths, storyId) {
  const storyFile = findStoryFile(cwd, paths, storyId);
  if (!storyFile) return { storyFile: null, missing: [] };
  const dir = path.dirname(storyFile);
  const rel = (f) => path.relative(cwd, f).replace(/\\/g, '/');
  const plan = path.join(dir, `${storyId}-plan.md`);
  const gate = path.join(dir, `${storyId}-gate.md`);
  const review = path.join(dir, `${storyId}-review.md`);
  const stepLog = path.join(dir, `${storyId}-step-log.txt`);
  const missing = [];
  if (!exists(plan)) missing.push(`plan: ${rel(plan)} missing`);
  if (!exists(gate)) missing.push(`gate: ${rel(gate)} missing`);
  if (!exists(review)) missing.push(`review: ${rel(review)} missing`);
  if (!exists(stepLog)) missing.push(`step-log: ${rel(stepLog)} missing`);

  const usertest = path.join(cwd, paths.usertest);
  if (fs.existsSync(usertest) && !new RegExp(`^## ${storyId}:`, 'm').test(read(usertest))) {
    missing.push(`usertest: ${rel(usertest)} has no "## ${storyId}:" section`);
  }
  if (exists(stepLog)) {
    const log = read(stepLog);
    for (const s of CORE_STEPS) {
      if (!new RegExp(`STEP_[0-9.]*[ _]${s}[^A-Za-z].*EXECUTED`).test(log)) missing.push(`step-log-step: ${s} EXECUTED entry missing`);
    }
    if (/<!--\s*ui-story:\s*true\s*-->/.test(read(storyFile)) && !/frontend-design INVOKED/.test(log)) {
      missing.push('ui-story: step-log lacks "frontend-design INVOKED" (mandatory for UI stories)');
    }
  }
  if (exists(review)) {
    const n = (read(review).match(/\|\s*(ESCALATED|OPEN|NEEDS_ATTENTION)\s*\|/g) || []).length;
    if (n > 0) missing.push(`review-unresolved: ${n} unresolved finding(s) in ${rel(review)}`);
  }
  return { storyFile, missing };
}

module.exports = { listFiles, findStoryFile, findGateReport, findPhaseGateReport, checkStoryEvidence, CORE_STEPS };
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .claude/hooks/lib/evidence.js tests/lib-evidence.test.js
git commit -m "feat(hooks): add story evidence locator"
```

---

### Task 6: Telegram notifier and CLI

**Files:**
- Create: `.claude/hooks/lib/notify.js`, `.claude/hooks/notify-cli.js`
- Test: `tests/lib-notify.test.js`

**Interfaces:**
- Produces: `sendTelegram(config, message, {fetchImpl?, env?}) → Promise<{sent: boolean, reason?: string, count?: number}>`.
- Produces CLI: `node .claude/hooks/notify-cli.js "message"` (exit 0 always; used by the telegram-notifications rule for LLM-sent events).

- [ ] **Step 1: Write failing test**

`tests/lib-notify.test.js`:
```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { DEFAULTS, deepMerge } = require('../.claude/hooks/lib/config');
const { sendTelegram } = require('../.claude/hooks/lib/notify');

const enabled = deepMerge(DEFAULTS, { notifications: { telegram: { enabled: true } } });

test('disabled config never calls fetch', async () => {
  let calls = 0;
  const r = await sendTelegram(DEFAULTS, 'hi', { fetchImpl: async () => { calls++; }, env: {} });
  assert.deepStrictEqual(r, { sent: false, reason: 'disabled' });
  assert.strictEqual(calls, 0);
});

test('enabled but missing env is a no-op', async () => {
  const r = await sendTelegram(enabled, 'hi', { fetchImpl: async () => {}, env: {} });
  assert.deepStrictEqual(r, { sent: false, reason: 'missing-env' });
});

test('sends one request per chat id with token from env', async () => {
  const seen = [];
  const env = { ASEL_TELEGRAM_BOT_TOKEN: 'T', ASEL_TELEGRAM_CHAT_IDS: '1, 2' };
  const r = await sendTelegram(enabled, 'hello *w*', { env, fetchImpl: async (url, opts) => { seen.push({ url, body: JSON.parse(opts.body) }); return { ok: true }; } });
  assert.deepStrictEqual(r, { sent: true, count: 2 });
  assert.ok(seen[0].url.includes('/botT/sendMessage'));
  assert.deepStrictEqual(seen.map((s) => s.body.chat_id), ['1', '2']);
  assert.strictEqual(seen[0].body.text, 'hello *w*');
});

test('fetch errors are swallowed', async () => {
  const env = { ASEL_TELEGRAM_BOT_TOKEN: 'T', ASEL_TELEGRAM_CHAT_IDS: '1' };
  const r = await sendTelegram(enabled, 'x', { env, fetchImpl: async () => { throw new Error('net'); } });
  assert.deepStrictEqual(r, { sent: true, count: 1 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/lib-notify.test.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`.claude/hooks/lib/notify.js`:
```js
'use strict';

async function sendTelegram(config, message, opts = {}) {
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  const env = opts.env || process.env;
  const tg = config && config.notifications && config.notifications.telegram;
  if (!tg || !tg.enabled) return { sent: false, reason: 'disabled' };
  const token = env[tg.tokenEnv || 'ASEL_TELEGRAM_BOT_TOKEN'];
  const ids = String(env[tg.chatIdsEnv || 'ASEL_TELEGRAM_CHAT_IDS'] || '').split(/[\s,]+/).filter(Boolean);
  if (!token || ids.length === 0 || typeof fetchImpl !== 'function') return { sent: false, reason: 'missing-env' };
  const timeoutMs = tg.timeoutMs || 5000;
  for (const chatId of ids) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message.replace(/\r/g, ''), parse_mode: 'Markdown' }),
        signal: ctrl.signal,
      });
    } catch { /* never block the workflow on a notification */ } finally { clearTimeout(timer); }
  }
  return { sent: true, count: ids.length };
}

module.exports = { sendTelegram };
```

`.claude/hooks/notify-cli.js`:
```js
#!/usr/bin/env node
'use strict';
const { loadConfig } = require('./lib/config');
const { sendTelegram } = require('./lib/notify');

const message = process.argv.slice(2).join(' ').trim();
if (!message) process.exit(0);
const { config } = loadConfig(process.cwd());
sendTelegram(config, message).then((r) => {
  if (!r.sent) process.stderr.write(`asel notify: not sent (${r.reason})\n`);
  process.exit(0);
});
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .claude/hooks/lib/notify.js .claude/hooks/notify-cli.js tests/lib-notify.test.js
git commit -m "feat(notify): add env-driven Telegram sender and CLI"
```

---

### Task 7: quality-scan hook

**Files:**
- Create: `.claude/hooks/quality-scan.js`, `.claude/hooks/lib/scan-rules.js`
- Test: `tests/quality-scan.test.js`, `tests/self-scan.test.js`, `tests/helpers/run-hook.js`

**Interfaces:**
- Consumes: `parseInput`, `finish`, `loadConfig`, `guard`, `matchesAny`.
- Produces: `scanFiles(files: {rel, text}[], opts: {skipPaths}) → {blockers: string[], warnings: string[]}` in `scan-rules.js`; `formatReport({blockers, warnings}) → string`.
- Produces test helper: `runHook(name, inputObj, {cwd, env}) → {code, stderr, stdout}` (spawns `node .claude/hooks/<name>.js` with JSON on stdin).

- [ ] **Step 1: Write the hook runner helper**

`tests/helpers/run-hook.js`:
```js
'use strict';
const { spawnSync } = require('child_process');
const path = require('path');
const { ROOT } = require('./walk');

function runHook(name, input, opts = {}) {
  const file = path.join(ROOT, '.claude', 'hooks', `${name}.js`);
  const r = spawnSync(process.execPath, [file], {
    input: JSON.stringify(input),
    cwd: opts.cwd || ROOT,
    env: { ...process.env, HOME: opts.home || process.env.HOME, USERPROFILE: opts.home || process.env.USERPROFILE, ...(opts.env || {}) },
    encoding: 'utf8',
  });
  return { code: r.status, stderr: r.stderr || '', stdout: r.stdout || '' };
}

module.exports = { runHook };
```

- [ ] **Step 2: Write failing tests**

`tests/quality-scan.test.js`:
```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const { scanFiles } = require('../.claude/hooks/lib/scan-rules');
const { runHook } = require('./helpers/run-hook');

const SKIP = ['**/__tests__/**', '**/*.test.*'];

test('collects a secret, a SQL injection and a raw <input> from one file in one run', () => {
  const text = [
    "const password = 'hunter2hunter2';",
    'db.query(`SELECT * FROM t WHERE id = ${id}`);',
    '<input value={x} />',
  ].join('\n');
  const r = scanFiles([{ rel: 'src/Form.tsx', text }], { skipPaths: SKIP });
  assert.strictEqual(r.blockers.length, 3, JSON.stringify(r));
  assert.ok(r.blockers.some((b) => /HARDCODED SECRET/.test(b)));
  assert.ok(r.blockers.some((b) => /SQL INJECTION/.test(b)));
  assert.ok(r.blockers.some((b) => /RAW HTML ELEMENT/.test(b)));
});

test('warnings: size, console.log, any, hex colour, inline style, arbitrary px', () => {
  const big = Array.from({ length: 401 }, (_, i) => `// ${i}`).join('\n');
  const r1 = scanFiles([{ rel: 'src/a.ts', text: big }], { skipPaths: SKIP });
  assert.ok(r1.warnings.some((w) => /too large/.test(w)));
  const text = ["console.log('x');", 'const v: any = 1;', "<div style={{ color: '#ff0000' }} className=\"w-[13px]\" />"].join('\n');
  const r2 = scanFiles([{ rel: 'src/b.tsx', text }], { skipPaths: SKIP });
  for (const re of [/console\.log/, /any type/, /hardcoded color/, /inline style/, /arbitrary pixel/]) {
    assert.ok(r2.warnings.some((w) => re.test(w)), String(re));
  }
  assert.deepStrictEqual(r2.blockers, []);
});

test('blockers: non-shadcn import, native dialog, XSS; primitives dir exempt from HTML/XSS rules', () => {
  const text = ["import { Button } from '@mui/material';", 'window.confirm("x");', 'el.innerHTML = html;'].join('\n');
  const r = scanFiles([{ rel: 'src/pages/P.tsx', text }], { skipPaths: SKIP });
  assert.strictEqual(r.blockers.length, 3, JSON.stringify(r));
  const r2 = scanFiles([{ rel: 'src/components/ui/button.tsx', text: '<button />\nel.innerHTML = x;' }], { skipPaths: SKIP });
  assert.deepStrictEqual(r2.blockers, []);
});

test('skipPaths exempt secrets only, never SQL/XSS', () => {
  const text = ["const apiKey = 'abcdefghijklmnop';", 'cursor.execute(f"SELECT {x}")'].join('\n');
  const r = scanFiles([{ rel: 'src/__tests__/x.py', text }], { skipPaths: SKIP });
  assert.strictEqual(r.blockers.length, 1);
  assert.ok(/SQL INJECTION/.test(r.blockers[0]));
});

test('hook: ignores non-commit commands, blocks on staged secret, passes when disabled', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'asel-'));
  execSync('git init -q && git config user.email a@b && git config user.name a', { cwd: d });
  fs.mkdirSync(path.join(d, 'src'));
  fs.writeFileSync(path.join(d, 'src', 'k.ts'), "export const secret = 'supersecretvalue';\n");
  execSync('git add -A', { cwd: d });
  const input = (cmd) => ({ hook_event_name: 'PreToolUse', tool_name: 'Bash', cwd: d, tool_input: { command: cmd } });
  assert.strictEqual(runHook('quality-scan', input('git status'), { cwd: d }).code, 0);
  const r = runHook('quality-scan', input('git commit -m x'), { cwd: d });
  assert.strictEqual(r.code, 2);
  assert.match(r.stderr, /HARDCODED SECRET/);
  fs.writeFileSync(path.join(d, 'asel.config.json'), JSON.stringify({ guards: { qualityScan: { enabled: false } } }));
  assert.strictEqual(runHook('quality-scan', input('git commit -m x'), { cwd: d }).code, 0);
});
```

`tests/self-scan.test.js`:
```js
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
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `node --test tests/quality-scan.test.js tests/self-scan.test.js`
Expected: FAIL, module not found.

- [ ] **Step 4: Implement scan rules**

`.claude/hooks/lib/scan-rules.js`:
```js
'use strict';
const { matchesAny } = require('./glob');

const PRIMITIVE_DIR = /\/(ui|atoms|primitives)\/|ui-kit\/|^docs\/|\/__tests__\//;
const SECRET_SKIP = /test|mock|example|fixture|seed|\.env/i;
const DEBUG = {
  ts: /^\s*console\.(log|debug|info)\(/, tsx: /^\s*console\.(log|debug|info)\(/, js: /^\s*console\.(log|debug|info)\(/, jsx: /^\s*console\.(log|debug|info)\(/,
  go: /^\s*fmt\.Print(ln|f)?\(/, py: /^\s*print\(|^\s*breakpoint\(\)|^\s*import\s+pdb/,
  java: /^\s*System\.out\.print|^\s*println\(/, kt: /^\s*System\.out\.print|^\s*println\(/, kts: /^\s*println\(/,
  rs: /^\s*println!\(|^\s*dbg!\(/,
};
const SQLI = {
  ts: /query\s*\(\s*`.*\$\{|execute\s*\(\s*`.*\$\{/, js: /query\s*\(\s*`.*\$\{|execute\s*\(\s*`.*\$\{/,
  tsx: /query\s*\(\s*`.*\$\{|execute\s*\(\s*`.*\$\{/, jsx: /query\s*\(\s*`.*\$\{|execute\s*\(\s*`.*\$\{/,
  py: /execute\s*\(\s*f"|cursor\.execute\s*\(\s*f"/,
  java: /createQuery\s*\(\s*".*"\s*\+\s*|nativeQuery.*"\s*\+\s*/, kt: /createQuery\s*\(\s*".*"\s*\+\s*/, kts: /createQuery\s*\(\s*".*"\s*\+\s*/,
};
const SECRET = /(password|secret|api[_-]?key|private[_-]?key)\s*[:=]\s*["'][^"']{8,}/i;
const XSS = /dangerouslySetInnerHTML|\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML\s*\(|document\.write\s*\(/;
const NON_SHADCN = /from ['"](@mui\/|antd|@chakra-ui\/|@mantine\/|react-bootstrap|@headlessui\/react)/;
const RAW_HTML = /<(input|button|select|textarea|dialog|table)\b/;
const NATIVE_DIALOG = /(^|[^a-zA-Z0-9_.])(window\.)?(alert|confirm|prompt)\s*\(/;
const isJsLike = (e) => ['ts', 'tsx', 'js', 'jsx'].includes(e);
const isReact = (e) => e === 'tsx' || e === 'jsx';

function firstMatch(lines, re, skipComments = false) {
  for (let i = 0; i < lines.length; i++) {
    if (skipComments && /^\s*(\/\/|\{\/\*|\/\*)/.test(lines[i])) continue;
    if (re.test(lines[i])) return { n: i + 1, line: lines[i].trim() };
  }
  return null;
}

function scanFile(file, opts, out) {
  const { rel, text } = file;
  const ext = rel.includes('.') ? rel.slice(rel.lastIndexOf('.') + 1) : '';
  const lines = text.split(/\r?\n/);
  const warn = (msg) => out.warnings.push(`${rel}: ${msg}`);
  const block = (msg) => out.blockers.push(`${rel}: ${msg}`);
  const at = (m, msg) => `${msg} (line ${m.n}: ${m.line.slice(0, 80)})`;
  let m;

  if (lines.length > 400) warn(`${lines.length} lines — file too large, consider splitting`);
  if (DEBUG[ext] && (m = firstMatch(lines, DEBUG[ext]))) warn(at(m, 'debug statement'));
  if ((ext === 'ts' || ext === 'tsx') && (m = firstMatch(lines, /:\s*any\b|<any>|as\s+any\b/))) warn(at(m, 'any type'));
  if (isReact(ext)) {
    if ((m = firstMatch(lines, /#[0-9a-fA-F]{3,8}\b/, true))) warn(at(m, 'hardcoded color (use design token)'));
    if ((m = firstMatch(lines, /style=\{\{?/))) warn(at(m, 'inline style (use CSS class/token)'));
    if ((m = firstMatch(lines, /-\[[0-9]+px\]/))) warn(at(m, 'arbitrary pixel value (use spacing token)'));
    if ((m = firstMatch(lines, NON_SHADCN))) block(at(m, 'NON-SHADCN UI LIBRARY (use shadcn/ui from @/components/ui/)'));
    if (!PRIMITIVE_DIR.test(rel)) {
      if ((m = firstMatch(lines, RAW_HTML, true))) block(at(m, 'RAW HTML ELEMENT (use project wrapper: Input/Button/Select/Textarea/Dialog/Table)'));
      if ((m = firstMatch(lines, NATIVE_DIALOG, true))) block(at(m, 'NATIVE BROWSER DIALOG (use ConfirmDialog/AlertDialog wrapper or toast)'));
    }
  }
  const secretExempt = SECRET_SKIP.test(rel) || matchesAny(rel, opts.skipPaths || []);
  if (!secretExempt && (m = firstMatch(lines, SECRET))) block(at(m, 'HARDCODED SECRET (move to env)'));
  if (SQLI[ext] && (m = firstMatch(lines, SQLI[ext]))) block(at(m, 'SQL INJECTION (use parameterized query)'));
  if (isJsLike(ext) && !PRIMITIVE_DIR.test(rel) && (m = firstMatch(lines, XSS))) block(at(m, 'RAW HTML INJECTION / XSS RISK (use sanitizing wrapper component)'));
}

function scanFiles(files, opts = {}) {
  const out = { blockers: [], warnings: [] };
  for (const f of files) scanFile(f, opts, out);
  return out;
}

function formatReport(r) {
  let s = '';
  if (r.blockers.length) s += 'BLOCKED — security/architecture issues (fix before commit):\n' + r.blockers.map((b) => '  ' + b).join('\n') + '\n';
  if (r.warnings.length) s += (r.blockers.length ? '\n' : '') + 'Quality scan warnings (non-blocking):\n' + r.warnings.map((w) => '  ' + w).join('\n') + '\n';
  return s;
}

module.exports = { scanFiles, formatReport };
```

- [ ] **Step 5: Implement the hook**

`.claude/hooks/quality-scan.js`:
```js
#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { readInput } = require('./lib/input');
const { finish } = require('./lib/exit');
const { loadConfig, guard } = require('./lib/config');
const { scanFiles, formatReport } = require('./lib/scan-rules');

const input = readInput();
const { config } = loadConfig(input.cwd);
const g = guard(config, 'qualityScan', input.event || 'PreToolUse');
if (!g.enabled || !/git\s+commit/.test(input.command)) finish('warn', '');

let staged = [];
try {
  staged = execSync('git diff --cached --name-only --diff-filter=ACM', { cwd: input.cwd, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
} catch { finish('warn', ''); }

const files = staged
  .map((rel) => ({ rel: rel.replace(/\\/g, '/'), abs: path.join(input.cwd, rel) }))
  .filter((f) => fs.existsSync(f.abs))
  .map((f) => ({ rel: f.rel, text: fs.readFileSync(f.abs, 'utf8') }));

const result = scanFiles(files, { skipPaths: g.skipPaths || [] });
const report = formatReport(result);
finish(result.blockers.length ? g.level : 'warn', report);
```

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: PASS, including the three-blockers-in-one-run regression and the self-scan.

- [ ] **Step 7: Commit**

```bash
git add .claude/hooks tests/
git commit -m "feat(hooks): add single-pass quality scanner that keeps every finding"
```

---

### Task 8: gate-guard and stop-check hooks

**Files:**
- Create: `.claude/hooks/gate-guard.js`, `.claude/hooks/stop-check.js`
- Test: `tests/gate-guard.test.js`, `tests/stop-check.test.js`

**Interfaces:**
- Consumes: `readSession`, `findGateReport`, `loadConfig`, `guard`, `finish`, `readInput`.

- [ ] **Step 1: Write failing tests**

`tests/gate-guard.test.js`:
```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { runHook } = require('./helpers/run-hook');

function proj(session) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'asel-'));
  fs.writeFileSync(path.join(d, 'CLAUDE.md'), `# P\n\n## Asel Session\n${session}\n`);
  fs.mkdirSync(path.join(d, 'docs', 'stories', 'phase-1'), { recursive: true });
  return d;
}
const commit = (d) => ({ hook_event_name: 'PreToolUse', tool_name: 'Bash', cwd: d, tool_input: { command: 'git commit -m "x"' } });

test('blocks commit when story active before Commit step and no gate report', () => {
  const d = proj('- Story: STORY-003\n- Step: Dev\n- Mode: Normal');
  const r = runHook('gate-guard', commit(d));
  assert.strictEqual(r.code, 2);
  assert.match(r.stderr, /asel-gate-lead/);
});

test('passes when gate report exists, when step is Commit, when no story, when not a commit', () => {
  const d = proj('- Story: STORY-003\n- Step: Dev');
  fs.writeFileSync(path.join(d, 'docs', 'stories', 'phase-1', 'STORY-003-gate.md'), 'ok');
  assert.strictEqual(runHook('gate-guard', commit(d)).code, 0);
  const d2 = proj('- Story: STORY-003\n- Step: Commit');
  assert.strictEqual(runHook('gate-guard', commit(d2)).code, 0);
  const d3 = proj('- Story: —\n- Step: —');
  assert.strictEqual(runHook('gate-guard', commit(d3)).code, 0);
  const d4 = proj('- Story: STORY-003\n- Step: Dev');
  assert.strictEqual(runHook('gate-guard', { ...commit(d4), tool_input: { command: 'git status' } }).code, 0);
});
```

`tests/stop-check.test.js`:
```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { runHook } = require('./helpers/run-hook');

test('warns (exit 0) when a story is in progress, silent otherwise', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'asel-'));
  fs.writeFileSync(path.join(d, 'CLAUDE.md'), '## Asel Session\n- Story: STORY-002\n- Step: Gate\n');
  const r = runHook('stop-check', { hook_event_name: 'Stop', cwd: d });
  assert.strictEqual(r.code, 0);
  assert.match(r.stderr, /STORY-002 .*Gate/);
  fs.writeFileSync(path.join(d, 'CLAUDE.md'), '## Asel Session\n- Story: —\n- Step: —\n');
  assert.strictEqual(runHook('stop-check', { hook_event_name: 'Stop', cwd: d }).stderr, '');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/gate-guard.test.js tests/stop-check.test.js`
Expected: FAIL (hook file missing → spawn exits non-zero with module error).

- [ ] **Step 3: Implement**

`.claude/hooks/gate-guard.js`:
```js
#!/usr/bin/env node
'use strict';
const { readInput } = require('./lib/input');
const { finish } = require('./lib/exit');
const { loadConfig, guard } = require('./lib/config');
const { readSession } = require('./lib/session');
const { findGateReport } = require('./lib/evidence');

const PAST_GATE = new Set(['Commit', 'Close', 'Done', 'Review', 'Handoff']);

const input = readInput();
const { config } = loadConfig(input.cwd);
const g = guard(config, 'gateGuard', input.event || 'PreToolUse');
if (!g.enabled || !/git\s+commit/.test(input.command)) finish('warn', '');

const s = readSession(input.cwd, config.paths.claudeMd);
if (!s.story || PAST_GATE.has(s.step)) finish('warn', '');
if (findGateReport(input.cwd, config.paths, s.story)) finish('warn', '');

finish(g.level, `BLOCKED: no gate report for ${s.story} (step: ${s.step}). Dispatch the asel-gate-lead subagent (with the three asel-gate-scout-* results) before committing.`);
```

`.claude/hooks/stop-check.js`:
```js
#!/usr/bin/env node
'use strict';
const { readInput } = require('./lib/input');
const { finish } = require('./lib/exit');
const { loadConfig, guard } = require('./lib/config');
const { readSession } = require('./lib/session');

const input = readInput();
const { config } = loadConfig(input.cwd);
const g = guard(config, 'stopCheck', 'Stop');
if (!g.enabled) finish('warn', '');
const s = readSession(input.cwd, config.paths.claudeMd);
if (!s.story || !s.step) finish('warn', '');
finish('warn', `WARNING: ${s.story} is still in progress (step: ${s.step}). Resume with /asel to continue.`);
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .claude/hooks/gate-guard.js .claude/hooks/stop-check.js tests/
git commit -m "feat(hooks): add gate-guard and stop-check"
```

---

### Task 9: story-done-guard hook

**Files:**
- Create: `.claude/hooks/story-done-guard.js`
- Test: `tests/story-done-guard.test.js`

**Interfaces:**
- Consumes: `doneIdsIn`, `checkStoryEvidence`, `loadConfig`, `guard`, `finish`, `readInput`.

- [ ] **Step 1: Write failing test**

`tests/story-done-guard.test.js`:
```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { runHook } = require('./helpers/run-hook');

function proj() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'asel-'));
  const p1 = path.join(d, 'docs', 'stories', 'phase-1');
  fs.mkdirSync(p1, { recursive: true });
  fs.writeFileSync(path.join(d, 'docs', 'ROUTEMAP.md'), '| STORY-001 | A | S | [x] DONE | — |\n| STORY-002 | B | S | [~] IN PROGRESS | Commit |\n');
  fs.writeFileSync(path.join(p1, 'STORY-002-b.md'), '# STORY-002');
  return { d, p1 };
}
const edit = (d, oldS, newS) => ({ hook_event_name: 'PreToolUse', tool_name: 'Edit', cwd: d, tool_input: { file_path: path.join(d, 'docs/ROUTEMAP.md'), old_string: oldS, new_string: newS } });

test('blocks transition to DONE without evidence, listing what is missing', () => {
  const { d } = proj();
  const r = runHook('story-done-guard', edit(d, '| STORY-002 | B | S | [~] IN PROGRESS | Commit |', '| STORY-002 | B | S | [x] DONE | — |'));
  assert.strictEqual(r.code, 2);
  assert.match(r.stderr, /STORY-002/);
  assert.match(r.stderr, /plan:/);
  assert.match(r.stderr, /step-log:/);
});

test('ignores already-DONE stories, non-ROUTEMAP files and non-DONE edits', () => {
  const { d } = proj();
  assert.strictEqual(runHook('story-done-guard', edit(d, '| STORY-001 | A | S | [x] DONE | — |', '| STORY-001 | A | S | [x] DONE | — | 2026 |')).code, 0);
  assert.strictEqual(runHook('story-done-guard', edit(d, 'x', '| STORY-002 | B | S | [~] IN PROGRESS | Dev |')).code, 0);
  const other = edit(d, 'a', '| STORY-002 | B | S | [x] DONE | — |');
  other.tool_input.file_path = path.join(d, 'docs/OTHER.md');
  assert.strictEqual(runHook('story-done-guard', other).code, 0);
});

test('Write tool: compares against current file; passes with full evidence', () => {
  const { d, p1 } = proj();
  for (const f of ['plan', 'gate']) fs.writeFileSync(path.join(p1, `STORY-002-${f}.md`), 'x');
  fs.writeFileSync(path.join(p1, 'STORY-002-review.md'), '| F | ok | FIXED |');
  fs.writeFileSync(path.join(p1, 'STORY-002-step-log.txt'), ['STEP_1 PLAN: EXECUTED', 'STEP_2 DEV: EXECUTED', 'STEP_3 GATE: EXECUTED', 'STEP_4 REVIEW: EXECUTED', 'STEP_5 COMMIT: EXECUTED'].join('\n'));
  const write = { hook_event_name: 'PreToolUse', tool_name: 'Write', cwd: d, tool_input: { file_path: path.join(d, 'docs/ROUTEMAP.md'), content: '| STORY-001 | A | S | [x] DONE | — |\n| STORY-002 | B | S | [x] DONE | — |\n' } };
  assert.strictEqual(runHook('story-done-guard', write).code, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/story-done-guard.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement**

`.claude/hooks/story-done-guard.js`:
```js
#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { readInput } = require('./lib/input');
const { finish } = require('./lib/exit');
const { loadConfig, guard } = require('./lib/config');
const { doneIdsIn } = require('./lib/routemap');
const { checkStoryEvidence } = require('./lib/evidence');

const input = readInput();
const { config } = loadConfig(input.cwd);
const g = guard(config, 'storyDoneGuard', input.event || 'PreToolUse');
if (!g.enabled || !/routemap/i.test(input.filePath)) finish('warn', '');

const proposed = input.newString || input.content || '';
const newDone = doneIdsIn(proposed);
if (newDone.length === 0) finish('warn', '');

let oldText = input.oldString;
if (!oldText) {
  const rm = path.join(input.cwd, config.paths.routemap);
  oldText = fs.existsSync(rm) ? fs.readFileSync(rm, 'utf8') : '';
}
const oldDone = new Set(doneIdsIn(oldText));
const transitioning = newDone.filter((id) => !oldDone.has(id));
if (transitioning.length === 0) finish('warn', '');

const failures = [];
for (const id of transitioning) {
  const r = checkStoryEvidence(input.cwd, config.paths, id);
  if (r.missing.length) failures.push(`  ${id}:\n` + r.missing.map((m) => `    - ${m}`).join('\n'));
}
if (failures.length === 0) finish('warn', '');

finish(g.level, `STORY-DONE GUARD BLOCKED: cannot mark story(ies) [x] DONE without full evidence.\n\nMissing evidence:\n${failures.join('\n')}\n\nFix the missing items (re-dispatch the agent that writes the file, append the step-log entry, resolve the finding) then retry the ROUTEMAP edit.`);
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .claude/hooks/story-done-guard.js tests/story-done-guard.test.js
git commit -m "feat(hooks): add story-done evidence guard"
```

---

### Task 10: setup-guard (PreToolUse) and phase-gate-guard (PostToolUse) hooks

**Files:**
- Create: `.claude/hooks/setup-guard.js`, `.claude/hooks/phase-gate-guard.js`
- Test: `tests/setup-guard.test.js`, `tests/phase-gate-guard.test.js`

**Interfaces:**
- Consumes: `parseRoutemap`, `inProgressPhase`, `findPhaseGateReport`, config, exit, input.

- [ ] **Step 1: Write failing tests**

`tests/setup-guard.test.js`:
```js
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
```

`tests/phase-gate-guard.test.js`:
```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { runHook } = require('./helpers/run-hook');

function proj(rows) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'asel-'));
  fs.mkdirSync(path.join(d, 'docs', 'reports'), { recursive: true });
  fs.writeFileSync(path.join(d, 'docs', 'ROUTEMAP.md'), `### Phase 2: Core [IN PROGRESS]\n\n${rows}\n`);
  return d;
}
const post = (d) => ({ hook_event_name: 'PostToolUse', tool_name: 'Edit', cwd: d, tool_input: { file_path: 'docs/ROUTEMAP.md' } });

test('warns when all stories of the in-progress phase are DONE and no phase gate report exists', () => {
  const d = proj('| STORY-003 | A | S | [x] DONE | — |\n| STORY-004 | B | S | [x] DONE | — |');
  const r = runHook('phase-gate-guard', post(d));
  assert.strictEqual(r.code, 0);
  assert.match(r.stderr, /Phase 2/);
  fs.writeFileSync(path.join(d, 'docs', 'reports', 'phase-2-gate-2026-09-16.md'), 'ok');
  assert.strictEqual(runHook('phase-gate-guard', post(d)).stderr, '');
});

test('silent when phase incomplete, and never exits 2 even if configured block', () => {
  const d = proj('| STORY-003 | A | S | [x] DONE | — |\n| STORY-004 | B | S | [ ] PENDING | — |');
  assert.strictEqual(runHook('phase-gate-guard', post(d)).stderr, '');
  const d2 = proj('| STORY-003 | A | S | [x] DONE | — |');
  fs.writeFileSync(path.join(d2, 'asel.config.json'), JSON.stringify({ guards: { phaseGateGuard: { level: 'block' } } }));
  const r = runHook('phase-gate-guard', post(d2));
  assert.strictEqual(r.code, 0);
  assert.match(r.stderr, /downgraded to warn/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/setup-guard.test.js tests/phase-gate-guard.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement**

`.claude/hooks/setup-guard.js`:
```js
#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { readInput } = require('./lib/input');
const { finish } = require('./lib/exit');
const { loadConfig, guard } = require('./lib/config');
const { parseRoutemap } = require('./lib/routemap');

const input = readInput();
const { config } = loadConfig(input.cwd);
const g = guard(config, 'setupGuard', input.event || 'PreToolUse');
if (!g.enabled || !/routemap/i.test(input.filePath)) finish('warn', '');

const proposed = input.newString || input.content || '';
const starting = parseRoutemap(proposed).stories.some((s) => s.inProgress);
if (!starting) finish('warn', '');

const rmFile = path.join(input.cwd, config.paths.routemap);
if (!fs.existsSync(rmFile)) finish('warn', '');
const current = parseRoutemap(fs.readFileSync(rmFile, 'utf8'));
const phase1 = current.phases.find((p) => p.number === 1);
if (!phase1 || !phase1.stories.some((s) => s.done)) finish('warn', '');

const reports = path.join(input.cwd, config.paths.reports);
const tuning = path.join(reports, 'infra-tuning.md');
const setup = path.join(reports, 'setup-verification.md');
if (fs.existsSync(tuning) && fs.existsSync(setup)) finish('warn', '');

const rel = (f) => path.relative(input.cwd, f).replace(/\\/g, '/');
if (!fs.existsSync(tuning)) finish(g.level, `BLOCKED: infrastructure tuning not completed. Dispatch the asel-devops subagent before starting the next story. Expected report: ${rel(tuning)}`);
finish(g.level, `BLOCKED: setup verification not completed. Dispatch the asel-setup-verifier subagent before starting the next story. Expected report: ${rel(setup)}`);
```

`.claude/hooks/phase-gate-guard.js`:
```js
#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { readInput } = require('./lib/input');
const { finish } = require('./lib/exit');
const { loadConfig, guard } = require('./lib/config');
const { parseRoutemap, inProgressPhase } = require('./lib/routemap');
const { findPhaseGateReport } = require('./lib/evidence');

const input = readInput();
const { config } = loadConfig(input.cwd);
const g = guard(config, 'phaseGateGuard', input.event || 'PostToolUse');
if (!g.enabled || !/routemap/i.test(input.filePath)) finish('warn', '');

const rmFile = path.join(input.cwd, config.paths.routemap);
if (!fs.existsSync(rmFile)) finish('warn', '');
const phase = inProgressPhase(parseRoutemap(fs.readFileSync(rmFile, 'utf8')));
if (!phase || phase.stories.length === 0 || !phase.stories.every((s) => s.done)) finish('warn', g.note);
if (findPhaseGateReport(input.cwd, config.paths, phase.number)) finish('warn', g.note);

const prefix = g.note ? g.note + '\n' : '';
finish('warn', `${prefix}All ${phase.stories.length} stories in Phase ${phase.number} (${phase.name}) are DONE. Dispatch the asel-phase-gate subagent before starting the next phase; expected report: ${config.paths.reports}/phase-${phase.number}-gate-<date>.md`);
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .claude/hooks/setup-guard.js .claude/hooks/phase-gate-guard.js tests/
git commit -m "feat(hooks): add setup-guard (pre) and phase-gate-guard (post, warn-only)"
```

---

### Task 11: skill-guard and notify-hook

**Files:**
- Create: `.claude/hooks/skill-guard.js`, `.claude/hooks/notify-hook.js`
- Test: `tests/skill-guard.test.js`, `tests/notify-hook.test.js`

**Interfaces:**
- Consumes: `parseRoutemap`, `progress`, `sendTelegram`, config, exit, input.
- Produces (notify-hook internals, exported for tests): `computeEvents(rm, state, cwd, paths) → {events: {key, message}[]}`, `seedState(rm) → string[]`.

- [ ] **Step 1: Write failing tests**

`tests/skill-guard.test.js`:
```js
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
```

`tests/notify-hook.test.js`:
```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/skill-guard.test.js tests/notify-hook.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement skill-guard**

`.claude/hooks/skill-guard.js`:
```js
#!/usr/bin/env node
'use strict';
const { readInput } = require('./lib/input');
const { finish } = require('./lib/exit');
const { loadConfig, guard } = require('./lib/config');

const input = readInput();
const { config } = loadConfig(input.cwd);
const g = guard(config, 'skillGuard', input.event || 'PreToolUse');
if (!g.enabled || !input.skill) finish('warn', '');
const userOnly = new Set(g.userOnlySkills || []);
if (!userOnly.has(input.skill)) finish('warn', '');
finish(g.level, `BLOCKED: ${input.skill} is a user-only utility skill. The orchestrator must never invoke it; the user runs /${input.skill} directly.`);
```

- [ ] **Step 4: Implement notify-hook**

`.claude/hooks/notify-hook.js`:
```js
#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { readInput } = require('./lib/input');
const { loadConfig } = require('./lib/config');
const { parseRoutemap, progress } = require('./lib/routemap');
const { sendTelegram } = require('./lib/notify');

const STATE_FILE = '.asel-notify-state';

function phaseComplete(p) { return p.stories.length > 0 && p.stories.every((s) => s.done); }
function planningComplete(rm) { return /COMPLETE|DEVELOPMENT|E2E/i.test(rm.macroPhase); }
function devComplete(rm) { const pr = progress(rm); return pr.total > 0 && pr.done === pr.total; }
function e2eComplete(rm) { return rm.e2e.length > 0 && rm.e2e.every((e) => e.done); }

function seedState(rm) {
  const s = [];
  for (const st of rm.stories) if (st.done) s.push(`STORY:${st.id}`);
  for (const p of rm.phases) if (phaseComplete(p)) s.push(`PHASE:${p.number}`);
  if (planningComplete(rm)) s.push('MACRO:PLANNING');
  if (devComplete(rm)) s.push('MACRO:DEVELOPMENT');
  if (e2eComplete(rm)) s.push('MACRO:E2E');
  return s;
}

function artifact(cwd, paths, id, suffix) {
  const root = path.join(cwd, paths.stories);
  if (!fs.existsSync(root)) return '✗';
  for (const phaseDir of fs.readdirSync(root)) {
    const dir = path.join(root, phaseDir);
    if (!fs.statSync(dir).isDirectory()) continue;
    if (fs.readdirSync(dir).some((f) => f.startsWith(id) && f.endsWith(`${suffix}.md`))) return '✓';
  }
  return '✗';
}

function computeEvents(rm, state, cwd, paths) {
  const events = [];
  const pr = progress(rm);
  const tail = `Toplam: ${pr.done}/${pr.total} (%${pr.pct})`;
  const push = (key, message) => { if (!state.has(key)) events.push({ key, message }); };
  for (const p of rm.phases) {
    const done = p.stories.filter((s) => s.done).length;
    for (const s of p.stories) {
      if (!s.done) continue;
      const a = ['plan', 'gate', 'deliverable', 'review'].map((x) => artifact(cwd, paths, s.id, x));
      if (a[0] === '✗') continue; // premature ROUTEMAP edit; wait for next edit
      push(`STORY:${s.id}`, `📋 *${rm.project}*\n${s.id}: ${s.title} ✓\nPlan ${a[0]} | Gate ${a[1]} | Deliv ${a[2]} | Review ${a[3]}\nPhase ${p.number}: ${done}/${p.stories.length} — ${tail}`);
    }
  }
  for (const s of rm.stories) {
    if (s.escalated) push(`ESCALATED:${s.id}`, `⚠️ *${rm.project}*\n${s.id}: ${s.title} — ESCALATED\nMüdahale gerekli\n${tail}`);
    if (s.failed) push(`FAILED:${s.id}`, `❌ *${rm.project}*\n${s.id}: ${s.title} — FAILED\nMüdahale gerekli\n${tail}`);
  }
  for (const p of rm.phases) {
    if (phaseComplete(p)) push(`PHASE:${p.number}`, `🎯 *${rm.project}*\nPhase ${p.number}: ${p.name} COMPLETE ✓\nStories: ${p.stories.length}/${p.stories.length}\n${tail}`);
  }
  if (planningComplete(rm)) push('MACRO:PLANNING', `🏁 *${rm.project}*\nPLANNING COMPLETE ✓\n${rm.planning.filter((x) => x.done).length} adım tamamlandı\nDevelopment fazına hazır`);
  if (devComplete(rm)) push('MACRO:DEVELOPMENT', `🏁 *${rm.project}*\nDEVELOPMENT COMPLETE ✓\nTüm ${pr.done} story tamamlandı\nE2E & Polish fazına hazır`);
  if (e2eComplete(rm)) push('MACRO:E2E', `🏁 *${rm.project}*\nE2E & POLISH COMPLETE ✓\n${rm.e2e.length} kontrol tamamlandı`);
  return { events };
}

async function main() {
  const input = readInput();
  if (!/routemap/i.test(input.filePath)) return;
  const { config } = loadConfig(input.cwd);
  const rmFile = path.join(input.cwd, config.paths.routemap);
  if (!fs.existsSync(rmFile)) return;
  const rm = parseRoutemap(fs.readFileSync(rmFile, 'utf8'));
  const stateFile = path.join(input.cwd, STATE_FILE);
  if (!fs.existsSync(stateFile)) { fs.writeFileSync(stateFile, seedState(rm).join('\n') + '\n'); return; }
  const state = new Set(fs.readFileSync(stateFile, 'utf8').split(/\r?\n/).filter(Boolean));
  const { events } = computeEvents(rm, state, input.cwd, config.paths);
  for (const e of events) {
    await sendTelegram(config, e.message);
    fs.appendFileSync(stateFile, e.key + '\n');
  }
}

if (require.main === module) main().then(() => process.exit(0), () => process.exit(0));
module.exports = { computeEvents, seedState };
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add .claude/hooks/skill-guard.js .claude/hooks/notify-hook.js tests/
git commit -m "feat(hooks): add skill-guard and state-tracked notify hook"
```

---

### Task 12: Placeholder renderer and installer

**Files:**
- Create: `.claude/hooks/lib/render.js`, `install.js`
- Test: `tests/lib-render.test.js`, `tests/install.test.js`

**Interfaces:**
- Produces: `renderPlaceholders(text, ctx) → string` where `ctx = {config, hookRoot, aselRoot, playwrightPrefix}`. Rules: `{{agents.<role>.<key>}}` → string; `{{rules.<k1>[,<k2>]}}` → JSON array union; `{{paths.<key>}}` → JSON array with one string; `{{hookRoot}}`, `{{aselRoot}}`, `{{playwrightPrefix}}` → string. Unknown placeholders throw `Error('unknown placeholder …')`.
- Produces: `install(opts) → {copied: string[], skipped: string[], configSource, hooksMode}` with `opts = {target, mode: 'project'|'global', hooksMode: 'skill'|'always', playwrightPrefix, home}`; `check(opts) → {added, removed, modified}`; CLI parsing in `main()`.
- Install layout: project mode copies to `<target>/.claude/{skills,agents,rules,hooks}`; global mode copies to `<home>/.claude/skills/asel*`, `<home>/.claude/agents/asel-*`, `<home>/.claude/hooks/asel/`, and does **not** copy rules (rules are project-level). `hookRoot` = `$CLAUDE_PROJECT_DIR/.claude/hooks` (project) or `$HOME/.claude/hooks/asel` (global); `aselRoot` = `.claude/skills/asel` or `$HOME/.claude/skills/asel`.

- [ ] **Step 1: Write failing tests**

`tests/lib-render.test.js`:
```js
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
```

`tests/install.test.js`:
```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { install, check } = require('../install');
const { walk } = require('./helpers/walk');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'asel-'));

test('project install renders placeholders, writes config template, is idempotent', () => {
  const target = tmp();
  const r1 = install({ target, mode: 'project', hooksMode: 'always', playwrightPrefix: 'mcp__pw', home: tmp() });
  assert.ok(r1.copied.length > 0);
  assert.ok(fs.existsSync(path.join(target, 'asel.config.json')));
  assert.ok(fs.existsSync(path.join(target, '.env.example')));
  const rendered = walk(path.join(target, '.claude'), (f) => /\.(md|js|json)$/.test(f)).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  assert.ok(!/\{\{[a-zA-Z.,]+\}\}/.test(rendered), 'placeholders remain');
  const settings = JSON.parse(fs.readFileSync(path.join(target, '.claude', 'settings.json'), 'utf8'));
  assert.ok(settings.hooks.PreToolUse.some((h) => JSON.stringify(h).includes('quality-scan.js')));
  fs.writeFileSync(path.join(target, 'asel.config.json'), JSON.stringify({ language: { conversation: 'en' } }));
  const r2 = install({ target, mode: 'project', hooksMode: 'always', playwrightPrefix: 'mcp__pw', home: tmp() });
  assert.strictEqual(JSON.parse(fs.readFileSync(path.join(target, 'asel.config.json'), 'utf8')).language.conversation, 'en', 'config must not be overwritten');
  const settings2 = JSON.parse(fs.readFileSync(path.join(target, '.claude', 'settings.json'), 'utf8'));
  assert.deepStrictEqual(settings2.hooks, settings.hooks, 'second install must not duplicate hooks');
  assert.deepStrictEqual(check({ target, mode: 'project', home: tmp() }), { added: [], removed: [], modified: [] });
  assert.deepStrictEqual(r2.copied.sort(), r1.copied.sort());
});

test('settings merge keeps foreign hooks and allow entries', () => {
  const target = tmp();
  fs.mkdirSync(path.join(target, '.claude'));
  fs.writeFileSync(path.join(target, '.claude', 'settings.json'), JSON.stringify({
    permissions: { allow: ['Bash(git:*)'] },
    hooks: { PostToolUse: [{ hooks: [{ type: 'command', command: 'node other.js' }] }] },
  }));
  install({ target, mode: 'project', hooksMode: 'always', playwrightPrefix: 'mcp__pw', home: tmp() });
  const s = JSON.parse(fs.readFileSync(path.join(target, '.claude', 'settings.json'), 'utf8'));
  assert.deepStrictEqual(s.permissions.allow, ['Bash(git:*)']);
  assert.ok(s.hooks.PostToolUse.some((h) => JSON.stringify(h).includes('other.js')));
  assert.ok(s.hooks.PostToolUse.some((h) => JSON.stringify(h).includes('notify-hook.js')));
});

test('global install goes under home and skips rules; check reports drift', () => {
  const home = tmp();
  install({ mode: 'global', hooksMode: 'skill', playwrightPrefix: 'mcp__pw', home });
  assert.ok(fs.existsSync(path.join(home, '.claude', 'skills', 'asel', 'SKILL.md')));
  assert.ok(fs.existsSync(path.join(home, '.claude', 'hooks', 'asel', 'quality-scan.js')));
  assert.ok(!fs.existsSync(path.join(home, '.claude', 'rules')));
  fs.appendFileSync(path.join(home, '.claude', 'skills', 'asel', 'SKILL.md'), '\nlocal edit\n');
  const d = check({ mode: 'global', home });
  assert.deepStrictEqual(d.modified, ['skills/asel/SKILL.md']);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/lib-render.test.js tests/install.test.js`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement renderer**

`.claude/hooks/lib/render.js`:
```js
'use strict';

function renderPlaceholders(text, ctx) {
  return text.replace(/\{\{([a-zA-Z0-9_.,-]+)\}\}/g, (_, key) => {
    const parts = key.split('.');
    if (parts[0] === 'agents' && parts.length === 3) {
      const a = ctx.config.agents[parts[1]];
      if (a && a[parts[2]] !== undefined) return String(a[parts[2]]);
    } else if (parts[0] === 'rules' && parts.length === 2) {
      const out = [];
      for (const k of parts[1].split(',')) {
        const list = ctx.config.rules[k];
        if (!list) throw new Error(`unknown placeholder {{${key}}}: rules.${k}`);
        out.push(...list);
      }
      return JSON.stringify(out);
    } else if (parts[0] === 'paths' && parts.length === 2) {
      const v = ctx.config.paths[parts[1]];
      if (v !== undefined) return JSON.stringify([v]);
    } else if (parts.length === 1 && ['hookRoot', 'aselRoot', 'playwrightPrefix'].includes(key) && ctx[key] !== undefined) {
      return String(ctx[key]);
    }
    throw new Error(`unknown placeholder {{${key}}}`);
  });
}

module.exports = { renderPlaceholders };
```

- [ ] **Step 4: Implement installer**

`install.js`:
```js
#!/usr/bin/env node
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { DEFAULTS, deepMerge } = require('./.claude/hooks/lib/config');
const { renderPlaceholders } = require('./.claude/hooks/lib/render');

const SRC = path.join(__dirname, '.claude');
const RENDERABLE = /\.(md|js|json)$/;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    e.isDirectory() ? walk(f, out) : out.push(f);
  }
  return out;
}
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };
const rel = (base, f) => path.relative(base, f).replace(/\\/g, '/');

function layout(opts) {
  const home = opts.home || os.homedir();
  if (opts.mode === 'global') {
    const root = path.join(home, '.claude');
    return {
      home, root, configFile: path.join(root, 'asel.config.json'), envExample: null, settingsFile: path.join(root, 'settings.json'),
      hookRoot: '$HOME/.claude/hooks/asel', aselRoot: '$HOME/.claude/skills/asel',
      map: { skills: 'skills', agents: 'agents', hooks: 'hooks/asel' },
    };
  }
  const target = path.resolve(opts.target);
  const root = path.join(target, '.claude');
  return {
    home, root, configFile: path.join(target, 'asel.config.json'), envExample: path.join(target, '.env.example'), settingsFile: path.join(root, 'settings.json'),
    hookRoot: '$CLAUDE_PROJECT_DIR/.claude/hooks', aselRoot: '.claude/skills/asel',
    map: { skills: 'skills', agents: 'agents', rules: 'rules', hooks: 'hooks' },
  };
}

function resolveConfig(L) {
  if (fs.existsSync(L.configFile)) return { config: deepMerge(DEFAULTS, readJson(L.configFile)), source: L.configFile };
  return { config: deepMerge(DEFAULTS, {}), source: 'defaults' };
}

function renderedFiles(L, ctx) {
  const out = [];
  for (const [srcDir, dstDir] of Object.entries(L.map)) {
    for (const f of walk(path.join(SRC, srcDir))) {
      const r = rel(path.join(SRC, srcDir), f);
      const dst = path.join(L.root, dstDir, r);
      let content = fs.readFileSync(f);
      if (RENDERABLE.test(f)) content = Buffer.from(renderPlaceholders(content.toString('utf8'), ctx));
      out.push({ src: f, dst, content, key: `${dstDir}/${r}` });
    }
  }
  return out;
}

const HOOK_EVENTS = {
  PreToolUse: [
    { matcher: 'Bash', files: ['gate-guard.js', 'quality-scan.js'] },
    { matcher: 'Skill', files: ['skill-guard.js'] },
    { matcher: 'Edit|Write', files: ['story-done-guard.js', 'setup-guard.js'] },
  ],
  PostToolUse: [{ matcher: 'Edit|Write', files: ['phase-gate-guard.js', 'notify-hook.js'] }],
  Stop: [{ matcher: '', files: ['stop-check.js'] }],
};

function hookEntries(hookRoot) {
  const out = {};
  for (const [event, groups] of Object.entries(HOOK_EVENTS)) {
    out[event] = groups.map((g) => ({ matcher: g.matcher, hooks: g.files.map((f) => ({ type: 'command', command: `node "${hookRoot}/${f}"` })) }));
  }
  return out;
}

function mergeSettings(file, hookRoot) {
  const s = fs.existsSync(file) ? readJson(file) : {};
  s.hooks = s.hooks || {};
  for (const [event, groups] of Object.entries(hookEntries(hookRoot))) {
    const existing = s.hooks[event] || [];
    const known = new Set(existing.flatMap((g) => (g.hooks || []).map((h) => h.command)));
    for (const g of groups) {
      const fresh = g.hooks.filter((h) => !known.has(h.command));
      if (fresh.length) existing.push({ matcher: g.matcher, hooks: fresh });
    }
    s.hooks[event] = existing;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(s, null, 2) + '\n');
}

function install(opts) {
  const L = layout(opts);
  const { config, source } = resolveConfig(L);
  const ctx = { config, hookRoot: L.hookRoot, aselRoot: L.aselRoot, playwrightPrefix: opts.playwrightPrefix || 'mcp__plugin_playwright_playwright' };
  const copied = [];
  for (const f of renderedFiles(L, ctx)) {
    fs.mkdirSync(path.dirname(f.dst), { recursive: true });
    fs.writeFileSync(f.dst, f.content);
    copied.push(f.key);
  }
  const skipped = [];
  if (!fs.existsSync(L.configFile)) { fs.mkdirSync(path.dirname(L.configFile), { recursive: true }); fs.writeFileSync(L.configFile, JSON.stringify(DEFAULTS, null, 2) + '\n'); } else skipped.push(L.configFile);
  if (L.envExample) {
    if (!fs.existsSync(L.envExample)) fs.copyFileSync(path.join(__dirname, '.env.example'), L.envExample); else skipped.push(L.envExample);
  }
  const hooksMode = opts.hooksMode === 'always' ? 'always' : 'skill';
  if (hooksMode === 'always') mergeSettings(L.settingsFile, L.hookRoot);
  return { copied, skipped, configSource: source, hooksMode, playwrightPrefix: ctx.playwrightPrefix };
}

function check(opts) {
  const L = layout(opts);
  const { config } = resolveConfig(L);
  const ctx = { config, hookRoot: L.hookRoot, aselRoot: L.aselRoot, playwrightPrefix: opts.playwrightPrefix || 'mcp__plugin_playwright_playwright' };
  const expected = new Map(renderedFiles(L, ctx).map((f) => [f.key, f]));
  const added = [], removed = [], modified = [];
  for (const [key, f] of expected) {
    if (!fs.existsSync(f.dst)) removed.push(key);
    else if (!fs.readFileSync(f.dst).equals(f.content)) modified.push(key);
  }
  for (const [, dstDir] of Object.entries(L.map)) {
    for (const f of walk(path.join(L.root, dstDir))) {
      const key = `${dstDir}/${rel(path.join(L.root, dstDir), f)}`;
      if (!expected.has(key) && /asel/i.test(key)) added.push(key);
    }
  }
  return { added: added.sort(), removed: removed.sort(), modified: modified.sort() };
}

function parseArgs(argv) {
  const o = { mode: 'project', hooksMode: 'skill', check: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--project') { o.mode = 'project'; o.target = argv[++i]; }
    else if (a === '--global') o.mode = 'global';
    else if (a === '--check') o.check = true;
    else if (a.startsWith('--hooks=')) o.hooksMode = a.slice(8);
    else if (a === '--playwright-prefix') o.playwrightPrefix = argv[++i];
  }
  if (o.mode === 'project' && !o.target) throw new Error('usage: node install.js --project <dir> | --global [--check] [--hooks=skill|always] [--playwright-prefix <name>]');
  return o;
}

function main() {
  const o = parseArgs(process.argv.slice(2));
  if (o.check) {
    const d = check(o);
    console.log(JSON.stringify(d, null, 2));
    process.exit(d.added.length + d.removed.length + d.modified.length ? 1 : 0);
  }
  const r = install(o);
  console.log(`Asel installed (${o.mode}).\n  files: ${r.copied.length}\n  config: ${r.configSource}\n  hooks: ${r.hooksMode}\n  playwright prefix: ${r.playwrightPrefix}\n  kept: ${r.skipped.join(', ') || '-'}`);
}

if (require.main === module) main();
module.exports = { install, check, mergeSettings, hookEntries, parseArgs };
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS. (`install.test.js` copies whatever is under `.claude/` at this point; later tasks add files and the test keeps passing.)

- [ ] **Step 6: Commit**

```bash
git add .claude/hooks/lib/render.js install.js tests/
git commit -m "feat(install): add placeholder renderer and idempotent installer with settings merge"
```

---

### Task 13: Port script and the 19 agent definitions

**Files:**
- Create: `scripts/port-from-amil.js`, `scripts/agent-manifest.js`
- Create (generated): `.claude/agents/asel-*.md` (19), `.claude/skills/asel/phases/**`, `.claude/skills/asel/templates/**`, `.claude/skills/asel-{help,checkup,commit,changelog,deploy,codex-review}/SKILL.md` (raw, still over-long; Tasks 16-18 split/rewrite them), `.claude/rules/*.md` (raw, Task 14 adds `paths:`)
- Test: `tests/agents.test.js`

**Interfaces:**
- Produces: `AGENTS` manifest: `{ role, source, description, tools, skills? }[]` in `scripts/agent-manifest.js`.
- Port script CLI: `node scripts/port-from-amil.js <AMIL_SRC> <AMIL_RULES_DIR>`; prints files over 400 lines at the end.
- Term replacement table (applied to every ported markdown, in this order):

| From (regex) | To |
|---|---|
| `Amil` / `amil` / `AMIL` (word) | `Asel` / `asel` / `ASEL` |
| `\.amil-notify-state` | `.asel-notify-state` |
| `agents/gate-team/lead-prompt\.md` | `asel-gate-lead` |
| `agents/gate-team/scout-(analysis\|testbuild\|ui)\.md` | `asel-gate-scout-$1` |
| `agents/gate-prompt\.md` | `asel-legacy-gate` |
| `agents/([a-z0-9-]+)-prompt\.md` | `asel-$1` |
| `via Task tool` / `Task tool` | `Agent tool` |
| `Task\(` | `Agent(` |
| `` `dev-browser` `` / `dev-browser` | `Playwright MCP tools ({{playwrightPrefix}}__browser_*)` |
| `~/.claude/skills/asel/scripts/notify-telegram\.sh "\$MESSAGE"` | `node "{{hookRoot}}/notify-cli.js" "$MESSAGE"` |
| `\.claude/skills/asel/` (remaining path prefixes) | `{{aselRoot}}/` |
| `model: "(opus\|sonnet)"` inside prose | removed (frontmatter owns model) |

- [ ] **Step 1: Write the agent manifest**

`scripts/agent-manifest.js`:
```js
'use strict';
const RO = 'Read, Grep, Glob';
const PW = '{{playwrightPrefix}}__browser_navigate, {{playwrightPrefix}}__browser_snapshot, {{playwrightPrefix}}__browser_click, {{playwrightPrefix}}__browser_type, {{playwrightPrefix}}__browser_fill_form, {{playwrightPrefix}}__browser_take_screenshot, {{playwrightPrefix}}__browser_console_messages, {{playwrightPrefix}}__browser_wait_for, {{playwrightPrefix}}__browser_close';

const AGENTS = [
  { role: 'planner', source: 'agents/planner-prompt.md', description: 'Writes the story implementation plan (tasks, contracts, risks) and FIX-mode plans for bugs.', tools: `${RO}, Write, Edit` },
  { role: 'developer', source: 'agents/developer-prompt.md', description: 'Implements one plan task at a time with tests, following the story plan and architecture.', tools: '*', skills: 'frontend-design' },
  { role: 'gate-lead', source: 'agents/gate-team/lead-prompt.md', description: 'Consolidates scout findings, fixes as single writer, verifies, writes the gate report.', tools: `${RO}, Bash, Write, Edit` },
  { role: 'gate-scout-analysis', source: 'agents/gate-team/scout-analysis.md', description: 'Read-only static analysis scout for the quality gate.', tools: `${RO}, Bash` },
  { role: 'gate-scout-testbuild', source: 'agents/gate-team/scout-testbuild.md', description: 'Runs build and tests for the quality gate; reports failures.', tools: `${RO}, Bash` },
  { role: 'gate-scout-ui', source: 'agents/gate-team/scout-ui.md', description: 'Browser-based UI scout for the quality gate.', tools: `${RO}, Bash, ${PW}` },
  { role: 'reviewer', source: 'agents/reviewer-prompt.md', description: 'Consistency review of story code vs docs; writes the review report with findings.', tools: `${RO}, Write` },
  { role: 'phase-gate', source: 'agents/phase-gate-prompt.md', description: 'Phase boundary gate: deploy, smoke, E2E, compliance; writes phase gate report.', tools: `${RO}, Bash, Write, Edit, ${PW}` },
  { role: 'devops', source: 'agents/devops-prompt.md', description: 'Tunes infrastructure (Docker, DB, cache) after Phase 1 first story; writes infra-tuning report.', tools: `${RO}, Bash, Write, Edit` },
  { role: 'setup-verifier', source: 'agents/setup-verifier-prompt.md', description: 'Verifies a fresh setup works end to end; writes setup-verification report.', tools: `${RO}, Bash, Write, Edit` },
  { role: 'deploy-engineer', source: 'agents/deploy-engineer-prompt.md', description: 'Builds and deploys via Makefile/compose on demand.', tools: `${RO}, Bash, Write, Edit` },
  { role: 'seed-generator', source: 'agents/seed-generator-prompt.md', description: 'Generates realistic seed data scripts.', tools: '*' },
  { role: 'e2e-tester', source: 'agents/e2e-tester-prompt.md', description: 'Runs browser E2E passes and writes dated E2E reports.', tools: `${RO}, Bash, Write, ${PW}` },
  { role: 'test-hardener', source: 'agents/test-hardener-prompt.md', description: 'Raises test coverage and robustness after E2E.', tools: '*' },
  { role: 'perf-optimizer', source: 'agents/perf-optimizer-prompt.md', description: 'Measures and optimizes performance hotspots.', tools: '*' },
  { role: 'ui-polisher', source: 'agents/ui-polisher-prompt.md', description: 'Polishes UI against design tokens and accessibility.', tools: `${RO}, Bash, Write, Edit, ${PW}` },
  { role: 'acceptance-tester', source: 'agents/acceptance-tester-prompt.md', description: 'Functional acceptance against USERTEST scenarios.', tools: `${RO}, Bash, Write, ${PW}` },
  { role: 'compliance-auditor', source: 'agents/compliance-auditor-prompt.md', description: 'Doc-vs-code compliance audit with gap matrix.', tools: `${RO}, Bash, Write` },
  { role: 'legacy-gate', source: 'agents/gate-prompt.md', description: 'Single-agent quality gate fallback when the gate team cannot be used.', tools: `${RO}, Bash, Write` },
];

module.exports = { AGENTS };
```

- [ ] **Step 2: Write the port script**

`scripts/port-from-amil.js`:
```js
#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { AGENTS } = require('./agent-manifest');

const [amilSrc, amilRules] = process.argv.slice(2);
if (!amilSrc || !amilRules) { console.error('usage: node scripts/port-from-amil.js <AMIL_SRC> <AMIL_RULES_DIR>'); process.exit(1); }
const OUT = path.join(__dirname, '..', '.claude');

const REPLACEMENTS = [
  [/\.amil-notify-state/g, '.asel-notify-state'],
  [/agents\/gate-team\/lead-prompt\.md/g, 'asel-gate-lead'],
  [/agents\/gate-team\/scout-(analysis|testbuild|ui)\.md/g, 'asel-gate-scout-$1'],
  [/agents\/gate-prompt\.md/g, 'asel-legacy-gate'],
  [/agents\/([a-z0-9-]+)-prompt\.md/g, 'asel-$1'],
  [/via Task tool/g, 'via Agent tool'],
  [/Task tool/g, 'Agent tool'],
  [/\bTask\(/g, 'Agent('],
  [/`dev-browser`|dev-browser/g, 'Playwright MCP tools ({{playwrightPrefix}}__browser_*)'],
  [/~\/\.claude\/skills\/amil\/scripts\/notify-telegram\.sh "\$MESSAGE"/g, 'node "{{hookRoot}}/notify-cli.js" "$MESSAGE"'],
  [/\.claude\/skills\/amil\//g, '{{aselRoot}}/'],
  [/\bAmil\b/g, 'Asel'], [/\bamil\b/g, 'asel'], [/\bAMIL\b/g, 'ASEL'],
  [/\s*\(`?model: "(opus|sonnet)"`?\)/g, ''],
];

function port(text) { return REPLACEMENTS.reduce((t, [re, to]) => t.replace(re, to), text); }
function write(dst, text) { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.writeFileSync(dst, text); }
function copyTree(srcDir, dstDir) {
  for (const e of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const s = path.join(srcDir, e.name), d = path.join(dstDir, e.name);
    if (e.isDirectory()) copyTree(s, d); else write(d, port(fs.readFileSync(s, 'utf8')));
  }
}

// 1) phases + templates
copyTree(path.join(amilSrc, 'phases'), path.join(OUT, 'skills', 'asel', 'phases'));
copyTree(path.join(amilSrc, 'templates'), path.join(OUT, 'skills', 'asel', 'templates'));

// 2) agents with frontmatter
for (const a of AGENTS) {
  const body = port(fs.readFileSync(path.join(amilSrc, a.source), 'utf8')).replace(/^---[\s\S]*?---\n/, '');
  const fm = ['---', `name: asel-${a.role}`, `description: ${a.description}`, `tools: ${a.tools}`,
    `model: {{agents.${a.role}.model}}`, `effort: {{agents.${a.role}.effort}}`, a.skills ? `skills: ${a.skills}` : null, '---', ''].filter((x) => x !== null).join('\n');
  write(path.join(OUT, 'agents', `asel-${a.role}.md`), fm + body);
}

// 3) utility skills (asel-setup is rewritten by hand in Task 18, not ported)
for (const s of ['help', 'checkup', 'commit', 'changelog', 'deploy', 'codex-review']) {
  const src = path.join(amilSrc, '..', `amil-${s}`, 'SKILL.md');
  write(path.join(OUT, 'skills', `asel-${s}`, 'SKILL.md'), port(fs.readFileSync(src, 'utf8')));
}

// 4) rules (project-current versions, excluding project-specific build-speed.md)
for (const f of fs.readdirSync(amilRules)) {
  if (!f.endsWith('.md') || f === 'build-speed.md') continue;
  write(path.join(OUT, 'rules', f), port(fs.readFileSync(path.join(amilRules, f), 'utf8')));
}

// 5) report oversize
const big = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else if (f.endsWith('.md') && fs.readFileSync(f, 'utf8').split(/\r?\n/).length > 400) big.push(path.relative(OUT, f)); } })(OUT);
console.log('ported. files over 400 lines (split by hand):\n  ' + big.join('\n  '));
```

- [ ] **Step 3: Write the agents test**

`tests/agents.test.js`:
```js
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
    assert.match(fm[1], /^tools: .+/m);
    assert.match(fm[1], new RegExp(`^model: \\{\\{agents\\.${a.role}\\.model\\}\\}$`, 'm'));
    assert.match(fm[1], new RegExp(`^effort: \\{\\{agents\\.${a.role}\\.effort\\}\\}$`, 'm'));
    assert.ok(!/^---\n[\s\S]*^---\n[\s\S]*^---/m.test(text.slice(fm[0].length)), `${a.role}: nested frontmatter left in body`);
  }
});
```

- [ ] **Step 4: Run the port, then the tests**

Run:
```bash
node scripts/port-from-amil.js E:/CORPORATE/Cvs/.claude/skills/amil E:/CORPORATE/Cvs/.claude/rules
npm test
```
Expected: `agents.test.js`, `install.test.js` PASS; `line-limit.test.js` FAILS listing the over-long files (fixed in Tasks 15-18); `no-stale-terms.test.js` may FAIL on residual terms — open each reported file, fix the sentence by hand, and re-run until it passes. Do not commit with stale terms present.

- [ ] **Step 5: Commit** (line-limit still red is expected at this point and is stated in the message)

```bash
git add scripts .claude tests/agents.test.js
git commit -m "feat(port): port Amil workflow to Asel with agent definitions (splits pending)"
```

---

### Task 14: Path-scoped rules

**Files:**
- Modify: `.claude/rules/*.md` (11 files ported in Task 13)
- Test: `tests/rules.test.js`

**Interfaces:**
- Each scoped rule starts with a frontmatter block `---\npaths: {{rules.<keys>}}\n---` (or `{{paths.routemap}}`); always-on rules have no frontmatter.

- [ ] **Step 1: Write failing test**

`tests/rules.test.js`:
```js
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
  'makefile-standards.md': '{{rules.infra}}', 'telegram-notifications.md': '{{paths.routemap}}',
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/rules.test.js`
Expected: FAIL (no frontmatter yet).

- [ ] **Step 3: Prepend frontmatter to the six scoped rules**

For each scoped file in the table above, insert as the first three lines exactly:
```
---
paths: {{rules.backend,frontend}}
---
```
(with the scope string from the table). In `telegram-notifications.md` also replace the shell snippet so it reads:
```bash
node "{{hookRoot}}/notify-cli.js" "$MESSAGE"
```
and replace the `hooks/notify-hook.sh` mention with `notify-hook.js`.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: `rules.test.js` PASS; `install.test.js` still PASS (renderer resolves the new placeholders).

- [ ] **Step 5: Commit**

```bash
git add .claude/rules tests/rules.test.js
git commit -m "feat(rules): scope rules with paths placeholders"
```

---

### Task 15: Orchestrator skill `asel/SKILL.md`

**Files:**
- Create: `.claude/skills/asel/SKILL.md` (≤300 lines)
- Create: `.claude/skills/asel-audit/SKILL.md`, `.claude/skills/asel-seed/SKILL.md`, `.claude/skills/asel-acceptance/SKILL.md`, `.claude/skills/asel-e2e-check/SKILL.md` (forked heavy modes)
- Test: `tests/orchestrator.test.js`

**Interfaces:**
- Frontmatter of `asel/SKILL.md` declares the hooks with `node "{{hookRoot}}/<file>.js"` commands, same event/matcher table as `hookEntries()` in `install.js`.
- Forked skills use `context: fork`, `agent: asel-<role>`, `disable-model-invocation: true` is NOT set (the orchestrator may invoke them).

- [ ] **Step 1: Write failing test**

`tests/orchestrator.test.js`:
```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { ROOT } = require('./helpers/walk');
const { hookEntries } = require('../install');

const skill = fs.readFileSync(path.join(ROOT, '.claude', 'skills', 'asel', 'SKILL.md'), 'utf8');

test('orchestrator is short and declares every hook that install.js knows', () => {
  assert.ok(skill.split(/\r?\n/).length <= 300);
  const fm = skill.match(/^---\n([\s\S]*?)\n---\n/)[1];
  assert.match(fm, /^name: asel$/m);
  for (const groups of Object.values(hookEntries('{{hookRoot}}'))) {
    for (const g of groups) for (const h of g.hooks) assert.ok(fm.includes(h.command), h.command);
  }
});

test('orchestrator dispatches by subagent name and lists all 21 modes', () => {
  for (const m of ['ONBOARD', 'NEW', 'CONTINUE', 'CHANGE', 'ASK', 'DEV', 'POLISH', 'DOCS', 'DEPLOY', 'AUTOPILOT', 'HEADLESS', 'RELEASE', 'AUDIT', 'BUGFIX', 'GAP REVIEW', 'DEV-READINESS', 'UAT', 'SEED', 'ACCEPTANCE', 'E2E-CHECK', 'MAINTAIN']) {
    assert.ok(skill.includes(`**${m}**`), m);
  }
  assert.match(skill, /subagent_type: "asel-planner"/);
});

test('forked skills exist with context: fork and agent', () => {
  for (const [s, role] of [['asel-audit', 'compliance-auditor'], ['asel-seed', 'seed-generator'], ['asel-acceptance', 'acceptance-tester'], ['asel-e2e-check', 'e2e-tester']]) {
    const t = fs.readFileSync(path.join(ROOT, '.claude', 'skills', s, 'SKILL.md'), 'utf8');
    assert.match(t, /^context: fork$/m);
    assert.match(t, new RegExp(`^agent: asel-${role}$`, 'm'));
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/orchestrator.test.js`
Expected: FAIL (file missing).

- [ ] **Step 3: Write `asel/SKILL.md`**

Write it from the ported Amil `SKILL.md` content (`AMIL_SRC/SKILL.md`, port the text through the Task 13 replacement table by hand) with these structural changes:

1. Frontmatter:
```yaml
---
name: asel
description: Project lifecycle orchestrator. Invoke to start, continue, or manage any project phase. Full lifecycle: Planning → Development → E2E & Polish → Documentation → Release & Maintenance.
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: node "{{hookRoot}}/gate-guard.js"
        - type: command
          command: node "{{hookRoot}}/quality-scan.js"
    - matcher: "Skill"
      hooks:
        - type: command
          command: node "{{hookRoot}}/skill-guard.js"
    - matcher: "Edit|Write"
      hooks:
        - type: command
          command: node "{{hookRoot}}/story-done-guard.js"
        - type: command
          command: node "{{hookRoot}}/setup-guard.js"
  PostToolUse:
    - matcher: "Edit|Write"
      hooks:
        - type: command
          command: node "{{hookRoot}}/phase-gate-guard.js"
        - type: command
          command: node "{{hookRoot}}/notify-hook.js"
  Stop:
    - matcher: ""
      hooks:
        - type: command
          command: node "{{hookRoot}}/stop-check.js"
---
```
2. Keep: mode table (21 rows, each mode name bold), dispatch protocol, CONTINUE map, step-column mappings, progress display, anti-patterns, "skills the orchestrator must never invoke" (list = `guards.skillGuard.userOnlySkills` from config).
3. Replace the "Agent Dispatch Reference" table with one column set `Agent | subagent_type | When` and the sentence: *Dispatch with the Agent tool, e.g. `Agent(subagent_type: "asel-planner", prompt: …)`. Model and effort come from the agent definition (rendered from `asel.config.json`); never restate them in the prompt.*
4. Replace the AUDIT / SEED / ACCEPTANCE / E2E-CHECK rows' behaviour with: *Invoke the `asel-audit` / `asel-seed` / `asel-acceptance` / `asel-e2e-check` skill (runs forked in its subagent).*
5. Add a "Configuration" section: config file resolution order, `workflow.autopilot` default false, guard toggles, and "read `asel.config.json` once at session start; if `language.conversation` is `tr`, converse in Turkish".
6. Path resolution sentence: *All Asel resources live under `{{aselRoot}}/`; agent reference material under `{{aselRoot}}/references/`.*
7. Drop the dot graph (the table is the source of truth) to stay under 300 lines.

- [ ] **Step 4: Write the four forked skills**

Each file, e.g. `.claude/skills/asel-audit/SKILL.md`:
```markdown
---
name: asel-audit
description: Doc-vs-code compliance audit for the current project; run in an isolated subagent. Invoke for "audit", "compliance", "doğrulama", "kontrol et".
context: fork
agent: asel-compliance-auditor
---

Run the compliance audit as described in your agent definition against the project at the current working directory. Read `{{paths.routemap}}` first. Write the report to `docs/reports/compliance-audit-<YYYY-MM-DD>.md` and return a summary with the gap matrix counts.
```
Same shape for `asel-seed` (agent `asel-seed-generator`, description "Generate seed data; 'seed', 'test verisi', 'veri yükle'"), `asel-acceptance` (agent `asel-acceptance-tester`, "Functional acceptance mid-project; 'kabul', 'acceptance'"), `asel-e2e-check` (agent `asel-e2e-tester`, "Scoped browser E2E check; 'test et', 'gez', 'e2e check', 'son N story test'"; body adds: "Mode: e2e-check, headless OFF, dated report, bucket findings as BUG / SCOPE").

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: `orchestrator.test.js` PASS.

- [ ] **Step 6: Commit**

```bash
git add .claude/skills/asel/SKILL.md .claude/skills/asel-audit .claude/skills/asel-seed .claude/skills/asel-acceptance .claude/skills/asel-e2e-check tests/orchestrator.test.js
git commit -m "feat(skill): add asel orchestrator with skill-scoped hooks and forked heavy modes"
```

---

### Task 16: Split over-long phase files

**Files:**
- Modify: `.claude/skills/asel/phases/planning/step-9-dev-readiness.md`, `phases/development/dev-cycle.md`, `phases/development/headless-autopilot.md`, `phases/development/autopilot.md`, `phases/onboard/onboard-existing.md`, `phases/planning/step-5a-architecture-design.md`, `phases/planning/step-5c-architecture-output.md`
- Create: the `references/*.md` files listed below under `.claude/skills/asel/references/`

Line numbers refer to the ported file (identical line count to the Amil source). Procedure for every split: cut the range into the new file, prepend a one-line H1 with the file's purpose, and leave in the main file, at the cut point, the line: `> Read `{{aselRoot}}/references/<file>.md` now and follow it, then return here.`

| Main file | Cut ranges → new file |
|---|---|
| `step-9-dev-readiness.md` (879) | 48–384 → `dev-readiness-audit-a-c.md`; 385–601 → `dev-readiness-audit-d-g.md`; 671–761 → `dev-readiness-report-template.md` |
| `dev-cycle.md` (802) | 138–310 → `dev-cycle-plan-dev.md`; 311–624 → `dev-cycle-gate-review-commit.md` |
| `headless-autopilot.md` (558) | 82–415 → `headless-story-loop.md` |
| `autopilot.md` (415) | 59–315 → `autopilot-story-loop.md` |
| `onboard-existing.md` (533) | 53–325 → `onboard-scan-document.md` |
| `step-5a-architecture-design.md` (498) | 106–471 → `architecture-design-sections.md` |
| `step-5c-architecture-output.md` (511) | 19–305 → `architecture-output-templates.md`; 306–422 → `architecture-output-claudemd.md` |

- [ ] **Step 1: Confirm the ranges before cutting**

Run for each file: `sed -n '<start>p;<end>p' <file>` and check the start line is a `## ` heading and the end line is the last line before the next `## ` heading. If a heading moved by a line or two after porting, adjust to the heading boundary.

- [ ] **Step 2: Perform the cuts**

Use `sed -n 'A,Bp' main.md > ref.md` then `sed -i 'A,Bd' main.md` and insert the pointer line at line A. Example for headless:
```bash
F=.claude/skills/asel/phases/development/headless-autopilot.md
R=.claude/skills/asel/references/headless-story-loop.md
{ echo '# Headless story loop (reference for headless-autopilot.md)'; echo; sed -n '82,415p' "$F"; } > "$R"
sed -i '82,415d' "$F"
sed -i '82i > Read `{{aselRoot}}/references/headless-story-loop.md` now and follow it, then return here.' "$F"
```

- [ ] **Step 3: Headless Windows note**

In `headless-autopilot.md` replace the `nohup … & disown` launch instructions with: *Launch detached via `node "{{hookRoot}}/lib/spawn-detached.js" -- claude -p …` (works on Windows, Linux, macOS).* Create `.claude/hooks/lib/spawn-detached.js`:
```js
#!/usr/bin/env node
'use strict';
const { spawn } = require('child_process');
const sep = process.argv.indexOf('--');
const [cmd, ...args] = process.argv.slice(sep + 1);
if (!cmd) { console.error('usage: node spawn-detached.js -- <cmd> [args…]'); process.exit(1); }
const child = spawn(cmd, args, { detached: true, stdio: 'ignore', shell: process.platform === 'win32' });
child.unref();
console.log(String(child.pid));
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: `line-limit.test.js` no longer lists any `phases/` file (agent files still listed until Task 17).

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/asel .claude/hooks/lib/spawn-detached.js
git commit -m "refactor(phases): split over-long phase files into references"
```

---

### Task 17: Split over-long agent bodies

**Files:**
- Modify: `.claude/agents/asel-legacy-gate.md`, `asel-e2e-tester.md`, `asel-compliance-auditor.md`, `asel-phase-gate.md`, `asel-planner.md`
- Create: under `.claude/skills/asel/references/agents/`

Agent files have a 7-line frontmatter prepended, so ported line numbers are Amil line + 7. Same cut procedure and pointer line as Task 16 (pointer path `{{aselRoot}}/references/agents/<file>.md`).

| Agent file | Cut ranges (Amil lines +7) → new file |
|---|---|
| `asel-legacy-gate.md` (761) | `## Process` spans Amil 92–627. List its H3 headings with `grep -n '^### ' file`; cut from `## Process` to the H3 nearest the middle into `legacy-gate-passes-1.md`, the rest of Process into `legacy-gate-passes-2.md`. Each part must be ≤400 lines. |
| `asel-e2e-tester.md` (665) | Amil 66–421 → `e2e-tester-process.md`; Amil 524–650 → `e2e-tester-compliance.md` |
| `asel-compliance-auditor.md` (648) | Amil 49–282 → `compliance-auditor-process.md`; Amil 283–583 → `compliance-auditor-report.md` |
| `asel-phase-gate.md` (645) | Amil 65–407 → `phase-gate-steps.md`; Amil 408–557 → `phase-gate-report.md` |
| `asel-planner.md` (540) | Amil 71–453 → `planner-plan-template.md` |

- [ ] **Step 1: Confirm boundaries** as in Task 16 Step 1 (remember the +7 offset).

- [ ] **Step 2: Cut and insert pointers** as in Task 16 Step 2.

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: `line-limit.test.js` now only lists `skills/asel-help/SKILL.md` and `skills/asel-codex-review/SKILL.md` (handled in Task 18).

- [ ] **Step 4: Commit**

```bash
git add .claude/agents .claude/skills/asel/references
git commit -m "refactor(agents): move long checklists and templates into references"
```

---

### Task 18: Utility skills

**Files:**
- Modify: `.claude/skills/asel-help/SKILL.md`, `asel-checkup/SKILL.md`, `asel-commit/SKILL.md`, `asel-changelog/SKILL.md`, `asel-deploy/SKILL.md`, `asel-codex-review/SKILL.md`
- Create: `.claude/skills/asel-setup/SKILL.md`, `.claude/skills/asel-setup/statusline.sh`, `.claude/skills/asel-setup/setup.js`, `.claude/skills/asel-help/references/help-*.md`, `.claude/skills/asel-codex-review/references/codex-review-steps-*.md`
- Test: `tests/utility-skills.test.js`

- [ ] **Step 1: Write failing test**

`tests/utility-skills.test.js`:
```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/utility-skills.test.js`
Expected: FAIL.

- [ ] **Step 3: Fix frontmatter on the six ported skills**

In each of `asel-help`, `asel-checkup`, `asel-commit`, `asel-changelog`, `asel-deploy`, `asel-codex-review` replace any `user_invocable: …` / `auto_trigger: …` lines with:
```yaml
user-invocable: true
disable-model-invocation: true
```
Keep `allowed-tools:` and `effort:` lines where present. Keep the `!`-backtick dynamic context lines.

- [ ] **Step 4: `asel-help` split**

The display block in `asel-help/SKILL.md` is split at its `═══` banner lines into `references/help-planning.md` (Planning section), `references/help-development.md` (Development + E2E + Docs + Release), `references/help-modes.md` (modes, utility skills, config). `SKILL.md` keeps rules + "Read the three reference files and display them in order". Update numbers in the text: "21 mod", "19 ajan", "asel.config.json ile yapılandırılır".

- [ ] **Step 5: `asel-codex-review` split**

Cut `## Process` (ported lines 29–662) at the H3 nearest the middle into `references/codex-review-steps-1.md` and `-2.md`; leave pointer lines. Keep the `codex --version` / `codex login` checks.

- [ ] **Step 6: `asel-checkup` self-check section**

Append before `### Step 7: Final Report`:
```markdown
### Step 6.5: Asel Self-Check

Run and report:
1. `node -e "console.log(require('./.claude/hooks/lib/config').loadConfig(process.cwd()).source)"` → config source
2. `node install.js --check --project .` (from the Asel source repo, if available) → drift
3. For each `.claude/agents/asel-*.md`: frontmatter has no `{{` (rendered)
4. For each `.claude/rules/*.md` with frontmatter: `paths:` is a JSON array
5. `.claude/hooks/*.js` exist for every hook named in `.claude/skills/asel/SKILL.md`
Any failure → list under "Asel install issues" with the fix command.
```

- [ ] **Step 7: `asel-deploy` fallback**

Replace "Step 1: Read Makefile" with: *If `Makefile` exists, read targets from it. Else if `package.json` has `build`/`start` scripts, use `npm run build && npm run start`. Else if `docker-compose*.yml` exists, use `docker compose build && docker compose up -d`. Else stop and ask.*

- [ ] **Step 8: Write `asel-setup`**

`.claude/skills/asel-setup/SKILL.md`:
```markdown
---
name: asel-setup
description: First-time developer setup for Asel projects. Adds a statusline only if none exists, adds permission rules with valid syntax, sets recommended settings. Run with /asel-setup.
user-invocable: true
disable-model-invocation: true
allowed-tools: Bash(node:*), Read
---

# Asel Setup

Run: `node "{{aselRoot}}/../asel-setup/setup.js"` and show its report to the user. The script is idempotent; it never removes existing settings and never replaces an existing statusline (it prints how to switch instead).
```

`.claude/skills/asel-setup/setup.js`:
```js
#!/usr/bin/env node
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const home = os.homedir();
const settingsFile = path.join(home, '.claude', 'settings.json');
const statusline = path.join(home, '.claude', 'asel-statusline.sh');
const s = fs.existsSync(settingsFile) ? JSON.parse(fs.readFileSync(settingsFile, 'utf8')) : {};
const report = [];

const ALLOW = ['Bash(git:*)', 'Bash(node:*)', 'Bash(npm:*)', 'Bash(npx:*)', 'Bash(docker:*)', 'Bash(make:*)', 'Bash(curl:*)', 'WebFetch', 'WebSearch'];
s.permissions = s.permissions || {};
const allow = new Set(s.permissions.allow || []);
let added = 0;
for (const a of ALLOW) if (!allow.has(a)) { allow.add(a); added++; }
s.permissions.allow = [...allow];
report.push(`Permissions: +${added} (total ${allow.size})`);

if (!s.statusLine) {
  fs.copyFileSync(path.join(__dirname, 'statusline.sh'), statusline);
  s.statusLine = { type: 'command', command: `bash "${statusline.replace(/\\/g, '/')}"` };
  report.push('Statusline: installed asel-statusline.sh');
} else {
  report.push(`Statusline: kept existing (${s.statusLine.command}). To switch: set statusLine.command to bash "${statusline.replace(/\\/g, '/')}"`);
}

s.env = s.env || {};
if (!s.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS) s.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS = '64000';
if (s.alwaysThinkingEnabled === undefined) s.alwaysThinkingEnabled = true;
if (!s.effortLevel) s.effortLevel = 'high';
report.push('Settings: max output tokens, always-thinking, effort (only if missing)');

fs.mkdirSync(path.dirname(settingsFile), { recursive: true });
fs.writeFileSync(settingsFile, JSON.stringify(s, null, 2) + '\n');
console.log('═══ ASEL SETUP COMPLETE ═══\n' + report.map((r) => '  ' + r).join('\n') + '\n  Restart Claude Code to activate.');
```

`.claude/skills/asel-setup/statusline.sh` — a minimal, dependency-free statusline (no `jq`, no network):
```bash
#!/bin/bash
input=$(cat)
get() { printf '%s' "$input" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d||"{}");const v=process.argv[1].split(".").reduce((o,k)=>o&&o[k],j);process.stdout.write(v==null?"":String(v))})' "$1"; }
MODEL=$(get model.display_name); DIR=$(get workspace.current_dir); PCT=$(get context_window.used_percentage)
PROJECT=$(basename "${DIR:-.}"); PCT=${PCT%%.*}; PCT=${PCT:-0}
BRANCH=$(git -C "$DIR" --no-optional-locks symbolic-ref --short HEAD 2>/dev/null)
printf '\033[1;34m%s\033[0m %s \033[36m%s\033[0m  ctx %s%%\n' "$PROJECT" "${BRANCH:+($BRANCH)}" "$MODEL" "$PCT"
```

- [ ] **Step 9: Run tests**

Run: `npm test`
Expected: ALL PASS, including `line-limit` and `no-stale-terms`. If `no-stale-terms` reports a file, fix that sentence and re-run.

- [ ] **Step 10: Commit**

```bash
git add .claude/skills tests/utility-skills.test.js
git commit -m "feat(skills): rework user-only utility skills with valid frontmatter and node setup"
```

---

### Task 19: Docs, changelog, end-to-end install check and tag

**Files:**
- Modify: `README.md`
- Create: `CHANGELOG.md`
- Test: `tests/e2e-install.test.js`

- [ ] **Step 1: Write failing E2E test**

`tests/e2e-install.test.js`:
```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { ROOT } = require('./helpers/walk');

test('CLI install into a temp project renders a working hook set', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'asel-e2e-'));
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'asel-home-'));
  const env = { ...process.env, HOME: home, USERPROFILE: home };
  execFileSync(process.execPath, [path.join(ROOT, 'install.js'), '--project', target, '--hooks=always'], { env });
  const out = execFileSync(process.execPath, [path.join(ROOT, 'install.js'), '--check', '--project', target], { env, encoding: 'utf8' });
  assert.deepStrictEqual(JSON.parse(out), { added: [], removed: [], modified: [] });
  const hook = path.join(target, '.claude', 'hooks', 'skill-guard.js');
  const r = require('child_process').spawnSync(process.execPath, [hook], { input: JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Skill', cwd: target, tool_input: { skill: 'asel-help' } }), encoding: 'utf8', env });
  assert.strictEqual(r.status, 2);
  const skill = fs.readFileSync(path.join(target, '.claude', 'skills', 'asel', 'SKILL.md'), 'utf8');
  assert.match(skill, /node "\$CLAUDE_PROJECT_DIR\/\.claude\/hooks\/quality-scan\.js"/);
  const agent = fs.readFileSync(path.join(target, '.claude', 'agents', 'asel-planner.md'), 'utf8');
  assert.match(agent, /^model: opus$/m);
  assert.match(agent, /^effort: xhigh$/m);
});
```

- [ ] **Step 2: Run test**

Run: `node --test tests/e2e-install.test.js`
Expected: PASS already if Tasks 12–18 are complete; if it fails, the failure names the broken piece — fix it there, not in the test.

- [ ] **Step 3: Write `CHANGELOG.md`**

```markdown
# Asel Changelog

## 0.1.0 — 2026-09-16

### Differences from Amil
- Hooks rewritten in Node.js; no `jq`, no Bash subshell pitfalls. `quality-scan` now reports every finding (Amil lost 14 of 17).
- Guards are configurable per project in `asel.config.json` (enable / level); PostToolUse guards can only warn.
- Telegram token and chat IDs come from environment variables; notifications are off by default.
- 19 agents are real subagent definitions in `.claude/agents/` with tools, model and effort rendered from config.
- Rules are scoped with `paths:`; project-specific rules stay out of the set.
- All workflow files ≤400 lines; long material lives under `skills/asel/references/`.
- Utility skills use `user-invocable` / `disable-model-invocation`; setup writes valid permission rules and never replaces an existing statusline.
- `install.js` renders placeholders, merges `settings.json` without touching foreign hooks, and `--check` reports drift.
- References to `dev-browser`, `amil-distribute`, `MultiEdit` and "Task tool" removed.
```

- [ ] **Step 4: Extend `README.md`**

Add sections: Install (`node install.js --project <dir>`, `--global`, `--hooks=always`, `--playwright-prefix`), Configure (each top-level key of `asel.config.json` in one line), Notifications (env vars, `enabled`), Guards table (name, event, default level), Adding a project-specific rule (drop a file into `.claude/rules/` with its own `paths:`), Development (`npm test`, `npm run config:template`, port script), Windows note (hooks run under Git Bash; commands are `node "…"` so no `jq`).

- [ ] **Step 5: Full test run and tag**

Run: `npm test`
Expected: ALL PASS.

```bash
git add README.md CHANGELOG.md tests/e2e-install.test.js
git commit -m "docs: add README, changelog and end-to-end install test"
git tag -a v0.1.0 -m "Asel 0.1.0"
```

---

## Self-review against the spec

| Spec section | Task |
|---|---|
| §1 problem table (12 rows) | 1 (stale-terms), 3 (config), 6 (env token), 7 (scanner), 10 (setup pre / phase-gate match), 13 (agents, Task→Agent), 14 (paths), 16-18 (≤400), 18 (frontmatter, setup) |
| §2 layout | 1, 12, 13, 15 |
| §3.1 config + level rule | 3 |
| §3.2 env | 1, 6 |
| §4.1 lib modules | 2, 3, 4, 5, 6, 12 (`exit.js` = `finish`) |
| §4.2 hook table | 7, 8, 9, 10, 11; registration 12 + 15 |
| §4.3 tests incl. three-blockers regression | 7 and every task |
| §5 agents (19, tools/model/effort/skills, replacements) | 13 |
| §6.1 orchestrator ≤300, forked modes | 15 |
| §6.2 split map + headless Windows | 16, 17 |
| §6.3 utility skills | 18 |
| §7 rules | 14 |
| §8 installer incl. `--check` | 12, 19 |
| §9 quality bar | 1, 7, 19 |
