# Legacy Gate — Passes 1-3 (reference for asel-legacy-gate.md)

## Process

### Phase 1: CHECK (6 Passes)

Run all 6 passes, collecting findings. Do NOT fix yet — just detect.

#### Pass 1: Requirements Tracing & Gap Analysis

<EXTREMELY-IMPORTANT>
This is NOT a vague "does it work?" check. Systematically extract EVERY requirement from the story, then verify EACH ONE exists in the implementation. Missing items are FINDINGS that Gate MUST fix in Phase 2.
</EXTREMELY-IMPORTANT>

**1.0 Requirements Extraction** — Before checking anything, read the story file and extract ALL requirements into 4 inventories:

**A. Field Inventory** — Read story ACs + SCREENS.md mockup → list every data field/attribute mentioned:

| Field | Source | Layer Check |
|-------|--------|-------------|
| name | AC-1, SCR-005 | Model + API + UI |
| email | AC-1, SCR-005 | Model + API + UI |
| department | AC-2, SCR-005 | Model + API + UI |

**B. Endpoint Inventory** — Read story ACs + ARCHITECTURE.md → list every API endpoint:

| Method | Path | Source | Expected Response |
|--------|------|--------|-------------------|
| GET | /api/users | AC-1, API-015 | 200, paginated list |
| POST | /api/users | AC-2, API-016 | 201, created record |
| DELETE | /api/users/:id | AC-4, API-018 | 204, no content |

**C. Workflow Inventory** — Read story ACs → extract step-by-step user workflows:

| AC | Step | User Action | Expected System Response |
|----|------|-------------|--------------------------|
| AC-1 | 1 | Click "Yeni Kullanıcı" button | Modal opens with empty form |
| AC-1 | 2 | Fill name, email, role fields | Fields accept input, validation on blur |
| AC-1 | 3 | Click "Kaydet" | Toast "Kullanıcı oluşturuldu", modal closes, list refreshes with new row |

**D. UI Component Inventory** (if UI story) — Read SCREENS.md mockup + ARCHITECTURE.md component tree:

| Component | Screen Location | Architecture Ref |
|-----------|----------------|-----------------|
| UserTable | main content area | CMP-015 |
| UserFormModal | overlay | CMP-016 |
| FilterBar | above table | CMP-017 |

**1.1 Field-by-Field Verification:**
For each field in Field Inventory, Grep implementation files and verify it exists in ALL required layers:
- **Model/Schema**: DB column or model property exists
- **API**: Field in request DTO/validation AND response serialization
- **UI**: Field rendered in form (input) AND display (table/detail)
- If field missing in ANY layer → FINDING (CRITICAL): `"Field '[field]' missing in [layer]"`

**1.2 Endpoint-by-Endpoint Verification:**
For each endpoint in Endpoint Inventory:
- Route definition exists with correct HTTP method and path
- Controller/handler function exists and is wired
- Service layer function exists with business logic
- DB query/model operation exists
- Response matches expected format (status code, envelope structure)
- If endpoint missing or incomplete → FINDING (CRITICAL): `"Endpoint [METHOD] [path] — [what's missing]"`

**1.3 Workflow Step-by-Step Trace:**
For each workflow in Workflow Inventory, trace the full chain in code:
- UI element exists (button, link, menu item) with correct label
- Event handler wired (onClick, onSubmit, etc.)
- API call triggered with correct endpoint
- Service processes request
- DB operation executes
- Response flows back to UI (toast, redirect, list refresh, state update)
- If any link in chain broken/missing → FINDING (HIGH): `"Workflow AC-N step N: [action] — [broken link]"`

**1.4 UI Component Verification — Screen Mockup Compliance** (if UI story):

<EXTREMELY-IMPORTANT>
Read the actual screen mockup from `docs/SCREENS.md` (or split screen files). The story's "Screen Reference" field tells you which SCR-NNN to find. Read the FULL ASCII mockup and extract EVERY element: tabs, columns, buttons, filters, search bars, cards, charts, status indicators, action menus, empty states, pagination, breadcrumbs, modals, drawers, tooltips.

Then verify EACH element exists in the implementation:
</EXTREMELY-IMPORTANT>

1. Read screen mockup (SCR-NNN from story's Screen Reference)
2. Extract element inventory from mockup:
   - All table columns (exact names)
   - All buttons and their labels
   - All form fields and their types
   - All filter/search controls
   - All tabs and their names
   - All cards/widgets and their content
   - All charts/visualizations
   - All status indicators/badges
   - All action menus (row actions, bulk actions)
   - Empty state, loading skeleton, error boundary
   - Pagination controls
   - Breadcrumb items
3. For EACH element in mockup → verify it exists in component code:
   - Component file exists at architecture-specified path
   - Element renders with correct label/text (from mockup)
   - Props match data model fields
   - Uses correct atoms/molecules from design system (not raw HTML)
4. **Missing element → FIXABLE (HIGH)**: Gate writes the missing component/element
5. Report: `"Screen SCR-NNN compliance: X/Y elements implemented (Z missing)"`

If screen has TABS → each tab is a separate verification scope. Missing tab = FIXABLE.

**1.5 State Completeness** (if UI story):
For each screen/component:
- Loading state: skeleton or spinner while data fetches
- Empty state: meaningful message + CTA when no data
- Error state: error message + retry when API fails
- If missing → FINDING (MEDIUM): `"[Component] missing [loading/empty/error] state"`

**1.6 Acceptance Criteria Summary:**
After 1.1-1.5, summarize per AC:

| # | Criterion | Status | Fields OK | Endpoints OK | Workflow OK | Components OK | Gaps |
|---|-----------|--------|-----------|-------------|-------------|---------------|------|
| AC-1 | [text] | PASS/FAIL | 5/5 | 2/2 | 3/3 | 2/2 | none |
| AC-2 | [text] | FAIL | 3/5 | 1/2 | 2/4 | 1/2 | department, phone missing; DELETE endpoint missing |

**1.7 Test Coverage Verification:**

  **A. Plan compliance** — Read the plan file's test steps:
  - Test files listed in plan exist
  - Test scenarios from plan are implemented
  - If missing → flag as FINDING (HIGH)

  **B. Acceptance criteria coverage** — For each AC in the story:
  - At least one test verifies the happy path
  - At least one test verifies the failure/edge case (invalid input, unauthorized access, duplicate, boundary)
  - If only happy path tested → flag as FINDING (MEDIUM): "AC-N missing negative test"

  **C. Business rule coverage** — Read PRODUCT.md, find rules referenced by this story:
  - Each referenced business rule MUST have a test that enforces it
  - Example: rule "only admin can delete users" → test verifies non-admin gets 403
  - If business rule has no test → flag as FINDING (HIGH): "Business rule '[rule]' untested"

  **D. Test quality** — Scan test files for weak assertions:
  - Tests must assert specific outcomes (status code, response body, DB state), not just `.toBeDefined()` or `not.toThrow()`
  - If weak assertions found → flag as FINDING (MEDIUM): "Weak assertion in [test file]"

#### Pass 2: Compliance Check

Check against ARCHITECTURE.md:
- Layer separation (code in correct architectural layer?)
- Component boundaries respected?
- Data flow matches documented patterns?
- Technology stack per ADRs?
- API contracts match architecture spec?
- API response format: standard envelope `{ status, data, meta? }` / `{ status, error: { code, message, details? } }`?
- Database models match data model?
- Naming conventions follow architectural patterns?
- Dependency direction correct?
- React component-based (atomic design)?
- Performance patterns (lazy loading, memoization, efficient queries)?
- Database migration scripts present for ALL DB changes? Reversible?
- No temporary solutions (TODO comments, hardcoded values, workarounds)?
- Docker compatibility?
- Enterprise quality (error handling, logging, security, accessibility)?
- Makefile updated if new services/scripts/targets added?
- Data drill-down: ALL displayed entity references clickable/navigable?
- Design tokens: UI code uses CSS variables from FRONTEND.md? No hardcoded colors/fonts/spacing?
- **shadcn/ui enforcement**: ALL UI components use shadcn/ui from `@/components/ui/*`? No raw HTML (`<input>`, `<button>`, `<select>`, `<textarea>`, `<dialog>`, `<table>`) outside `components/ui/`? No native browser dialogs (`alert`, `confirm`, `prompt`, `window.alert/confirm/prompt`) — only project wrapper components from atoms/molecules? No raw HTML injection (`dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`) — only project wrapper with sanitizer? No competing library imports (`@mui/*`, `antd`, `@chakra-ui/*`, `@mantine/*`, `react-bootstrap`, `@headlessui/react`)? Custom atoms wrap shadcn/ui primitives?

Check against PRODUCT.md:
- Business rules implemented correctly?
- User workflows match documented flows?

Check against `docs/brainstorming/bug-patterns.md` (under `## Patterns`):
- For each pattern whose `Affected` layer matches this story's code → verify the prevention rule is followed
- Example: PAT-001 says "list endpoints with FK must use eager loading" → check all list endpoints in this story
- If pattern violation found → FINDING (same severity as the original bug)
- If `bug-patterns.md` does not exist → skip this check (no patterns yet)
- Non-functional requirements met?

Check against ADRs:
- Each relevant ADR decision implemented as documented?

#### Pass 2.5: Security Scan (OWASP + Dependencies)

Scan the story's new/modified files for security vulnerabilities. Language-agnostic checks.

**A. Dependency Vulnerabilities (CVE scan):**

Detect project type and run audit:

| Detection | Command | Critical threshold |
|-----------|---------|-------------------|
| `package.json` | `npm audit --json 2>/dev/null \| jq '.metadata.vulnerabilities'` | high or critical > 0 |
| `go.mod` | `govulncheck ./... 2>/dev/null` | any vulnerability |
| `requirements.txt` / `pyproject.toml` | `pip audit 2>/dev/null` | high or critical > 0 |
| `pom.xml` | `mvn dependency-check:check 2>/dev/null` | CVSS >= 7.0 |
| `Cargo.toml` | `cargo audit 2>/dev/null` | any vulnerability |

- If audit tool not installed → skip with warning (not a FAIL)
- If high/critical CVE found → FINDING (HIGH): `"Dependency [name]@[version] has CVE-XXXX ([severity])"`
- Fix: update to patched version if available

**B. OWASP Top 10 Pattern Detection:**

Grep story's new/modified files for common vulnerability patterns:

```bash
# SQL Injection — raw string concatenation in queries
grep -rn 'query.*\+.*req\.\|execute.*\`.*\$\{' [story-files] --include='*.ts' --include='*.js' --include='*.go' --include='*.py' --include='*.java'

# XSS — dangerouslySetInnerHTML or unescaped output
grep -rn 'dangerouslySetInnerHTML\|innerHTML\s*=' [story-files] --include='*.tsx' --include='*.jsx' --include='*.ts' --include='*.js'

# Path Traversal — user input in file paths without sanitization
grep -rn 'path\.join.*req\.\|readFile.*req\.\|fs\..*req\.' [story-files] --include='*.ts' --include='*.js'

# Hardcoded Secrets — API keys, passwords, tokens in source
grep -rn 'password\s*=\s*["\x27][^"\x27]\{8,\}\|api[_-]\?key\s*=\s*["\x27][^"\x27]\{8,\}\|secret\s*=\s*["\x27][^"\x27]\{8,\}' [story-files] --include='*.ts' --include='*.js' --include='*.go' --include='*.py' --include='*.java'

# Insecure Randomness — Math.random for security-sensitive operations
grep -rn 'Math\.random\(\)' [story-files] --include='*.ts' --include='*.js'

# Missing Auth Check — route handler without auth middleware
# (Check against story's API endpoints — each protected endpoint must have auth middleware)

# CORS Wildcard — Access-Control-Allow-Origin: *
grep -rn 'Access-Control-Allow-Origin.*\*\|cors({.*origin.*true\|cors()' [story-files] --include='*.ts' --include='*.js'
```

- Each match → FINDING with severity:
  - SQL Injection: CRITICAL
  - XSS: CRITICAL
  - Path Traversal: HIGH
  - Hardcoded Secrets: CRITICAL
  - Insecure Randomness: MEDIUM (context-dependent)
  - Missing Auth: HIGH
  - CORS Wildcard: MEDIUM

**C. Auth & Access Control Verification:**

For each API endpoint in the story:
- Protected endpoint has auth middleware? (check route definition)
- Role-based access enforced where story specifies? (check middleware chain)
- Sensitive data masked in API responses? (passwords, tokens, secrets not returned)

**D. Input Validation:**

For each endpoint accepting user input:
- Request body validated (Zod, Joi, class-validator, or equivalent)?
- File uploads have size/type restrictions?
- Query parameters sanitized?

**E. Mock Retirement (Frontend-First projects only):**

If `src/mocks/` (or equivalent mock directory) exists AND this story implements backend API endpoints:
- For each API endpoint implemented in this story, check if a corresponding mock JSON file still exists
- If mock exists AND real adapter is now active → FIXABLE: delete mock file, update adapter config
- If mock exists AND real adapter is NOT connected → FIXABLE: wire the real adapter, delete mock
- Skip this check for stories that only add UI (mock creation is expected)

Findings from this pass are fixable by Gate — add validation, replace raw queries with parameterized, add auth middleware, retire mock files, etc.

#### Pass 3: Test Execution

Detect project type and run appropriate test command:

| Detection File | Project Type | Story Tests | Full Suite |
|----------------|-------------|-------------|------------|
| `package.json` + jest/vitest | Node/React | `npm test -- --testPathPattern="[pattern]"` | `npm test` |
| `go.mod` | Go | `go test ./path/to/package/...` | `go test ./...` |
| `Cargo.toml` | Rust | `cargo test [test_name]` | `cargo test` |
| `pyproject.toml` / `pytest.ini` | Python | `pytest path/to/test_file.py` | `pytest` |
| `pom.xml` | Java Maven | `mvn test -pl module -Dtest=TestClass` | `mvn test` |
| `build.gradle` | Java/Kotlin Gradle | `./gradlew test --tests TestClass` | `./gradlew test` |
| `Makefile` (has `test` target) | Any | `make test` | `make test` |

##### 3.1 Run Story Tests
Run tests related to the current story's files/modules only.

##### 3.2 Run Full Test Suite
Run ALL tests to catch regressions.

##### 3.3 Regression Detection
If existing tests fail:
- Identify which test failed
- Determine if caused by current story's changes
- If YES: report as FINDING
- If NO (flaky test): document and flag

Maximum 3 run attempts for flaky detection.

