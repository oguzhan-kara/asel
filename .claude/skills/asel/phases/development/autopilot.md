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

> Read `{{aselRoot}}/references/autopilot-story-loop.md` now and follow it, then return here.
## Phase Boundary — Phase Gate Testing

When all stories in current phase are DONE:

1. Display phase complete banner
2. Dispatch Phase Gate Agent:
   - dispatch `Agent(subagent_type: "asel-phase-gate", prompt: …)`; model and effort come from the agent definition
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
