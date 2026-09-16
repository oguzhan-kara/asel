# Step 9: Development Readiness Audit

> Planner → Developer → Gate pipeline her story'yi soru sormadan, assumption yapmadan çalıştırabilir mi? %100 netlik kontrolü.
> Before starting: Update ROUTEMAP — mark Step 9 as `[~] IN PROGRESS`
> After completion: Update ROUTEMAP — mark Step 9 as `[x] DONE` with date, set `Current phase: PLANNING COMPLETE`

<EXTREMELY-IMPORTANT>
**ASEL DIRECT EXECUTION — DO NOT DELEGATE TO AN AGENT.**

Step 9 is executed by Ana Asel directly. It is NOT dispatched via Agent tool, NOT delegated to any agent. This audit requires holistic cross-document judgment that only the orchestrator with full planning context can perform.

The fundamental question Step 9 answers:
> "Tüm story'leri baştan sona implement etsek, ortaya çıkan ürün PRODUCT.md, SCOPE.md ve decisions.md'de tanımlanan ürünle birebir aynı olur mu?"
>
> If YES → ready for development.
> If NO → stories are incomplete, something was planned but never assigned to a story.
</EXTREMELY-IMPORTANT>

You are the Dev-Readiness Auditor. Your single goal: verify every story can be autonomously developed by Planner → Developer → Gate without any human question, assumption, or ambiguity — AND that the sum of all stories equals the planned product.

**Two core tests:**
1. **Per-story**: "If the Planner/Developer/Gate encounters this, will it NEED to ask a question or MAKE an assumption?" → YES = GAP, NO = PASS.
2. **Holistic (A8)**: "If ALL stories are implemented perfectly, does the result match what PRODUCT/SCOPE/decisions defined?" → NO = GAP, YES = PASS.

## Context Required

Before starting, read ALL:
- `docs/ROUTEMAP.md`
- `docs/brainstorming/decisions.md`
- `docs/SCOPE.md`, `docs/PRODUCT.md`, `docs/GLOSSARY.md`, `docs/FUTURE.md`
- `docs/ARCHITECTURE.md` (+ split files if scale-adaptive)
- `docs/SCREENS.md` (+ split files if scale-adaptive)
- `docs/FRONTEND.md` (if UI project)
- `docs/stories/phase-*/STORY-*.md` (ALL stories)

## Rules

- Run ALL 7 phases in order (A → G)
- Each gap: classify as **AUTO-FIX** or **NEEDS-DECISION**
- AUTO-FIX: update the doc/story directly, track the change
- NEEDS-DECISION: present to user with 2-3 specific options (NEVER open-ended questions)
- After all gaps resolved: re-scan Phase A to verify ZERO ambiguity
- Speak Turkish to user. Update docs in English.
- **ZERO tolerance**: even 1 ambiguity = FAIL. No exceptions.

---

> Read `{{aselRoot}}/references/dev-readiness-audit-a-c.md` now and follow it, then return here.
> Read `{{aselRoot}}/references/dev-readiness-audit-d-g.md` now and follow it, then return here.
## Resolution Protocol

### Auto-Fix (update directly, track change)

| Gap Type | Default Fix |
|----------|------------|
| Missing API status codes | Add: 400, 401, 403, 404, 422, 500 |
| Missing audit fields | Add: created_at, updated_at, created_by, updated_by |
| Missing empty/loading/error states | Add enterprise defaults from Step 2 |
| Missing FK cascade | Add: `ON DELETE RESTRICT` (safe default) |
| `should` → obligation | Replace with `MUST` |
| Missing pagination spec | Add: server-side, 50/page, sort by created_at DESC |
| Missing nullable spec | Add: `NOT NULL` (safe default) |
| Missing column default | Add: `NONE` (explicit no default) |
| Missing migration direction | Add: "reversible: up + down" |

### Create New Spec Document (C6 gaps)

When C6 finds a domain concept without adequate spec:

1. **Create** the spec doc under `docs/` (see C6 output file column)
2. **Content**: write comprehensive spec based on ARCHITECTURE.md + PRODUCT.md + stories + decisions.md + WebSearch if needed
3. **Sufficiency test**: "Can Planner embed a section from this directly into a plan?" — if not, expand
4. **Update story references**: add `- Spec: docs/[FILE].md` to each referencing story's Architecture Reference section
5. **Update ARCHITECTURE.md**: add cross-reference to new spec doc in relevant section
6. **Present to user**: show summary of created doc, get confirmation before finalizing
7. **Track**: log in report as "NEW_DOC: docs/[FILE].md — [reason]"

Multiple spec docs may be created in a single audit. This is expected and correct — a complex project (telecom, fintech, IoT) may need 5-10 domain spec documents.

### Needs Decision (present with options)

Format:
```
[Check ID] [Story/Doc] — KARAR GEREKLİ
Gap: [what's missing/ambiguous]
Impact: [Planner/Developer/Gate ne yapamaz]
Seçenekler:
  A) [option with pros]
  B) [option with pros]
  C) [option with pros]
Hangisi?
```

User decides → update doc → move to next gap.

---

## After All Phases Complete

### Re-Verification (MANDATORY)

1. Re-run Phase A7 (Ambiguity Scan) on ALL updated stories → MUST be ZERO matches
2. Re-run Phase B1-B3 on updated cross-story contracts → MUST PASS
3. Re-run Phase E1-E3 on all docs → MUST be ZERO open items

If ANY re-verification fails → fix and re-verify again (max 3 iterations).

### Report

Write to `docs/reports/dev-readiness.md`:

> Read `{{aselRoot}}/references/dev-readiness-report-template.md` now and follow it, then return here.
## When Complete

- Dev-readiness report at `docs/reports/dev-readiness.md`
- All stories verified for autonomous development
- All cross-story contracts verified consistent
- All architecture specs complete for implementation
- Zero ambiguities in any doc
- Update ROUTEMAP → Step 9 `[x] DONE` with date
- Set `Current phase: PLANNING COMPLETE`
- Announce: "Development Readiness Audit PASSED. Tüm story'ler otonom geliştirme için hazır. 'development phase' de ki başlayalım."
- Next: User triggers development phase → Read `phases/development/dev-cycle.md`

---

## Mid-Project Dev-Readiness Audit

Triggered when user says "dev-readiness", "readiness check", "otonom kontrol", "geliştirme hazırlık" during development phase.

This is NOT the initial Step 9 audit — the project already has DONE stories and active development. The goal is to verify that REMAINING (PENDING/NEEDS_REPLAN) stories are still autonomously developable after changes that occurred during development.

### When to Use

- After a CHANGE analysis added/modified stories
- After Gap Review (Mid-Project Re-Scan) added new stories
- Before starting a new phase (Phase 2, Phase 3, etc.)
- When Planner or Developer escalated due to missing spec
- When user feels docs may have drifted from implementation

### Context (Mid-Project)

Before starting, read:
- `docs/ROUTEMAP.md` — identify DONE vs PENDING stories
- `docs/brainstorming/decisions.md` — development decisions since initial audit
- ALL docs (same as initial audit)
- ALL story files (DONE + PENDING)
- Existing source code (for drift detection)

### Scope Differences from Initial Audit

| Phase | Initial (Step 9) | Mid-Project |
|-------|-------------------|-------------|
| **A: Per-Story** | ALL stories | Only PENDING + NEEDS_REPLAN stories |
| **B: Cross-Story** | ALL stories | DONE→PENDING contracts (does implementation match what PENDING stories expect?) |
| **C: Architecture** | Full check | Delta check — what changed since last audit? New tech introduced? |
| **C6: Domain Specs** | Create from docs | Also check existing spec docs against ACTUAL implementation — has implementation diverged? |
| **D: Design System** | Full check | Delta — new tokens/components introduced during dev that aren't in FRONTEND.md? |
| **E: Decisions** | docs/ only | Also scan code for TODO/FIXME/HACK comments that represent undocumented decisions |
| **F: Bootstrap** | Phase 1 scaffold | SKIP (already bootstrapped) |

### Mid-Project Extra Checks

#### M1. Implementation Drift Detection

For DONE stories, spot-check that implementation matches docs:
- Grep source for API endpoints → compare with ARCHITECTURE.md endpoint list
- Grep source for DB table/column names → compare with story schemas
- Grep source for env vars → compare with CONFIG.md (if exists)
- If drift found → update docs to match implementation (implementation wins post-dev)

#### M2. New Story Completeness

For stories added AFTER initial audit (via CHANGE or Gap Review):
- Run FULL Phase A (all 7 checks) — these stories never went through Step 9
- Run C6 domain check — new stories may reference concepts not yet spec'd

#### M3. Cross-Phase Contract

If auditing before a new phase:
- Verify Phase N-1 DONE stories created everything Phase N PENDING stories expect
- Check: tables, API endpoints, components, services, middleware, config
- Each missing dependency → GAP (either Phase N-1 missed it or Phase N story has wrong assumption)

### Mid-Project Report

Write to `docs/reports/dev-readiness-rescan-YYYY-MM-DD.md`:

```markdown
# Dev-Readiness Re-Scan

> Date: YYYY-MM-DD
> Context: [after CHANGE / before Phase N / user-triggered]
> Stories audited: N PENDING (M DONE skipped)
> Result: PASS / FAIL

## Scope
- PENDING stories checked: [list]
- New stories (post-initial audit): [list]
- DONE stories drift-checked: [list]

## Findings
| # | Check | Story/Doc | Gap | Resolution |
|---|-------|-----------|-----|------------|

## Drift Detected
| # | Area | Doc Says | Code Says | Fix |
|---|------|----------|-----------|-----|

## New Spec Documents Created
| # | Document | Reason | Stories |
|---|----------|--------|--------|

## Summary
- PENDING stories ready: X/Y
- Drift fixes: N
- New docs created: N
- User decisions: N
- **Remaining stories ready for autonomous dev: YES/NO**
```

### Important Rules for Mid-Project

- Do NOT re-audit DONE stories for Phase A (they're already built)
- DO check DONE stories for drift (M1) — docs may need updating
- PENDING stories get FULL Phase A audit (same rigor as initial)
- New stories (never audited) get FULL treatment including C6
- If drift found: implementation wins — update docs, NOT code
- All changes go through user approval — no silent doc updates
- Update `decisions.md` with audit findings
