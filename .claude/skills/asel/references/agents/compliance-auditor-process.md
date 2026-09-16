# Compliance Auditor — Process (Steps 1-3: Extraction, Scan, Verify) (reference for asel-compliance-auditor.md)

## Process

### Step 1: DOC EXTRACTION — Build 7 Inventories

Scan all docs and build structured inventories:

**1a. Endpoint Inventory:**
Read ARCHITECTURE.md → extract every API endpoint:
```
API-001: POST /api/users → creates user (fields: name, email, role)
API-002: GET /api/users → list users (pagination, filters)
API-003: GET /api/users/:id → user detail
...
```
Cross-reference with story files → mark which story implements each endpoint.

**1b. Schema Inventory:**
Read ARCHITECTURE.md → extract every DB table and its fields:
```
DB-001.users: id(PK), name(varchar), email(varchar,unique), role(enum), created_at, updated_at
DB-001.users → FK: role_id → DB-002.roles
...
```

**1c. Screen Inventory:**
Read SCREENS.md → extract every screen with expected elements:
```
SCR-001: /dashboard → cards(4), charts(2), recent-activity-table
SCR-002: /users → user-table(columns: name,email,role,actions), create-button, search, filters
...
```

**1d. Component Inventory:**
Read ARCHITECTURE.md (component tree) + SCREENS.md → extract expected components:
```
CMP-001: Button (variants: primary, secondary, danger, ghost)
CMP-002: DataTable (sort, paginate, search, export)
CMP-003: FormField (input, select, textarea, checkbox, date)
...
```

**1e. Business Rule Inventory:**
Read PRODUCT.md + story ACs → extract every testable rule:
```
BR-001: Only admin can delete users
BR-002: Email must be unique
BR-003: Password min 8 chars, 1 uppercase, 1 number
...
```

**1f. Feature Inventory (PRODUCT → Story coverage):**

<EXTREMELY-IMPORTANT>
This inventory catches features that are in PRODUCT.md or SCOPE.md but have NO story addressing them. The other inventories (1a-1e) are architecture-rooted (endpoints, schema, screens, components) — they miss product-level features that never made it into architecture (e.g., "multi-language support", "notifications system", "offline mode", "data export to PDF").

This is the reverse-coverage check: `Doc → Story`. It complements the forward-coverage check that the rest of the auditor does (`Story → Code`).
</EXTREMELY-IMPORTANT>

Read PRODUCT.md → extract ALL features from every section (MoSCoW table, features list, user stories, workflows):
```
FEAT-001: User authentication (email + password + OAuth Google)
FEAT-002: Role-based access control (admin, user, viewer)
FEAT-003: Multi-language support (TR, EN)
FEAT-004: Notifications (email + in-app)
FEAT-005: Data export (CSV, Excel, PDF)
...
```

Read SCOPE.md → extract every in-scope bullet and add to inventory if not already captured from PRODUCT.md.

**Cross-reference with ALL story files (DONE + PENDING, every phase):**
For each `FEAT-NNN`, scan story titles, descriptions, and acceptance criteria for keyword and concept match. A feature is considered "covered" if ANY story meaningfully addresses it (not just mentions it in passing).

Matching heuristic (keep it simple, deterministic where possible):
1. Entity/subject match: feature mentions "notification" → any story with "notification" in title/description/AC
2. Capability match: feature "export to PDF" → story mentioning "PDF export", "download report", etc.
3. If no confident match → flag as `NO_STORY` (gap for Step 6 story generation)

Output:
```
FEAT-001: COVERED by STORY-003 (Auth), STORY-004 (OAuth)
FEAT-002: COVERED by STORY-006 (RBAC)
FEAT-003: NO_STORY — Multi-language support mentioned in PRODUCT.md §2.4 but no story found
FEAT-004: PARTIAL — STORY-012 covers email but in-app notifications have no story
FEAT-005: NO_STORY — Data export to PDF in PRODUCT.md §3.1 but no story
```

**1g. Leftover Findings Inventory (Gate/Review history sweep):**

<EXTREMELY-IMPORTANT>
This is a historical sweep of gate/review reports for findings that were NEVER properly resolved. Sources include old-protocol projects where "non-blocking" / "observation" / "advisory" categories were allowed (the new protocol bans them, but leftover instances may still exist in old artifacts).

Also catches new-protocol projects with subtle leaks: DEFERRED items whose target story is now DONE without the debt being addressed, or ESCALATED items the user accepted as risk without a follow-up.
</EXTREMELY-IMPORTANT>

**1g.1 Scan every `docs/stories/phase-*/STORY-*-gate.md`:**
```bash
# Old-protocol forbidden section headers (banned in current protocol, may exist in old projects)
grep -lE '^## (Observations|Notes|Non-Blocking|Advisory)' docs/stories/phase-*/*-gate.md

# Within each matching file, extract the content under those sections
# Each bullet / table row → one FIND-NNN entry

# Escalated items: may have been "accepted as risk" without follow-up
grep -A 20 '^## Escalated' docs/stories/phase-*/*-gate.md
```

**1g.2 Scan every `docs/stories/phase-*/STORY-*-review.md`:**
```bash
# Unresolved Issues table rows (current protocol non-compliance)
grep -nE '\| +(ESCALATED|OPEN|NEEDS_ATTENTION|NON-BLOCKING|NON_BLOCKING|ADVISORY|OBSERVATION) +\|' docs/stories/phase-*/*-review.md

# Issues rows with empty Resolution column (old protocol before mandatory resolution)
grep -nE '\| +[0-9]+ +\|.*\| +\| +' docs/stories/phase-*/*-review.md  # blank Resolution

# Also scan the fixed sections for rows marked FIXED but with no file change evidence
```

**1g.3 Dedup against `ROUTEMAP.md → ## Tech Debt`:**
Before adding a finding to the inventory, check if the same description (keyword match) already exists in the ROUTEMAP Tech Debt table. If yes → skip (already tracked, not leftover).

```bash
# Extract existing tracked debt
awk '/^## Tech Debt/,/^## /' docs/ROUTEMAP.md | grep '^| D-'
```

**Output format:**
```
FIND-001: [from STORY-003-gate.md ## Observations] "Counter TTL not set — may grow unbounded"
         Severity: MEDIUM | Type: CODE_QUALITY | Not in Tech Debt
FIND-002: [from STORY-007-review.md ## Issues row 3] "USERTEST section missing for error flow"
         Severity: LOW | Type: USERTEST_GAP | Resolution column was empty (old protocol)
FIND-003: [from STORY-012-gate.md ## Deferred] "EMQX ACL simplified, needs proper per-topic rules"
         Target: STORY-020 (DONE without fix) | Severity: HIGH | Not in Tech Debt
FIND-004: [from STORY-015-review.md ## Issues row 1] "N+1 query in reports endpoint"
         Severity: HIGH | Resolution: ESCALATED, accepted as-is
```

**1g.4 Classification for Step 6:**
For each `FIND-NNN`, determine the target:
- **Subject overlaps with a PENDING story** (entity/layer/component match) → mark `TARGET: STORY-NNN` → Step 6 will add AC to that story
- **No PENDING story overlaps** → mark `TARGET: NEW` → Step 6 will create a new `[FINDING-SWEEP]` story

**Filter by scope:**
- PHASE_GATE mode → inventories 1a-1e related to the completed phase's DONE stories. Inventory 1f (feature coverage) scoped to features associated with completed phase. Inventory 1g (findings sweep) scoped to gate/review files of completed phase's stories.
- E2E / MANUAL / CHECKUP mode → all inventories for ALL DONE stories and ALL historical gate/review artifacts

### Step 2: CODEBASE SCAN — Static Analysis

Scan the actual codebase and build corresponding inventories:

**2a. Implemented Endpoints:**
```bash
# Find route definitions
grep -rn "router\.\(get\|post\|put\|patch\|delete\)" src/ --include='*.ts' --include='*.js'
# Or for Express/Fastify/NestJS patterns
grep -rn "@\(Get\|Post\|Put\|Patch\|Delete\)\|app\.\(get\|post\|put\|patch\|delete\)" src/ --include='*.ts'
```
For each found route: extract method, path, handler file.

**2b. Implemented Schema:**
```bash
# Find migration files
ls -la db/migrations/ || ls -la migrations/ || ls -la prisma/migrations/
# Find model/schema definitions
grep -rn "createTable\|CREATE TABLE\|model\b\|@Entity\|Schema(" src/ db/ prisma/ --include='*.ts' --include='*.js' --include='*.prisma' --include='*.sql'
```
For each table: extract fields, types, constraints.

**2c. Implemented Screens:**
```bash
# Find route definitions in React router
grep -rn "path:\|<Route\|createBrowserRouter" src/ --include='*.tsx' --include='*.jsx'
# Find page components
ls src/pages/ src/views/ src/app/ 2>/dev/null
```
For each route: identify the page component and its child components.

**2d. Implemented Components:**
```bash
# Find component files
find src/components/ -name '*.tsx' -o -name '*.jsx' 2>/dev/null
# Check atom/molecule/organism structure
ls src/components/atoms/ src/components/molecules/ src/components/organisms/ 2>/dev/null
```

**2e. Implemented Business Rules:**
```bash
# Find validation logic
grep -rn "validate\|guard\|authorize\|permission\|role\|throw.*\(401\|403\|422\)" src/ --include='*.ts'
# Find middleware/guards
grep -rn "middleware\|@Guard\|canActivate\|isAdmin\|hasRole" src/ --include='*.ts'
```

### Step 3: RUNTIME VERIFY (Conditional — App Running)

Check if app is running:
```bash
docker compose ps 2>/dev/null | grep -c "running\|Up"
```

**If app IS running** (count > 0):

**3a. API Endpoint Verification:**
For each endpoint from Endpoint Inventory that should be implemented (DONE stories):
```bash
curl -s -o /dev/null -w "%{http_code}" [API_URL]/api/[endpoint]
```
- Verify status code matches expected
- Verify response body structure
- Verify required fields in response

**3b. DB Schema Verification:**
```bash
docker compose exec [db-service] psql -U [user] -d [db] -c "\dt"  # list tables
docker compose exec [db-service] psql -U [user] -d [db] -c "\d [table]"  # describe table
```
- Verify all expected tables exist
- Verify all expected columns exist with correct types
- Verify constraints (NOT NULL, UNIQUE, FK)

**3c. Screen Route Verification:**
Use Playwright MCP tools ({{playwrightPrefix}}__browser_*) to navigate each expected route:
- Does route resolve? (not 404)
- Does page render? (not blank/error)
- Are expected UI elements present?

**If app is NOT running**: Skip runtime verification, proceed with static analysis results only. Note in report: "Runtime verification skipped — app not running."

