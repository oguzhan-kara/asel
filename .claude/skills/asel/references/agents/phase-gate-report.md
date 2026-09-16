# Phase Gate — Report Template (reference for asel-phase-gate.md)

## Report

After all steps complete, write report to `docs/reports/phase-N-gate.md`:

```markdown
# Phase N Gate Report

> Date: YYYY-MM-DD
> Phase: N — [Phase Name]
> Status: PASS | FAIL
> Stories Tested: STORY-XXX, STORY-YYY, ...

## Deploy
| Check | Status |
|-------|--------|
| Docker build | PASS/FAIL |
| Services up | PASS/FAIL |
| Health check | PASS/FAIL |

## Smoke Test
| Endpoint | Status | Response |
|----------|--------|----------|
| Frontend | 200 | OK |
| API Health | 200 | {"status":"ok"} |
| DB | connected | OK |

## Unit/Integration Tests
> Total: N | Passed: X | Failed: Y | Skipped: Z

## USERTEST Scenarios
> Total: N | Pass: X | Fail: Y | Pass Rate: Z%

| Story | Scenario | Result | Evidence |
|-------|----------|--------|----------|
| STORY-001 | #1: Login flow | PASS | phase-1/STORY-001-01.png |
| STORY-001 | #2: Invalid login | FAIL | phase-1/STORY-001-02-fail.png |

## Functional Verification
> API: X/Y pass | DB: X/Y pass | Business Rules: X/Y pass

| Type | Check | Result | Detail |
|------|-------|--------|--------|
| API | GET /api/users returns created user | PASS | 200, user in data array |
| DB | users table has new row | PASS | Row exists with correct fields |
| Rule | Non-admin DELETE /api/users/1 → 403 | PASS | 403 Forbidden |

## Screen Screenshots
| Screen | Route | Status | Evidence |
|--------|-------|--------|----------|
| Dashboard | / | OK | phase-1/dashboard.png |
| Users | /users | OK | phase-1/users.png |

## Turkish Text Audit
> Issues Found: N | Fixed: X

| File | Line | Before | After |
|------|------|--------|-------|
| src/components/UserList.tsx | 42 | "Kullanicilar" | "Kullanıcılar" |
| src/i18n/tr.json | 15 | "Islem Basarili" | "İşlem Başarılı" |

## UI Polish
> Screens Polished: N | Design Docs Updated: Yes/No

| Screen | Issues | Fixes Applied | Before | After |
|--------|--------|--------------|--------|-------|
| Dashboard | Spacing, empty state | Added breathing room, empty widget state | polish/dashboard-before.png | polish/dashboard-after.png |
| Users | Table styling, hover | Consistent row height, hover highlight | polish/users-before.png | polish/users-after.png |

### Design Doc Changes
- FRONTEND.md: [list changes or "No changes"]
- SCREENS.md: [list changes or "No changes"]

## Compliance Audit (Doc vs Code)
> Compliance Rate: X/Y (Z%)
> Auto-fixed: N | Stories Generated: M

| Dimension | Documented | Implemented | Gaps | Rate |
|-----------|-----------|-------------|------|------|
| Endpoints | X | Y | Z | N% |
| Schema | X | Y | Z | N% |
| Screens | X | Y | Z | N% |
| Components | X | Y | Z | N% |
| Business Rules | X | Y | Z | N% |

### Audit-Gap Stories Generated
| Story | Title | Priority |
|-------|-------|----------|
| STORY-NNN | [AUDIT-GAP] ... | HIGH |

## Fix Attempts
| # | Issue | Fix | Commit | Result |
|---|-------|-----|--------|--------|
| 1 | Login redirect broken | Fixed auth middleware | abc1234 | PASS |

## Escalated (unfixed)
[None — or list]
```

## Return Status

Return this structured status block. This is parsed by Ana Asel.

```
PHASE_GATE_STATUS
==================
Phase: N — [Phase Name]
Status: PASS | FAIL
Deploy: PASS/FAIL
Smoke: PASS/FAIL
Tests: X/Y passed (unit + integration)
USERTEST: X/Y pass (Z%)
Functional: API X/Y, DB X/Y, Rules X/Y
Screenshots: N screens captured
Turkish Text: N issues found, X fixed
UI Polish: N screens polished, design docs updated: yes/no
Compliance Audit: X/Y (Z%), auto-fixed: N, stories generated: M
Fix Attempts: [count]
Fix Commits: [commit hashes]
Polish Commits: [commit hashes]
Escalated: [count] — [descriptions if any]
Report: docs/reports/phase-N-gate.md
Evidence: docs/e2e-evidence/phase-N/
Step Log: docs/e2e-evidence/phase-N/step-log.txt

STEP_EXECUTION_LOG
==================
STEP_1 DEPLOY: EXECUTED | items=N | evidence=docker-ps.txt | result=PASS/FAIL
STEP_2 SMOKE: EXECUTED | items=N | evidence=smoke-results.txt | result=PASS/FAIL
STEP_2.5 TESTS: EXECUTED | items=N | evidence=test-results.txt | result=PASS/FAIL
STEP_3 E2E: EXECUTED | items=N | evidence=[screenshot list] | result=X/Y PASS
STEP_3.5 FUNCTIONAL: EXECUTED | items=N | evidence=functional-results.txt | result=PASS/FAIL
STEP_4 VISUAL: EXECUTED | items=N | evidence=[screenshot list] | result=PASS/FAIL
STEP_5 TURKISH: EXECUTED | items=N | evidence=turkish-fixes.txt | result=PASS/FAIL
STEP_6 UI_POLISH: EXECUTED | items=N | evidence=[before/after list] | result=PASS/FAIL
STEP_6.5 COMPLIANCE: EXECUTED | items=N | evidence=compliance-report.txt | result=X%
STEP_7 FIX_LOOP: EXECUTED | items=N | evidence=[commit list] | result=PASS/FAIL
```

<EXTREMELY-IMPORTANT>
EVERY step MUST appear in STEP_EXECUTION_LOG. Valid statuses:
- `EXECUTED` — step ran and produced evidence
- `SKIPPED_NO_UI` — step is UI-conditional and this phase has no UI stories (valid only for Steps 3, 4, 5, 6)
- `NOT_EXECUTED` — step was not run for any other reason = AUTOMATIC FAIL

Ana Asel will reject any Phase Gate result where:
- Mandatory steps (1, 2, 2.5, 3.5, 6.5, 7) are not EXECUTED
- UI-conditional steps (3, 4, 5, 6) are not EXECUTED when the phase HAS UI stories
- Any step is missing from the log entirely
</EXTREMELY-IMPORTANT>

