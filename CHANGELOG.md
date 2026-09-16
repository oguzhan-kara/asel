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
- story-done/setup/phase-gate guards apply an Edit virtually and diff whole documents, so surgical status-cell edits are detected.
- quality-scan scans renamed files and closes comment-prefix bypasses.
- headless mode no longer needs jq or nohup.
- fence-balance and line-limit tests guard every markdown file.
