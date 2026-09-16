# Asel Changelog

## 0.1.0 — 2026-09-16

### Highlights
- Hooks are single-pass Node.js scripts with no external binary dependency (no `jq`); the
  quality scanner collects every finding in one pass instead of stopping early.
- Guards are configurable per project in `asel.config.json` (enable / level); guards attached
  to a `PostToolUse` event can only warn, never block, since the tool has already run.
- Telegram token and chat IDs come from environment variables only, never from the config
  file or the repo; notifications are off by default.
- 19 agents are real subagent definitions in `.claude/agents/` with tools, model and effort
  rendered from config — no hand-pasted prompt files.
- Rules are scoped with `paths:` frontmatter so they only load for matching files;
  project-specific rules stay out of the shipped set.
- All workflow files are ≤400 lines; long reference material lives under
  `skills/asel/references/` and is loaded on demand.
- Utility skills use valid `user-invocable` / `disable-model-invocation` frontmatter; setup
  writes valid permission rules and never replaces an existing statusline.
- `install.js` renders placeholders, merges `settings.json` without touching foreign hooks,
  and `--check` reports drift between the source tree and an installed copy.
- `storyDoneGuard`, `setupGuard` and `phaseGateGuard` apply an edit virtually and diff whole
  documents, so surgical status-cell edits are detected correctly.
- `qualityScan` scans renamed files and closes comment-prefix bypasses.
- Headless mode needs neither `jq` nor `nohup` — a pure-Node formatter and detached spawn.
- Fence-balance and line-limit tests guard every Markdown file in the repo.
