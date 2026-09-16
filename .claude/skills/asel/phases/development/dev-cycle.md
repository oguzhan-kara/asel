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
│  1. PLAN (asel-planner)                                           │
│     Agent reads story file + ALL docs (isolated context)          │
│     Creates self-contained plan with pre-validation               │
│     Writes plan → docs/stories/phase-N/STORY-NNN-plan.md          │
│     Returns summary → Asel presents to user for approval          │
│     USER APPROVAL REQUIRED                                        │
│     If feedback → re-dispatch agent with feedback                 │
│                                                                   │
│  2. DEV — Agent-based Developer dispatch (Ana Asel direct)         │
│     Read plan → extract Tasks + Context refs + Depends on         │
│     Build dependency graph → group into waves                     │
│     Per wave: ONE response, N parallel Agent calls (sonnet)        │
│     Inter-wave typecheck (NOT Gate)                               │
│     BLOCKED → re-dispatch with opus → still BLOCKED → user       │
│                                                                   │
│  3. GATE — Quality gate (asel-gate-lead)                          │
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
│     (asel-reviewer)                                               │
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

> Read `{{aselRoot}}/references/dev-cycle-plan-dev.md` now and follow it, then return here.
> Read `{{aselRoot}}/references/dev-cycle-gate-review-commit.md` now and follow it, then return here.
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
