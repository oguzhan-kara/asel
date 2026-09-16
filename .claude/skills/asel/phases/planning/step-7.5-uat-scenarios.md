# Step 7.5: UAT Scenario Design

> Cross-screen, cross-story business flow scenarios. Tests that a value entered in one screen correctly propagates through system processes and appears in other screens.
> Before starting: Update ROUTEMAP — mark Step 7.5 as `[~] IN PROGRESS`
> After completion: Update ROUTEMAP — mark Step 7.5 as `[x] DONE` with date

## You are the UAT Scenario Designer

You create User Acceptance Test scenarios that verify END-TO-END BUSINESS FLOWS — not individual screens or CRUD operations (USERTEST.md handles those).

UAT scenarios answer: "If a user does X here, does the system correctly process it and show the results everywhere it should?"

## Context Required

Before starting, read ALL:
- `docs/PRODUCT.md` — business rules, workflows, user journeys
- `docs/ARCHITECTURE.md` — services, API flows, async processing, event chains
- `docs/SCREENS.md` — screen relationships, navigation, data display
- `docs/SCOPE.md` — in-scope features
- `docs/stories/phase-*/STORY-*.md` — ALL stories (understand what's being built)
- `docs/GLOSSARY.md` — domain terminology

## Rules

- Write ALL scenarios in English (document language)
- User-facing steps reference screen names from SCREENS.md
- System steps reference services/APIs from ARCHITECTURE.md
- Each scenario MUST cross at least 2 screens or involve background processing
- Each scenario MUST reference specific business rules from PRODUCT.md
- Present scenarios to user for approval before writing file
- Speak Turkish to user during discussion

## UAT vs USERTEST — Clear Distinction

| | USERTEST.md | UAT.md |
|---|---|---|
| **Scope** | Single screen, single story | Cross-screen, cross-story flow |
| **Tests** | Button clicks, form submits, table display | Business process end-to-end |
| **Example** | "Login form accepts valid email" | "User registers → gets welcome email → first login shows onboarding → completes wizard → dashboard shows personalized data" |
| **Written by** | Commit step (per story) | This step (all at once, from business flows) |
| **Tested by** | E1 Pass 3 | E5 Acceptance Tester |

## Process

### 1. Business Flow Extraction

Read PRODUCT.md → identify ALL multi-step business flows:

| Flow Type | How to Find |
|-----------|-------------|
| **User journeys** | Registration → onboarding → first action → ongoing use |
| **CRUD cascades** | Create X → affects Y → visible in Z |
| **Status transitions** | Entity moves through statuses → different screens/actors involved |
| **Approval chains** | Request → review → approve/reject → notification → status update |
| **Calculation flows** | Input values → system calculates → result displayed elsewhere |
| **Notification chains** | Action → event → notification → recipient sees it |
| **Scheduled processes** | Time trigger → batch job → results visible in reports/dashboards |
| **Integration flows** | External input → system processes → internal state changes |
| **Multi-role flows** | User A does X → User B sees Y → User B does Z → User A sees result |
| **Data aggregation** | Multiple inputs → dashboard/report aggregates → drill-down works |

### 2. Scenario Design

For each identified flow, create a UAT scenario:

```markdown
## UAT-NNN: [Flow Name]

**Business Context**: [Why this flow matters — what business value it delivers]
**Trigger**: [What starts the flow — user action, time event, external input]
**Roles Involved**: [Which user roles participate]
**Business Rules**: [BR-NNN references from PRODUCT.md]
**Stories**: [STORY-NNN references that implement parts of this flow]

### Steps

| # | Actor | Screen / System | Action | Expected Result |
|---|-------|----------------|--------|-----------------|
| 1 | User (Admin) | SCR-005: User Management | Create new user with role "Editor" | User appears in list, status "Active" |
| 2 | System | Email Service | — | Welcome email sent to new user |
| 3 | User (New) | SCR-001: Login | Login with credentials from email | Redirected to onboarding wizard |
| 4 | System | Auth Service | — | Session created, last_login updated |
| 5 | User (New) | SCR-020: Onboarding | Complete wizard steps | Profile marked "onboarded" |
| 6 | User (Admin) | SCR-005: User Management | View user detail | Shows "Onboarded" badge, login history |

### Verify (Post-Flow Checks)

- [ ] User record in DB has `onboarded_at` timestamp
- [ ] Admin dashboard user count incremented
- [ ] Audit log shows: user_created, user_logged_in, onboarding_completed events
- [ ] New user can access Editor-level features but not Admin features
```

### 3. Coverage Matrix

After all scenarios, create a coverage matrix:

```markdown
## Coverage Matrix

### Story Coverage
| Story | UAT Scenarios | Covered By |
|-------|--------------|------------|
| STORY-001 | 2 | UAT-001, UAT-005 |
| STORY-005 | 3 | UAT-001, UAT-002, UAT-003 |
| STORY-010 | 0 | ⚠ NO UAT COVERAGE |

### Business Rule Coverage
| Rule | UAT Scenarios |
|------|--------------|
| BR-01 | UAT-001 |
| BR-05 | UAT-002, UAT-003 |
| BR-12 | ⚠ NO UAT COVERAGE |

### Screen Coverage
| Screen | UAT Scenarios |
|--------|--------------|
| SCR-001 | UAT-001, UAT-003 |
| SCR-005 | UAT-001, UAT-005 |
```

Stories or business rules with NO UAT coverage → present to user: "Bu story/rule UAT senaryosu olmadan kalacak. Ekleyelim mi?"

### 4. Output

Write to `docs/UAT.md`:

```markdown
# User Acceptance Test Scenarios

> Generated: YYYY-MM-DD
> Total scenarios: N
> Story coverage: X/Y stories (Z%)
> Business rule coverage: X/Y rules (Z%)

---

## UAT-001: [Flow Name]
...

## UAT-002: [Flow Name]
...

---

## Coverage Matrix
...
```

## When Complete

- UAT scenarios at `docs/UAT.md`
- N scenarios covering X stories, Y business rules
- Coverage gaps presented and resolved
- Update ROUTEMAP → Step 7.5 `[x] DONE` with date
- Next: Read `phases/planning/step-8-final-review.md`

---

## Mid-Project UAT Update

Triggered when user says "uat", "uat senaryosu", "kabul senaryosu", "iş akışı testi" during development.

### When to Use
- After new stories added (CHANGE, Gap Review)
- Before E2E & Polish phase
- When a cross-screen bug is found (add regression UAT scenario)

### Mid-Project Process
1. Read existing `docs/UAT.md`
2. Read ROUTEMAP → identify NEW or CHANGED stories since last UAT update
3. For new stories → check if they participate in existing flows (update steps) or create new flows
4. For changed stories → update affected UAT scenarios
5. Re-check coverage matrix
6. Present changes to user for approval
7. Update `docs/UAT.md`
