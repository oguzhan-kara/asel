# Development Phase — Normal DEV Mode

> Story-by-story implementation with full pipeline visibility.
> Ana Asel manages all steps directly (Plan → Dev → Lint → Gate → Review → Commit).
> Before starting: Read `rules/routemap-discipline.md` for step transition protocol.

## Agent Prompts
- Planner: `asel-planner` (Agent tool, opus)
- Developer: `asel-developer` (Agent tool, sonnet — opus on escalation)
- Gate: `asel-gate-lead` (Agent tool, opus — team architecture: lead + 3 parallel scouts). Legacy monolithic agent at `asel-legacy-gate` retained for fallback.
- Reviewer: `asel-reviewer` (Agent tool, opus)
- Setup Verifier: `asel-setup-verifier` (Agent tool, opus — Phase 1 first story only)

---

## Phase Kickoff: Repository & Initial Commit

Before the first story starts:

1. **Initialize Git repo** (if not already): `git init`
2. **Create GitHub repo**: `gh repo create [project-name] --private --source=. --push=false`
3. **Commit entire planning phase**:
   ```
   git add docs/ README.md Makefile .gitignore .env.example CLAUDE.md
   git commit -m "docs: complete project planning phase

   - ARCHITECTURE.md with full system design (services, APIs, DB schema, Docker)
   - PRODUCT.md with scope and business rules
   - ROUTEMAP.md with phased story breakdown
   - SCREENS.md with UI mockups
   - FUTURE.md with future roadmap
   - FRONTEND.md with design system
   - ADRs for all technology decisions
   - Story files for all phases
   - README.md with project overview and setup instructions"
   ```
4. NO push (user controls when to push)

## Story Development Cycle

For each story in ROUTEMAP (in order):

```
┌──────────────────────────────────────────────────────────────────┐
│              STORY DEVELOPMENT CYCLE (Normal DEV Mode)            │
│           Ana Asel manages all steps directly (1M context)       │
│                                                                   │
│  1. PLAN (Task: planner-prompt.md, model: "opus")                 │
│     Agent reads story file + ALL docs (isolated context)          │
│     Creates self-contained plan with pre-validation               │
│     Writes plan → docs/stories/phase-N/STORY-NNN-plan.md          │
│     Returns summary → Asel presents to user for approval          │
│     USER APPROVAL REQUIRED                                        │
│     If feedback → re-dispatch agent with feedback                 │
│                                                                   │
│  2. DEV — Task-based Developer dispatch (Ana Asel direct)         │
│     Read plan → extract Tasks + Context refs + Depends on         │
│     Build dependency graph → group into waves                     │
│     Per wave: ONE response, N parallel Task calls (sonnet)        │
│     Inter-wave typecheck (NOT Gate)                               │
│     BLOCKED → re-dispatch with opus → still BLOCKED → user       │
│                                                                   │
│  3. GATE — Quality gate (Task: gate-team/lead-prompt.md, opus)    │
│     Lead dispatches 3 scouts in parallel (CHECK):                 │
│       • Analysis Scout (Pass 1+2+2.5+4)                           │
│       • Test/Build Scout (Pass 3+5)                               │
│       • UI Scout (Pass 6 — skipped if no UI)                      │
│     Lead merges findings → FIX (max 2 loops) → REPORT             │
│     Escalation ladder (attempt counter enforced, max 3):          │
│       Gate self-fix (2 loops) → ESCALATE                          │
│         → Re-dispatch Developer (opus) + Re-Gate                  │
│           → PASS → continue                                       │
│           → ESCALATE → present to user (3 options)                │
│                                                                   │
│  4. REVIEW + FINDING RESOLUTION                                    │
│     (Task: reviewer-prompt.md, model: "sonnet")                   │
│     Doc review + Story Impact (cond'l) + Phase 3 Finding          │
│     Resolution. MANDATORY: zero unresolved findings before 5.     │
│     All file edits land in the Step 5 unified commit.            │
│                                                                   │
│  5. COMMIT — Close & Commit (Ana Asel direct, SINGLE commit)      │
│     USERTEST + decisions + bug-patterns entry (dedup) + commit    │
│     Bundles: story code + review edits + finding fixes            │
│                                                                   │
│  6. POST-PROCESSING (Ana Asel Direct)                             │
│     a. Update ROUTEMAP: mark story DONE with date                 │
│     b. Setup Verification (Phase 1 first story only)             │
│     c. Display progress, Telegram notification                    │
│     d. Session Handoff                                            │
│     Wait for user to start next story                             │
│                                                                   │
├──────────────────────────────────────────────────────────────────┤
│  DEPLOY (on-demand, not per-story)                                │
│     Triggered by: user request OR phase completion (autopilot)    │
│     Invoke Deploy Engineer via Agent tool                          │
│     Docker build + deploy + smoke tests                           │
└──────────────────────────────────────────────────────────────────┘
```

## Step-Log & Attempt Counter (Evidence Protocol)

<EXTREMELY-IMPORTANT>
Mirror of Phase Gate's step-log protocol applied to the per-story dev cycle. `story-done-guard.sh` hook verifies the step-log before allowing a ROUTEMAP `[x] DONE` edit to land. Skipping the log means the story cannot close.
</EXTREMELY-IMPORTANT>

### Step-Log File — `docs/stories/phase-N/STORY-NNN-step-log.txt`

At the END of each numbered step below, Ana Asel appends ONE line:

```
STEP_<num> <NAME>: EXECUTED | items=<count> | evidence=<file-or-hash> | result=PASS|FAIL
```

Required core step names that `story-done-guard.sh` checks: `PLAN`, `DEV`, `GATE`, `REVIEW`, `COMMIT`. Missing any of these in the step-log → hook BLOCKS the ROUTEMAP DONE edit.

Create the file at Step 1 start (`touch`), keep appending, never overwrite. On resume after compaction, read the existing file to determine which steps already ran.

### Attempt Counter — `docs/stories/phase-N/STORY-NNN-attempts.log`

Before EVERY re-dispatch of Gate, Developer (escalation), or Reviewer (missing report), Ana Asel appends ONE line:

```
<ISO-8601 timestamp> <AGENT> <REASON>
```

Before dispatching, read the count:

```bash
wc -l < docs/stories/phase-N/STORY-NNN-attempts.log 2>/dev/null || echo 0
```

**Hard limit: 3 total re-dispatches per story.** When count ≥ 3 → STOP the escalation ladder, set ROUTEMAP Step = `Escalated`, present issues to user with the 3 options (düzelt/atla/dur). This bound is mathematical, not LLM judgment — it survives compaction because the file persists.

The counter is per-story, reset when a new story starts (file is fresh per story because its filename includes the story ID).

---

## Step 1 — PLAN: Planner Dispatch

**Planner Agent** — dispatched via Agent tool:
1. Read `asel-planner` → pass as prompt to Agent tool
2. Include in prompt: story file path, project root path, any user feedback (if re-dispatch)
3. Agent runs in isolated context → reads all docs → writes plan to `docs/stories/phase-N/STORY-NNN-plan.md`
4. Agent returns summary to Asel
5. **Verify plan file exists** (MANDATORY — Bash tool, NOT LLM judgment):
   ```bash
   test -s docs/stories/phase-N/STORY-NNN-plan.md && echo "PLAN_EXISTS" || echo "PLAN_MISSING"
   ```
   - `PLAN_EXISTS` → proceed
   - `PLAN_MISSING` → re-dispatch Planner: "Plan file was NOT written to disk. You MUST use the Write tool to save the full plan to docs/stories/phase-N/STORY-NNN-plan.md before returning."
   - Still missing after retry → present error to user, STOP
6. Asel reads the plan file → presents plan to user for approval
7. Normal mode: wait for user approval / feedback
8. If user gives feedback → re-dispatch Planner agent with feedback appended to prompt (append attempts.log entry: `<ts> Planner feedback-revision`)
9. After approval → append step-log (Bash):
   ```bash
   TASKS=$(grep -cE '^### Task [0-9]+' docs/stories/phase-N/STORY-NNN-plan.md 2>/dev/null)
   echo "STEP_1 PLAN: EXECUTED | items=${TASKS} tasks | evidence=docs/stories/phase-N/STORY-NNN-plan.md | result=PASS" \
     >> docs/stories/phase-N/STORY-NNN-step-log.txt
   ```
10. Proceed to Step 2 (Planner already self-validated via embedded Quality Gate)

## Step 2 — DEV: Task-Based Developer Dispatch

1. Update ROUTEMAP: Step = `Dev`
2. Update CLAUDE.md session: Step = Dev
3. Display progress:
   ```
   ═══ STORY-003: User Management ════════════════════════════════════════════
   [✓] Plan → [▶] Dev → [ ] Lint → [ ] Regression → [ ] Gate → [ ] Review → [ ] Commit → [ ] Handoff
   ═══════════════════════════════════════════════════════════════════════════
   ```
4. Read the plan file: `docs/stories/phase-N/STORY-NNN-plan.md`
5. Parse the `## Tasks` section → extract all Task blocks with `Context refs`, `Depends on`, `Complexity`, and `Pattern ref` fields
6. Read `asel-developer` (for system instructions)
7. Read project `CLAUDE.md` (for conventions)
8. If any task has UI → read `docs/FRONTEND.md` (for design tokens)
9. **Build dependency graph** from `Depends on` fields → group tasks into execution waves:
   - **Wave 1**: Tasks with no dependencies (e.g., Task 1, Task 6 if independent)
   - **Wave 2**: Tasks depending only on Wave 1 tasks
   - **Wave N**: Tasks depending on previous waves
   - Tasks within the same wave are independent → can run in parallel
   - **File conflict check**: Tasks in the same wave MUST NOT write to the same files

10. **For each wave (sequential):**

    a. **Display wave progress:**
       ```
       ═══ STORY-003: User Management ════════════════════════════════════════════
       [✓] Plan → [▶] Dev (wave 1/3: Task 1,2,6 parallel) → [ ] Lint → [ ] Regression → [ ] Gate → [ ] Review → [ ] Commit → [ ] Handoff
       ═══════════════════════════════════════════════════════════════════════════
       ```

    b. **Phase A — Per-task prep (loop over ALL wave tasks FIRST):**

       For each task in the wave, prepare the Developer prompt BEFORE any dispatch:

       **Context refs pre-validation:**
       - Read task's `Context refs` field
       - For each ref, extract the matching section content from plan file
       - If a referenced section is empty or not found → log warning, include all available context

       **Context curation** — Build Developer prompt:
       - Task spec (from plan's Tasks section)
       - Curated context sections (extracted above from Context refs)
       - If task has `Pattern ref` → Read the referenced file, include its content
       - CLAUDE.md conventions
       - FRONTEND.md design tokens (if UI task)
       - Developer does NOT read plan file — only curated context

       **Model selection** based on task `Complexity`:
       - `low` or `medium` → `model: "sonnet"`
       - `high` → `model: "opus"`
       - No complexity field → default to `sonnet`

       Output of Phase A: N fully-prepared Developer prompts + model choices, ready to dispatch.

    c. **Phase B — Parallel dispatch (ONE response, N Agent tool calls):**

       <EXTREMELY-IMPORTANT>
       Emit ALL N Agent tool calls in a SINGLE response. This is the concurrency
       point — same pattern as scout dispatch in Step 3 ("3 parallel Agent tool
       calls in ONE response"). Sequential dispatch (one Task call per response,
       waiting for Done before emitting the next) is a PROTOCOL VIOLATION and
       defeats wave parallelism. If the wave has 5 tasks, your response contains
       5 Agent tool_use blocks — not 1, not "one at a time".
       </EXTREMELY-IMPORTANT>

       All tasks in the wave are dispatched concurrently. Ana Asel waits for ALL
       N results to return before proceeding to Phase C. If the wave has a single
       task, emit one Agent tool call (trivial case — still valid parallel dispatch).

    d. **Phase C — Collect & parse N results:**

       For each returned result, parse `DEVELOPER_TASK_STATUS`:
       - **DONE** → display `✓ Task N: [title]`
       - **DONE_WITH_CONCERNS** → display `⚠ Task N: [title] (concerns noted)`
       - **NEEDS_CONTEXT** → do NOT re-dispatch inline. Queue task for post-wave re-dispatch (Phase D).
       - **BLOCKED** → do NOT re-dispatch inline. Queue task for post-wave re-dispatch (Phase D) with `model: "opus"`.

    e. **Phase D — Post-wave re-dispatch (if any NEEDS_CONTEXT/BLOCKED queued):**

       Failed tasks are edge cases, not the hot path — re-dispatch them sequentially
       AFTER the parallel wave completes. This preserves parallelism for the success
       path while allowing per-task iteration for corrections.
       - **NEEDS_CONTEXT** → Read the requested file/info, re-dispatch with added context (max 2 retries per task)
       - **BLOCKED** → re-dispatch with `model: "opus"`. If still BLOCKED → display `⛔ Task N: [title] — BLOCKED`, present issue to user with task context.

    f. **Inter-wave build verification** (after ALL tasks in wave complete, including post-wave re-dispatches):

       <EXTREMELY-IMPORTANT>
       Ana Asel runs the build command directly via Bash tool. Do NOT delegate to Developer or skip.
       This is a deterministic check, not an LLM judgment call.
       </EXTREMELY-IMPORTANT>

       Detect project type and run:
       | Detection | Command |
       |-----------|---------|
       | `tsconfig.json` | `tsc --noEmit` |
       | `go.mod` | `go build ./...` |
       | `Cargo.toml` | `cargo check` |
       | `pyproject.toml` | `python -m py_compile` on changed files |
       | `package.json` + vite/next | `npm run build` |

       - **PASS** → continue to next wave
       - **FAIL** → dispatch Developer with error output to fix → re-run build
       - **2nd FAIL** → present error to user, STOP

11. All tasks complete → display task summary and append step-log:
    ```
    Dev tamamlandı: 8/8 task ✓ (3 waves)
      Wave 1 (parallel): ✓ Task 1, ✓ Task 2, ✓ Task 6
      Wave 2 (parallel): ✓ Task 3, ✓ Task 4, ✓ Task 7
      Wave 3 (parallel): ✓ Task 5, ✓ Task 8
    ```
    ```bash
    echo "STEP_2 DEV: EXECUTED | items=<task-count> tasks in <wave-count> waves | evidence=inter-wave-builds PASS | result=PASS" \
      >> docs/stories/phase-N/STORY-NNN-step-log.txt
    ```
    Continue to Step 2.5.

## Step 2.5 — PRE-GATE LINT: Quick Automated Scan

After all Dev waves complete, BEFORE dispatching expensive Gate agent (opus), run quick grep checks to catch obvious issues cheaply.

Ana Asel runs these directly via Bash tool (NOT delegated to Developer):

```bash
# 1. Hardcoded hex colors (UI files only)
grep -rn '#[0-9a-fA-F]\{3,8\}' src/ --include='*.tsx' --include='*.jsx' --include='*.css' 2>/dev/null

# 2. TODO/FIXME/HACK in source code
grep -rn 'TODO\|FIXME\|HACK\|TEMP\|XXX' src/ --include='*.ts' --include='*.tsx' --include='*.py' --include='*.go' 2>/dev/null

# 3. Raw HTML elements instead of atoms (UI files only)
grep -rn '<input\b\|<button\b\|<select\b\|<textarea\b' src/ --include='*.tsx' --include='*.jsx' 2>/dev/null
```

- **Zero matches on all checks** → proceed to Step 3 (Gate)
- **Matches found** → dispatch Developer (sonnet) with lint findings to fix → re-run lint
- **2nd round still matches** → proceed to Step 3 anyway (Gate will handle in its 6-pass check)

Append step-log:
```bash
echo "STEP_2.5 LINT: EXECUTED | items=<match-count> matches fixed | evidence=lint-scan | result=PASS" \
  >> docs/stories/phase-N/STORY-NNN-step-log.txt
```

This step saves opus Gate tokens on trivially fixable issues.

## Step 3 — GATE: Quality Gate with Escalation

<EXTREMELY-IMPORTANT>
Gate is a MANDATORY step. You MUST dispatch the Gate Team Lead via Agent tool. A manual `tsc --noEmit` or `npm test` does NOT count as Gate. Gate runs 6 comprehensive passes distributed across 3 parallel scouts (Analysis: gap+compliance+security+perf, Test/Build: tests+build, UI: visual quality) then consolidates fixes and writes a gate report. NEVER skip Gate. NEVER mark Gate as DONE without dispatching `asel-gate-lead`. If the team architecture fails, fall back to legacy `asel-legacy-gate`.
</EXTREMELY-IMPORTANT>

1. Update ROUTEMAP: Step = `Gate`
2. Update CLAUDE.md session: Step = Gate
3. Display progress bar (Gate step active)
4. **Dispatch 3 scouts IN PARALLEL** (one response, 3 Agent tool calls — Asel main session is the only place with Task dispatch capability; subagents cannot nest-dispatch). All use `subagent_type: "general-purpose"` and `model: "opus"`.
   - Scout Analysis dispatch prompt:
     ```
     You are the Analysis Scout for the Asel Gate team.
     Read and follow: ~/{{aselRoot}}/asel-gate-scout-analysis
     Story: docs/stories/phase-N/STORY-NNN-*.md
     Plan:  docs/stories/phase-N/STORY-NNN-plan.md
     Implemented files: [list from plan]
     UI story: YES|NO
     Maintenance mode: YES|NO
     Return ONLY the <SCOUT-ANALYSIS-FINDINGS> block. Do NOT edit any file.
     ```
   - Scout Test/Build dispatch prompt: same template but references `scout-testbuild.md` and returns `<SCOUT-TESTBUILD-FINDINGS>`.
   - Scout UI dispatch prompt: same template but references `scout-ui.md` and returns `<SCOUT-UI-FINDINGS>`. If `has_ui: false`, scout returns empty block (no-op).
5. **Collect all 3 findings blocks.** If any scout fails, retry that scout once; if it still fails, note the gap in the Team Lead dispatch.
6. **Dispatch Gate Team Lead** via Agent tool (`subagent_type: "general-purpose"`, `model: "opus"`):
   ```
   You are the Gate Team Lead. Read and follow:
   ~/{{aselRoot}}/asel-gate-lead

   Context:
   - Story: docs/stories/phase-N/STORY-NNN-*.md
   - Plan:  docs/stories/phase-N/STORY-NNN-plan.md
   - UI story: YES|NO
   - Maintenance mode: YES|NO

   Scout findings (raw, as returned):

   <SCOUT-ANALYSIS-FINDINGS>
   [paste full block]
   </SCOUT-ANALYSIS-FINDINGS>

   <SCOUT-TESTBUILD-FINDINGS>
   [paste full block]
   </SCOUT-TESTBUILD-FINDINGS>

   <SCOUT-UI-FINDINGS>
   [paste full block — or "Skipped (no UI)"]
   </SCOUT-UI-FINDINGS>

   Proceed with merge, fix, verify, report. Return Asel summary.
   ```
7. Team Lead runs internally: Phase 0 Input → Phase 1 Merge → Phase 2 FIX (single writer) → Phase 3 Verify → Phase 4 Report (writes `docs/stories/phase-N/STORY-NNN-gate.md`) → Phase 5 Return Summary
8. **Verify gate report exists** (MANDATORY — Bash tool, NOT LLM judgment):
   ```bash
   test -s docs/stories/phase-N/STORY-NNN-gate.md && echo "GATE_REPORT_EXISTS" || echo "GATE_REPORT_MISSING"
   ```
   - `GATE_REPORT_EXISTS` → proceed to parse result
   - `GATE_REPORT_MISSING` → re-dispatch Team Lead (with same scout findings) and explicit instruction: "Gate report was NOT written to disk. You MUST use the Write tool to save the report to docs/stories/phase-N/STORY-NNN-gate.md before returning."
   - Still missing after retry → present error to user, STOP
9. Parse Gate result:
   - **PASS** → append step-log, continue to Step 4
   - **ESCALATE** → Escalation (below)

Append step-log on PASS:
```bash
echo "STEP_3 GATE: EXECUTED | items=6 passes (3 scouts + lead) | evidence=docs/stories/phase-N/STORY-NNN-gate.md | result=PASS" \
  >> docs/stories/phase-N/STORY-NNN-step-log.txt
```

**Escalation (Ana Asel handles directly — attempt counter enforced):**

1. **Read attempt count first** (Bash):
   ```bash
   ATTEMPTS=$(wc -l < docs/stories/phase-N/STORY-NNN-attempts.log 2>/dev/null || echo 0)
   ```
   - If `ATTEMPTS >= 3` → STOP escalation, set ROUTEMAP Step = `Escalated`, present to user. Do NOT loop further. This is a hard mathematical bound.
2. **Append attempts.log BEFORE dispatch:**
   ```bash
   echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) Developer opus gate-escalation" \
     >> docs/stories/phase-N/STORY-NNN-attempts.log
   ```
3. Read Gate's escalation findings from `docs/stories/phase-N/STORY-NNN-gate.md`
4. Re-dispatch Developer via Agent tool (`model: "opus"`, NOT sonnet — upgraded for difficult fixes)
   - Pass: plan file path, gate findings, project root
5. **Append attempts.log again** (for the re-Gate dispatch):
   ```bash
   echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) Gate opus re-check" \
     >> docs/stories/phase-N/STORY-NNN-attempts.log
   ```
6. Re-dispatch Gate via Agent tool
7. Parse second Gate result:
   - **PASS** → append step-log, continue to Step 4
   - **ESCALATE** → Update ROUTEMAP Step = `Escalated`, present issues to user, offer 3 options (düzelt/atla/dur)

```
Escalation Summary (attempt-counter enforced):
Gate internal fix (2 loops) → ESCALATE
  → attempts.log count check (must be < 3)
  → Ana Asel re-dispatch Developer (opus) + append attempts.log
    → Re-dispatch Gate (opus) + append attempts.log
      → PASS → continue
      → ESCALATE → present to user (3 options)
Hard bound: 3 total re-dispatches per story. The attempts.log file is
the source of truth — survives compaction.
```

## Step 4 — REVIEW + FINDING RESOLUTION

<EXTREMELY-IMPORTANT>
Review runs BEFORE Commit. This is a SEQUENTIAL protocol — NOT the old parallel pattern. The single git commit in Step 5 captures EVERYTHING: story code (Step 2) + Review's doc edits (this step, Phase 1) + Story Impact edits (Phase 2) + Finding Resolution fixes (Phase 3). No intermediate commits inside Step 4.

If you catch yourself running `git commit -m "docs(STORY-NNN): post-review ..."` or `git commit -m "fix(STORY-NNN): resolve findings"` inside this step — STOP. You are violating the sequential protocol. All edits in Step 4 land in the Step 5 unified commit.
</EXTREMELY-IMPORTANT>

1. Update ROUTEMAP: Step = `Review`
2. Update CLAUDE.md session: Step = Review
3. **Verify transition write** (Bash, deterministic):
   ```bash
   grep -q '^- Step: Review' CLAUDE.md || echo "WARN: CLAUDE.md session did not register Step=Review"
   ```
4. Display progress bar (Review step active)

### Phase 1 — Doc Review (sonnet)

5. Read `asel-reviewer`
6. Dispatch Reviewer via Agent tool
   - Pass: completed story reference, context type "post-story", project root
   - Reviewer runs checks #2-#14 (doc consistency, glossary, architecture, tech debt, mock sweep, etc.)
   - Reviewer also runs check #1 (next story impact) and #10 (story updates) but ONLY reports findings — does NOT edit story files
7. **Verify review report exists** (MANDATORY — Bash tool, NOT LLM judgment):
   ```bash
   test -s docs/stories/phase-N/STORY-NNN-review.md && echo "REVIEW_EXISTS" || echo "REVIEW_MISSING"
   ```
   - `REVIEW_EXISTS` → proceed
   - `REVIEW_MISSING` → append attempts.log (`<ts> Reviewer sonnet missing-report`), re-dispatch Reviewer with explicit Write instruction
   - Still missing → append attempts.log, re-dispatch ONE more time with `model: "opus"`
   - Still missing after 3rd attempt (attempts.log ≥ 3 entries total for this story) → mark story Step = `Escalated`, present to user: "Review agent failed to produce report after 3 attempts."
8. Read review summary.
9. **Do NOT commit Review's doc edits here.** Any files the Reviewer touched are staged by Step 5's unified commit.

### Phase 2 — Story Impact Update (opus — deterministic trigger)

10. **Bash trigger check** (deterministic, NOT LLM parse):
    ```bash
    UPDATED=$(grep -cE '\| *UPDATED *\|' docs/stories/phase-N/STORY-NNN-review.md 2>/dev/null)
    ```
11. If `UPDATED` = 0 → proceed to Phase 3
12. If `UPDATED` > 0 → dispatch Story Impact agent via Agent tool:
    - Pass: review report path, affected story file paths, project root
    - Prompt: "Read the review report. For each story marked UPDATED in the Impact table, edit the story file: update dependencies, technical approach, acceptance criteria, or effort estimate as described. Do NOT change stories marked NO_CHANGE."
13. Do NOT commit story file edits here — they also land in Step 5.
14. Proceed to Phase 3.

### Phase 3 — Finding Resolution (MANDATORY before Step 5)

Review reports contain findings in 5 sections. Each finding MUST be resolved before proceeding to Commit (Step 5). Skipping this phase is a skill violation. `story-done-guard.sh` hook will block the eventual DONE edit if any unresolved finding remains.

15. **Parse review report** — extract findings from these sections:
    - `## Issues` → any row with Resolution = ESCALATED or DEFERRED (verify DEFERRED items were actually written to ROUTEMAP)
    - `## Cross-Doc Consistency` → contradictions found > 0
    - `## Decision Tracing` → orphaned (approved but not applied) > 0
    - `## USERTEST Completeness` → type = MISSING
    - `## Tech Debt Pickup` → NOT addressed (CRITICAL) > 0
    - `## Mock Status` → missed retirements > 0

    Also check: if `## Issues` table has FIXED items → verify the fix exists (file was actually changed). If not → treat as unresolved.

16. **Deterministic unresolved check** — Bash safety net (the SAME grep `story-done-guard.sh` runs at DONE time):
    ```bash
    UNRESOLVED=$(grep -cE '\| +(ESCALATED|OPEN|NEEDS_ATTENTION) +\|' docs/stories/phase-N/STORY-NNN-review.md 2>/dev/null)
    ```
    If `UNRESOLVED > 0` but LLM parse in step 15 said zero → re-parse, surface the missed rows, fix them. Trust the grep.

17. **If `UNRESOLVED = 0` and LLM parse found no findings** → skip to step 20 (append step-log, proceed to Step 5).

18. **For each finding, apply resolution by category:**

    | Category | Action |
    |----------|--------|
    | Cross-Doc contradiction | Fix the inconsistent doc NOW (edit file — NO commit) |
    | Orphaned decision | Apply the decision to code/config/doc NOW, or if out of scope → DEFER |
    | USERTEST missing | Write the missing USERTEST section NOW (edit file — NO commit) |
    | Tech Debt not addressed (CRITICAL) | ESCALATE to user — story cannot close with unresolved targeted tech debt |
    | Mock not retired | Delete the mock file NOW (edit file — NO commit) |

    **DEFER** = add entry to `docs/ROUTEMAP.md → ## Tech Debt` table:
    ```
    | D-NNN | [description from finding] | STORY-NNN (source) | STORY-MMM (target) | OPEN |
    ```
    Choose the nearest relevant upcoming story as target. The ROUTEMAP edit lands in Step 5's unified commit — do NOT commit it separately.

    **ESCALATE** = present finding to user with options:
    ```
    Review Finding — [category]:
    [finding detail]

    1. Fix now (describe what will change)
    2. Defer to STORY-MMM as tech debt
    3. Accept risk and close anyway
    ```
    Wait for user choice. In AUTOPILOT mode: auto-select option 1 (fix now) for non-CRITICAL, option 2 (defer) for CRITICAL.

19. **Re-run Bash unresolved check** (same grep as step 16). Must be 0 before proceeding. If still > 0 → loop Phase 3 (same findings not resolved yet) or escalate.

20. Append step-log:
    ```bash
    echo "STEP_4 REVIEW: EXECUTED | items=<finding-count> findings (fixed=F deferred=D escalated=E) | evidence=docs/stories/phase-N/STORY-NNN-review.md | result=PASS" \
      >> docs/stories/phase-N/STORY-NNN-step-log.txt
    ```

21. Proceed to Step 5 (Commit).

## Step 5 — COMMIT: Single Unified Commit

<EXTREMELY-IMPORTANT>
This is ONE commit per story. It captures EVERYTHING accumulated during Steps 2-4:
- Story code from Dev (Step 2)
- Review-driven doc edits (Step 4 Phase 1)
- Story Impact edits to upcoming story files (Step 4 Phase 2, if any)
- Finding Resolution fixes (Step 4 Phase 3)
- USERTEST.md entry, decisions.md updates, bug-patterns.md entries
- ROUTEMAP Tech Debt entries

NO intermediate commits from Step 4. Every commit in git history has already passed Review — bisect and revert remain clean.
</EXTREMELY-IMPORTANT>

1. Update ROUTEMAP: Step = `Commit`
2. Update CLAUDE.md session: Step = Commit
3. **Verify transition write** (Bash):
   ```bash
   grep -q '^- Step: Commit' CLAUDE.md || echo "WARN: CLAUDE.md session did not register Step=Commit"
   ```
4. **Safety gate: review.md must exist** (Bash, deterministic — protects resume from the old parallel protocol):
   ```bash
   test -s docs/stories/phase-N/STORY-NNN-review.md || { echo "ERROR: review.md missing — Step 4 Review did not run. Back to Step 4." >&2; }
   ```
   If `review.md` is missing, Ana Asel re-enters Step 4 before continuing. This handles in-flight projects that started on the old commit-before-review flow.
5. Update `docs/USERTEST.md` — append manual test scenarios for this story (see USERTEST format below). If the story has no UI → add "Bu story icin manuel test senaryosu yok (backend/altyapi)" note.
6. Update `docs/brainstorming/decisions.md` — append any decisions made during development.
7. **Bug Pattern entry with dedup** (if Gate fixed issues or escalation occurred):
   - Read gate report for fixes applied
   - **Bootstrap `bug-patterns.md` if missing** (Bash, idempotent):
     ```bash
     F=docs/brainstorming/bug-patterns.md
     if [ ! -f "$F" ]; then
       mkdir -p docs/brainstorming
       printf '# Bug Patterns & Prevention Rules\n\nRuntime knowledge base of bugs that have occurred and rules to prevent them.\nRead by: Planner (warnings), Gate/Scouts (compliance check), Developer (awareness).\n\n## Patterns\n\n' > "$F"
     fi
     ```
   - For each non-trivial fix (not just typos):
     - Draft pattern description (short, literal)
     - **Dedup check** (Bash, deterministic — skip if pattern already recorded):
       ```bash
       grep -cF "Pattern: [description]" docs/brainstorming/bug-patterns.md 2>/dev/null
       ```
     - If zero → append to `bug-patterns.md` under `## Patterns`:
       `- [DATE] PAT-NNN [STORY-NNN]: [pattern] — Root Cause: [cause] — Prevention: [rule] — Affected: [layer]`
     - If already present → skip (no duplicate noise)
   - Skip the entire section if Gate passed with zero fixes
8. **Stage everything** — story code + Review doc edits + Story Impact edits + Finding Resolution fixes + USERTEST + decisions + bug-patterns + ROUTEMAP tech debt:
   ```
   git add -A
   ```
9. **Single git commit** for the whole story:
   ```
   git commit -m "feat(STORY-NNN): [story title]

   - [list of key changes]
   - [endpoints added/modified]
   - [migrations if any]
   - [tests added]
   - Review findings resolved: <count> (deferred: <count>)

   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```
10. Capture commit hash.
11. **Append step-log:**
    ```bash
    HASH=$(git log -1 --pretty=%h)
    echo "STEP_5 COMMIT: EXECUTED | items=1 commit=${HASH} | evidence=git log -1 | result=PASS" \
      >> docs/stories/phase-N/STORY-NNN-step-log.txt
    ```
12. Proceed to Step 6 (Post-Processing & Handoff).

### USERTEST.md Format

Screen-focused and business-focused manual test scenarios. Written in Turkish.

```markdown
# Manual Test Scenarios

> Son guncelleme: YYYY-MM-DD
> Test ortami: [CLAUDE.md'den Docker URL]

---

## STORY-003: Kullanici Yonetimi

**Ekran:** Kullanici Listesi (SCR-010)

| # | Senaryo | Beklenen Sonuc |
|---|---------|----------------|
| 1 | Sol menuден "Kullanicilar" sayfasina git | Kullanici listesi tabloda gorunur |
| 2 | "Yeni Kullanici" butonuna tikla | Kullanici olusturma formu acilir |
| 3 | Formu doldur ve kaydet | Basarili mesaji, liste guncellenir |
```

Rules:
- Her story icin ayri `## STORY-NNN: [Title]` section
- Her ekran icin ayri `**Ekran:** [Name] (SCR-NNN)` alt bolumu
- Story'de UI yoksa → "Bu story icin manuel test senaryosu yok (backend/altyapi)" notu
- **Sadece UI senaryolari**: Kullanicinin browser'da gorebilecegi, yapabilecegi, dogrulayabilecegi aksiyonlar
- **API endpoint testi YAZMA**: API dogrulamasi Phase Gate Step 3.5'te otomatik yapiliyor

## Step 6 — Post-Processing & Session Handoff

<EXTREMELY-IMPORTANT>
Post-processing is ATOMIC — ALL steps below MUST execute in order. A story is NOT complete until every item runs. Do NOT say "devam ediyorum" or "şimdilik geçiyorum".

If you skip Setup Verification → infrastructure might be broken and subsequent stories will fail.
If you skip Persistence Checklist → resume after compaction will be inaccurate.

When you write `[x] DONE (YYYY-MM-DD)` to ROUTEMAP, `story-done-guard.sh` hook verifies all 5 artifacts (plan, gate, review, step-log, USERTEST entry) AND zero unresolved findings. If evidence is missing → the hook BLOCKS the edit. Fix the missing piece, then retry.

NO SHORTCUTS. Execute every step sequentially.
</EXTREMELY-IMPORTANT>

**Normal DEV Mode:**
After Commit completes (Step 5), Asel performs post-processing directly:

1. **Append step-log** for post-processing start:
   ```bash
   echo "STEP_6 POSTPROC: EXECUTED | items=6 checks | evidence=persistence-verified | result=PASS" \
     >> docs/stories/phase-N/STORY-NNN-step-log.txt
   ```
   (Append at the END of post-processing — after persistence verified.)
2. **Update ROUTEMAP**: mark story `[x] DONE (YYYY-MM-DD)`, Step = `—`. The `story-done-guard.sh` hook runs on this edit and verifies ALL artifacts before allowing it.
3. **Update ROUTEMAP**: completion %, current phase, last updated
4. **Update CLAUDE.md session**: clear values to `—`
5. **Setup Verification** (Phase 1 first story ONLY — see below). Hook enforced: setup-guard.sh blocks next story without report.
6. **Verify persistence** (checklist below) — read files to confirm writes succeeded
7. **Session Handoff** — display status, wait for user

> **Telegram**: Story DONE/ESCALATED/FAILED notifications are sent automatically by `notify-hook.sh` when ROUTEMAP is edited. Do NOT send manually.

Note: Escalation and failure are handled in Steps 3, 4 directly. By the time we reach Step 6, the story is successfully completed.

**AUTOPILOT Mode:**
Same steps as normal mode, but skips user approval of plan and does NOT wait between stories. See `phases/development/autopilot.md` for the continuous loop protocol.

### Persistence Checklist

| Check | File | What |
|-------|------|------|
| **Plan file** | `docs/stories/phase-N/STORY-NNN-plan.md` | Created by Planner (Step 1) |
| **Gate report** | `docs/stories/phase-N/STORY-NNN-gate.md` | Created by Gate agent (Step 3) |
| **Review report** | `docs/stories/phase-N/STORY-NNN-review.md` | Created by Reviewer (Step 4) |
| **Step-log** | `docs/stories/phase-N/STORY-NNN-step-log.txt` | Lines for PLAN/DEV/GATE/REVIEW/COMMIT (Steps 1-5) |
| ROUTEMAP current story | `docs/ROUTEMAP.md` | Story marked `[x] DONE` with date |
| ROUTEMAP next story | `docs/ROUTEMAP.md` | Next story visible as `[ ] PENDING` |
| ROUTEMAP stats | `docs/ROUTEMAP.md` | Completion %, current phase, last updated |
| **USERTEST entry** | `docs/USERTEST.md` | `## STORY-NNN:` section exists — UI story: test scenarios, backend: "backend/altyapi" note |
| Decisions | `docs/brainstorming/decisions.md` | Updated (Step 5) |
| Git commit | `git log -1` | Single story commit (Step 5) with bundled review fixes |
| Reviewer updates | Next story files | Updated if needed (Step 4 Phase 2) |

**If ANY of the first 5 items is missing → story is NOT complete. Go back to the step that creates it. `story-done-guard.sh` will BLOCK the DONE edit anyway.**

### Handoff — Mode-Dependent

**Normal Mode** — Present status and WAIT:
```
═══════════════════════════════════════════
  STORY-NNN: [Title] ✓ COMPLETE
═══════════════════════════════════════════

  Progress: X/Y stories (Z%)
  Phase:    Phase N — [Name]
  Next:     STORY-NNN+1: [Title]

  Sonraki story için hazırım. Devam etmek istediğinde söyle.
═══════════════════════════════════════════
```
**Autopilot Mode** — NEVER show this handoff message. NEVER ask "devam edeyim mi?". Continue IMMEDIATELY to next story without any pause or user interaction. Read `phases/development/autopilot.md` for the autopilot loop protocol. At phase boundary → auto-trigger Phase Gate Agent.

If any persistence check fails, DO NOT announce handoff. Fix the issue first.

## Infrastructure Tuning + Setup Verification (Phase 1 First Story Only)

**Condition**: Only runs after the FIRST completed story of **Phase 1** (the very first development phase). Later phases already have a running environment — skip.

### Step A: DevOps Agent (Infrastructure Tuning)

**DevOps Agent** — dispatched by Ana Asel via Agent tool:
1. Read `asel-devops` → pass as prompt to Agent tool with `mode: "post-setup"`
2. Include in prompt: project root path, CLAUDE.md path
3. Agent reads ARCHITECTURE.md for deployment model (single node / cluster / hybrid)
4. Agent tunes all Docker services: database, cache, web server, message broker, etc.
5. Agent rebuilds and verifies services start with new configs
6. Agent writes report → `docs/reports/infra-tuning.md`
7. Agent returns structured status: PASS or FAIL
8. **If PASS** → proceed to Setup Verifier (Step B)
9. **If FAIL** → present issues to user, STOP development

### Step B: Setup Verifier (Infrastructure Verification)

**Setup Verifier Agent** — dispatched by Ana Asel via Agent tool:
1. Read `asel-setup-verifier` → pass as prompt to Agent tool
2. Include in prompt: project root path, CLAUDE.md path
3. Agent runs in isolated context → verifies Makefile, Docker, DB, Web access
4. Agent writes report → `docs/reports/setup-verification.md`
5. Agent returns structured status: PASS or FAIL
6. **If PASS** → proceed to Handoff
7. **If FAIL** → present failed checks to user, STOP development

### Mid-Project DevOps (On-Demand)

DevOps Agent can also be dispatched mid-project with `mode: "mid-project"` when:
- New infrastructure services are added (new story adds Kafka, ClickHouse, etc.)
- User requests optimization (`/asel devops` or "infra'yı optimize et")
- Performance issues observed during development

Mid-project dispatch: same agent, same process, but operates on existing tuned infrastructure — only adds/improves, does not regress existing tuning.

<EXTREMELY-IMPORTANT>
DevOps + Setup Verifier are MANDATORY after Phase 1 first story. ZERO EXCEPTIONS.

You MUST dispatch both agents. Do NOT skip them for ANY reason including:
- "Backend/frontend services don't exist yet" — infrastructure containers (PG, Redis, Kafka, EMQX, etc.) ARE services that need tuning
- "Tuning was already done in docker-compose.yml" — DevOps Agent verifies and improves, it does not trust developer configs
- "Docker is not running" or "requires Docker Desktop" — that is the agent's problem to solve, not a reason to skip
- "Only infra containers, no app containers" — infra IS what DevOps tunes
- "I'll do it after the next story" — NO. The hook (setup-guard.sh) will BLOCK you

If you catch yourself writing "protokol gereği X gerekiyor ancak/ama..." → STOP. You are about to skip a mandatory step. Dispatch the agent.

Setup verification failure is a HARD STOP. Do NOT skip it, do NOT proceed with a failed setup.
DevOps tuning failure is also a HARD STOP — untuned infrastructure leads to performance issues throughout the project.
</EXTREMELY-IMPORTANT>

## Memory System

### decisions.md

Every agent reads and updates `docs/brainstorming/decisions.md`:

```markdown
# Project Decisions Log

## Gap Analysis Decisions
- [DATE] [Technical] Approved: retry/fallback mechanism for data pipeline
- [DATE] [UX] Approved: empty states for all list screens

## Architecture Decisions
- [DATE] Selected PostgreSQL for primary DB (see ADR-001)

## Development Decisions
- [DATE] STORY-002: Used bcrypt over argon2 for password hashing

## Rejected Ideas
- [DATE] GraphQL considered, rejected — REST covers all requirements
```

### bug-patterns.md

Runtime knowledge base of bugs, tracked separately from decisions.md so per-story agents (Planner, Gate, Gate Scouts) can read it without loading the full decisions log.

File: `docs/brainstorming/bug-patterns.md`

```markdown
# Bug Patterns & Prevention Rules

Runtime knowledge base of bugs that have occurred and rules to prevent them.
Read by: Planner (warnings), Gate/Scouts (compliance check), Developer (awareness).

## Patterns

- [DATE] PAT-001 [STORY/FIX-NNN]: [Pattern name]
  - Pattern: [What went wrong]
  - Root Cause: [Why it happened]
  - Prevention: [Rule for future — Planner/Developer/Gate should check this]
  - Affected: [Which layer/component type is at risk]
```

Writers: dev-cycle Step 7, autopilot Step 4 Bug Pattern entry, bugfix Commit step.
Readers: planner (Bug Pattern Warnings section), gate/gate-team Pass 2 compliance check.

Existing projects: the first writer bootstraps the file if missing. Legacy projects with `## Bug Patterns & Prevention Rules` still under `decisions.md` are migrated by `/asel-checkup`.

### Session Files

Each planning session saves notes to `docs/brainstorming/session-YYYY-MM-DD.md` for full conversation context preservation.
