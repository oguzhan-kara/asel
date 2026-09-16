# Asel

Configurable project lifecycle orchestrator for Claude Code. Successor to Amil.

`.claude/` in this repo is the **source tree**; it contains `{{placeholders}}` and is
rendered into a project by `node install.js --project <dir>`. Do not use it unrendered.

See `docs/superpowers/specs/2026-09-16-asel-design.md`.

Requires Node.js ≥18. Zero runtime dependencies — `npm install` has nothing to fetch.

## Install

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

## Configure

Every top-level key in `asel.config.json` (see `.claude/hooks/lib/config.js` for the exact
defaults):

- `language` — `{ conversation, documents }` IETF-ish codes (e.g. `tr`/`en`) for which
  language the orchestrator talks to the user in versus which language it writes files in.
- `paths` — where project documents live: `docs`, `routemap`, `stories`, `reports`,
  `usertest`, `claudeMd`. Hooks and agents read these instead of hardcoding paths.
- `workflow` — process switches: `autopilot`, `maxRedispatch` (escalation cap, rendered into
  the escalation-ladder prose via `{{workflow.maxRedispatch}}`) and `coAuthor` (git trailer,
  rendered into commit templates via `{{workflow.coAuthor}}`). `reviewBeforeCommit` and
  `phaseGateRequired` are **reserved — documented intent, not yet enforced by a hook**.
- `agents` — per-agent `{ model, effort }` (some also add `escalationModel`) for all 19
  subagents; rendered verbatim into each agent's frontmatter at install time.
- `guards` — per-guard `{ enabled, level }` (plus guard-specific extras such as
  `qualityScan.skipPaths` and `skillGuard.userOnlySkills`); see the Guards table below.
- `notifications` — currently `telegram: { enabled, tokenEnv, chatIdsEnv, timeoutMs }`.
- `rules` — named glob lists (`backend`, `frontend`, `infra`) that scoped rules reference
  via `{{rules.<name>[,<name>...]}}` placeholders so a rule can apply to more than one area.

**Resolution order**: `<project>/asel.config.json` → `~/.claude/asel.config.json` →
built-in defaults. The first file found wins outright (its values are deep-merged over the
defaults; later candidates are not merged in). If the first candidate found contains
invalid JSON, it is skipped with a warning and the next candidate in the order is tried.

## Notifications

Telegram delivery is off by default (`notifications.telegram.enabled: false`). To enable
it, set `enabled: true` in `asel.config.json` and provide, as environment variables (never
in the config file itself):

- `ASEL_TELEGRAM_BOT_TOKEN` — bot token (env var name configurable via `tokenEnv`)
- `ASEL_TELEGRAM_CHAT_IDS` — comma/whitespace-separated chat IDs (env var name
  configurable via `chatIdsEnv`)

Messages are sent as Markdown first; if Telegram rejects the Markdown payload, the same
message is retried as plain text. Delivery never throws and never blocks the calling hook —
failures are reported (stderr, non-zero exit is never used for this) but swallowed for
control flow. Hook-driven events (ROUTEMAP state changes) go through
`.claude/hooks/notify-hook.js` automatically; events the LLM must send itself go through
`node "$CLAUDE_PROJECT_DIR/.claude/hooks/notify-cli.js" "<message>"`.

While `notifications.telegram.enabled` is `false` the hook is a complete no-op. Once enabled,
its first run seeds `.asel-notify-state` in the project root — a plain list of already-announced
ROUTEMAP events, so enabling notifications on a project with history does not flood the chat.
The file is local bookkeeping and should not be committed: a project install appends
`.asel-notify-state` to an existing `.gitignore` (it never creates one).

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
attached to a `PostToolUse` event (the tool already ran), it is downgraded to `warn` and the
note is printed by the guard that warns (it appears in that hook's stderr, not anywhere else); `phaseGateGuard` is `warn` by default
for exactly this reason.

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

## Development

```bash
npm test                    # node --test "tests/**/*.test.js"
npm run config:template     # regenerate asel.config.json from hooks/lib/config.js DEFAULTS
node scripts/port-from-amil.js <AMIL_SRC> <AMIL_RULES_DIR>  # one-time Amil -> Asel port
```

`npm run config:template` is how `asel.config.json` at the repo root stays in sync with the
`DEFAULTS` object in `.claude/hooks/lib/config.js` — edit `DEFAULTS`, then regenerate the
file, rather than hand-editing both.

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

## Windows note

This project is developed on Windows with Git Bash. Claude Code's own hook runner invokes
hook commands through a bash shell even on Windows, so every hook command in this repo is
written as `node "$CLAUDE_PROJECT_DIR/.claude/hooks/<name>.js"` — a form that Git Bash can
execute directly, with **no dependency on `jq`** or any other POSIX utility beyond `node`
itself (already required to run Claude Code). Headless / detached execution follows the
same rule: `.claude/hooks/lib/spawn-detached.js` launches a detached child process (via
`cmd.exe /d /s /c` on Windows, a plain `spawn` elsewhere) instead of shelling out to `nohup`,
and `.claude/hooks/lib/headless-format.js` reformats `claude -p --output-format=stream-json`
output in pure Node instead of a `jq` filter.
