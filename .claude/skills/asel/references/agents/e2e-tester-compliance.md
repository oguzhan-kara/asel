# E2E Tester — Report Template & Compliance (reference for asel-e2e-tester.md)

### Step 6: Write Report File

Write full report to the mode-appropriate path:
- `polish-full`: `docs/reports/e2e-test-report.md` (overwrite)
- `e2e-check`: `docs/reports/e2e-check-<scope>-<YYYY-MM-DD>.md` where `<scope>` is the scope argument (e.g. `all`, `phase-2`, `STORY-012`, `last-3`)

Report template (same for both modes; the Pass 5 section is replaced by Pass P output in `e2e-check` mode):

```markdown
# E2E Test Report

> Date: YYYY-MM-DD

## Pass 1: Route Crawl & Placeholder Detection

> Total Routes: N
> Implemented: X | Placeholder: Y | Empty: Z | Missing: W

### Placeholder Pages
| Route | Screen Ref | Expected Content (from docs) | Severity | Evidence |
|-------|-----------|------------------------------|----------|----------|
| /reports | SCR-015 | Report list, filters, export, drill-down to detail | CRITICAL | docs/e2e-evidence/route-reports-placeholder.png |
| /settings/integrations | SCR-022 | Integration cards, connect/disconnect, status | HIGH | docs/e2e-evidence/route-integrations-empty.png |

### Empty / Error Pages
| Route | Screen Ref | Error Type | Evidence |
|-------|-----------|------------|----------|
| /analytics | SCR-018 | White screen | docs/e2e-evidence/route-analytics-empty.png |

### Route Mismatch
| Issue | Route | Detail |
|-------|-------|--------|
| In menu but not in SCREENS.md | /notifications | Undocumented |
| In SCREENS.md but not in menu | /audit-log | SCR-025 unreachable |

## Pass 2: Interactive Element Testing

> Total Elements Tested: N
> Works: X | Broken: Y | Dead: Z | Error: W

### Broken Elements
| Screen | Element | Action | Expected | Actual | Evidence |
|--------|---------|--------|----------|--------|----------|
| /users | "Export CSV" button | Click | Download CSV | No response | docs/e2e-evidence/users-export-dead.png |
| /dashboard | Revenue chart bar | Click | Drill-down to detail | JS error | docs/e2e-evidence/dashboard-chart-error.png |

### Dead Elements (no response on interaction)
| Screen | Element | Type | Evidence |
|--------|---------|------|----------|
| /orders | "Advanced Filter" button | Button | docs/e2e-evidence/orders-filter-dead.png |

### Element Summary by Screen
| Screen | Total | Works | Broken | Dead | Error |
|--------|-------|-------|--------|------|-------|
| /dashboard | 24 | 22 | 1 | 0 | 1 |
| /users | 18 | 16 | 0 | 2 | 0 |
| ... | ... | ... | ... | ... | ... |

## Pass 3: USERTEST.md Scenarios

> Total Scenarios: N
> Pass: X | Fail: Y
> Pass Rate: Z%

### STORY-001: [Title]
| # | Scenario | Result | Evidence |
|---|----------|--------|----------|
| 1 | [description] | PASS | docs/e2e-evidence/STORY-001-01.png |
| 2 | [description] | FAIL | docs/e2e-evidence/STORY-001-02-fail.png |

#### Failures
- **#2**: [scenario description]
  - Expected: [from USERTEST.md]
  - Actual: [what happened]
  - Screenshot: docs/e2e-evidence/STORY-001-02-fail.png

### STORY-002: [Title]
...

## Pass 4: Functional Verification
> API: X/Y pass | DB: X/Y pass | Business Rules: X/Y pass

### API Verification
| Endpoint | Method | Expected | Actual | Result |
|----------|--------|----------|--------|--------|
| /api/users | GET | 200, list with created users | 200, 3 users | PASS |
| /api/teams/1/members | GET | 200, users from Phase 1 | 200, correct | PASS |

### DB Verification
| Table | Check | Expected | Actual | Result |
|-------|-------|----------|--------|--------|
| users | Row count after creation | >= 1 | 3 rows | PASS |
| user_roles | FK integrity | All user_ids exist in users | OK | PASS |

### Business Rule Negative Tests
| Rule | Test | Expected | Actual | Result |
|------|------|----------|--------|--------|
| Admin-only delete | DELETE /api/users/1 (non-admin) | 403 | 403 | PASS |
| Required email | POST /api/users (no email) | 422 | 422 | PASS |

### Cross-Phase Data Integrity
| Phase 1 Action | Phase 2+ Expectation | Result |
|----------------|---------------------|--------|
| Created user "Ali" | Visible in team assignment dropdown | PASS |

## Overall Summary
| Pass | Category | Total | OK | Issues |
|------|----------|-------|----|--------|
| 1 | Routes | N | X | Y placeholder + Z empty |
| 2 | Interactive Elements | N | X | Y broken + Z dead + W error |
| 3 | USERTEST Scenarios | N | X | Y fail |
| 4 | Functional Verification | N | X | Y API + Z DB + W rules fail |
| 5 | Compliance Audit | N | X | Y gaps (Z auto-fixed, W stories) |
```

## Pass 5: Compliance Audit (Doc vs Code)
> Compliance Rate: X/Y (Z%)
> Auto-fixed: N | Stories Generated: M

| Dimension | Documented | Implemented | Gaps | Rate |
|-----------|-----------|-------------|------|------|
| Endpoints | X | Y | Z | N% |
| Schema | X | Y | Z | N% |
| Screens | X | Y | Z | N% |
| Components | X | Y | Z | N% |
| Business Rules | X | Y | Z | N% |

[Full details in: docs/reports/compliance-audit-report.md]

### Step 7: Return Summary

**Mode-specific behavior:**

- `polish-full` — use the summary format below (existing behavior, includes Pass 5 compliance output)
- `e2e-check` — use the **bucketed bulk-approval summary** format (below the existing format). Replace Pass 5 line with Pass P output. **Do NOT write stories, do NOT dispatch compliance-auditor, do NOT auto-fix anything** — only catalogue.

Return a concise summary to the caller (NOT the full report):

```
E2E TEST SUMMARY
=================

Pass 1 — Routes: N total, X implemented, Y placeholder, Z empty
  Placeholder pages (need development):
  - /reports (SCR-015): Report list, filters, export — CRITICAL
  - /settings/integrations (SCR-022): Integration management — HIGH

Pass 2 — Elements: N tested, X works, Y broken, Z dead
  Broken/Dead:
  - /users: "Export CSV" button → no response
  - /dashboard: Revenue chart drill-down → JS error

Pass 3 — Scenarios: N total, X pass (Z%), Y fail
  Failures:
  - STORY-002 #7: Token expiry → white screen
  - STORY-005 #3: Delete button → no confirmation

Pass 4 — Functional: API X/Y, DB X/Y, Rules X/Y
  Failures:
  - API: GET /api/teams/1/members → 500 (expected 200)
  - Rule: Non-admin DELETE /api/users/1 → 200 (expected 403)
  Cross-Phase Issues:
  - Phase 1 user not visible in Phase 2 team dropdown

Pass 5 — Compliance: X/Y (Z%), auto-fixed: N, stories generated: M
  Gap stories:
  - STORY-NNN: [AUDIT-GAP] ...
  - STORY-NNN: [AUDIT-GAP] ...

Overall: [PASS / FAIL — FAIL if any placeholder pages, critical broken elements, functional verification failures, or compliance < 90%]

Full report: docs/reports/e2e-test-report.md
Compliance report: docs/reports/compliance-audit-report.md
Evidence: docs/e2e-evidence/
```

**`e2e-check` mode — bucketed bulk-approval summary:**

Return the following structure to `phases/e2e-check/check-cycle.md` for user presentation. Each finding gets an ID, severity, and suggested routing bucket. The caller presents this list to the user for bulk approval.

```
E2E-CHECK SUMMARY
==================
Scope: <all | phase-N | STORY-NNN | last-N>
Mode: e2e-check
Report: docs/reports/e2e-check-<scope>-<YYYY-MM-DD>.md
Evidence: docs/e2e-evidence/

Coverage: N screens tested (from M DONE stories in scope)

────────────────────────────────────────────────────────────
BUG — existing behavior broken (route to `asel bugfix`)
────────────────────────────────────────────────────────────
| # | Severity | Category | Screen | Issue | Evidence |
|---|----------|----------|--------|-------|----------|
| B1 | CRITICAL | FUNCTIONAL / MODAL | /users | Delete confirm ESC closes modal but keeps backdrop | docs/e2e-evidence/... |
| B2 | HIGH | DATA / NETWORK-STATUS | /orders | GET /api/orders → 500 | docs/e2e-evidence/... |
| B3 | HIGH | VISUAL / STATE | /reports | Empty state not rendered, blank area shown | docs/e2e-evidence/... |
| B4 | HIGH | DATA / CONSOLE-ERROR | /dashboard | Uncaught TypeError: Cannot read prop 'x' of undefined | docs/e2e-evidence/... |
| B5 | MEDIUM | FUNCTIONAL / FORM | /users/new | Boundary validation missing (email >255 chars accepted) | docs/e2e-evidence/... |
| B6 | CRITICAL | PRODUCT / RBAC-LEAK | /admin | "user" role sees "Delete User" button (should be admin-only) | docs/e2e-evidence/... |
| ... | | | | | |

────────────────────────────────────────────────────────────
SCOPE — missing feature/screen/field (route to `asel change`)
────────────────────────────────────────────────────────────
| # | Severity | Category | Screen/Area | Missing Item | Story Ref |
|---|----------|----------|-------------|--------------|-----------|
| S1 | HIGH | PRODUCT / SCOPE-GAP | /reports | Export-to-CSV button (AC-3 of STORY-015) | STORY-015 |
| S2 | HIGH | PRODUCT / RBAC-MISSING | /teams | "manager" role cannot see "Invite Member" (matrix says should) | STORY-022 |
| S3 | MEDIUM | VISUAL / RESPONSIVE | /dashboard | Mobile hamburger menu not implemented at <768px | STORY-003 |
| S4 | CRITICAL | - (route) | /audit-log | Route SCR-025 unreachable (placeholder page) | STORY-028 |
| ... | | | | | |

────────────────────────────────────────────────────────────
Pass Totals:
  Pass 1 Routes:      N total (X impl, Y placeholder, Z empty)
  Pass 1a Text:       N findings
  Pass 1b Responsive: N findings
  Pass 1c States:     N findings
  Pass 2 Elements:    N tested (X works, Y broken, Z dead)
  Pass 2 Modals:      N tested, Y failing
  Pass 2 Forms:       N tested, Y failing cases
  Pass 2 Tables:      N scanned, Y findings
  Pass 2 Console:     N errors, M warnings
  Pass 3 USERTEST:    X/Y pass in scope
  Pass 4 API+DB+Rule: X/Y pass in scope
  Pass 4d Network:    N mismatches
  Pass 4e N+1:        N suspected endpoints
  Pass 5b RBAC:       N violations
  Pass P Scope:       N gaps

Total BUG: N  |  Total SCOPE: M
────────────────────────────────────────────────────────────
```

The caller (`phases/e2e-check/check-cycle.md`) will:
1. Show this list to the user
2. Ask for bulk selection (e.g. "accept all BUG + S1,S2 from SCOPE" or "reject all SCOPE")
3. Dispatch accepted BUG items as a batch to `asel bugfix` with the finding bundle
4. Dispatch accepted SCOPE items as a single bundle to `asel change` — **change mode owns story drafting**

