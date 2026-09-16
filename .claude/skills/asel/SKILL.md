---
name: asel
description: Project lifecycle orchestrator. Invoke to start, continue, or manage any project phase. Full lifecycle: Planning → Development → E2E & Polish → Documentation → Release & Maintenance.
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: node "{{hookRoot}}/gate-guard.js"
        - type: command
          command: node "{{hookRoot}}/quality-scan.js"
    - matcher: "Skill"
      hooks:
        - type: command
          command: node "{{hookRoot}}/skill-guard.js"
    - matcher: "Edit|Write"
      hooks:
        - type: command
          command: node "{{hookRoot}}/story-done-guard.js"
        - type: command
          command: node "{{hookRoot}}/setup-guard.js"
  PostToolUse:
    - matcher: "Edit|Write"
      hooks:
        - type: command
          command: node "{{hookRoot}}/phase-gate-guard.js"
        - type: command
          command: node "{{hookRoot}}/notify-hook.js"
  Stop:
    - matcher: ""
      hooks:
        - type: command
          command: node "{{hookRoot}}/stop-check.js"
---

# Asel — Project Lifecycle Orchestrator

Orchestrates 5 macro phases: **Planning** → **Development** → **E2E & Polish** → **Documentation** → **Release & Maintenance**.

Conversation language: `language.conversation` from `asel.config.json` (default `tr` — Turkish). Document language: `language.documents` (default `en` — all generated docs stay in English regardless of conversation language).

Foundational rules (auto-loaded from `.claude/rules/`):
- Architecture: `rules/immutable-architecture.md`
- ROUTEMAP: `rules/routemap-discipline.md`

## Mode Detection

When invoked, check for `docs/ROUTEMAP.md`. No ROUTEMAP + existing source files → ONBOARD. No ROUTEMAP + no source → NEW. ROUTEMAP exists → read its status and the user's stated intent to pick a mode from the table below.

| Mode | Trigger | Behavior |
|------|---------|----------|
| **ONBOARD** | No ROUTEMAP, existing codebase detected | Read `phases/onboard/onboard-existing.md`, follow its protocol |
| **NEW** | No ROUTEMAP.md, no existing source files | Read `phases/planning/step-0-routemap-init.md` → Start Planning |
| **CONTINUE** | ROUTEMAP exists, has PENDING/IN PROGRESS items | Resume from first incomplete step (see CONTINUE Mode below) |
| **CHANGE** | User wants to change/add/remove something | Read `phases/change/change-analysis.md`, follow its protocol |
| **ASK** | User asks a question | Read-only, explain from docs, no file changes |
| **DEV** | Planning complete, user says "development phase" | Read `phases/development/dev-cycle.md`, follow its protocol |
| **POLISH** | E2E & Polish Phase active | Read `phases/e2e-polish/e2e-polish-cycle.md`, follow its protocol |
| **DOCS** | Dev & E2E complete, user says "documentation" | Read `phases/documentation/doc-cycle.md`, follow its protocol |
| **DEPLOY** | User says "deploy" / "deploy et" | Dispatch `asel-deploy-engineer` via the Agent tool |
| **AUTOPILOT** | User says "otopilot" / "autopilot" | Read `phases/development/autopilot.md`, follow its protocol. **Phase-scoped**: runs the current dev phase only, stops after Phase Gate PASS. |
| **HEADLESS** | User says "headless" / "asel headless" | Read `phases/development/headless-autopilot.md`, follow its protocol. **Phase-scoped + context-isolated**: Asel loops, each story runs in a fresh `claude -p` sub-session. Requires `claude` CLI on PATH. |
| **RELEASE** | User says "release" / "canlıya al" / "v1" | Read `phases/release/release-process.md`, follow its protocol |
| **AUDIT** | User says "audit" / "compliance" / "doğrulama" | Invoke the `asel-audit` skill (runs forked in its subagent) |
| **BUGFIX** | No production marker + user reports bug | Read `phases/development/bugfix.md`, follow its protocol |
| **GAP REVIEW** | User says "gap review" / "eksikleri tara" / "scope review" / "fonksiyonel eksik" | Read `phases/planning/step-2-gap-analysis.md` → scroll to "Mid-Project Re-Scan" section, follow its protocol |
| **DEV-READINESS** | User says "dev-readiness" / "readiness check" / "otonom kontrol" / "geliştirme hazırlık" | Read `phases/planning/step-9-dev-readiness.md` → scroll to "Mid-Project Dev-Readiness Audit" section, follow its protocol |
| **UAT** | User says "uat" / "uat senaryosu" / "kabul senaryosu" / "iş akışı testi" | Read `phases/planning/step-7.5-uat-scenarios.md` → scroll to "Mid-Project UAT Update" section, follow its protocol |
| **SEED** | User says "seed" / "seed data" / "test verisi" / "veri yükle" | Invoke the `asel-seed` skill (runs forked in its subagent) |
| **ACCEPTANCE** | User says "kabul" / "acceptance" / "fonksiyonel kabul" / "kabul testi" | Invoke the `asel-acceptance` skill (runs forked in its subagent) |
| **E2E-CHECK** | User says "test et" / "browser kontrol" / "gez" / "e2e check" / "son N story test" / "phase N test" or `/asel e2e-check <scope>` | Read `phases/e2e-check/check-cycle.md` to resolve scope, then invoke the `asel-e2e-check` skill (runs forked in its subagent); present bucketed findings (BUG / SCOPE) for bulk approval, route accepted items to `asel bugfix` / `asel change` |
| **MAINTAIN** | Production marker exists + user reports bug/feature | Read `phases/maintain/maintain-cycle.md` (and shared `phases/maintain/github-flow.md`), follow its protocol — GitHub issue + worktree + PR + user-approved squash merge |

When mode is unclear, ASK: "Mevcut projeyi tespit ettim. Ne yapmak istersin?"

## Dispatch Protocol

When mode is determined, **Read** the corresponding phase file and follow its instructions. The file IS the protocol.

All Asel resources live under `{{aselRoot}}/`; agent reference material under `{{aselRoot}}/references/`. When a phase file uses a short form like `agents/X.md` or `phases/Y.md`, resolve relative to `{{aselRoot}}/`.

## CONTINUE Mode — Read ROUTEMAP

ALWAYS read ROUTEMAP to determine progress. Never guess from file existence.

```
Read docs/ROUTEMAP.md → Planning Phase table:
- Step 1 PENDING?  → Read phases/planning/step-1-discovery.md
- Step 2 PENDING?  → Read phases/planning/step-2-gap-analysis.md
- Step 3 PENDING?  → Read phases/planning/step-3-product-definition.md
- Step 4 PENDING?  → Read phases/planning/step-4-feature-discovery.md
- Step 5 PENDING?  → Sub-step detection:
  - No ARCHITECTURE.md → Read phases/planning/step-5a-architecture-design.md
  - ARCHITECTURE.md exists but no Docker section → Read phases/planning/step-5b-architecture-infra.md
  - Docker exists but no Makefile → Read phases/planning/step-5c-architecture-output.md
- Step 6 PENDING?  → Read phases/planning/step-6-screen-design.md
- Step 6.5 PENDING? → Read phases/planning/step-6.5-theme-design.md
- Step 7 PENDING?  → Read phases/planning/step-7-story-writing.md
- Step 7.5 PENDING? → Read phases/planning/step-7.5-uat-scenarios.md
- Step 8 PENDING?  → Read phases/planning/step-8-final-review.md
- Step 9 PENDING?  → Read phases/planning/step-9-dev-readiness.md
- All DONE?        → Planning complete, ready for DEV

Read docs/ROUTEMAP.md → Development Phase:
- Story [~] IN PROGRESS? → Read Step column → Resume from that exact step
- Story [!] NEEDS_REPLAN? → Planner RE-PLAN mode (reads change context from decisions.md)
- Story [!!] BLOCKED_BY_CHANGE? → STOP, warn user
- Next [ ] PENDING story? → Start from Plan
- FIX-NNN [~] IN PROGRESS? → Read phases/development/bugfix.md, resume from Step column
- All [x] DONE? → Development complete, ready for E2E & Polish
- Priority: IN PROGRESS > FIX IN PROGRESS > NEEDS_REPLAN > PENDING

Step column mapping (Dev Phase Fixes):
- Investigate → Planner FIX mode
- Fix → Developer dispatch
- Gate → Gate dispatch
- Commit → Close & Commit

Step column mapping (Development — Normal Mode):
- Plan → Planner (Step 1)
- Dev → Developer dispatch (Step 2)
- Lint → Pre-Gate Lint (Step 2.5)
- Gate → Gate dispatch (Step 3)
- Review → Reviewer dispatch + Finding Resolution (Step 4a)
- Commit → Close & Commit, single unified commit (Step 4b)
- Setup → Setup Verification (Phase 1 first story only)
- Handoff → Session Handoff (Step 5)
- PhaseGate → Phase Gate agent running
- Escalated → Gate/Review escalated — present to user, offer 3 options
- Failed → Agent failed — show error, wait for user

Step column mapping (Development — AUTOPILOT / HEADLESS Mode):
Same steps as Normal Mode, just skips user approval and does not wait between stories. HEADLESS
additionally runs each story in a fresh `claude -p` sub-session; from ROUTEMAP's perspective it
looks identical to an AUTOPILOT story.

**Pipeline order** (all three modes): `Plan → Dev → Lint → Gate → Review → Commit → Handoff`. Review
ALWAYS runs before Commit so a single, clean git commit captures story code + Review-driven fixes.

Step column mapping (Maintenance):
- Investigate → Planner FIX mode (BUGFIX only)
- Fix → Developer (HOTFIX/BUGFIX)
- Dev → Developer (ENHANCE)
- Gate → Gate (all types)
- E2E → E2E test (BUGFIX/ENHANCE)
- Commit → Close & Commit

Step column mapping (E2E & Polish):
- E0 → Seed Data Generation
- E1 → E2E Browser Testing
- E2 → Test Hardening
- E3 → Performance Optimization
- E4 → UI Polish
- E5 → Functional Acceptance

If plan file is missing when resuming Dev → re-run Planner to regenerate.
```

Report: "ROUTEMAP'e göre [phase], [step] adımında kalmış. Oradan devam ediyorum."

## Agent Dispatch Reference

| Agent | subagent_type | When |
|-------|---------------|------|
| Planner | `asel-planner` | Story planning (Plan step, FIX-mode plans) |
| Developer | `asel-developer` | Task implementation (Dev step) |
| Gate Scout — Analysis | `asel-gate-scout-analysis` | Parallel gate scout: code/doc consistency pass |
| Gate Scout — Test/Build | `asel-gate-scout-testbuild` | Parallel gate scout: test + build verification pass |
| Gate Scout — UI | `asel-gate-scout-ui` | Parallel gate scout: UI/visual verification pass |
| Gate Team Lead | `asel-gate-lead` | Consolidates scout findings, fixes as single writer, verifies, writes gate report |
| Legacy Gate | `asel-legacy-gate` | Single-agent fallback when the scout team cannot be dispatched |
| Reviewer | `asel-reviewer` | Consistency check before commit |
| Phase Gate | `asel-phase-gate` | Phase boundary verification |
| DevOps | `asel-devops` | Phase 1 first story infra tuning + on-demand |
| Setup Verifier | `asel-setup-verifier` | Phase 1 first story, after DevOps |
| Deploy Engineer | `asel-deploy-engineer` | On-demand deploy (DEPLOY mode) |
| Seed Generator | `asel-seed-generator` | E2E phase E0; mid-project via the `asel-seed` skill |
| E2E Tester | `asel-e2e-tester` | E2E phase E1; mid-project via the `asel-e2e-check` skill |
| Test Hardener | `asel-test-hardener` | E2E phase E2 |
| Perf Optimizer | `asel-perf-optimizer` | E2E phase E3 |
| UI Polisher | `asel-ui-polisher` | E2E phase E4 |
| Acceptance Tester | `asel-acceptance-tester` | E2E phase E5; mid-project via the `asel-acceptance` skill |
| Compliance Auditor | `asel-compliance-auditor` | Audit mode via the `asel-audit` skill |

Dispatch with the Agent tool, e.g. `Agent(subagent_type: "asel-planner", prompt: …)`. Model and
effort come from the agent definition (rendered from `asel.config.json`); never restate them in
the prompt.

The Gate step is a **team** dispatch, not a single agent: run the three `asel-gate-scout-*`
subagents in parallel first, then dispatch `asel-gate-lead` with their combined findings.
`asel-legacy-gate` is a single-agent fallback only, for when the team dispatch is impractical.

## Progress Display

| Symbol | Meaning |
|--------|---------|
| `[✓]` | Completed |
| `[▶]` | Running |
| `[ ]` | Pending |
| `[✗]` | Failed |

Display at EVERY step transition. **Update ROUTEMAP DONE before asking user about next step** — see
`rules/routemap-discipline.md` Step Completion Protocol. Formats:

**Planning:** `[✓] Discovery → [▶] Gap Analysis → [ ] Product → ...`
**Dev (Normal):** `[✓] Plan → [▶] Dev (2/4: Auth) → [ ] Lint → [ ] Gate → [ ] Review → [ ] Commit → [ ] Handoff`
**Dev (AUTOPILOT):** `[✓] STORY-001 → [▶] STORY-002 → [ ] STORY-003 → ...`
**E2E:** `[✓] E2E Tests → [▶] Test Hardening → [ ] Performance → [ ] UI Polish`

## Anti-Patterns

| Bad Practice | Why | Instead |
|-------------|-----|---------|
| Using Asel on existing project without onboarding | Missing docs, broken references | Always run ONBOARD mode first |
| Skipping brainstorming or gap analysis for "simple" projects | Unexamined assumptions, missing functionality discovered mid-dev | Every project gets discovery and gap analysis |
| Starting development without all planning docs | Missing context causes rework | Complete planning first |
| Editing docs directly during mid-project changes | Missed dependencies, broken stories | Always go through Change Analyst (`phases/change/change-analysis.md`) |
| Manual typecheck instead of Gate | Gate has multiple passes — `tsc` is NOT Gate | ALWAYS dispatch the gate team (scouts, then `asel-gate-lead`); `asel-legacy-gate` is fallback only |
| Running stories in parallel (AUTOPILOT) | Stories have inter-dependencies, parallel causes conflicts | Stories ALWAYS sequential — one at a time |
| Batching multiple stories into one Dev dispatch | Skips per-story Plan/Gate/Commit/Review | Each story gets full pipeline |
| Not updating ROUTEMAP | Lost project visibility | Update after EVERY step and story change |
| Guessing progress from file existence | Fragile, inaccurate | ALWAYS read ROUTEMAP |
| Skipping Phase Gate between phases | Bugs accumulate across phases | ALWAYS run Phase Gate at phase boundary |
| Bug fix without regression test | Fix one bug, introduce another | Developer MUST run all tests after fix |
| Skipping triage in maintenance | Wrong pipeline | Asel MUST classify HOTFIX/BUGFIX/ENHANCE |
| Direct commit/push to `main` after release for code changes | Bypasses review gate, breaks audit trail | All post-release CODE changes go through GitHub issue + worktree + PR + user-approved squash merge — see `phases/maintain/github-flow.md` |
| Auto-merging PRs in autopilot | User mandate: merges always need human approval | Plans auto-approve, merges do NOT, even in autopilot |
| Working on `main` for maintenance fixes | Dirties primary working directory, regression risk | Each maintain item runs in its own worktree (`.claude/worktrees/<ID>`) |
| Dispatching agents without WORKTREE context block (post-release) | Agents work on stale main code, regression check is meaningless | Prepare each dispatch with both `cd <WORKTREE>` and a `WORKTREE: <path>` context block |
| Skipping DevOps Agent | Infra runs with defaults, perf degrades as data grows | ALWAYS dispatch DevOps before Setup Verifier |

## Configuration

Asel reads `asel.config.json` **once at session start**, resolved in this order: project root
(`./asel.config.json`) → user home (`~/.claude/asel.config.json`) → built-in defaults. If
`language.conversation` is `tr`, converse with the user in Turkish; documents are always written per
`language.documents` (default English) regardless of conversation language.

`workflow.autopilot` defaults to `false` — AUTOPILOT/HEADLESS only run when the user explicitly
asks. Each `guards.*` entry (`qualityScan`, `gateGuard`, `storyDoneGuard`, `setupGuard`,
`phaseGateGuard`, `skillGuard`, `stopCheck`) carries its own `enabled`/`level` (`block`/`warn`) —
respect it; never bypass a guard because a step "looks safe". Per-role model/effort live under
`agents.<role>.{model,effort}` — dispatch prompts never restate them.

## Integration with Other Skills

- **frontend-design**: Developer agent MUST use for all web UI. Enterprise-grade, no generic AI aesthetics.
- **Playwright MCP tools** (`{{playwrightPrefix}}__browser_*`): Gate (UI scout), E2E Tester, Phase Gate, UI Polisher use these for visual/browser testing.
- **asel-deploy**: Quick Makefile-based build & deploy (Skill tool, interactive) — distinct from dispatching `asel-deploy-engineer` for DEPLOY mode.

<EXTREMELY-IMPORTANT>
### Skills Asel MUST NEVER invoke

The following skills are standalone utilities invoked ONLY by the user directly
(`guards.skillGuard.userOnlySkills`). Asel orchestrator MUST NEVER dispatch or invoke them under
any circumstance:

- **asel-setup** — Developer onboarding (statusline, permissions, settings). User-only via `/asel-setup`.
- **asel-help** — Displays usage guide. User-only via `/asel-help`.
- **asel-changelog** — Generates changelogs. User-only via `/asel-changelog`.
- **asel-commit** — Smart commit. User-only via `/asel-commit`.
- **asel-checkup** — Project health check against current Asel standards. User-only via `/asel-checkup`.
- **asel-codex-review** — Independent external review via Codex CLI. User-only via `/asel-codex-review`. Produces a findings report the user feeds back into `asel bugfix` / `asel change` manually.

If user says "skill yükle", "skill güncelle", or similar → this means reload/re-read the current
skill files, NOT invoke any of the above.
</EXTREMELY-IMPORTANT>

## Checklist (for Asel orchestrator)

1. Detect mode → Read corresponding phase file → follow its protocol
2. **Display Workflow Progress** bar before EVERY step transition
3. **Validation/Quality gates** → dispatch the gate team (scouts + `asel-gate-lead`) via the Agent tool
4. Provide agent with decisions.md context
5. Ensure output gets user approval before writing files
6. Ensure decisions.md is updated
7. Ensure ROUTEMAP is updated at every transition
8. Ensure build verification passes (in DEV mode)
9. **Phase boundary** → Normal: ask user. Autopilot: auto-dispatch Phase Gate Agent
10. **Review → Handoff**: always automatic, no question asked
11. **Normal DEV** → Asel manages Plan → Dev → Gate → Commit → Review → Handoff directly
12. **AUTOPILOT** → Same pipeline as normal mode, continuous loop **WITHIN the current dev phase only**. Stops after Phase Gate PASS at the end of the phase. User must re-issue "otopilot" to start the next phase. Autocompact handles context.
13. **AUTOPILOT escalation** → STOP + 3 options (düzelt/atla/dur) — NEVER auto-skip
14. **AUTOPILOT phase boundary** → After all current-phase stories DONE → Phase Gate → on PASS, STOP with summary, do NOT cross into next phase
15. **RELEASE mode** → Git tag + `gh release create` (categorized notes from ROUTEMAP + closed issues) + ROUTEMAP production marker + Telegram (with release URL) + activate MAINTAIN
16. **MAINTAIN mode** → Triage (HOTFIX/BUGFIX/ENHANCE) + architecture guard + regression-safe pipeline + GitHub flow (issue → worktree → PR → user-approved squash merge). PR merge is the ONLY approval autopilot does NOT auto-grant.
