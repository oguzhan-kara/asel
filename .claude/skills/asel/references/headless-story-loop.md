# Headless story loop (reference for headless-autopilot.md)

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

The Bash tool caps **foreground** calls at 10 minutes, but stories can take 30–40 minutes. Solution: detach `claude -p` from the Bash tool entirely using `node "{{hookRoot}}/lib/spawn-detached.js" -- <cmd>` (works on Windows, Linux, macOS — no `nohup`/`disown` shell builtins required), then poll via PID alive check + ROUTEMAP state.

**3a. Launch sub-Claude detached** — this is a **regular (foreground) Bash tool call**. The tool call itself completes in <1 second (`spawn-detached.js` forks the detached process, prints its PID to stdout, and returns immediately). Do NOT use `run_in_background: true` for this dispatch — `spawn-detached.js` already detaches the child (`detached: true`, `child.unref()`), and using `run_in_background` would trigger a misleading "Background command completed" notification when the outer wrapper exits (not when claude -p finishes).

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

# Detach claude -p with stream-json piped through the headless-format.js formatter →
# human-readable log in real time.
#
# WHY stream-json: `claude -p` in default text mode BUFFERS output and writes only at exit.
# During a 30-40min story the log would stay empty. stream-json writes events in real time.
#
# WHY the formatter pipe: raw stream-json is unreadable (JSON per line). Piping it through
# the Node formatter turns it into human-readable text as events stream. `tail -f` shows
# activity immediately. The formatter is a small CLI at `hooks/lib/headless-format.js` —
# no external binaries required (no `jq`), just the `node` already on PATH.
#
# --dangerously-skip-permissions: detached process has no stdin, can't answer permission prompts.
#
# WHY spawn-detached.js: `nohup ... & disown` is a POSIX shell idiom that does not exist on
# Windows. `node "{{hookRoot}}/lib/spawn-detached.js" -- <cmd>` detaches the child process
# (detached: true, stdio: ignore, child.unref()) identically on Windows, Linux, and macOS,
# and prints the child PID to stdout so it can be captured for the PID file.

dispatch_cmd="
  set -o pipefail
  claude -p \"\$(cat <<'PROMPT'
You are invoked as a HEADLESS sub-Claude under asel orchestration. Read the 'Sub-Claude Per-Story Protocol' section of {{aselRoot}}/phases/development/headless-autopilot.md (global fallback: ~/{{aselRoot}}/phases/development/headless-autopilot.md) and follow it exactly.

Your job: complete EXACTLY ONE story, then exit. Do NOT chain into a second story.

Start now.
PROMPT
)\" --output-format=stream-json --verbose --dangerously-skip-permissions 2>&1 \
    | node \"{{hookRoot}}/lib/headless-format.js\" > '$LOG' 2>/dev/null
"
PID=$(node "{{hookRoot}}/lib/spawn-detached.js" -- bash -c "$dispatch_cmd")

# Record PID for idempotency + polling
echo "$PID" > "$PIDFILE"
echo "DISPATCHED pid=$PID"
```

The Bash tool call returns in <1s with `DISPATCHED pid=12345` (or `ALREADY_RUNNING pid=...` if another dispatch is active).

**Live viewing for humans** — just `tail -f` the log, it's already formatted:
```bash
tail -f docs/stories/phase-N/STORY-NNN-headless.log
```

No extra pretty-print step needed on your end — the log file IS the formatted output (formatted at write-time via `hooks/lib/headless-format.js`).

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

**Launch detached** (regular foreground Bash tool call, dispatched via `spawn-detached.js`):
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

gate_cmd="
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
    | node \"{{hookRoot}}/lib/headless-format.js\" > '$GATE_LOG' 2>/dev/null
"
PID=$(node "{{hookRoot}}/lib/spawn-detached.js" -- bash -c "$gate_cmd")
echo "$PID" > "$GATE_PIDFILE"
echo "DISPATCHED Phase Gate pid=$PID"
```

**Important**: same as per-story dispatch — call this as a **regular (foreground) Bash tool call**, NOT `run_in_background: true`. `spawn-detached.js` handles detachment internally (`detached: true` + `child.unref()`).

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

