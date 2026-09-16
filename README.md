# Asel

![Node](https://img.shields.io/badge/node-%E2%89%A518-brightgreen)
![Dependencies](https://img.shields.io/badge/dependencies-0-blue)
![Tests](https://img.shields.io/badge/tests-115%2F115-brightgreen)

Asel is a configurable project-lifecycle orchestrator for Claude Code. It drives a project
through five macro phases — **Planning → Development → E2E & Polish → Documentation →
Release & Maintenance** — using Node.js hooks, real subagent definitions, path-scoped rules,
and an idempotent installer.

`.claude/` in this repo is the **source tree**: it contains `{{placeholders}}` and is not
meant to be used unrendered. `node install.js --project <dir>` renders it into a real
project's `.claude/`.

## Why Asel

Running a multi-phase, multi-agent workflow inside Claude Code surfaces a recurring set of
problems once a project grows past a handful of stories:

- Bash-based hooks that shell out to `jq` silently no-op when it's missing, and naive
  `while read` subshell patterns can silently drop findings instead of reporting all of them.
- Hardcoding secrets (bot tokens, chat IDs) directly in scripts instead of reading them from
  the environment.
- Guards that are wired to the wrong hook event: some Claude Code events (`PostToolUse`) fire
  after a tool has already run, so a guard attached there can only warn, never block — a
  guard that claims to block from such an event is a bug waiting to be found.
- Guards that key off file modification time instead of content, which makes them
  unreliable on filesystems where timestamps aren't trustworthy.
- Agent instructions kept as prompt files that have to be read and pasted into a dispatch
  call by hand, instead of first-class subagent definitions, and prose that references
  tools or skills that no longer exist.
- Invalid frontmatter keys and invalid permission syntax that Claude Code silently ignores.
- Prompt/workflow files that grow past a readable size, and rules that get loaded on every
  turn regardless of whether they apply to the file being touched.
- Configuration (models, effort levels, paths, guard toggles) scattered across many prompt
  files instead of living in one place.

Asel addresses each of these with a Node.js-only implementation, a single
`asel.config.json`, real `.claude/agents/` subagent files, and `paths:`-scoped rules — see
`CHANGELOG.md` for the full list of what shipped in 0.1.0.

## How it works

```
asel/ (source tree, {{placeholders}})          <project>/.claude/ (rendered)
  .claude/skills/asel*/          --install.js-->  skills/asel*/
  .claude/agents/asel-*.md       --render config->  agents/asel-*.md   (model/effort filled in)
  .claude/rules/*.md             --render config->  rules/*.md         (paths: filled in)
  .claude/hooks/                 --copy verbatim->  hooks/
  asel.config.json               --write if absent-> asel.config.json
```

- **Hooks** (`.claude/hooks/*.js`) run on Claude Code tool-use events (`PreToolUse`,
  `PostToolUse`, `Stop`) and implement the guards described below. They are plain Node.js —
  no `jq`, no other external binary beyond `node` itself.
- **Agents** (`.claude/agents/asel-*.md`) are real Claude Code subagent definitions, one per
  role in the lifecycle (planner, developer, gate team, reviewer, and so on), dispatched via
  the `Agent` tool.
- **Skills** (`.claude/skills/`) are the orchestrator itself (`asel`) plus utility skills for
  setup, commits, changelogs, checkups, and audits.
- **Rules** (`.claude/rules/*.md`) are Markdown files with `paths:` frontmatter that Claude
  Code loads automatically and scopes to matching files, so a backend-only rule doesn't load
  while editing frontend code.
- **The installer** (`install.js`) copies the source tree into a project's `.claude/`,
  substitutes config values into agent/rule frontmatter, optionally merges hook registrations
  into `settings.json`, and can report drift between source and installed copies with
  `--check`.

## Quick start

```bash
# Render into a project (writes .claude/, asel.config.json, .env.example)
node install.js --project <dir>

# Render into ~/.claude instead of a project (no rules/, no .env.example)
node install.js --global

# Report drift between the source tree and what's installed, without writing anything
node install.js --check --project <dir>

# Also register the guard hooks in settings.json so they run on every matching
# tool call, not only while the asel skill itself is active
node install.js --project <dir> --hooks=always

# Override the Playwright MCP tool-name prefix baked into rendered agents/skills
node install.js --project <dir> --playwright-prefix mcp__my_playwright
```

By default (`--hooks=skill`, the implicit default) the guard hooks are declared only in
`.claude/skills/asel/SKILL.md`'s own frontmatter, so they run while the `asel` skill is
active. `--hooks=always` additionally merges the same hook commands into
`.claude/settings.json`, merging with (never replacing) any hooks or permissions already
there — so they run on every matching tool call regardless of which skill is active.
Re-running install is idempotent: an existing `asel.config.json` or `.env.example` is left
untouched, and `settings.json` hook entries are de-duplicated by exact command string.

`--check` prints `{ "added": [...], "removed": [...], "modified": [...] }` (paths relative
to `hooks/`, `skills/`, `agents/`, `rules/`) and exits `1` if any list is non-empty, `0` if
the installed tree matches the source tree exactly — use it in CI to catch drift between a
project's rendered `.claude/` and this repo.

## Configuration

Every top-level key in `asel.config.json` (see `.claude/hooks/lib/config.js` for the exact
defaults):

| Key | Purpose |
|---|---|
| `language` | `{ conversation, documents }` IETF-ish codes (e.g. `tr`/`en`) for which language the orchestrator talks to the user in versus which language it writes files in. |
| `paths` | Where project documents live: `docs`, `routemap`, `stories`, `reports`, `usertest`, `claudeMd`. Hooks and agents read these instead of hardcoding paths. |
| `workflow` | Process switches: `autopilot`, `maxRedispatch` (escalation cap, rendered into the escalation-ladder prose) and `coAuthor` (git trailer, rendered into commit templates). `reviewBeforeCommit` and `phaseGateRequired` are **reserved — documented intent, not yet enforced by a hook**. |
| `agents` | Per-agent `{ model, effort }` (some also add `escalationModel`) for all 19 subagents; rendered verbatim into each agent's frontmatter at install time. |
| `guards` | Per-guard `{ enabled, level }` (plus guard-specific extras such as `qualityScan.skipPaths` and `skillGuard.userOnlySkills`); see the Guards table below. |
| `notifications` | Currently `telegram: { enabled, tokenEnv, chatIdsEnv, timeoutMs }`. **Tokens and chat IDs are never stored in this file or committed to the repo** — only the names of the environment variables that hold them; see Notifications below. |
| `rules` | Named glob lists (`backend`, `frontend`, `infra`) that scoped rules reference via `{{rules.<name>[,<name>...]}}` placeholders so a rule can apply to more than one area. |

**Resolution order**: `<project>/asel.config.json` → `~/.claude/asel.config.json` →
built-in defaults. The first file found wins outright (its values are deep-merged over the
defaults; later candidates are not merged in). If the first candidate found contains
invalid JSON, it is skipped with a warning and the next candidate in the order is tried.

## Guards

| Guard | Event | Default level | Checks |
|---|---|---|---|
| `qualityScan` | PreToolUse (`Bash`, `git commit`) | `block` | Staged files for stale debug prints, SQL injection patterns, hardcoded secrets, XSS sinks, non-shadcn UI imports, raw HTML/native dialogs. `guards.qualityScan.skipPaths` exempts a file from the **secret rule only** — SQL injection, XSS and UI rules always apply. |
| `gateGuard` | PreToolUse (`Bash`, `git commit`) | `block` | A gate report exists for the in-progress story before allowing the commit. |
| `storyDoneGuard` | PreToolUse (`Edit`/`Write` to ROUTEMAP) | `block` | Any story being newly marked `[x] DONE` has full evidence (plan, gate, review, step-log). A story with no story file under `paths.stories` passes with a warning on stderr. |
| `setupGuard` | PreToolUse (`Edit`/`Write` to ROUTEMAP) | `block` | Before starting the 2nd+ story of Phase 1, infra-tuning and setup-verification reports exist. |
| `phaseGateGuard` | PostToolUse (`Edit`/`Write` to ROUTEMAP) | `warn` | After a ROUTEMAP edit, if every story in the in-progress phase is DONE but no phase-gate report exists yet. |
| `skillGuard` | PreToolUse (`Skill`) | `block` | The orchestrator itself never invokes a skill listed in `guards.skillGuard.userOnlySkills`. |
| `stopCheck` | `Stop` | `warn` (fixed) | Warns the user when the session ends mid-story so they know to resume with `/asel`. `level` is not configurable for this guard — it always warns. |

A guard's `level: "block"` only takes effect on `PreToolUse` and `Stop` — those are the only
events where blocking (exit code 2) is meaningful. If a guard configured as `block` is
attached to a `PostToolUse` event (the tool already ran), it is downgraded to `warn`, and the
note is printed by the guard itself (it appears in that hook's stderr, not anywhere else);
`phaseGateGuard` is `warn` by default for exactly this reason.

## Notifications

Telegram delivery is off by default (`notifications.telegram.enabled: false`). To enable
it, set `enabled: true` in `asel.config.json` and provide, as environment variables **only —
never in the config file itself, and never committed to the repo**:

- `ASEL_TELEGRAM_BOT_TOKEN` — bot token (env var name configurable via `tokenEnv`)
- `ASEL_TELEGRAM_CHAT_IDS` — comma/whitespace-separated chat IDs (env var name
  configurable via `chatIdsEnv`)

`.env.example` documents these two variable names with placeholder values; the real `.env`
is git-ignored, so an actual token never lands in version control.

Messages are sent as Markdown first; if Telegram rejects the Markdown payload, the same
message is retried as plain text. Delivery never throws and never blocks the calling hook —
failures are reported on stderr (non-zero exit is never used for this) but swallowed for
control flow. Hook-driven events (ROUTEMAP state changes) go through
`.claude/hooks/notify-hook.js` automatically; events the LLM must send itself go through
`node "$CLAUDE_PROJECT_DIR/.claude/hooks/notify-cli.js" "<message>"`.

While `notifications.telegram.enabled` is `false` the hook is a complete no-op. Once enabled,
its first run seeds `.asel-notify-state` in the project root — a plain list of already-announced
ROUTEMAP events, so enabling notifications on a project with history does not flood the chat.
The file is local bookkeeping and should not be committed: a project install appends
`.asel-notify-state` to an existing `.gitignore` (it never creates one).

## Agents

Nineteen real subagent definitions live in `.claude/agents/`, each dispatched via the
`Agent` tool with model and effort rendered from `asel.config.json`:

| Agent | Role |
|---|---|
| `asel-planner` | Writes the story implementation plan (tasks, contracts, risks) and FIX-mode plans for bugs. |
| `asel-developer` | Implements one plan task at a time with tests, following the story plan and architecture. |
| `asel-gate-scout-analysis` | Read-only static analysis scout for the quality gate. |
| `asel-gate-scout-testbuild` | Runs build and tests for the quality gate; reports failures. |
| `asel-gate-scout-ui` | Browser-based UI scout for the quality gate. |
| `asel-gate-lead` | Consolidates scout findings, fixes as single writer, verifies, writes the gate report. |
| `asel-legacy-gate` | Single-agent quality gate fallback when the gate team cannot be used. |
| `asel-reviewer` | Consistency review of story code vs docs; writes the review report with findings. |
| `asel-phase-gate` | Phase boundary gate (deploy, smoke, E2E, compliance); writes the phase gate report. |
| `asel-devops` | Tunes infrastructure (Docker, DB, cache) after Phase 1's first story; writes an infra-tuning report. |
| `asel-setup-verifier` | Verifies a fresh setup works end to end; writes a setup-verification report. |
| `asel-deploy-engineer` | Builds and deploys via Makefile/compose on demand. |
| `asel-seed-generator` | Generates realistic seed data scripts. |
| `asel-e2e-tester` | Runs browser E2E passes and writes dated E2E reports. |
| `asel-test-hardener` | Raises test coverage and robustness after E2E. |
| `asel-perf-optimizer` | Measures and optimizes performance hotspots. |
| `asel-ui-polisher` | Polishes UI against design tokens and accessibility. |
| `asel-acceptance-tester` | Functional acceptance against USERTEST scenarios. |
| `asel-compliance-auditor` | Doc-vs-code compliance audit with a gap matrix. |

## Skills & modes

The `asel` skill is the orchestrator itself: invoking it detects the current mode from
`docs/ROUTEMAP.md` and the user's stated intent, then dispatches the matching phase file
and agents. It recognizes 21 modes, covering onboarding an existing codebase, planning,
development (normal, autopilot, and context-isolated headless loops), bugfixes, E2E &
polish, documentation, release, and mid-project checks (gap review, dev-readiness, UAT,
seed data, acceptance, browser E2E checks) and production maintenance.

Six utility skills are **user-only** — invocable by the person (`/asel-setup`, and so on)
but never by the orchestrator itself, enforced by the `skillGuard` hook and each skill's own
`user-invocable: true` / `disable-model-invocation: true` frontmatter:

| Skill | Purpose |
|---|---|
| `asel-setup` | First-time install of statusline, permissions and recommended settings. |
| `asel-help` | Internal reference card. |
| `asel-changelog` | Generates a changelog from git commits. |
| `asel-commit` | Smart commit: groups changes, writes a conventional-commit message. |
| `asel-checkup` | Project health check against current Asel standards, with fixes. |
| `asel-codex-review` | Runs an independent Codex CLI review and helps route findings. |

## Adding a project-specific rule

Drop a new file into `.claude/rules/<name>.md` with its own frontmatter:

```markdown
---
paths: ["backend/payments/**", "**/*.sql"]
---

# Payments Module Rules
...
```

Claude Code loads rules under `.claude/rules/` automatically and scopes them to matching
files via the `paths:` frontmatter; a rule with no frontmatter at all is always-on. Rules
shipped by Asel itself reference the shared `asel.config.json` glob lists via
`{{rules.<name>}}` placeholders, but a project-specific rule can just hardcode its own glob
array. `install.js` never overwrites a file it did not itself render, so a project-specific
rule is safe from being clobbered by a re-install; and `--check` only ever reports an
*untracked* file under `skills/`, `agents/`, `hooks/`, `rules/` as `"added"` when its path
contains `asel` (case-insensitive) — so a custom rule named e.g. `my-rules.md` is ignored by
`--check`, but naming it something like `asel-payments.md` would cause it to show up in the
`added` list.

## Development & tests

```bash
npm test                    # node --test "tests/**/*.test.js"  (115 tests)
npm run config:template     # regenerate asel.config.json from hooks/lib/config.js DEFAULTS
```

`npm run config:template` is how `asel.config.json` at the repo root stays in sync with the
`DEFAULTS` object in `.claude/hooks/lib/config.js` — edit `DEFAULTS`, then regenerate the
file, rather than hand-editing both.

## Windows notes

This project is developed on Windows with Git Bash. Claude Code's own hook runner invokes
hook commands through a bash shell even on Windows, so every hook command in this repo is
written as `node "$CLAUDE_PROJECT_DIR/.claude/hooks/<name>.js"` — a form Git Bash can execute
directly, with **no dependency on `jq`** or any other POSIX utility beyond `node` itself
(already required to run Claude Code).

Headless / detached execution (`.claude/hooks/lib/spawn-detached.js`) launches the target
directly with Node's `spawn` on every platform, resolving plain executable names against
`PATH` first. The one exception is a `.cmd`/`.bat` shim on Windows (for example an npm-linked
CLI): those can only be executed by `cmd.exe`, so they are launched via
`cmd.exe /d /s /c` with the full command line explicitly quoted, and only when every argument
is single-line — `.claude/hooks/lib/headless-format.js` reformats
`claude -p --output-format=stream-json` output in pure Node instead of a `jq` filter.

## Line endings

The repo ships a `.gitattributes` with `* text=auto eol=lf` (and `*.png`/`*.jpg` marked
`binary`) so every checkout normalizes to LF — this matters because the fence-balance and
frontmatter tests under `tests/` read files byte-wise, and a CRLF checkout would make every
line in every file look "modified" relative to what's committed. If a Windows clone shows
spurious modifications (e.g. `git status` listing files you haven't touched, or `--check`
reporting drift that isn't real), run:

```bash
git config core.autocrlf false
git checkout -- .
```

## Repository layout

```
asel/
  README.md
  CHANGELOG.md
  package.json                 # scripts: test, install:project, install:global, check
  asel.config.json             # template; copied into a project, single settings point
  .env.example                 # ASEL_TELEGRAM_BOT_TOKEN=, ASEL_TELEGRAM_CHAT_IDS=
  install.js                   # copy + config-driven frontmatter + settings.json merge
  .claude/
    skills/asel/                # orchestrator: SKILL.md, phases/, templates/, references/
    skills/asel-*/               # 6 user-only utility skills, 5 model-invocable skills
    agents/                      # asel-*.md, 19 subagent definitions
    rules/                       # scoped with paths: frontmatter
    hooks/                       # guard hooks + lib/ (config, input, evidence, notify, ...)
  tests/                         # node --test; fixtures/ with fake hook inputs and ROUTEMAPs
```

## Known limitations / roadmap

These are tracked but intentionally deferred — none block v0.1.0 usage:

- **PATHEXT-aware executable resolution.** `spawn-detached.js` resolves a bare command name
  against `PATH` trying `.exe`/`.cmd`/`.bat` in a fixed order; it does not yet honor a
  user's actual `PATHEXT` variable.
- **Error handling for an unresolvable command.** If the target executable cannot be found
  at all, the spawn currently fails without a clear message before a PID is printed.
- **Telegram null guard.** If a user's config sets `notifications.telegram` to `null`
  outright (rather than omitting it or setting `enabled: false`), the notify hook throws
  instead of treating it as disabled.

## License

No license file is included yet. Until one is added, all rights are reserved by the author.
