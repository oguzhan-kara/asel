# Project Roadmap: [Project Name]

> Last updated: YYYY-MM-DD
> Current phase: PLANNING | DEVELOPMENT | E2E_POLISH | DOCUMENTATION
> Overall progress: 0%

---

## Planning Phase

| Step | Name | Status | Completed |
|------|------|--------|-----------|
| 1 | Discovery (Brainstormer) | [ ] PENDING | — |
| 2 | Gap Analysis (Gap Analyst) | [ ] PENDING | — |
| 3 | Product Definition (Product Analyst) | [ ] PENDING | — |
| 4 | Feature Discovery (Feature Researcher) | [ ] PENDING | — |
| 5 | Architecture (Architect) | [ ] PENDING | — |
| 6 | Screen Design (Screen Designer) | [ ] PENDING | — |
| 6.5 | Theme & Visual Design (Theme Designer) | [ ] PENDING | — |
| 7 | Story Writing (Story Writer) | [ ] PENDING | — |
| 7.5 | UAT Scenario Design | [ ] PENDING | — |
| 8 | Final Review (Reviewer) | [ ] PENDING | — |
| 9 | Development Readiness Audit | [ ] PENDING | — |

---

## Development Phase [NOT STARTED]

> Stories completed: 0/N (0%)
> Current story: —
> Current step: —

### Phase 1: [Name] [PENDING]

| # | Story | Effort | Status | Step | Dependencies | Completed |
|---|-------|--------|--------|------|-------------|-----------|
| STORY-001 | [Title] | S | [ ] PENDING | — | — | — |
| STORY-002 | [Title] | M | [ ] PENDING | — | STORY-001 | — |

### Phase 2: [Name] [PENDING]

| # | Story | Effort | Status | Step | Dependencies | Completed |
|---|-------|--------|--------|------|-------------|-----------|
| STORY-003 | [Title] | M | [ ] PENDING | — | STORY-002 | — |

---

## E2E & Polish Phase [NOT STARTED]

| Step | Name | Status | Completed |
|------|------|--------|-----------|
| E0 | Seed Data Generation (Seed Generator) | [ ] PENDING | — |
| E1 | E2E Browser Testing (E2E Tester) | [ ] PENDING | — |
| E2 | Test Hardening (Test Hardener) | [ ] PENDING | — |
| E3 | Performance Optimization (Perf Optimizer) | [ ] PENDING | — |
| E4 | UI Polish (UI Polisher) | [ ] PENDING | — |
| E5 | Functional Acceptance (Acceptance Tester) | [ ] PENDING | — |

---

## Documentation Phase [NOT STARTED]

| Step | Name | Status | Completed |
|------|------|--------|-----------|
| D1 | Specification | [ ] PENDING | — |
| D2 | Presentations (Sales + Technical) | [ ] PENDING | — |
| D3 | Rollout Guide | [ ] PENDING | — |
| D4 | User Guide | [ ] PENDING | — |

---

## Tech Debt

> Gate DEFERRED items tracked here. Planner reads open items for target story. Gate marks ✓ RESOLVED when target story completes.

| ID | Source | Description | Target | Status |
|----|--------|-------------|--------|--------|

## Change Log

| Date | Type | Description | Affected |
|------|------|-------------|----------|
| — | — | — | — |

---

## Status Legend
- `[ ] PENDING` — Not started
- `[~] IN PROGRESS` — Currently being worked on
- `[x] DONE` — Completed and verified
- `[!] NEEDS_REPLAN` — Affected by change, needs re-planning
- `[!!] BLOCKED_BY_CHANGE` — Cannot proceed until change is applied
- `[S] SKIPPED` — User kararıyla atlandı (autopilot escalation)
- Effort: S (Small) | M (Medium) | L (Large) | XL (Extra Large)

## Step Values
- `—` — Not started
- `Plan` — Implementation planning
- `Dev` — Developer implementing
- `Lint` — Pre-Gate lint scan
- `Gate` — Combined Gate (Gap + Compliance + Tests + Perf + Build)
- `Commit` — Close & Commit
- `Review` — Reviewer checking (after every story)
- `Handoff` — Session handoff
- `Escalated` — Gate/Dev escalate etti, user bekleniyor
- `Failed` — Build/test/gate failed
- `E1` — E2E Browser Testing
- `E2` — Test Hardening
- `E3` — Performance Optimization
- `E4` — UI Polish
- `D1` — Specification document
- `D2` — Presentations (Sales + Technical)
- `D3` — Rollout Guide
- `D4` — User Guide

## Maintenance Phase (post-release)

> NOT present until first `release` is run. After the first release, the live state of bugs/features lives in **GitHub Issues + PRs**, not in this file.
>
> ROUTEMAP receives only release-time updates:
>
> ```markdown
> ## Production: v1.0.0 (YYYY-MM-DD)
>
> ## v1.1.0 (2026-03-10)
> - HOTFIX-001: Login button label typo ([#12](issue-url) / [#13](pr-url))
> - BUG-001: Login timeout fix ([#14](issue-url) / [#15](pr-url))
> - ENH-001: PDF export ([#18](issue-url) / [#20](pr-url))
> ```
>
> The release process (`phases/release/release-process.md`) writes these blocks. Do NOT add an open "Maintenance" table here manually — open work is tracked via `gh issue list` / `gh pr list`.
