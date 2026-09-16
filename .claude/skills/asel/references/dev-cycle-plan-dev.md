# Plan and Dev steps (reference for dev-cycle.md)

## Step 1 — PLAN: Planner Dispatch

**Planner Agent** — dispatched via Agent tool:
1. dispatch `Agent(subagent_type: "asel-planner", prompt: …)`; model and effort come from the agent definition
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
6. Dev tasks go to `Agent(subagent_type: "asel-developer", prompt: …)`; model and effort come from the agent definition
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
       - `low`/`medium` → default developer agent; `high` or escalation → the model in `agents.developer.escalationModel` (asel.config.json)
       - No complexity field → default developer agent (model from `agents.developer.model`)

       Output of Phase A: N fully-prepared Developer prompts + model choices, ready to dispatch.

    c. **Phase B — Parallel dispatch (ONE response, N Agent tool calls):**

       <EXTREMELY-IMPORTANT>
       Emit ALL N Agent tool calls in a SINGLE response. This is the concurrency
       point — same pattern as scout dispatch in Step 3 ("3 parallel Agent tool
       calls in ONE response"). Sequential dispatch (one Agent call per response,
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
       - **BLOCKED** → do NOT re-dispatch inline. Queue task for post-wave re-dispatch (Phase D) with the escalation model (`agents.developer.escalationModel`).

    e. **Phase D — Post-wave re-dispatch (if any NEEDS_CONTEXT/BLOCKED queued):**

       Failed tasks are edge cases, not the hot path — re-dispatch them sequentially
       AFTER the parallel wave completes. This preserves parallelism for the success
       path while allowing per-task iteration for corrections.
       - **NEEDS_CONTEXT** → Read the requested file/info, re-dispatch with added context (max 2 retries per task)
       - **BLOCKED** → re-dispatch with the escalation model (`agents.developer.escalationModel`). If still BLOCKED → display `⛔ Task N: [title] — BLOCKED`, present issue to user with task context.

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

