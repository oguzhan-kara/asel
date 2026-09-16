# Dev-readiness report template (reference for step-9-dev-readiness.md)

```markdown
# Development Readiness Audit

> Date: YYYY-MM-DD
> Stories audited: N
> Result: PASS / FAIL

## Per-Story Results
| Story | A1 API | A2 DB | A3 Screen | A4 Rules | A5 AC | A6 Tests | A7 Ambig | A8 DocCov | Status |
|-------|--------|-------|-----------|----------|-------|----------|----------|--------|

## Cross-Story Results
| Check | Status | Issues Fixed |
|-------|--------|-------------|
| B1 Schema Consistency | PASS/FAIL | N |
| B2 Resource Ownership | PASS/FAIL | N |
| B3 Dependencies | PASS/FAIL | N |
| B4 Route Uniqueness | PASS/FAIL | N |
| B5 Migration Order | PASS/FAIL | N |

## Architecture Results
| Check | Status | Issues Fixed |
|-------|--------|-------------|
| C1 Tech Stack | PASS/FAIL | N |
| C2 Infrastructure | PASS/FAIL | N |
| C3 Auth Flow | PASS/FAIL | N |
| C4 Error Handling | PASS/FAIL | N |
| C5 File Convention | PASS/FAIL | N |
| C6 Domain Tech Depth | PASS/FAIL | N |

## Domain Spec Documents Created (C6)
| # | Document | Reason | Stories Referencing |
|---|----------|--------|-------------------|

## Design System Results
| Check | Status | Issues Fixed |
|-------|--------|-------------|
| D1 Tokens | PASS/FAIL/N/A | N |
| D2 Mockups | PASS/FAIL/N/A | N |
| D3 Components | PASS/FAIL/N/A | N |
| D4 Forms | PASS/FAIL/N/A | N |

## Decision & Bootstrap Results
| Check | Status | Issues Fixed |
|-------|--------|-------------|
| E1 Open Decisions | PASS/FAIL | N |
| E2 TBD in Docs | PASS/FAIL | N |
| E3 Unresolved OR | PASS/FAIL | N |
| F1 Scaffold Story | PASS/FAIL | N |
| F2 Pattern Guidance | PASS/FAIL | N |

## Functional Completeness Results (Phase G)
| Check | Status | Gaps Found | Stories Created/Updated |
|-------|--------|-----------|----------------------|
| G1 Entity Lifecycle | PASS/FAIL | N | N |
| G2 User Flow | PASS/FAIL | N | N |
| G3 Data Integrity | PASS/FAIL | N | N |
| G4 Role & Permission | PASS/FAIL | N | N |
| G5 Edge Case & Boundary | PASS/FAIL | N | N |
| G6 Integration & External | PASS/FAIL/N/A | N | N |

## Changes Made
| # | Type | Location | Change |
|---|------|----------|--------|
| — | AUTO-FIX | — | — |
| — | NEW_DOC | — | — |
| — | USER-DECISION | — | — |
| — | STORY-UPDATE | — | — |

## Summary
- Total checks run: N
- Passed on first scan: N
- Auto-fixed: N
- New spec docs created: N
- Stories updated with new refs: N
- New stories from Phase G: N
- User decisions: N
- Re-verification: PASS
- **Functional completeness: PASS**
- **Ready for development: YES**
```

### Pass Criteria

| Condition | Required |
|-----------|----------|
| Phase A: ALL stories, ALL 8 checks = PASS | YES |
| Phase B: ALL 5 cross-story checks = PASS | YES |
| Phase C: ALL applicable checks = PASS (C6 domain specs created if needed) | YES |
| Phase D: ALL applicable checks = PASS (UI) | YES |
| Phase E: ZERO open decisions/TBDs | YES |
| Phase F: Bootstrap verified | YES |
| Phase G: ALL 6 functional completeness checks = PASS | YES |
| Re-verification: ZERO ambiguities (including new stories from Phase G) | YES |

**ALL = PASS → Step 9 DONE → PLANNING COMPLETE**
**ANY FAIL remaining → CANNOT proceed to development**

