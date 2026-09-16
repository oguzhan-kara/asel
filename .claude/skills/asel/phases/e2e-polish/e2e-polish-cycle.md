# E2E & Polish Cycle

> Run E2E testing, test hardening, performance optimization, and UI polish agents sequentially.
> Before starting: Update ROUTEMAP — set `Current phase: E2E_POLISH`
> After completion: Update ROUTEMAP — E2E & Polish Phase `[DONE]`

## Phase Kickoff

<EXTREMELY-IMPORTANT>
Docker deployment is MANDATORY for E2E & Polish Phase. E1 (E2E Tester) and E4 (UI Polisher) require a running application for browser-based testing. Do NOT skip Docker. Do NOT skip any E-step.
</EXTREMELY-IMPORTANT>

1. Read ROUTEMAP → verify Development Phase is complete (all stories DONE)
2. If Development Phase not complete → warn user, suggest completing development first
3. **Deploy application**: Run `make down && make build && make up` → verify all services healthy via `docker compose ps`
4. **If deploy fails → STOP. Do NOT proceed to any E-step. Fix deployment first.**
5. Update ROUTEMAP: Set `Current phase: E2E_POLISH`

## Step Dependency Rules

- E0 (Seed Generator): **MUST run first** — populates ALL tables with realistic data for testing
- E1 (E2E Tester): Runs after E0 — tests with real data in place
- E2 (Test Hardener): Runs after E1 — hardens test coverage based on E1 findings
- E3 (Perf Optimizer): Runs after E2 — optimizes on a tested, stable codebase
- E4 (UI Polisher): Runs after E3 — polishes visuals on a performant codebase
- E5 (Acceptance Tester): **MUST run last** — formal acceptance with all fixes applied
- **If E1 has CRITICAL failures that can't be fixed in 2 loops → STOP, escalate to user before E2**
- E3 failure does NOT block E4 (E4 is visual, not perf-dependent)

## E2E & Polish Cycle — Agent + Asel Approval Pattern

Each step follows the same pattern:
1. Asel reads agent prompt file → dispatches agent via Agent tool
2. Agent runs autonomously (isolated context) → writes report file → returns summary
3. Asel reads summary → presents to user
4. User approval gate (approve / request fixes)
5. If fixes needed → Asel dispatches Developer agent with findings from report
6. After fix → re-dispatch same agent for re-check (max 2 loops)
7. PASS → update ROUTEMAP → next step

```
┌──────────────────────────────────────────────────────────────────┐
│                  E2E & POLISH CYCLE                                │
│                                                                   │
│  For each step (E1 → E2 → E3 → E4):                              │
│                                                                   │
│  1. DISPATCH AGENT (Agent tool)                     │
│     Read agents/[name]-prompt.md → pass to Agent tool              │
│     Agent runs in isolated context (no main context bloat)        │
│     Agent writes report → docs/reports/[name]-report.md           │
│     Agent returns summary to Asel                                 │
│                                                                   │
│  2. ASEL READS SUMMARY                                            │
│     Present summary to user                                       │
│     If PASS (no issues) → user approval → next step               │
│                                                                   │
│  3. USER APPROVAL GATE                                            │
│     User reviews summary + can read full report                   │
│     Normal: user approves or requests fixes                       │
│     Autopilot: auto-approve if no CRITICAL findings               │
│                                                                   │
│  4. FIX LOOP (if needed)                                          │
│     Asel reads report file → extracts findings                    │
│     Dispatches Developer agent with findings                      │
│     After fix → re-dispatch same E-step agent (re-check)          │
│     Max 2 loops → escalate to user                                │
│                                                                   │
│  E1 SPECIAL: PLACEHOLDER PAGE DEVELOPMENT                         │
│     E1 report includes placeholder/empty pages with expected      │
│     content from SCREENS.md + PRODUCT.md.                         │
│     If placeholders found → Asel extracts each page's expected    │
│     functionality → dispatches Developer agent PER PAGE            │
│     (with screen ref, expected components, business rules).       │
│     After all pages developed → re-dispatch E1 agent for          │
│     full re-test (routes + elements + scenarios).                 │
│     This is NOT counted in the 2-loop limit — it's a              │
│     development cycle, not a fix loop.                            │
│                                                                   │
├──────────────────────────────────────────────────────────────────┤
│  E0: Seed Generator → docs/reports/seed-report.md                 │
│      Schema analysis → data volume plan → generate seed → verify  │
│  E1: E2E Tester → docs/reports/e2e-test-report.md                │
│      4-pass: Route Crawl → Element Test → Scenarios → Functional │
│      (API + DB + business rules + cross-phase data integrity)    │
│  E2: Test Hardener → docs/reports/test-hardener-report.md         │
│  E3: Perf Optimizer → docs/reports/perf-optimizer-report.md       │
│  E4: UI Polisher → docs/reports/ui-polisher-report.md             │
│  E5: Acceptance Tester → docs/reports/acceptance-report.md        │
│      AC inventory → BR inventory → USERTEST → cross-cutting →    │
│      formal ACCEPTED/REJECTED decision                            │
│                                                                   │
│  Steps execute sequentially (E0-E3 modify code/data).             │
│  E3 failure doesn't block E4 (E4 is read-only).                  │
│  E5 runs LAST — formal acceptance on fully polished codebase.     │
│  After all 6 complete → phase DONE → ready for Documentation.    │
└──────────────────────────────────────────────────────────────────┘
```

<EXTREMELY-IMPORTANT>
E2E & Polish agents (model comes from the agent definition).
Each agent writes a REPORT FILE — Asel reads the report for fix dispatch, NOT the agent's raw output.
User approval happens in main context (Asel) based on agent's summary.
Fix loops are coordinated by Asel (not by the agent itself).
</EXTREMELY-IMPORTANT>

## ROUTEMAP Updates

After each step, update ROUTEMAP E2E & Polish Phase table:
- Mark completed step as `[x] DONE` with date
- When all 4 done → mark E2E & Polish Phase as `[DONE]`
- Set `Current phase: E2E_POLISH COMPLETE`

## When Complete

- All 6 E2E & Polish steps completed (E0-E5)
- Reports generated in `docs/reports/`
- Update ROUTEMAP: E2E & Polish Phase `[DONE]`
- Update decisions.md with E2E & Polish decisions
- Normal: "E2E & Polish tamamlandi. Documentation fazina gecmek ister misin?"
- Autopilot: Auto-start D1
- Next: Read `phases/documentation/doc-cycle.md`
