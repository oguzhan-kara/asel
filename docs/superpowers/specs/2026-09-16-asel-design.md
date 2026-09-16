# Asel — Project Lifecycle Orchestrator (Design Spec)

Date: 2026-09-16
Status: Approved in chat (sections 1-3), pending written review
Supersedes: Amil skill set (last changelog 2026-05-09)

## 1. Purpose

Asel is the successor to Amil: a Claude Code skill set that orchestrates a project through
Planning → Development → E2E & Polish → Documentation → Release & Maintenance. It keeps
Amil's workflow and evidence discipline, and replaces the parts that an audit on
2026-09-16 found broken or stale:

| Amil problem | Asel decision |
|---|---|
| Telegram token and chat IDs hardcoded in a script | Read from environment variables; notifications off by default |
| `quality-scan.sh` lost 14 of 17 findings (subshell `while read`) | Single-pass Node scanner; every finding is collected |
| All hooks depend on `jq`, silently no-op without it | Node.js hooks, no external binaries |
| `setup-guard` claimed to block from PostToolUse | Moved to PreToolUse |
| `phase-gate-guard` always warned (`-newer` race) | Matches gate report by phase number in content |
| Invalid frontmatter (`user_invocable`, `auto_trigger`) | `user-invocable` / `disable-model-invocation` |
| Invalid permission rules in setup (`Git:*`, `MultiEdit`) | Valid `Bash(git:*)` syntax; no removed tools |
| Agent prompts read into `Task` calls by hand | Real subagent definitions in `.claude/agents/` |
| 16 prompt files over 400 lines | Split into ≤400-line files, loaded on demand |
| Rules loaded every session regardless of task | `paths:` frontmatter scoping |
| Model/effort/paths/guards scattered across prompts | One `asel.config.json` |
| References to `dev-browser`, `amil-distribute`, "Task tool" | Playwright MCP tool names, `Agent` tool, no ghost skills |

Non-goals: Asel does not replace GSD or any other framework installed globally; the
installer merges into existing `settings.json` and never removes foreign hooks.

## 2. Repository layout

Standalone git repository at `E:\CORPORATE\Cvs\asel`.

```
asel/
  README.md
  CHANGELOG.md                 # first entry: "Differences from Amil"
  package.json                 # scripts: test, install:project, install:global, check
  asel.config.json             # template; copied into a project, single settings point
  .env.example                 # ASEL_TELEGRAM_BOT_TOKEN=, ASEL_TELEGRAM_CHAT_IDS=
  install.js                   # copy + config-driven frontmatter + settings.json merge
  .claude/
    skills/
      asel/
        SKILL.md               # orchestrator, ≤300 lines
        phases/                # planning/step-0..9, development/, e2e-polish/, e2e-check/,
                               # documentation/, release/, maintain/, change/, onboard/
        templates/             # ROUTEMAP, STORY, SCOPE, PRODUCT, ARCHITECTURE, SCREENS, ADR, GLOSSARY
        references/            # long reference material split out of phase files
      asel-help/SKILL.md
      asel-setup/SKILL.md
      asel-checkup/SKILL.md
      asel-commit/SKILL.md
      asel-changelog/SKILL.md
      asel-deploy/SKILL.md
      asel-codex-review/SKILL.md
    agents/                    # asel-planner.md, asel-developer.md, asel-gate-lead.md, ... (19)
    rules/                     # scoped with paths: frontmatter
    hooks/
      lib/                     # input.js, config.js, routemap.js, evidence.js, notify.js
      quality-scan.js, gate-guard.js, story-done-guard.js, setup-guard.js,
      phase-gate-guard.js, skill-guard.js, notify-hook.js, stop-check.js
  tests/                       # node --test; fixtures/ with fake hook inputs and ROUTEMAPs
```

Every file under `.claude/` is ≤400 lines. Files that would exceed it are split into a
main file plus `references/<name>-*.md` that the main file tells the reader to open when
needed.

## 3. Configuration

### 3.1 `asel.config.json`

Resolution order: `<project>/asel.config.json` → `~/.claude/asel.config.json` → built-in
defaults (`hooks/lib/config.js` holds the defaults; the template file is generated from
them so the two cannot drift).

```json
{
  "language": { "conversation": "tr", "documents": "en" },
  "paths": {
    "docs": "docs",
    "routemap": "docs/ROUTEMAP.md",
    "stories": "docs/stories",
    "reports": "docs/reports",
    "usertest": "docs/USERTEST.md",
    "claudeMd": "CLAUDE.md"
  },
  "workflow": {
    "autopilot": false,
    "reviewBeforeCommit": true,
    "phaseGateRequired": true,
    "maxRedispatch": 3,
    "coAuthor": "Claude <noreply@anthropic.com>"
  },
  "agents": {
    "planner":            { "model": "opus",   "effort": "xhigh" },
    "developer":          { "model": "sonnet", "effort": "high", "escalationModel": "opus" },
    "gate-lead":          { "model": "opus",   "effort": "high" },
    "gate-scout-analysis":{ "model": "sonnet", "effort": "medium" },
    "gate-scout-testbuild":{ "model": "sonnet","effort": "medium" },
    "gate-scout-ui":      { "model": "sonnet", "effort": "medium" },
    "reviewer":           { "model": "sonnet", "effort": "medium" },
    "phase-gate":         { "model": "opus",   "effort": "high" },
    "devops":             { "model": "opus",   "effort": "high" },
    "setup-verifier":     { "model": "opus",   "effort": "medium" },
    "deploy-engineer":    { "model": "sonnet", "effort": "medium" },
    "seed-generator":     { "model": "opus",   "effort": "medium" },
    "e2e-tester":         { "model": "opus",   "effort": "high" },
    "test-hardener":      { "model": "opus",   "effort": "high" },
    "perf-optimizer":     { "model": "opus",   "effort": "high" },
    "ui-polisher":        { "model": "opus",   "effort": "high" },
    "acceptance-tester":  { "model": "opus",   "effort": "high" },
    "compliance-auditor": { "model": "opus",   "effort": "xhigh" },
    "legacy-gate":        { "model": "opus",   "effort": "high" }
  },
  "guards": {
    "qualityScan":    { "enabled": true, "level": "block", "skipPaths": ["**/__tests__/**", "**/*.test.*", "**/fixtures/**", "docs/**"] },
    "gateGuard":      { "enabled": true, "level": "block" },
    "storyDoneGuard": { "enabled": true, "level": "block" },
    "setupGuard":     { "enabled": true, "level": "block" },
    "phaseGateGuard": { "enabled": true, "level": "warn" },
    "skillGuard":     { "enabled": true, "level": "block", "userOnlySkills": ["asel-setup","asel-help","asel-changelog","asel-commit","asel-checkup","asel-codex-review"] },
    "stopCheck":      { "enabled": true, "level": "warn" }
  },
  "notifications": {
    "telegram": { "enabled": false, "tokenEnv": "ASEL_TELEGRAM_BOT_TOKEN", "chatIdsEnv": "ASEL_TELEGRAM_CHAT_IDS", "timeoutMs": 5000 }
  },
  "rules": {
    "backend":  ["backend/**", "sdk/**", "**/*.java", "**/*.go", "**/*.py"],
    "frontend": ["frontend/**", "**/*.tsx", "**/*.jsx"],
    "infra":    ["infra/**", "docker-compose*.yml", "Makefile"]
  }
}
```

Rules for `level`: `block` is honoured only on PreToolUse and Stop. If a PostToolUse hook is
configured with `block`, `config.js` downgrades it to `warn` and writes one line to stderr
explaining why. `enabled:false` makes the hook exit 0 before reading anything else.

### 3.2 Environment variables

Documented in `.env.example`. Only the Telegram pair exists in v1. `notify.js` reads them
at call time; missing or empty values mean "do not send", never an error.

## 4. Hooks

### 4.1 Shared library (`hooks/lib/`)

| Module | Responsibility |
|---|---|
| `input.js` | Read stdin JSON once; expose `command`, `filePath`, `newString`, `oldString`, `content`, `cwd`, `skill`, `event`. Tolerates both `file_path` and `filePath`. |
| `config.js` | Resolve and merge config; enforce level rules; `guard(name)` returns `{enabled, level}`. |
| `routemap.js` | Parse ROUTEMAP: phases, story rows (id, title, status, step), macro phase, E2E rows. One parser shared by notify, phase-gate, setup-guard, story-done-guard. |
| `evidence.js` | Locate story file, plan/gate/review/step-log/USERTEST evidence; count unresolved review findings; check `ui-story` marker. |
| `notify.js` | `send(message)` via Telegram Bot API with `fetch` and timeout; no-op when disabled. |
| `exit.js` | `block(msg)` → stderr + exit 2; `warn(msg)` → stderr + exit 0; `pass()` → exit 0. Chooses between block/warn from the guard's configured level. |

### 4.2 Hook table

| Hook | Event / matcher | Level default | Behaviour |
|---|---|---|---|
| `quality-scan.js` | PreToolUse / Bash (`git commit`) | block | Scans `git diff --cached` files. Blockers: hardcoded secrets, string-built SQL, raw HTML injection, non-shadcn UI imports, raw HTML form elements, native dialogs. Warnings: file >400 lines, debug prints, `any`, hardcoded colours, inline styles, arbitrary px. All findings collected in arrays; skip list from config applies only to the secret check, not to SQL/XSS. |
| `gate-guard.js` | PreToolUse / Bash (`git commit`) | block | Reads `## Asel Session` from CLAUDE.md; if a story is active and step is before Commit and no `<story>*gate*` report exists → block. |
| `story-done-guard.js` | PreToolUse / Edit,Write on ROUTEMAP | block | Stories transitioning to `[x] DONE` must have plan, gate, review, step-log with PLAN/DEV/GATE/REVIEW/COMMIT EXECUTED, USERTEST section (if file exists), zero unresolved findings, and `frontend-design INVOKED` when the story is a UI story. |
| `setup-guard.js` | PreToolUse / Edit,Write on ROUTEMAP | block | If Phase 1 has a DONE story and a new story is being marked IN PROGRESS, `infra-tuning.md` and `setup-verification.md` must exist. |
| `phase-gate-guard.js` | PostToolUse / Edit,Write on ROUTEMAP | warn | If every story in the `[IN PROGRESS]` phase is DONE and no `phase-<n>-gate*.md` exists for that phase number → warn. |
| `skill-guard.js` | PreToolUse / Skill | block | Skill name in `userOnlySkills` → block. |
| `notify-hook.js` | PostToolUse / Edit,Write on ROUTEMAP | — | Same state machine as Amil (`.asel-notify-state`, seeded on first run): story DONE, ESCALATED, FAILED, dev phase complete, planning/development/E2E complete. Exits immediately when notifications are disabled. |
| `stop-check.js` | Stop | warn | Story still in progress per CLAUDE.md → warn. |

Registration: the orchestrator's `SKILL.md` declares these in its `hooks:` frontmatter
(skill-scoped, active while Asel is loaded). `install.js` can additionally register them
in `settings.json` with `--hooks=always` for teams that want the guards outside Asel
sessions. Hook commands are `node "<path>/hooks/<name>.js"` with the path resolved at
install time; no `$HOME` shell fallbacks.

### 4.3 Tests

`tests/` uses `node --test`. Each hook gets: an "enabled:false exits 0" case, a happy path,
and one case per blocking rule. Fixtures: minimal ROUTEMAPs, CLAUDE.md snippets, staged file
samples (the scanner is tested against a temporary git repo created in the test). One
regression test asserts that `quality-scan` reports a secret, a SQL injection and a raw
`<input>` from the same staged file in one run.

## 5. Agents

Nineteen definitions in `.claude/agents/asel-<role>.md`. Frontmatter fields used:
`name`, `description`, `tools`, `model`, `effort`, and `skills` where a role depends on one.

| Role | tools | skills |
|---|---|---|
| planner | Read, Grep, Glob, Write, Edit | — |
| developer | all | frontend-design (web UI stories) |
| gate-lead | Read, Grep, Glob, Bash, Agent, Write | — |
| gate-scout-analysis / testbuild / ui | Read, Grep, Glob, Bash (+ Playwright MCP for ui) | — |
| reviewer | Read, Grep, Glob, Write | — |
| phase-gate, e2e-tester, acceptance-tester, ui-polisher | Read, Grep, Glob, Bash, Write, Playwright MCP | — |
| devops, setup-verifier, deploy-engineer | Read, Grep, Glob, Bash, Write, Edit | — |
| seed-generator, test-hardener, perf-optimizer | all | — |
| compliance-auditor | Read, Grep, Glob, Bash, Write | — |
| legacy-gate (single-agent fallback) | Read, Grep, Glob, Bash, Write | — |

`model` and `effort` are placeholders (`{{agents.planner.model}}`) in the source; `install.js`
substitutes them from config so the harness enforces them. Prompt bodies come from Amil
with these edits: "Task tool" → `Agent`; `dev-browser` → Playwright MCP
(`mcp__plugin_playwright_playwright__*` or the project's actual server name, taken from
`install.js --playwright-prefix`); "Amil" → "Asel"; WORKTREE honour rule kept verbatim;
model instructions removed from prose (frontmatter owns them).

## 6. Skills

### 6.1 Orchestrator `skills/asel/SKILL.md` (≤300 lines)

Contains: mode-detection table (same 21 modes as Amil), dispatch protocol ("read the phase
file, follow it"), CONTINUE-mode ROUTEMAP map, step-column mappings, progress display,
anti-patterns, and the `hooks:` block. Agent dispatch is by subagent name
(`Agent(subagent_type: "asel-planner")`), never by pasting a prompt file. Heavy read-only
modes (AUDIT, SEED, ACCEPTANCE, E2E-CHECK) are separate skills with
`context: fork` and `agent: asel-<role>` so they run in a subagent.

### 6.2 Phase files

Ported from Amil, renamed, split to ≤400 lines. Split map:

| Amil file (lines) | Asel files |
|---|---|
| planning/step-9-dev-readiness (879) | step-9-dev-readiness.md + references/dev-readiness-checklist.md + references/dev-readiness-midproject.md |
| development/dev-cycle (802) | dev-cycle.md + references/dev-cycle-steps.md + references/dev-cycle-escalation.md |
| development/headless-autopilot (558) | headless-autopilot.md + references/headless-runner.md |
| development/autopilot (415) | autopilot.md + references/autopilot-boundaries.md |
| onboard/onboard-existing (533) | onboard-existing.md + references/onboard-inventory.md |
| planning/step-5a (498), step-5c (511) | each + one references file |
| agents gate-prompt (754), e2e-tester (658), compliance-auditor (641), phase-gate (638), planner (533) | agent body + `references/<role>-checklist.md` |

Headless mode keeps `claude -p` but documents the Windows caveat (no `nohup`/`disown`;
uses `child_process.spawn` with `detached:true` via a small `hooks/lib/spawn.js` helper).

### 6.3 Utility skills

All seven carry `user-invocable: true` and `disable-model-invocation: true`.

- `asel-setup`: writes statusline only if none is configured (otherwise prints how to
  switch); adds permissions with valid syntax (`Bash(git:*)`, `Bash(npm:*)`, MCP names
  detected from the running config); sets `effortLevel`, `alwaysThinkingEnabled`, output
  tokens only when missing; no `jq`, uses Node.
- `asel-checkup`: Amil's infra checks plus an Asel self-check: config validity, hook paths
  resolve, agent frontmatter substituted, rules `paths:` valid, drift vs. source repo.
- `asel-commit`, `asel-changelog`: ported, names updated, co-author line from config.
- `asel-deploy`: Makefile first; falls back to `package.json` scripts or `docker compose`
  when no Makefile.
- `asel-codex-review`: ported; `codex` presence check kept.
- `asel-help`: rewritten from the new structure; split into SKILL.md + references.

## 7. Rules

`.claude/rules/*.md` with `paths:` frontmatter generated from `config.rules`:

| Rule | Scope |
|---|---|
| immutable-architecture, production-grade, commit-conventions, routemap-discipline, strict-protocol | always |
| clean-code (incl. "waiting and locks" section from 2026-09-10) | `rules.backend` + `rules.frontend` |
| i18n-standards, naming-conventions | `rules.frontend` + `rules.backend` |
| env-configuration, makefile-standards | `rules.infra` + root config files |
| telegram-notifications | `docs/ROUTEMAP.md` (only relevant when editing it) |

Project-specific rules (e.g. Amil's `build-speed.md`) are not part of the set; README
explains how to add one alongside.

## 8. Installer

`node install.js --project <path> [--hooks=skill|always] [--playwright-prefix <name>]`
and `node install.js --global`.

Steps, all idempotent:
1. Copy `.claude/skills/asel*`, `.claude/agents/asel-*`, `.claude/rules/*`, `.claude/hooks/`
   into the target `.claude/`.
2. Write `asel.config.json` template if absent; never overwrite an existing one.
3. Substitute `{{agents.<role>.model}}` / `{{...effort}}` in agent frontmatter from the
   resolved config.
4. Render `paths:` in rule frontmatter from `config.rules`.
5. If `--hooks=always`, merge hook entries into `settings.json` (append, dedupe by command
   string, never delete existing entries).
6. Write `.env.example` if absent.
7. Print a report: files copied, config source, hook mode, detected MCP prefix.

`node install.js --check --project <path>` prints drift between the source repo and the
installed copy (added, removed, modified files) without changing anything.

## 9. Testing and quality bar

- `npm test` runs all hook tests and an installer test (install twice into a temp dir,
  assert second run changes nothing).
- Every Markdown file ≤400 lines, enforced by `tests/line-limit.test.js`.
- No file contains the strings `Amil`, `amil-`, `dev-browser`, `MultiEdit`, `Task tool`,
  `jq -r`, enforced by `tests/no-stale-terms.test.js`.
- No secret-looking literal in the repo, enforced by the scanner running on itself.

## 10. Out of scope (v1)

- Migrating an existing Amil project's ROUTEMAP or docs (Asel reads the same formats; no
  conversion needed).
- Replacing or removing GSD from the user's global settings.
- Non-Telegram notification channels (config shape allows adding them later under
  `notifications`).
