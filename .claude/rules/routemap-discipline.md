# ROUTEMAP Discipline

<HARD-GATE>
Do NOT skip any phase. Do NOT generate documents without user approval. Do NOT start development without completed planning docs. Every agent MUST update docs/brainstorming/decisions.md when making significant decisions. Every story MUST result in a buildable, deployable project.

ROUTEMAP IS THE SINGLE SOURCE OF TRUTH. It MUST be:
- Created FIRST (Step 0) before any skill dispatch
- Updated by EVERY skill/agent upon completion (planning step status, story status, changes)
- Updated IMMEDIATELY — never deferred, never "later"
- The ONLY place to check project progress — not file existence, not guessing

If ROUTEMAP is not updated, the step is NOT complete. No exceptions.
</HARD-GATE>

## Step Completion Protocol

<EXTREMELY-IMPORTANT>
When a step/phase COMPLETES, update ROUTEMAP and CLAUDE.md IMMEDIATELY — BEFORE asking the user about the next step. The sequence is:

1. **Step finishes** → IMMEDIATELY update ROUTEMAP (mark DONE with date)
2. **IMMEDIATELY update CLAUDE.md** session section
3. **Display progress bar** with updated status
4. **THEN ask user** about next step: "Step N tamamlandı. Sonraki adıma geçeyim mi?"

WRONG order (causes data loss on compaction):
```
Step finishes → "Geçeyim mi?" → user says ok → THEN update ROUTEMAP
```

RIGHT order:
```
Step finishes → update ROUTEMAP DONE → update CLAUDE.md → show progress → "Geçeyim mi?"
```

This ensures that if compaction or /clear happens between step completion and user response, the DONE status is already persisted.
</EXTREMELY-IMPORTANT>

## Step Transition Protocol

When STARTING a new step, execute these 4 actions in order:

1. **Update ROUTEMAP** → Set Step column to new step name (IN PROGRESS)
2. **Update CLAUDE.md** → Set `## Asel Session` section:
   ```
   ## Asel Session
   - Story: STORY-NNN
   - Step: [new step name]
   - Mode: [current mode]
   ```
3. **Verify CLAUDE.md write landed** (Bash — deterministic, catches silent write failures):
   ```bash
   grep -q "^- Step: [new step name]" CLAUDE.md || echo "WARN: CLAUDE.md session did not register Step=[new step name]"
   ```
4. **Display progress bar** → Show the progress indicator

All 4 are mandatory. Skipping CLAUDE.md update (or failing to verify it) means compaction recovery will fail.

## Evidence Trail (Per-Story)

Two persistent files accompany every story through the dev cycle. Both survive context compaction because they live on disk:

### Step-Log — `docs/stories/phase-N/STORY-NNN-step-log.txt`

At the END of each dev-cycle step (PLAN, DEV, LINT, GATE, REVIEW, COMMIT, POSTPROC), Ana Asel appends one line:

```
STEP_<num> <NAME>: EXECUTED | items=<count> | evidence=<file-or-hash> | result=PASS|FAIL
```

`story-done-guard.sh` hook (PreToolUse Edit|Write) reads this file when a story row is being marked `[x] DONE` in ROUTEMAP. If any of the core step names (PLAN, DEV, GATE, REVIEW, COMMIT) are missing → the ROUTEMAP edit is BLOCKED. This makes step-skipping a mathematical impossibility, not a discipline problem.

### Attempts Log — `docs/stories/phase-N/STORY-NNN-attempts.log`

Before EVERY re-dispatch during an escalation loop (Gate, Developer on gate-escalation, Reviewer on missing-report), Ana Asel appends one line:

```
<ISO-8601 timestamp> <AGENT> <REASON>
```

Before dispatching, read the count:

```bash
wc -l < docs/stories/phase-N/STORY-NNN-attempts.log 2>/dev/null || echo 0
```

**Hard limit: 3 total re-dispatches per story.** Exceeding this count → STOP the escalation ladder, set ROUTEMAP Step = `Escalated`, present the issue to the user. This bound is mathematical — the LLM cannot talk itself into a 4th attempt because the counter is persisted to disk.

Both files are per-story (filename includes story ID) — they are fresh for each new story, no reset needed.

## ROUTEMAP Status Tracking

ROUTEMAP.md is the single source of truth for project progress. It MUST be updated:
- When a story starts → mark `[~] IN PROGRESS`, set Step to `Plan`
- **At EVERY step transition** → update Step column (Plan → Dev → Lint → Gate → Commit → Review → Handoff)
- When a story completes → mark `[x] DONE (YYYY-MM-DD)`, set Step to `—`
- When a phase completes → mark phase `[DONE]` and update project status
- Completion percentage updated after every story
- `Current step` in header updated at every transition

<EXTREMELY-IMPORTANT>
Step column is the RESUME POINT. After `/clear`, compact, or any session break, asel reads this column to know exactly where to continue. If Step is not updated, resume will be inaccurate.

CLAUDE.md survives compaction (always loaded). ROUTEMAP is source of truth, CLAUDE.md is safety net. Each project has its own CLAUDE.md — no cross-project conflicts. On story completion, clear all values to `—`.
</EXTREMELY-IMPORTANT>
