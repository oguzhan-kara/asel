# HEADLESS AUTOPILOT Mode — Fresh Context Per Story

> Ana Asel manages the loop; each story runs in a FRESH sub-Claude session via `claude -p`.
> Goal: context window stays clean across stories (no autocompact risk, no accumulation).
> Phase-scoped — stops at phase boundary, user explicitly restarts for next phase.

<EXTREMELY-IMPORTANT>
HEADLESS rules — violations are PIPELINE FAILURES:

1. **Ana Asel drives the loop, sub-Claude does the work**. Each story = one `claude -p` invocation. Ana Asel's context grows by only the per-iteration summary (~500 tokens), not the full story pipeline.
2. **One story per claude -p invocation**. Sub-Claude completes ONE story (Plan → Dev → Lint → Gate → Review → Commit → Post-processing) then exits. It does NOT chain into next story.
3. **ROUTEMAP is the single source of truth between iterations**. Ana Asel re-reads ROUTEMAP after every `claude -p` exits to determine what happened.
4. **Escalation halts the loop**. If a story comes back `[!] ESCALATED` or `[✗] FAILED`, Ana Asel STOPS and presents to user. No auto-retry beyond what sub-Claude already did.
5. **Phase-scoped**. Loop covers ONE phase. After all stories in the phase DONE → Phase Gate (also via `claude -p`) → STOP. User types `asel headless` again to start next phase.
6. **No user interaction during the loop**. Sub-Claude is invoked with explicit "skip approval" instruction. If a step genuinely needs user (edge case), sub-Claude marks story ESCALATED and loop stops.
</EXTREMELY-IMPORTANT>

## How It Works

```
HEADLESS AUTOPILOT (current phase only)
═══════════════════════════════════════════════════════════════

  ANA ASEL (bash loop via Bash tool):
  ┌──────────────────────────────────────────────────────────┐
  │  1. Detect current dev phase                              │
  │  2. LOOP until phase complete OR escalation:              │
  │       a. Read ROUTEMAP → find next story (priority:       │
  │          IN PROGRESS > NEEDS_REPLAN > PENDING)            │
  │       b. Display progress banner                          │
  │       c. Launch claude -p DETACHED (spawn-detached.js)    │
  │          Regular Bash call returns <1s, no 10-min cap     │
  │          ├─ log → STORY-NNN-headless.log                  │
  │          └─ pidfile → STORY-NNN-headless.pid (for polling) │
  │       d. POLL with adaptive backoff (5→10→20→30 min):     │
  │          ├─ [PID dead] → read ROUTEMAP terminal state     │
  │          └─ [interval elapsed] → 1-line progress to user  │
  │             (step=STEP_X  elapsed=Nm  poll=K/4)           │
  │          Turns: ~1-4 per story (not 12) = ~65% less       │
  │          Safety: 65 min max (4 polls) → kill + HUNG       │
  │       e. Re-read ROUTEMAP + cross-check with exit code    │
  │          ├─ [x] DONE (exit=0)    → summary, next story    │
  │          ├─ [!] ESCALATED (exit=1) → STOP                 │
  │          ├─ [✗] FAILED (exit=2)  → STOP                   │
  │          └─ UNKNOWN (drift)      → STOP, crash recovery   │
  │  3. After loop: Phase Gate via claude -p (same pattern)   │
  │  4. Present phase summary + STOP                          │
  └──────────────────────────────────────────────────────────┘

  Each iteration's sub-Claude:
  ┌──────────────────────────────────────────────────────────┐
  │  Fresh context (no accumulation from prior stories)       │
  │  Loads asel skill                                         │
  │  Executes dev-cycle.md pipeline for ONE story             │
  │  Exits after Post-processing (or ESCALATE/FAIL)           │
  └──────────────────────────────────────────────────────────┘
═══════════════════════════════════════════════════════════════
```

## Activation

1. Read ROUTEMAP → determine current dev phase (first phase NOT `[DONE]` containing at least one non-DONE story). HEADLESS covers ONLY this phase.
2. Verify: Planning Phase must be `COMPLETE`. If not → STOP, warn user.
3. Verify: prerequisite tools — `claude` CLI must be on PATH. Bash check:
   ```bash
   command -v claude >/dev/null && echo "CLAUDE_OK" || echo "CLAUDE_MISSING"
   ```
   If `CLAUDE_MISSING` → STOP, warn user to install Claude CLI.
4. Update CLAUDE.md session: `Mode = HEADLESS`, `Phase = N`, `Started = <ISO timestamp>`.
5. Display banner:

```
═══ ASEL HEADLESS — Phase N ═══════════════════════════════════════════
Phase N: [Name] — X/Y stories DONE
[ ] STORY-001 → [ ] STORY-002 → [ ] STORY-003 → ...
Mode: HEADLESS (fresh context per story via claude -p)
Scope: CURRENT PHASE ONLY. Stops after Phase Gate PASS or escalation.
Starting headless execution...
═══════════════════════════════════════════════════════════════════════
```

> Read `{{aselRoot}}/references/headless-story-loop.md` now and follow it, then return here.
## Safety Features

1. **Iteration bound**: `max_iterations = phase_story_count + 2`. Prevents runaway on ROUTEMAP corruption.
2. **Per-story timeout & long-running stories** (30–40 min is normal for XL stories):
   - `claude -p` is dispatched **detached** (launched via `node "{{hookRoot}}/lib/spawn-detached.js" -- claude -p …` — works on Windows, Linux, macOS — in a regular Bash tool call) → not subject to the Bash tool's 10-minute foreground cap. The dispatch Bash call itself returns in <1s, then claude -p continues as an independent process.
   - Ana Asel polls with **adaptive backoff** (default `POLL_INTERVALS=(5 10 20 30)` minutes) for a **65 min budget per story** (4 polls total). Each poll = 1 Ana Asel reasoning turn.
   - Terminal state is derived from **PID alive check + ROUTEMAP state** (no separate sentinel file). When PID goes dead, the ROUTEMAP shows the outcome: `[x] DONE`, `[!] ESCALATED`, `[✗] FAILED`, or `[~] IN PROGRESS` (= crash).
   - If budget exhausts, story is presumed HUNG → Ana Asel kills the process and STOPs the loop.
   - Tune `POLL_INTERVALS` for story profile: tighter early intervals for short-story phases, looser for long-story phases.
3. **User visibility during polls**:
   - Each poll returns a 1-line status to Ana Asel: `STATUS=RUNNING step=STEP_3 GATE elapsed=15m poll=2/4`
   - Current step is parsed from `STORY-NNN-step-log.txt` (sub-Claude writes it at end of each pipeline step).
   - User sees ~4 progress lines per story (one per backoff boundary) — low noise, high signal.
   - For live fine-grained viewing, user opens another terminal: `tail -f docs/stories/phase-N/STORY-NNN-headless.log` (plain text, not JSON).
   - On-demand inspection: user asks "what's STORY-NNN doing?" → Ana Asel reads last 20 log lines in a one-shot Bash call (context cost paid only when user requests it).
4. **Idempotency guard** (NEW in V3): Dispatch script refuses to start a second claude -p for the same story if a PID file exists and the recorded PID is alive. Prevents the "two concurrent claude -p writing to the same log" bug that created confusing `.prev.log` artifacts.
5. **Crash detection**: process dead + ROUTEMAP shows `[~] IN PROGRESS` (not terminal) = sub-Claude crashed mid-story. Polling returns `STATUS=CRASHED`, loop stops for user inspection.
6. **User interrupt**: Ctrl-C from user kills the active foreground Bash call (the polling sleep). Detached `claude -p` keeps running (launched via `spawn-detached.js`, unref'd from the parent). To kill sub-Claude too: `PID=$(cat docs/stories/phase-N/STORY-NNN-headless.pid); kill $PID`. Next `/asel headless` detects IN PROGRESS story — idempotency guard will NOT start a duplicate if the original is still alive.
6. **Log preservation**: Each iteration's full output saved to `docs/stories/phase-N/STORY-NNN-headless.log` for post-mortem.

## Stop Conditions (terminal states for the loop)

- **Phase complete**: no more PENDING/NEEDS_REPLAN in current phase → run Phase Gate → summary → STOP
- **Escalation**: story marked ESCALATED → STOP, show details, await user
- **Failure**: story marked FAILED → STOP, show details, await user
- **Crash**: sub-Claude PID dead + ROUTEMAP still IN PROGRESS → STOP, show last log lines + crash recovery note
- **No PID**: PID file missing (dispatch error) → STOP, report
- **Iteration bound exceeded**: hit max_iterations → STOP, report
- **User Ctrl-C**: foreground polling Bash call killed. Detached `claude -p` keeps running. Next run resumes via idempotency guard.

## Final Report (after STOP)

```
═══ ASEL HEADLESS — Phase N Summary ═══════════════════════════════════

  Stories processed: N
  ✓ DONE:       X
  ! ESCALATED:  Y (if any)
  ✗ FAILED:     Z (if any)

  Phase Gate: [PASS / FAIL / NOT_RUN]

  Duration: HH:MM:SS
  Total commits: K (see git log)

  Logs: docs/stories/phase-N/STORY-*-headless.log

  Next action:
  [ if ESCALATED/FAILED ] → user reviews details, decides fix/replan
  [ if PASS + more phases ] → type "asel headless" to run next phase
  [ if PASS + last phase ] → type "asel polish" for E2E & Polish

═══════════════════════════════════════════════════════════════════════
```

## Sub-Claude Per-Story Protocol

**Audience:** the `claude -p` sub-session invoked by Ana Asel for ONE story.
**Do not read this section when you are Ana Asel running the loop — only when you are the sub-Claude.**

<EXTREMELY-IMPORTANT>
You are in HEADLESS mode. These rules override normal DEV mode behavior:

1. **NO user interaction.** There is no user to answer prompts. Never ask for approval, confirmation, or input. If a step normally asks the user, skip it and proceed (same as AUTOPILOT).
2. **Plan approval is SKIPPED.** After Planner completes, do NOT present the plan for user approval. Trust Planner's embedded Quality Gate output and proceed directly to Dev.
3. **Exactly ONE story.** After Post-processing completes (or terminal state reached), exit. Do NOT look for the next PENDING story. Do NOT loop. Ana Asel's outer loop handles story sequencing.
4. **Exit code discipline** — your process's exit code signals the outcome to Ana Asel:
   - `exit 0` — story marked [x] DONE in ROUTEMAP
   - `exit 1` — story marked [!] ESCALATED (gate/review hit attempt bound)
   - `exit 2` — story marked [✗] FAILED (blocker, unrecoverable)
   - `exit 3` — sub-Claude crashed or unrecoverable error before writing ROUTEMAP
</EXTREMELY-IMPORTANT>

### Sub-Claude protocol steps

1. **Identify the story:**
   ```bash
   # Priority: IN PROGRESS > NEEDS_REPLAN > PENDING in current dev phase
   # Use the same awk-scoped pattern; phase number comes from ROUTEMAP
   ```
   Read ROUTEMAP, find current dev phase (first phase NOT marked `[DONE]`), pick story by priority.

2. **Session state setup** (same as AUTOPILOT first-story init):
   - Update ROUTEMAP: mark story `[~] IN PROGRESS`, Step = `Plan`
   - Update CLAUDE.md session: `Story = STORY-NNN`, `Step = Plan`, `Mode = HEADLESS_STORY`
   - Initialize evidence files:
     ```bash
     : > docs/stories/phase-N/STORY-NNN-step-log.txt
     : > docs/stories/phase-N/STORY-NNN-attempts.log
     ```

3. **Run the pipeline** — exactly as documented in `{{aselRoot}}/phases/development/dev-cycle.md`:

   **IMPORTANT — Read tool token cap (applies to ALL large reads):** Claude Code's Read tool caps output at 10000 tokens per call. Some asel files exceed this:
   - `phases/development/dev-cycle.md` (~10.8K)
   - `asel-gate-lead` (~11K) — primary Gate dispatch
   - `asel-gate-scout-analysis` (~8K)
   - `asel-gate-scout-testbuild` (~4K)
   - `asel-gate-scout-ui` (~8K)
   - `asel-legacy-gate` (~15K) — legacy fallback, use if team architecture fails
   - `asel-phase-gate` (~13K)
   - `asel-compliance-auditor` (~13K)
   - `asel-planner` (~10K, borderline)

   When Read returns `File content (N tokens) exceeds maximum allowed tokens (10000)`, **DO NOT skip reading**, **DO NOT rely on memory**. Re-read in chunks with `offset` and `limit`:
   ```
   Read(file_path="...dev-cycle.md", offset=0,   limit=400)
   Read(file_path="...dev-cycle.md", offset=400, limit=400)
   # continue until you've read to end-of-file
   ```
   Read ALL chunks. Missing any chunk means missing protocol rules — this is a hard violation of HEADLESS operation and will cause pipeline drift.
   
   - Step 1: Plan (Planner self-validates via embedded Quality Gate → append step-log)
   - Step 2: Dev (wave dispatch, inter-wave build check → step-log)
   - Step 2.5: Pre-Gate Lint → step-log
   - Step 3: Gate with attempts.log escalation bound → step-log
   - Step 4: Review + Finding Resolution → step-log
   - Step 5: Commit (single unified commit) → step-log
   - Step 6: Post-processing (ROUTEMAP DONE, CLAUDE.md clear, setup verification if first Phase-1 story) → step-log

   **Plan approval is OMITTED.** Between Step 1 and Step 2 there is NO user gate. Proceed directly.

4. **Terminal state handling:**
   - Pipeline completes cleanly → ROUTEMAP `[x] DONE` (hook `story-done-guard.sh` verifies evidence) → `exit 0`
   - Gate attempts.log bound hit → ROUTEMAP `[!] ESCALATED` + write details to `STORY-NNN-gate.md` → `exit 1`
   - Review attempts bound hit or unresolved findings → ROUTEMAP `[!] ESCALATED` + details to `STORY-NNN-review.md` → `exit 1`
   - Blocker (missing dependency, impossible context) → ROUTEMAP `[✗] FAILED` + details to `STORY-NNN-step-log.txt` → `exit 2`
   - Unrecoverable error before ROUTEMAP can be updated → `exit 3` (Ana Asel's loop treats as UNKNOWN)

5. **Do NOT:**
   - Do NOT read PRODUCT.md, ARCHITECTURE.md, SCREENS.md beyond what Planner/Developer need (these reads belong inside the specialized agents)
   - Do NOT display progress bars for the outer phase (Ana Asel handles that)
   - Do NOT update `Mode = HEADLESS_STORY` back to anything else — Ana Asel clears it when the loop ends
   - Do NOT invoke `asel-checkup`, `asel-distribute`, or any user-invocable skills
   - Do NOT commit beyond Step 5's single unified commit (same as dev-cycle.md rule)

## Critical Rules

- **Ana Asel does NOT dispatch Planner/Developer/Gate/Reviewer directly in HEADLESS mode**. All agent dispatch happens inside the sub-Claude's session. Ana Asel only dispatches `claude -p` via Bash.
- **Ana Asel does NOT read plan/gate/review files between iterations**. Only ROUTEMAP + step-log.txt to verify state. This keeps Ana Asel's context clean.
- **Sub-Claude uses the SAME pipeline as AUTOPILOT** (dev-cycle.md). No pipeline shortcuts. Same hooks, same rules, same quality bar.
- **CLAUDE.md session updates happen inside sub-Claude** (per story). Ana Asel only sets/clears `Mode = HEADLESS` at loop start/end.
- **Prompt caching**: sub-Claude invocations within 5-minute TTL benefit from cross-session prompt cache. Batch small stories together for cache efficiency; slow stories (>5min) will miss cache on next iteration.
