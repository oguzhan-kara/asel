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
  │       c. Launch claude -p DETACHED (nohup & disown)       │
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

## Story Loop

**Safety bound**: max `phase_story_count + 2` iterations to prevent runaway loops. Implemented via Bash counter.

### Per-iteration protocol

**Step 1 — Find next story (priority: IN PROGRESS → NEEDS_REPLAN → PENDING):**
```bash
PHASE=N  # current phase number

# Extract only the current phase's section from ROUTEMAP
PHASE_BODY=$(awk "/^### Phase ${PHASE}:/,/^(### Phase [0-9]+:|## [A-Z])/" docs/ROUTEMAP.md)

# Try in priority order: IN PROGRESS (resume mid-flight), NEEDS_REPLAN, PENDING
NEXT=$(echo "$PHASE_BODY" | grep -m1 -oE 'STORY-[0-9]+.*\[~\] IN PROGRESS' | grep -oE 'STORY-[0-9]+')
[ -z "$NEXT" ] && NEXT=$(echo "$PHASE_BODY" | grep -m1 -oE 'STORY-[0-9]+.*\[!\] NEEDS_REPLAN' | grep -oE 'STORY-[0-9]+')
[ -z "$NEXT" ] && NEXT=$(echo "$PHASE_BODY" | grep -m1 -oE 'STORY-[0-9]+.*\[ \] PENDING' | grep -oE 'STORY-[0-9]+')

[ -z "$NEXT" ] && { echo "PHASE_COMPLETE"; break; }
echo "Next story: $NEXT"
```

**Step 2 — Display progress:**
```
━━━ [N/Y] STORY-NNN: [title] ━━━
```

**Step 3 — Dispatch sub-Claude (detached) + poll for completion:**

The Bash tool caps **foreground** calls at 10 minutes, but stories can take 30–40 minutes. Solution: detach `claude -p` from Bash tool entirely using `nohup` + `& disown`, then poll via PID alive check + ROUTEMAP state.

**3a. Launch sub-Claude detached** — this is a **regular (foreground) Bash tool call**. The tool call itself completes in <1 second (just forks the detached process and returns). Do NOT use `run_in_background: true` for this dispatch — the `nohup & disown` pattern inside already detaches claude -p properly, and using `run_in_background` would trigger a misleading "Background command completed" notification when the outer wrapper exits (not when claude -p finishes).

**CRITICAL: Idempotency guard.** Before dispatching, check if a `claude -p` is already running for this story. Duplicate dispatches cause two processes writing to the same log file (one truncates the other mid-flight, requiring log rotation and creating `.prev.log` artifacts). Always check first:

```bash
# Directory and file setup (phase number N is known; story NNN from Step 1)
DIR="docs/stories/phase-N"
LOG="$DIR/STORY-NNN-headless.log"
PIDFILE="$DIR/STORY-NNN-headless.pid"

# Idempotency guard: refuse dispatch if one is already running for this story
if [ -f "$PIDFILE" ]; then
  EXISTING_PID=$(cat "$PIDFILE")
  if kill -0 "$EXISTING_PID" 2>/dev/null; then
    echo "ALREADY_RUNNING pid=$EXISTING_PID — refusing duplicate dispatch"
    exit 0
  fi
  # PID file exists but process dead — stale, clean up
  rm -f "$PIDFILE"
fi

# Also double-check by process search (covers case where PID file was deleted but process alive)
EXISTING=$(pgrep -f "STORY-NNN.*claude -p" | head -1)
if [ -n "$EXISTING" ]; then
  echo "ALREADY_RUNNING pid=$EXISTING (found via pgrep) — refusing duplicate dispatch"
  # Recreate PID file from actual process
  echo "$EXISTING" > "$PIDFILE"
  exit 0
fi

# Rotate existing log if present (preserve prior attempt's output for debugging)
if [ -s "$LOG" ]; then
  mv "$LOG" "$LOG.$(date +%s).bak"
fi

# Detach claude -p with stream-json piped through jq formatter → human-readable log in real time.
#
# WHY stream-json: `claude -p` in default text mode BUFFERS output and writes only at exit.
# During a 30-40min story the log would stay empty. stream-json writes events in real time.
#
# WHY jq pipe: raw stream-json is unreadable (JSON per line). Inline jq formatting turns
# it into human-readable text as events stream. `tail -f` shows activity immediately.
# The jq filter is stored separately at hooks/headless-format.jq to keep dispatch simple.
#
# Requires: jq (macOS ships /usr/bin/jq; Linux usually has it or available via package manager).
# If missing: `brew install jq` or equivalent. Protocol will fail loudly if jq not present.
#
# --dangerously-skip-permissions: detached process has no stdin, can't answer permission prompts.

# Locate jq filter file (project or global fallback)
JQ_FILTER="{{aselRoot}}/hooks/headless-format.jq"
[ ! -f "$JQ_FILTER" ] && JQ_FILTER="$HOME/{{aselRoot}}/hooks/headless-format.jq"

nohup bash -c "
  set -o pipefail
  claude -p \"\$(cat <<'PROMPT'
You are invoked as a HEADLESS sub-Claude under asel orchestration. Read the 'Sub-Claude Per-Story Protocol' section of {{aselRoot}}/phases/development/headless-autopilot.md (global fallback: ~/{{aselRoot}}/phases/development/headless-autopilot.md) and follow it exactly.

Your job: complete EXACTLY ONE story, then exit. Do NOT chain into a second story.

Start now.
PROMPT
)\" --output-format=stream-json --verbose --dangerously-skip-permissions 2>&1 \
    | jq --raw-output --unbuffered -f '$JQ_FILTER' > '$LOG' 2>/dev/null
" </dev/null >/dev/null 2>&1 &
PID=$!
disown

# Record PID for idempotency + polling
echo "$PID" > "$PIDFILE"
echo "DISPATCHED pid=$PID"
```

The Bash tool call returns in <1s with `DISPATCHED pid=12345` (or `ALREADY_RUNNING pid=...` if another dispatch is active).

**Live viewing for humans** — just `tail -f` the log, it's already formatted:
```bash
tail -f docs/stories/phase-N/STORY-NNN-headless.log
```

No `jq` or pretty-print pipeline needed on your end — the log file IS the formatted output (formatted at write-time via `hooks/headless-format.jq`).

**3b. Poll for completion — adaptive backoff** (fewer turns = less Ana Asel thinking overhead):

**Rationale**: Each poll = 1 Ana Asel turn ≈ 3-5K extended-thinking tokens. A fixed 5-min interval for a 60-min story = 12 turns ≈ 48K context growth. Adaptive backoff stretches intervals as the story proves longer, cutting turn count by ~3×.

**Interval ladder (default):**
```
POLL_INTERVALS = (5 10 20 30)  # minutes
# Poll 1: sleep 5m  → cumulative 5m
# Poll 2: sleep 10m → cumulative 15m (but Bash tool cap is 10min, so we split: see note below)
# Poll 3: sleep 20m → cumulative 35m
# Poll 4: sleep 30m → cumulative 65m → HUNG if still running
```

**Bash tool 10-min cap**: a single foreground Bash call can't sleep >10 min. Intervals longer than 9 min are executed as multiple internal sleeps within the same Bash call — but the tool cap still forces us to split across calls. Solution: if `POLL_INTERVAL > 9`, the polling script sleeps 9 min and returns `STATUS=RUNNING_CONTINUE` signalling Ana Asel to re-call with the same POLL_NUM (no thinking overhead because no decision needed — still same poll). This is cheap: Ana Asel re-emits the same tool call with a short response.

Actually simpler: cap each Bash call at 9 min, and if the interval needs more, Ana Asel calls again. For backoff schedule above, actual Bash calls per poll:

| Poll # | Interval | Bash calls | Cumulative |
|--------|----------|-----------|------------|
| 1 | 5m | 1 | 5m |
| 2 | 10m | 2 (5m+5m) | 15m |
| 3 | 20m | 3 (7m+7m+6m, ~ceil) | 35m |
| 4 | 30m | 4 (7.5m avg) | 65m → HUNG |

Total Bash calls ≤10. But Ana Asel's **reasoning turns** are only 4 (one decision per poll boundary — the continuation calls are mechanical, Ana Asel's reasoning is minimal). In practice this translates to ~4 reasoning-heavy turns.

**Polling script (one Bash call at a time) — sentinel-free:**

Terminal state is derived from **PID alive check + ROUTEMAP state** instead of a separate sentinel file. This is simpler and also catches crashes (process dead + ROUTEMAP still IN PROGRESS = crash).

```bash
DIR="docs/stories/phase-N"
PIDFILE="$DIR/STORY-NNN-headless.pid"
STEPLOG="$DIR/STORY-NNN-step-log.txt"
ROUTEMAP="docs/ROUTEMAP.md"
POLL_NUM=$1           # 1..4 (current poll index in the backoff ladder)
SLEEP_MINUTES=$2      # How long this Bash call should sleep (<=9, split by Ana Asel)
ELAPSED_BEFORE=$3     # Minutes elapsed before this call (for display)

PID=$(cat "$PIDFILE" 2>/dev/null)
[ -z "$PID" ] && { echo "STATUS=NO_PID pidfile missing"; exit 1; }

# Sleep with 30-sec granularity, early-out when process dies
SECONDS_TO_SLEEP=$((SLEEP_MINUTES * 60))
INTERVAL=30
ITERATIONS=$((SECONDS_TO_SLEEP / INTERVAL))
for i in $(seq 1 $ITERATIONS); do
  kill -0 "$PID" 2>/dev/null || break
  sleep $INTERVAL
done

if kill -0 "$PID" 2>/dev/null; then
  # Still running
  ELAPSED=$((ELAPSED_BEFORE + SLEEP_MINUTES))
  LAST_STEP=$(tail -1 "$STEPLOG" 2>/dev/null | grep -oE 'STEP_[0-9.]+ +[A-Z]+' | head -1)
  [ -z "$LAST_STEP" ] && LAST_STEP="starting"
  echo "STATUS=RUNNING step=$LAST_STEP elapsed=${ELAPSED}m poll=$POLL_NUM"
else
  # Process dead — derive terminal state from ROUTEMAP (authoritative)
  rm -f "$PIDFILE"  # clean up stale PID file
  ROW=$(grep "STORY-NNN" "$ROUTEMAP" | head -1)
  if echo "$ROW" | grep -q '\[x\] DONE'; then
    echo "STATUS=DONE"
  elif echo "$ROW" | grep -q '\[!\] ESCALATED'; then
    echo "STATUS=ESCALATED"
  elif echo "$ROW" | grep -q '\[✗\] FAILED'; then
    echo "STATUS=FAILED"
  else
    # Process dead but ROUTEMAP still shows IN PROGRESS / PENDING → crash
    echo "STATUS=CRASHED routemap-state=$(echo "$ROW" | grep -oE '\[[x!~ ✗]\] [A-Z]*' | head -1)"
  fi
fi
```

**Ana Asel's loop** (pseudo-code):
```
POLL_INTERVALS = [5, 10, 20, 30]
TOTAL_ELAPSED = 0
TERMINAL_STATES = {DONE, ESCALATED, FAILED, CRASHED, NO_PID}

for POLL_NUM, INTERVAL in enumerate(POLL_INTERVALS):
    remaining = INTERVAL
    while remaining > 0:
        this_sleep = min(remaining, 9)  # Bash tool cap
        result = bash(polling_script, POLL_NUM, this_sleep, TOTAL_ELAPSED)
        if result.STATUS in TERMINAL_STATES:
            goto step_4  # STATE is directly from ROUTEMAP (authoritative)
        TOTAL_ELAPSED += this_sleep
        remaining -= this_sleep
    # Interval done, story still running — show 1-line progress to user
    display: "STORY-NNN: step={LAST_STEP} elapsed={TOTAL_ELAPSED}m poll={POLL_NUM}/4"

# All 4 polls exhausted → HUNG
PID=$(cat docs/stories/phase-N/STORY-NNN-headless.pid)
kill -9 $PID 2>/dev/null
# Also kill any orphan claude -p children
pgrep -f "STORY-NNN.*claude -p" | xargs -r kill -9 2>/dev/null
rm -f docs/stories/phase-N/STORY-NNN-headless.pid
STOP loop with STATUS=HUNG
```

**Context budget per story:**

| Story length | Polls fired | Ana Asel turns | Context growth |
|--------------|-------------|----------------|----------------|
| ≤5 min | 1 | 1 | ~4K |
| 6-15 min | 2 | ~2 | ~8K |
| 16-35 min | 3 | ~3 | ~12K |
| 36-65 min | 4 | ~4 | ~16K |

Compare with previous fixed 5-min polling: 12 turns × 4K = ~48K for a 60-min story. V2 cuts this by **~65%**.

**Visibility trade-off — three user options:**
1. **Default (backoff polling)**: user sees progress updates at `cumulative 5m, 15m, 35m, 65m` marks (one line per poll boundary). Good for phase-running where user checks back periodically.
2. **Real-time viewing**: user opens another terminal and runs `tail -f docs/stories/phase-N/STORY-NNN-headless.log` — sub-Claude writes to this log in real time. Ana Asel's context stays clean.
3. **On-demand deep inspection**: user asks Ana Asel "show me what STORY-NNN is doing", and Ana Asel reads the last ~20 log lines in a one-shot Bash call. Pays context cost only when user explicitly asks.

**Tuning:**
- `POLL_INTERVALS` default `(5 10 20 30)` covers 65-min budget with 4 reasoning turns. Adjust for story profile:
  - Consistently short stories (all ≤15 min): `(3 7 10 0)` — tighter, no 4th poll
  - Consistently long stories: `(10 20 30 45)` — starts slower, saves turns
- Timeout = sum of intervals. For 90-min budget: `(5 15 30 40)`. For 120-min: `(10 20 30 60)`.

**Step 4 — Outcome already known from polling:**

The polling script returns the terminal state directly (derived from ROUTEMAP when PID goes dead). No separate verification step needed:

- `STATUS=DONE` — ROUTEMAP shows `[x] DONE`, story completed successfully
- `STATUS=ESCALATED` — ROUTEMAP shows `[!] ESCALATED`, gate/review escalation hit bound
- `STATUS=FAILED` — ROUTEMAP shows `[✗] FAILED`, blocker hit
- `STATUS=CRASHED` — process died before ROUTEMAP terminal state was written
- `STATUS=NO_PID` — PID file missing (dispatch failed or was cleaned up externally)

**Step 5 — Decide next action:**

| State | Action |
|-------|--------|
| DONE | Print 1-line summary (commit hash from step-log, file count, duration), continue loop |
| ESCALATED | STOP loop, display escalation details from `STORY-NNN-review.md` or `STORY-NNN-gate.md`, await user |
| FAILED | STOP loop, display failure reason from `STORY-NNN-step-log.txt`, await user |
| CRASHED | STOP loop, crash recovery — display last 30 log lines + ROUTEMAP current state, await user |
| NO_PID | STOP loop, indicate dispatch error (PID file was not created) |

**1-line summary template (DONE case):**
```
  ✓ STORY-NNN DONE  commit=abc1234  files=12  time=4m32s
```

### Phase Gate (after all stories DONE)

Same dispatch + poll pattern as per-story, with a Phase-Gate-specific prompt. Same idempotency guard. Same sentinel-free polling (PID alive check + ROUTEMAP).

**Launch detached** (regular foreground Bash tool call with `nohup & disown` inside):
```bash
DIR="docs/stories/phase-N"
GATE_LOG="$DIR/PHASE-GATE-headless.log"
GATE_PIDFILE="$DIR/PHASE-GATE-headless.pid"

# Idempotency guard
if [ -f "$GATE_PIDFILE" ]; then
  EXISTING_PID=$(cat "$GATE_PIDFILE")
  if kill -0 "$EXISTING_PID" 2>/dev/null; then
    echo "ALREADY_RUNNING Phase Gate pid=$EXISTING_PID"
    exit 0
  fi
  rm -f "$GATE_PIDFILE"
fi

# Rotate any existing gate log
[ -s "$GATE_LOG" ] && mv "$GATE_LOG" "$GATE_LOG.$(date +%s).bak"

JQ_FILTER="{{aselRoot}}/hooks/headless-format.jq"
[ ! -f "$JQ_FILTER" ] && JQ_FILTER="$HOME/{{aselRoot}}/hooks/headless-format.jq"

nohup bash -c "
  set -o pipefail
  claude -p \"\$(cat <<'PROMPT'
You are invoked in HEADLESS mode under asel orchestration. Your job: run Phase Gate for the current dev phase.

Protocol:
1. Read docs/ROUTEMAP.md → identify the current dev phase (all stories marked [x] DONE).
2. Load asel skill and follow phases/development/autopilot.md 'Phase Boundary — Phase Gate Testing' section.
3. Read {{aselRoot}}/asel-phase-gate and dispatch via Agent tool (model: opus). Pass phase number, project root, CLAUDE.md path.
4. Verify evidence via Bash (step-log.txt, evidence files) before trusting Phase Gate's return status.
5. Update ROUTEMAP with phase result (mark phase [DONE] on PASS).
6. Exit after gate report is written to docs/e2e-evidence/phase-N/.
PROMPT
)\" --output-format=stream-json --verbose --dangerously-skip-permissions 2>&1 \
    | jq --raw-output --unbuffered -f '$JQ_FILTER' > '$GATE_LOG' 2>/dev/null
" </dev/null >/dev/null 2>&1 &
PID=$!
disown
echo "$PID" > "$GATE_PIDFILE"
echo "DISPATCHED Phase Gate pid=$PID"
```

**Important**: same as per-story dispatch — call this as a **regular (foreground) Bash tool call**, NOT `run_in_background: true`. The `nohup & disown` handles detachment internally.

**Poll same way** as per-story (adaptive backoff `(5 10 20 30)` by default; raise intervals if Phase Gate is consistently slow for the project):
```bash
# Each poll Bash call — check PID alive, not sentinel
GATE_PID=$(cat "$GATE_PIDFILE" 2>/dev/null)
for i in $(seq 1 $POLLS_PER_CALL); do
  kill -0 "$GATE_PID" 2>/dev/null || break
  sleep 30
done
# STATUS=DONE (PID dead + phase marked [DONE] in ROUTEMAP)
# STATUS=RUNNING step=... elapsed=...m
# STATUS=FAILED (PID dead + phase NOT marked [DONE])
```

**Check result from ROUTEMAP** (authoritative):
```bash
if grep -qE "^### Phase N:.*\[DONE\]" docs/ROUTEMAP.md; then
  echo "✓ Phase N Gate PASS"
else
  echo "✗ Phase N Gate FAIL — see docs/e2e-evidence/phase-N/"
fi
rm -f "$GATE_PIDFILE"
```

## Safety Features

1. **Iteration bound**: `max_iterations = phase_story_count + 2`. Prevents runaway on ROUTEMAP corruption.
2. **Per-story timeout & long-running stories** (30–40 min is normal for XL stories):
   - `claude -p` is dispatched **detached** (via `nohup … & disown` in a regular Bash tool call) → not subject to the Bash tool's 10-minute foreground cap. The dispatch Bash call itself returns in <1s, then claude -p continues as an independent process.
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
6. **User interrupt**: Ctrl-C from user kills the active foreground Bash call (the polling sleep). Detached `claude -p` keeps running (nohup). To kill sub-Claude too: `PID=$(cat docs/stories/phase-N/STORY-NNN-headless.pid); kill $PID`. Next `/asel headless` detects IN PROGRESS story — idempotency guard will NOT start a duplicate if the original is still alive.
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
   - Step 3: Gate (opus) with attempts.log escalation bound → step-log
   - Step 4: Review + Finding Resolution (sonnet) → step-log
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
