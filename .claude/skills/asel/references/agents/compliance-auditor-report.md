# Compliance Auditor — Gap Analysis & Report (Steps 4-8) (reference for asel-compliance-auditor.md)

### Step 4: GAP MATRIX — Compare Doc vs Code

For each inventory, compare documented vs implemented:

```markdown
## Gap Matrix

### Endpoints
| Ref | Endpoint | Documented | Code Exists | Runtime Works | Gap Type |
|-----|----------|-----------|-------------|---------------|----------|
| API-001 | POST /api/users | ✓ | ✓ | ✓ | NONE |
| API-002 | GET /api/users | ✓ | ✓ | ✗ (500) | RUNTIME_BUG |
| API-005 | DELETE /api/users/:id | ✓ | ✗ | — | MISSING |
| API-008 | GET /api/reports | ✓ | partial | — | INCOMPLETE |

### Schema
| Ref | Table.Field | Documented | Exists | Type Match | Constraint Match | Gap Type |
|-----|------------|-----------|--------|------------|-----------------|----------|
| DB-001.email | users.email | ✓ | ✓ | ✓ | ✗ (no UNIQUE) | CONSTRAINT_MISSING |

### Screens
| Ref | Route | Documented | Route Exists | Renders | Elements Match | Gap Type |
|-----|-------|-----------|-------------|---------|---------------|----------|
| SCR-001 | /dashboard | ✓ | ✓ | ✓ | ✗ (2/4 cards) | INCOMPLETE |
| SCR-008 | /reports | ✓ | ✗ | — | — | MISSING |

### Components
| Ref | Component | Documented | File Exists | Variants Match | Gap Type |
|-----|-----------|-----------|-------------|---------------|----------|
| CMP-002 | DataTable | ✓ | ✓ | ✗ (no export) | INCOMPLETE |

### Business Rules
| Ref | Rule | Documented | Code Evidence | Runtime Verified | Gap Type |
|-----|------|-----------|--------------|-----------------|----------|
| BR-001 | Admin-only delete | ✓ | ✓ (guard exists) | ✓ (403) | NONE |
| BR-003 | Password policy | ✓ | ✗ | — | MISSING |

### Feature Coverage (PRODUCT → Story)
| Ref | Feature | Source | Covered By | Gap Type |
|-----|---------|--------|-----------|----------|
| FEAT-001 | User authentication | PRODUCT.md §1.1 | STORY-003 | NONE |
| FEAT-003 | Multi-language support | PRODUCT.md §2.4 | — | NO_STORY |
| FEAT-004 | Notifications | PRODUCT.md §2.5 | STORY-012 (email only) | PARTIAL |
| FEAT-005 | Data export to PDF | PRODUCT.md §3.1 | — | NO_STORY |

### Leftover Findings (Gate/Review history sweep)
| Ref | Finding | Source | Severity | Target | Gap Type |
|-----|---------|--------|----------|--------|----------|
| FIND-001 | Counter TTL not set | STORY-003-gate.md ## Observations | MEDIUM | STORY-015 (PENDING, overlap) | LEFTOVER_FINDING |
| FIND-002 | USERTEST missing for error flow | STORY-007-review.md Issues row 3 | LOW | NEW | LEFTOVER_FINDING |
| FIND-003 | EMQX ACL simplified | STORY-012-gate.md ## Deferred | HIGH | NEW (target story DONE) | LEFTOVER_FINDING |
| FIND-004 | N+1 query in reports endpoint | STORY-015-review.md Issues row 1 (ESCALATED) | HIGH | STORY-021 (PENDING, overlap) | LEFTOVER_FINDING |
```

**Gap Types:**
- `NONE` — fully implemented
- `MISSING` — not implemented at all
- `INCOMPLETE` — partially implemented (some fields/features missing)
- `DIVERGED` — implemented differently than documented
- `RUNTIME_BUG` — code exists but doesn't work at runtime
- `CONSTRAINT_MISSING` — logic exists but constraints/validations missing
- `UNDOCUMENTED` — exists in code but not in docs (bonus: flag for doc update)
- `NO_STORY` — feature in PRODUCT/SCOPE but no story addresses it (Feature Coverage only)
- `PARTIAL` — feature has a story covering part of it but not the whole scope (Feature Coverage only)
- `LEFTOVER_FINDING` — unresolved finding in historical gate/review reports, not yet in Tech Debt

### Step 5: AUTO-FIX — Small Gaps (Verify-Fix Loop)

Small gaps that can be fixed directly without story planning:

| Gap Type | Fixable? | Example |
|----------|----------|---------|
| CONSTRAINT_MISSING | YES | Add UNIQUE constraint, NOT NULL, index |
| Missing validation | YES | Add field validation in controller/service |
| Missing empty state | YES | Add empty state component to screen |
| Missing loading state | YES | Add loading spinner/skeleton |
| Wrong status code | YES | Fix return status in controller |
| Missing error handling | YES | Add try/catch, error response |
| Missing DB migration | YES | Generate migration script for missing constraint |
| Missing component variant | YES | Add missing variant to existing component |
| DIVERGED (minor) | YES | Fix to match spec (rename field, change type) |

**Fix process:**
1. For each fixable gap:
   a. Read the relevant source file
   b. Apply the fix
   c. Track in fix log
2. After all fixes → re-verify (re-run Step 2/3 for fixed items)
3. If still gaps after fix → try once more (max 2 iterations)
4. Git commit: `fix(audit): [description of fixes]`

**NOT fixable (require stories):**
- MISSING endpoint (new route + controller + service + tests)
- MISSING screen (new page component + routing + data fetching)
- MISSING feature (multiple files, new business logic)
- INCOMPLETE with >50% missing (essentially a new implementation)
- `NO_STORY` (Feature Coverage gaps) — always go to Step 6, never auto-fix (feature needs planning first)
- `PARTIAL` (Feature Coverage gaps) — always go to Step 6 (extends an existing story or creates a follow-up story)
- `LEFTOVER_FINDING` (gate/review history sweep) — always go to Step 6, even if the finding would be a small code change. The point of the sweep is to make findings durable as story work, not ephemeral auto-fixes. Exception: if the finding is a literal one-liner (typo in a label, missing `ı`/`ğ`), auto-fix is acceptable and the Step 7 report still logs it.

### Step 6: STORY GENERATION — Large Gaps + Feature Coverage + Leftover Findings

For each non-fixable gap, decide between TWO paths:

**Path A — Update existing PENDING story (cheaper, preferred when overlap exists):**

Before creating a new story, check if the gap's subject overlaps with an existing PENDING story. Overlap criteria (be strict — when in doubt, create a new story):

1. **Entity match**: the gap talks about the same entity the PENDING story targets (user, order, invoice, report, etc.)
2. **Layer match**: the gap is in the same architectural layer the PENDING story already touches
3. **Scope fit**: adding the gap as an AC would not balloon the story effort by more than ~25% (if it would, create a new story instead)

When overlap found → **add the gap as an AC to the existing story** (do NOT create a new story):

```markdown
## Acceptance Criteria
- [x] AC-1: ... (existing)
- [x] AC-2: ... (existing)
- [ ] AC-N: **[AUDIT-GAP / PRODUCT-GAP / FINDING-SWEEP]** [gap description]
       Source: [gap-ref, e.g., API-005 or FIND-003]
       Added by: Compliance Auditor [YYYY-MM-DD]
```

Also append to the story's description: `> Updated by Compliance Auditor [YYYY-MM-DD]: added AC-N from [gap-ref]`.

Do NOT modify story files for `[x] DONE` or `[~] IN PROGRESS` stories — DONE is immutable history, and IN PROGRESS means another agent (Developer/Gatekeeper/Reviewer) is actively working from the current plan/AC list. Mutating an IN PROGRESS story's ACs mid-flight creates a plan-vs-story mismatch. Overlap check is strictly against `[ ] PENDING` and `[!] NEEDS_REPLAN` stories only.

**Path B — Generate a new story (when no overlap or scope would balloon):**

1. Create story file: `docs/stories/phase-N/STORY-NNN-[prefix]-[name].md`
   - Use next available STORY number from ROUTEMAP
   - Reference the gap matrix entry
   - Include clear ACs derived from the original doc spec / feature / finding source
   - Tag title with appropriate prefix based on gap source:
     - **`[AUDIT-GAP]`** — gap from inventories 1a-1e (endpoint/schema/screen/component/BR doc-vs-code)
     - **`[PRODUCT-GAP]`** — gap from inventory 1f (feature in PRODUCT/SCOPE with no story coverage)
     - **`[FINDING-SWEEP]`** — gap from inventory 1g (leftover historical finding)

2. Story file format (same structure for all three prefixes):
```markdown
# STORY-NNN: [AUDIT-GAP] [descriptive title]

## Source
- Gap Type: [MISSING | INCOMPLETE | DIVERGED]
- Doc Reference: [API-005, SCR-008, etc.]
- Audit Report: docs/reports/compliance-audit-report.md

## Description
[What is missing and why it matters]

## Acceptance Criteria
- [ ] AC1: [specific, verifiable criterion from original doc]
- [ ] AC2: ...

## Technical Notes
- Architecture refs: [API-NNN, DB-NNN, SCR-NNN, CMP-NNN]
- Related stories: [STORY-NNN that should have implemented this]
- Files to create/modify: [based on gap analysis]

## Priority
[CRITICAL | HIGH | MEDIUM — based on gap severity]
```

3. Update ROUTEMAP:
   - Add audit stories to current or next phase
   - Mark as `[ ] PENDING`
   - Add the appropriate prefix tag to the title in ROUTEMAP: `[AUDIT-GAP]`, `[PRODUCT-GAP]`, or `[FINDING-SWEEP]`
   - Path A (AC added to existing PENDING story) does NOT add a new ROUTEMAP row — the existing story's row stays as-is, only its description/AC changes in the story file

Story file location by prefix:
- `[AUDIT-GAP]` → `docs/stories/phase-N/STORY-NNN-audit-[name].md`
- `[PRODUCT-GAP]` → `docs/stories/phase-N/STORY-NNN-product-[name].md`
- `[FINDING-SWEEP]` → `docs/stories/phase-N/STORY-NNN-finding-[name].md`

### Step 7: REPORT

Write full report to `docs/reports/compliance-audit-report.md`:

```markdown
# Compliance Audit Report

> Date: YYYY-MM-DD
> Trigger: MANUAL | PHASE_GATE (Phase N) | E2E
> Stories Audited: N (DONE stories)
> App Running: Yes/No (runtime verification: enabled/skipped)

## Executive Summary
- Total documented items: N
- Fully implemented: X (Y%)
- Gaps found: Z
- Auto-fixed: A
- Stories generated: B
- Compliance rate: X/N (Y%)

## Gap Matrix

### Endpoints (X/Y implemented)
[Full endpoint gap table from Step 4]

### Schema (X/Y complete)
[Full schema gap table from Step 4]

### Screens (X/Y implemented)
[Full screen gap table from Step 4]

### Components (X/Y implemented)
[Full component gap table from Step 4]

### Business Rules (X/Y enforced)
[Full business rule gap table from Step 4]

### Feature Coverage (X/Y covered — PRODUCT → Story)
[Full feature coverage table from Step 4 — include NO_STORY and PARTIAL gaps]

### Leftover Findings (Gate/Review sweep — X entries found, Y new, Z already in Tech Debt)
[Full leftover findings table from Step 4]

## Auto-Fixes Applied
| # | Gap Ref | Issue | Fix Applied | File | Verified |
|---|---------|-------|-------------|------|----------|
| 1 | DB-001.email | Missing UNIQUE | Added migration | db/migrations/... | ✓ |
| 2 | SCR-002 | Missing empty state | Added EmptyState component | src/pages/Users.tsx | ✓ |

## Existing Stories Updated (AC additions — Path A)
| Story | Gap Ref | AC Added | Rationale |
|-------|---------|----------|-----------|
| STORY-015 | FIND-001 | AC-5: Set counter TTL to prevent unbounded growth | Overlaps STORY-015 cache refactor |
| STORY-021 | FIND-004 | AC-7: Optimize reports endpoint N+1 query | Overlaps STORY-021 reports work |
| STORY-018 | FEAT-004 (partial) | AC-3: Add in-app notification channel | Extends STORY-018 email notifications |

## Stories Generated (new files — Path B)
| Story | Prefix | Title | Gap Refs | Priority |
|-------|--------|-------|----------|----------|
| STORY-025 | [AUDIT-GAP] | Implement DELETE /api/users/:id | API-005 | HIGH |
| STORY-026 | [AUDIT-GAP] | Build reports screen | SCR-008, API-010-012 | CRITICAL |
| STORY-027 | [PRODUCT-GAP] | Multi-language support (TR/EN) | FEAT-003 | HIGH |
| STORY-028 | [PRODUCT-GAP] | Data export to PDF | FEAT-005 | MEDIUM |
| STORY-029 | [FINDING-SWEEP] | USERTEST error-flow scenarios | FIND-002 | LOW |
| STORY-030 | [FINDING-SWEEP] | EMQX per-topic ACL rules | FIND-003 | HIGH |

## Undocumented Code (in code but not in docs)
| Type | Item | Location | Action Needed |
|------|------|----------|---------------|
| Endpoint | GET /api/health | src/routes/health.ts | Add to ARCHITECTURE.md |
| Screen | /404 | src/pages/NotFound.tsx | Add to SCREENS.md |

## Compliance by Dimension
| Dimension | Documented | Implemented / Covered | Gaps | Rate |
|-----------|-----------|----------------------|------|------|
| Endpoints | X | Y | Z | N% |
| Schema | X | Y | Z | N% |
| Screens | X | Y | Z | N% |
| Components | X | Y | Z | N% |
| Business Rules | X | Y | Z | N% |
| Feature Coverage (PRODUCT→Story) | X | Y | Z | N% |
| Leftover Findings (new, not in Tech Debt) | — | — | Z | — |
| **Overall** | **X** | **Y** | **Z** | **N%** |

Overall rate computed only over the 6 forward dimensions (endpoints/schema/screens/components/BR/feature). Leftover findings are not a "coverage rate" metric — they are historical cleanup.

## Verify-Fix Iterations
- Iteration 1: X gaps fixed, Y remaining
- Iteration 2: X gaps fixed, Y remaining (if needed)
- Unresolved: [list if any]
```

### Step 8: RETURN — Structured Status

Return this structured status block. This is parsed by Ana Asel.

```
COMPLIANCE_AUDIT_STATUS
========================
Trigger: MANUAL | PHASE_GATE (Phase N) | E2E | CHECKUP
Stories Audited: N
Runtime Verification: YES | SKIPPED (app not running)

Gap Summary (forward — Story→Code):
- Endpoints: X/Y implemented (Z gaps)
- Schema: X/Y complete (Z gaps)
- Screens: X/Y implemented (Z gaps)
- Components: X/Y implemented (Z gaps)
- Business Rules: X/Y enforced (Z gaps)
- Overall Forward Compliance: X/Y (Z%)

Gap Summary (reverse — Doc→Story):
- Feature Coverage: X/Y covered (Z NO_STORY, W PARTIAL)

Leftover Findings Sweep (historical):
- Scanned: N gate reports, M review reports
- Found: Z leftover findings (A already in Tech Debt, B new)

Actions Taken:
- Auto-fixed: N gaps (commit: [hash])
- Existing stories updated (Path A — AC additions): M (list of STORY-NNN + gap-ref)
- New stories generated (Path B): K total
  - [AUDIT-GAP]: X (forward doc/code gaps)
  - [PRODUCT-GAP]: Y (reverse feature coverage gaps)
  - [FINDING-SWEEP]: Z (leftover findings)
- ROUTEMAP updated: yes/no
- Verify-fix iterations: N

Unresolved: [count] — [descriptions if any]
Report: docs/reports/compliance-audit-report.md
```

