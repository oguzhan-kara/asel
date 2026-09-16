---
name: asel-codex-review
description: Run an independent Codex CLI review of the current project at story, phase, or project scope. Codex writes a findings report; this skill summarizes and helps you route findings to asel bugfix/change. User-only — invoke via /asel-codex-review.
user-invocable: true
disable-model-invocation: true
effort: xhigh
---

# Asel Codex Review — Independent External Review

Dispatch an independent review pass via the OpenAI Codex CLI and translate the findings into asel bugfix/change actions.

## Rules

- **User-only** — only when user explicitly calls `/asel-codex-review`. Asel orchestrator MUST NEVER invoke this skill.
- Conversation language: Turkish. Report language: English.
- Codex runs `--sandbox read-only` — it cannot write files. The report is captured via `-o`.
- **End-to-end flow:** run Codex → summarize report → user triages → skill spawns asel via Skill tool for each triaged finding (auto mode is the default). Copy-paste fallback only when user explicitly opts out.
- If Codex CLI is missing or broken, STOP with a clear install instruction.

## Cross-Skill Path Convention

Templates are under this skill's own directory:
- Project path: `.claude/skills/asel-codex-review/templates/<name>.md`
- Global fallback: `~/.claude/skills/asel-codex-review/templates/<name>.md`

Short form `templates/X.md` resolves via the above.

## Process

Steps 0-3 (Pre-flight `codex --version` / `codex login` checks, through Compose Codex Prompt):

> Read `references/codex-review-steps-1.md` now and follow it, then return here.

Steps 4-11 (Invoke Codex, through Cleanup):

> Read `references/codex-review-steps-2.md` now and follow it, then return here.

## Anti-Patterns

| Bad | Why | Instead |
|-----|-----|---------|
| Forcing the user to copy-paste /asel prompts for every finding | Pure friction — user already made triage decisions, losing control is NOT the concern at that point | **Auto-spawn asel via Skill tool** as default (Step 10a). Copy-paste only as opt-out fallback |
| Spawning ALL findings in parallel via asel | Stories have inter-dependencies, parallel asel invocations conflict on ROUTEMAP/FIX numbering | ALWAYS sequential one-at-a-time (Step 10a loop) |
| Ignoring asel escalation/failure mid-loop | Bad finding silently breaks pipeline, later findings inherit broken state | STOP on ESCALATED/FAILED, ask user: continue/retry/stop |
| Let Codex write to arbitrary files | Codex might overwrite real code | ALWAYS `--sandbox read-only` |
| Run project-scope with default Bash timeout | Review can take 10+ minutes | Use `timeout: 600000` for phase/project |
| Trust Codex findings blindly | Codex may hallucinate locations | Require evidence quotes; skill preserves report file for audit |
| Delete report after triage | Lost audit trail | Report stays in `docs/reports/codex-review/` |
| Invoke from within asel orchestrator | Skill is user-manual by design | Asel must never call this skill |

## Integration Notes

- **No changes required to asel skill.** The `/asel bugfix` and `/asel change` modes already accept free-form context — the Skill-tool invocation passes the finding details as `args`, asel picks them up like any manual `/asel bugfix <context>` call.
- **Sequencing:** auto mode processes findings one at a time. Each asel invocation runs its full pipeline (Plan → Dev → Gate → Commit for bugfix; or Change Analyst → Plan → user approval → dispatch for change) before the next finding starts. Expect minutes-to-tens-of-minutes per finding.
- **Context growth:** each asel invocation stays in the current session's conversation context. After processing 3-5 findings, context can get heavy — user can `/clear` between batches if needed.
- **User escape hatch:** copy mode (10b) and stop mode (10c) remain available. If a user prefers manual control for sensitive findings, they can opt out at the Step 10 prompt.
