# Strict Protocol Compliance

<HARD-GATE>

## Zero Tolerance for Step Skipping

You MUST execute every protocol step in exact order. This is non-negotiable regardless of:
- Context window pressure (high usage %)
- Perceived simplicity of the task
- Time pressure or user urgency
- Repeated similar work ("I already know how this goes")
- Model confidence ("this step won't find anything")

## Context Pressure Protocol

- **NEVER stop, pause, or warn about context usage** — autocompact handles it automatically
- **NEVER suggest `/clear`** — it breaks AUTOPILOT flow
- **NEVER compress steps, merge steps, or skip steps** regardless of context level
- **NEVER abbreviate agent outputs or skip agent dispatches**
- **NEVER say** "context yüksek", "context dolmak üzere", "context baskısı" — these are not your concern
- Keep ROUTEMAP + CLAUDE.md updated at every step transition (standard protocol, not extra work for context)
- If autocompact triggers mid-story → read ROUTEMAP Step column → resume from that step. This is seamless — do NOT announce it to user

## Mandatory Steps — Never Skip

### Planning Phase
Every step (1→9) executes fully. No "this project is simple, skip gap analysis."

### Development Phase (per story)
Full pipeline: **Plan (embedded QG) → Dev (waves) → Lint → Gate → Review + Finding Resolution → Commit (single unified commit) → Handoff**
- Gate is NEVER replaced by a manual `tsc` or `npm test`
- Review runs BEFORE Commit (sequential, not parallel)
- Review is NEVER skipped because "Gate passed clean"
- Commit is a SINGLE commit per story — no intermediate `docs(...)` or `fix(...)` commits inside Step 4
- Step-log (`STORY-NNN-step-log.txt`) and attempts.log MUST be appended at every step; `story-done-guard.sh` hook blocks DONE without them

### AUTOPILOT Mode (per story)
Same pipeline as Normal Mode: **Plan → Dev (waves) → Lint → Gate → Review → Commit → Handoff**
- Ana Asel dispatches ALL steps directly (no intermediate orchestrator)
- Stories are NEVER batched or parallelized
- Autocompact handles context — NEVER stop, pause, or warn about context
- Attempt counter hard bound: 3 re-dispatches per story, enforced via `attempts.log`

### Phase Boundaries
Phase Gate is MANDATORY between every phase transition. No exceptions.

## Self-Check Before Proceeding

Before moving to the next step, verify:
1. Current step output exists (file written, report generated)
2. ROUTEMAP updated with current step status
3. CLAUDE.md session section reflects current position
4. No step was summarized instead of executed

If ANY of these fail → you skipped something. Go back and complete it.

</HARD-GATE>
