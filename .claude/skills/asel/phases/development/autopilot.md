# AUTOPILOT Mode — Direct Execution Architecture

> Ana Asel executes ALL steps directly: Plan → Dev (wave) → Lint → Gate → Review → Commit.
> No Story Runner. No nested agent depth issues. Autocompact handles context — never stop.
> This guarantees full pipeline execution with wave-parallel dev dispatch.

<EXTREMELY-IMPORTANT>
AUTOPILOT rules — violations are PIPELINE FAILURES:

1. **Ana Asel executes everything directly**: Plan, Dev (wave dispatch), Lint, Gate, Commit, Review — all dispatched by Ana Asel. No intermediate orchestrator agent.
2. **Stories are SEQUENTIAL**: One story at a time. Story A must complete before Story B starts.
3. **Full pipeline per story**: Plan (QG) → Dev (waves) → Lint → Gate → Review + Finding Resolution → Commit (single unified commit). SEQUENTIAL, not parallel. NO shortcuts. NO skipping any step.
4. **Context management**: Autocompact handles context automatically. NEVER stop, pause, warn, or suggest `/clear` due to context. Just keep working.

If you catch yourself about to: skip Gate dispatch, skip Reviewer, or run stories in parallel — STOP. You are violating the pipeline.
</EXTREMELY-IMPORTANT>

## How It Works

```
AUTOPILOT STORY CYCLE (Direct Execution)
═══════════════════════════════════════════════════════════════

  ANA ASEL (direct dispatch — all steps):
  ┌──────────────────────────────────────────────────────┐
  │  Step 1:    Planner (opus, embedded Quality Gate)    │
  │  Step 2:    Developers (wave = 1 response, N tasks)  │
  │             Inter-wave build check (deterministic)   │
  │  Step 2.5:  Pre-Gate Lint (grep hardcoded values)    │
  │  Step 3:    Gate agent (opus, UI pass skip if no UI) │
  │             Escalation: attempts.log counter enforced│
  │  Step 4:    Review + Finding Resolution (sonnet)     │
  │             No intermediate commits — edits staged   │
  │  Step 5:    Commit (single unified commit)           │
  │  Step 6:    Post-processing (ROUTEMAP, progress)     │
  └──────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════
```

AUTOPILOT and normal DEV mode use the SAME step execution from `phases/development/dev-cycle.md`. Two differences: (1) AUTOPILOT does NOT wait for user between stories inside the current phase; (2) AUTOPILOT is SCOPED to a single phase — it stops after Phase Gate PASS, not after all phases are done.

## Activation

1. Read ROUTEMAP → determine the current dev phase (first phase that is NOT marked `[DONE]` and contains at least one non-DONE story). AUTOPILOT will run ONLY this phase.
2. Find first `[ ] PENDING` or `[~] IN PROGRESS` story inside that phase.
3. Verify: Planning Phase must be `COMPLETE`. If not → STOP, warn user.
4. Display autopilot banner (phase-scoped):

```
═══ AUTOPILOT — Phase N ═══════════════════════════════════════════════
Phase N: [Name] — 0/X stories (0%)
[ ] STORY-001 → [ ] STORY-002 → [ ] STORY-003 → ...
Scope: CURRENT PHASE ONLY. Stops after Phase Gate PASS.
Starting autonomous execution...
═══════════════════════════════════════════════════════════════════════
```

## Story Loop

<EXTREMELY-IMPORTANT>
AUTOPILOT processes ONLY THE CURRENT PHASE. It does NOT automatically continue into the next phase.

When all stories in the current phase are DONE → dispatch Phase Gate → on PASS, STOP and present a summary. The user must explicitly say "otopilot" again (or equivalent) to start the next phase.

Rationale: phase boundaries are natural checkpoints for user review — test deployment, screenshots, demo, decide whether to continue. Auto-continuing across phases would rob the user of that checkpoint.
</EXTREMELY-IMPORTANT>

**Phase scope detection:**
1. Read ROUTEMAP → determine which development phase is currently active (first phase that is NOT `[DONE]` and contains at least one non-DONE story).
2. AUTOPILOT will process ONLY stories inside that phase.
3. When the phase finishes, AUTOPILOT runs Phase Gate then STOPS.

**Story Loop (current phase only):**

For each PENDING or NEEDS_REPLAN story in the current phase (ROUTEMAP order, priority: NEEDS_REPLAN first, then PENDING):

### Steps 1–2.5: Plan + Dev + Lint

Execute Steps 1 through 2.5 from `dev-cycle.md` — same steps, same wave logic, same inter-wave builds, same step-log + attempts.log discipline. The only difference: **skip user approval of plan** (AUTOPILOT trusts Planner + Quality Gate).

1. Update ROUTEMAP: mark story `[~] IN PROGRESS`, Step = `Plan`
2. Update CLAUDE.md session: Story = STORY-NNN, Step = Plan, Mode = AUTOPILOT
3. Create (or reset for fresh story) step-log + attempts log:
   ```bash
   : > docs/stories/phase-N/STORY-NNN-step-log.txt
   : > docs/stories/phase-N/STORY-NNN-attempts.log
   ```
4. Display progress bar
5. Dispatch Planner → plan file (Step 1 from dev-cycle.md) — Planner self-validates via embedded Quality Gate → append step-log `STEP_1 PLAN: EXECUTED ...`
6. Dev wave dispatch (Step 2 from dev-cycle.md) — each wave = ONE response with N parallel Agent tool calls (concurrency point, same pattern as scouts in Step 3). Sequential dispatch = protocol violation. Failed tasks (NEEDS_CONTEXT/BLOCKED) re-dispatched post-wave, sequentially. → append step-log `STEP_2 DEV: EXECUTED ...`
7. Pre-Gate Lint (Step 2.5 from dev-cycle.md) → append step-log `STEP_2.5 LINT: EXECUTED ...`

### Step 3: Gate (Ana Asel direct dispatch)

Update ROUTEMAP: Step = `Gate`

**First Gate dispatch:**
1. **Dispatch 3 scouts IN PARALLEL** (one response, 3 Agent tool calls, `subagent_type: "general-purpose"`) — scout prompts reference `~/{{aselRoot}}/agents/gate-team/scout-{analysis,testbuild,ui}.md`. See `phases/development/dev-cycle.md` Step 3 for full dispatch prompt templates.
2. **Collect all 3 findings blocks**. Retry any failed scout once.
3. **Dispatch Gate Team Lead** via Agent tool with story/plan paths + all 3 raw scout findings blocks embedded in prompt. Lead does merge → FIX → verify → writes `docs/stories/phase-N/STORY-NNN-gate.md` → returns summary.
   - Legacy fallback: `asel-legacy-gate` (monolithic, no team) if team architecture misbehaves.
4. **Verify gate report exists** (MANDATORY — Bash tool, NOT LLM judgment):
   ```bash
   test -s docs/stories/phase-N/STORY-NNN-gate.md && echo "GATE_REPORT_EXISTS" || echo "GATE_REPORT_MISSING"
   ```
   - `GATE_REPORT_EXISTS` → proceed to parse result
   - `GATE_REPORT_MISSING` → append attempts.log + re-dispatch Team Lead (with same scout findings) + explicit Write instruction
   - Still missing after retry → Update ROUTEMAP Step = `Failed`, STOP autopilot
5. Parse Gate result:
   - **PASS** → append step-log `STEP_3 GATE: EXECUTED ... | result=PASS`, proceed to Step 4
   - **ESCALATE** → Escalation ladder (below)

**Escalation ladder (attempt counter enforced — identical to dev-cycle.md):**

1. **Read attempt count first** (Bash):
   ```bash
   ATTEMPTS=$(wc -l < docs/stories/phase-N/STORY-NNN-attempts.log 2>/dev/null || echo 0)
   ```
   - If `ATTEMPTS >= 3` → STOP escalation, set ROUTEMAP Step = `Escalated`, enter ESCALATED handling. Hard bound, no loop.
2. **Append attempts.log** (`<ts> Developer opus gate-escalation`)
3. Read Gate's escalation findings from gate report
4. Re-dispatch Developer via Agent tool
   - Pass: plan file path, gate findings, project root
5. **Append attempts.log** (`<ts> Gate opus re-check`)
6. Re-dispatch Gate via Agent tool
7. Parse second Gate result:
   - **PASS** → append step-log, proceed to Step 4
   - **ESCALATE** → Update ROUTEMAP Step = `Escalated`, enter ESCALATED handling

```
Escalation Summary (attempt-counter enforced):
Gate internal fix (2 loops) → ESCALATE
  → attempts.log count check (must be < 3)
  → Ana Asel re-dispatch Developer (opus) + append attempts.log
    → Re-dispatch Gate (opus) + append attempts.log
      → PASS → continue
      → ESCALATE → present to user (3 options)
Hard bound: 3 total re-dispatches per story. Source of truth: attempts.log.
```

### Step 4: Review + Finding Resolution (sequential, BEFORE commit)

Update ROUTEMAP: Step = `Review`

<EXTREMELY-IMPORTANT>
Review runs BEFORE Commit. AUTOPILOT uses the SAME sequential protocol as Normal DEV — no intermediate commits inside Step 4. All Review doc edits, Story Impact edits, and Finding Resolution fixes are staged and land in Step 5's single unified commit. If you find yourself running `git commit` inside Step 4, STOP — you are violating the sequential protocol.
</EXTREMELY-IMPORTANT>

**Phase 1: Doc Review (sonnet)**

1. Dispatch Reviewer via Agent tool
   - Reviewer runs all checks (#1-#14), but #1 and #10 are REPORT ONLY (no story file edits)
2. **Verify review report exists** (MANDATORY — Bash tool):
   ```bash
   test -s docs/stories/phase-N/STORY-NNN-review.md && echo "REVIEW_EXISTS" || echo "REVIEW_MISSING"
   ```
   - `REVIEW_EXISTS` → proceed
   - `REVIEW_MISSING` → append attempts.log + re-dispatch Reviewer (sonnet, explicit Write instruction)
   - Still missing → append attempts.log + re-dispatch with an explicit opus model override
   - Still missing (attempts.log ≥ 3 total) → STOP autopilot, escalate to user
3. **Do NOT commit Review's doc edits here.** They land in Step 5.

**Phase 2: Story Impact (opus — deterministic trigger)**

4. **Bash trigger check**:
   ```bash
   UPDATED=$(grep -cE '\| *UPDATED *\|' docs/stories/phase-N/STORY-NNN-review.md 2>/dev/null)
   ```
5. If `UPDATED > 0` → dispatch Story Impact agent (opus) with review report + affected story paths
6. Do NOT commit story file edits here — they land in Step 5.

**Phase 3: Finding Resolution (MANDATORY)**

Same protocol as `dev-cycle.md` Step 4 Phase 3. Parse review report for findings in 5 sections, resolve each per category (FIX / DEFER to Tech Debt / ESCALATE).

7. **Deterministic unresolved check** (Bash — same grep `story-done-guard.sh` runs):
   ```bash
   UNRESOLVED=$(grep -cE '\| +(ESCALATED|OPEN|NEEDS_ATTENTION) +\|' docs/stories/phase-N/STORY-NNN-review.md 2>/dev/null)
   ```
8. **If `UNRESOLVED > 0`** → loop fix until zero. AUTOPILOT auto-select: non-CRITICAL → FIX now, CRITICAL → DEFER to ROUTEMAP Tech Debt.
9. All finding file edits stay UNCOMMITTED — they land in Step 5.
10. Append step-log `STEP_4 REVIEW: EXECUTED | items=<findings> | evidence=review.md | result=PASS`.
11. Proceed to Step 5.

### Step 5: Commit (single unified commit)

Update ROUTEMAP: Step = `Commit`

<EXTREMELY-IMPORTANT>
ONE commit per story. Captures: story code (Step 2) + Review doc edits (Step 4 Phase 1) + Story Impact edits (Phase 2) + Finding Resolution fixes (Phase 3) + USERTEST + decisions + bug-patterns + ROUTEMAP Tech Debt entries. No intermediate commits.
</EXTREMELY-IMPORTANT>

1. **Safety gate** — review.md must exist (handles resume from old parallel flow):
   ```bash
   test -s docs/stories/phase-N/STORY-NNN-review.md || { echo "ERROR: review.md missing — back to Step 4" >&2; }
   ```
2. Update `docs/USERTEST.md` — append manual test scenarios for this story
   - If story has no UI → add "Bu story icin manuel test senaryosu yok (backend/altyapi)" note
3. Update `docs/brainstorming/decisions.md` — append any decisions made during development
4. **Bug Pattern entry with dedup** (if Gate fixed issues or escalation occurred):
   - Read gate report for fixes applied
   - **Bootstrap `bug-patterns.md` if missing**:
     ```bash
     F=docs/brainstorming/bug-patterns.md
     [ -f "$F" ] || { mkdir -p docs/brainstorming; printf '# Bug Patterns & Prevention Rules\n\nRuntime knowledge base of bugs that have occurred and rules to prevent them.\nRead by: Planner (warnings), Gate/Scouts (compliance check), Developer (awareness).\n\n## Patterns\n\n' > "$F"; }
     ```
   - For each non-trivial fix:
     - **Dedup check**: `grep -cF "Pattern: [description]" docs/brainstorming/bug-patterns.md`
     - If zero → append to `bug-patterns.md` under `## Patterns`:
       `- [DATE] PAT-NNN [STORY-NNN]: [pattern] — Root Cause: [cause] — Prevention: [rule] — Affected: [layer]`
     - If present → skip (no duplicate noise)
   - Skip if Gate passed with zero fixes
5. **Stage everything** (story code + Review edits + Finding fixes + USERTEST + decisions + bug-patterns + ROUTEMAP):
   ```
   git add -A
   ```
6. **Single git commit**:
   ```
   git commit -m "feat(STORY-NNN): [story title]

   - [list of key changes]
   - [endpoints added/modified]
   - [migrations if any]
   - [tests added]
   - Review findings resolved: <count> (deferred: <count>)

   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```
7. Capture commit hash, append step-log `STEP_5 COMMIT: EXECUTED | items=1 commit=<hash> | result=PASS`.

### Step 6: Post-Processing

**Artifact verification** (before marking DONE — note: `story-done-guard.sh` hook will re-verify these at the ROUTEMAP edit, but running the check here catches issues early):
```bash
# 4 artifact files + step-log
for f in plan gate review; do
  ls docs/stories/phase-*/*STORY-NNN*${f}.md 2>/dev/null | head -1
done
ls docs/stories/phase-*/*STORY-NNN*step-log.txt 2>/dev/null | head -1
# USERTEST entry
grep -q "^## ${STORY}:" docs/USERTEST.md
# Step-log completeness
for S in PLAN DEV GATE REVIEW COMMIT; do
  grep -qE "STEP_[0-9.]*[ _]${S}[^A-Za-z].*EXECUTED" docs/stories/phase-*/*STORY-NNN*step-log.txt \
    || echo "MISSING step-log entry: ${S}"
done
# Review findings unresolved
grep -cE '\| +(ESCALATED|OPEN|NEEDS_ATTENTION) +\|' docs/stories/phase-*/*STORY-NNN*review.md
```
ALL 4 artifact files must exist + step-log must contain PLAN/DEV/GATE/REVIEW/COMMIT EXECUTED + zero unresolved findings. If any missing → fix before marking DONE. The `story-done-guard.sh` hook is the last line of defense; fix the issue locally first to avoid a blocked edit.

Append step-log (post-processing entry, for symmetry with dev-cycle.md):
```bash
echo "STEP_6 POSTPROC: EXECUTED | items=6 checks | evidence=persistence-verified | result=PASS" \
  >> docs/stories/phase-N/STORY-NNN-step-log.txt
```

**Status update:**
- Update ROUTEMAP: mark story `[x] DONE (YYYY-MM-DD)`, Step = `—`
- Update completion percentage
- Update CLAUDE.md session: clear values
- **Infra Tuning + Setup Verification (Phase 1 first story ONLY — MANDATORY, ZERO EXCEPTIONS)**:
  If first story of Phase 1: dispatch DevOps Agent (`asel-devops`, mode: post-setup) → then Setup Verifier. Skip for all other phases.
  Do NOT rationalize skipping: "no backend yet", "already tuned", "Docker not running" are NOT valid excuses. Infra containers (PG, Redis, Kafka) ARE what gets tuned. DISPATCH THE AGENTS.
- Display updated progress
- Autocompact handles context seamlessly — do NOT stop, warn, or suggest /clear
- **Phase boundary check**: If all stories in the CURRENT phase are DONE → exit Story Loop → Phase Boundary (Phase Gate + STOP)
- Otherwise → **IMMEDIATELY continue to next story in the SAME phase (back to Step 1)**
- **DO NOT cross phase boundaries autonomously.** If the next PENDING story belongs to a different phase than the one AUTOPILOT was started for → exit Story Loop → Phase Boundary.

<EXTREMELY-IMPORTANT>
### AUTOPILOT DOES NOT WAIT BETWEEN STORIES — BUT STOPS AT PHASE BOUNDARY

**Within the current phase**: After a story completes (DONE), you MUST immediately proceed to the next PENDING story in the SAME phase. Do NOT:
- Ask "Devam edeyim mi?" / "Shall I continue?"
- Present a handoff message and wait
- Show "Sonraki story için hazırım"
- Pause for any reason

These are NORMAL DEV MODE behaviors. Within the phase, the loop is CONTINUOUS until:
- All stories in the CURRENT phase are DONE → run Phase Gate → STOP (present summary, wait for user)
- A story ESCALATES (Gate found unfixable issues) → STOP
- A story FAILS (build/test broken) → STOP
- Autocompact handles context — never stop for context

**At the phase boundary**: AUTOPILOT is SCOPED to one phase. When the last story of the current phase completes → run Phase Gate → on PASS, STOP and present a summary. The user must explicitly re-issue "otopilot" to start the next phase. Do NOT autonomously start a new phase.

If you catch yourself about to ask the user "devam?" INSIDE the current phase → STOP. You are in AUTOPILOT. Read ROUTEMAP → next PENDING story in SAME phase → continue the loop.

If you catch yourself about to dispatch a Planner for a story in the NEXT phase after Phase Gate PASS → STOP. AUTOPILOT is done. Present the summary and wait for user.

Read CLAUDE.md session → Mode = AUTOPILOT confirms you are in autopilot mode.
</EXTREMELY-IMPORTANT>

> **Telegram**: Notifications (DONE, ESCALATED, FAILED, Phase DONE) are sent automatically by `notify-hook.sh` when ROUTEMAP is edited. Do NOT send manually.

### ESCALATED Handling

- Update ROUTEMAP: Step = `Escalated`
- STOP autopilot loop
- Present escalated issues to user
- Offer 3 options:
  1. `"düzelt"` → User fixes manually → `"devam"` → re-dispatch from Step 3 (Gate)
  2. `"atla"` → Mark story `[S] SKIPPED` → continue to next
  3. `"dur"` → Stop autopilot entirely
- Wait for user decision

### FAILED Handling

- Update ROUTEMAP: Step = `Failed`
- STOP autopilot loop
- Display error details
- Wait for user intervention

## Phase Boundary — Phase Gate Testing

When all stories in current phase are DONE:

1. Display phase complete banner
2. Dispatch Phase Gate Agent:
   - Read `asel-phase-gate`
   - Dispatch via Agent tool
   - Pass: phase number, project root, CLAUDE.md path

3. **Evidence verification (MANDATORY — Bash tool, NOT LLM judgment):**

   After Phase Gate returns, Ana Asel MUST verify evidence BEFORE parsing status:

   ```bash
   # 1. Step log exists and has all steps
   PHASE=N
   EVIDENCE="docs/e2e-evidence/phase-$PHASE"
   test -s "$EVIDENCE/step-log.txt" && echo "STEP_LOG_EXISTS" || echo "STEP_LOG_MISSING"
   
   # 2. Count executed steps (must be 8+: steps 1-7 plus 2.5 and 3.5 and 6.5)
   grep -c "EXECUTED" "$EVIDENCE/step-log.txt" 2>/dev/null || echo "0"
   
   # 3. Check for NOT_EXECUTED steps
   grep "NOT_EXECUTED" "$EVIDENCE/step-log.txt" 2>/dev/null || echo "NONE"
   
   # 4. Evidence files exist
   ls "$EVIDENCE"/*.png 2>/dev/null | wc -l | tr -d ' '
   ls "$EVIDENCE"/*.txt 2>/dev/null | wc -l | tr -d ' '
   
   # 5. Gate report exists
   test -s "docs/reports/phase-$PHASE-gate.md" && echo "REPORT_EXISTS" || echo "REPORT_MISSING"
   ```

   **Verification rules:**
   - `STEP_LOG_MISSING` → Phase Gate FAIL (did not produce evidence)
   - Any `NOT_EXECUTED` step → Phase Gate FAIL (skipped steps)
   - `SKIPPED_NO_UI` is valid ONLY for Steps 3, 4, 5, 6 — and ONLY when phase has no UI stories
   - **If phase HAS UI stories** (check story files for screens/components): zero `.png` files → Phase Gate FAIL
   - **If phase has NO UI stories**: zero `.png` files is acceptable (UI steps should be `SKIPPED_NO_UI`)
   - `REPORT_MISSING` → Phase Gate FAIL
   - If Phase Gate reported PASS but evidence verification says FAIL → **override to FAIL**

   If evidence verification fails, re-dispatch Phase Gate ONE more time with explicit instruction:
   "Your previous run did NOT produce required evidence. Steps were skipped. You MUST execute ALL 8 steps with Playwright MCP tools ({{playwrightPrefix}}__browser_*) automation. Evidence directory and step-log.txt are MANDATORY."

   If second run also fails evidence verification → FAIL the phase.

4. Parse `PHASE_GATE_STATUS` + `STEP_EXECUTION_LOG`:

   **PASS (and evidence verified):**
   - Update ROUTEMAP: mark phase as `[DONE]`
   - Update CLAUDE.md session: clear Mode field (AUTOPILOT is done for this run)
   - **STOP autopilot loop.** Do NOT automatically start the next phase.
   - Present summary banner to user:
     ```
     ═══ AUTOPILOT — PHASE N COMPLETE ══════════════════════════════════════
     Phase N: [Name] ✓ DONE (X/X stories, Phase Gate PASS)
     Evidence: docs/reports/phase-N-gate.md
     ────────────────────────────────────────────────────────────────────────
     Next phase: Phase N+1 [Name] (Y PENDING stories)  [OR: E2E & Polish]
     Devam etmek için: "otopilot" de — yeni faz için autopilot başlatılır.
     ═══════════════════════════════════════════════════════════════════════
     ```
     If the completed phase was the LAST dev phase → say "Tüm development fazları bitti. E2E & Polish fazına geçmek için: `/asel polish`".
   - Wait for user command — do NOT auto-dispatch next phase's Planner.

   **FAIL:**
   - STOP autopilot
   - Present gate report to user
   - Present step execution log — show which steps were EXECUTED vs NOT_EXECUTED
   - Wait for user intervention

## Resume

- `"otopilot devam et"` = CONTINUE + AUTOPILOT
- Reads ROUTEMAP → finds first non-DONE story → resumes from that phase/story
- Resume by Step column (check step-log.txt to see exactly what's already EXECUTED):
  - `Plan` → re-dispatch Planner
  - `Dev` → re-read plan, resume from incomplete wave
  - `Lint` → re-run Pre-Gate Lint
  - `Regression` → re-run full test suite
  - `Gate` → re-dispatch Gate (check attempts.log first — if ≥3, STOP and escalate)
  - `Review` → re-dispatch Reviewer + re-run Finding Resolution Bash check
  - `Commit` → safety gate first (`test -s .../STORY-NNN-review.md`). If review.md exists → run Step 5 Commit. If missing → go back to Step 4 Review (in-flight from old parallel flow).
  - `Escalated` → present status, ask for decision
  - `Failed` → present error, ask for decision
- If previous phase all DONE but no Phase Gate run → run Phase Gate first
- If Step = `PhaseGate` → re-dispatch Phase Gate Agent

## Critical Rules

- ROUTEMAP is ONLY updated by Ana Asel
- CLAUDE.md session is ONLY updated by Ana Asel
- Progress display is ONLY shown by Ana Asel
- Gate/Commit/Review are ALWAYS Ana Asel's responsibility
- NEVER auto-skip blocked or escalated stories — always STOP and ask user
- Planning must be COMPLETE before autopilot can start
- **AUTOPILOT is phase-scoped**: one phase per run, STOP after Phase Gate PASS, wait for user to re-issue "otopilot" for next phase
- NEVER autonomously dispatch a Planner for a story in the next phase after Phase Gate PASS
