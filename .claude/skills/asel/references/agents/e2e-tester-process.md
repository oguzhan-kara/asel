# E2E Tester — Process (Passes 1-5b, P) (reference for asel-e2e-tester.md)

## Process

**Pass Selection by Mode:**

| Pass | `polish-full` | `e2e-check` |
|------|---------------|-------------|
| Pass 1 (+ 1a text, 1b responsive, 1c states) | ✓ | ✓ |
| Pass 2 (+ F modal, G form matrix, H tables, I console) | ✓ | ✓ |
| Pass 3 (USERTEST scenarios) | ✓ | ✓ (scoped to stories in scope) |
| Pass 4 (+ 4d network capture, 4e N+1) | ✓ (all phases) | ✓ (scope-filtered endpoints) |
| Pass 5 (compliance-auditor dispatch) | ✓ | **SKIP** |
| Pass 5b (role-based UI visibility) | ✓ | ✓ |
| Pass P (scope inventory — expected vs live for scoped stories only) | — | ✓ |

In `e2e-check` mode, do NOT dispatch the compliance-auditor. Pass P (below) provides the scoped gap analysis instead.

### Pass 1: Route Crawl & Placeholder Detection

Navigate EVERY route from SCREENS.md + sidebar/navbar menu items. For each route:

1. Navigate via Playwright MCP tools ({{playwrightPrefix}}__browser_*)
2. Take screenshot
3. Classify the page:
   - **IMPLEMENTED** — has real content, functional UI
   - **PLACEHOLDER** — has skeleton/stub content, "Coming Soon", empty card, or minimal boilerplate with no real functionality
   - **EMPTY** — blank page, 404, error, or white screen
   - **MISSING** — route defined in SCREENS.md but not in the app menu/router

For PLACEHOLDER and EMPTY pages:
- Cross-reference with SCREENS.md and PRODUCT.md → document WHAT should be on this page
- List expected components, data, and interactions from docs
- Flag severity: **CRITICAL** (core feature missing), **HIGH** (secondary feature missing)

Also check:
- Sidebar/navbar: are there menu items NOT in SCREENS.md? (undocumented routes)
- SCREENS.md: are there routes NOT in sidebar/navbar? (unreachable screens)

**1a. Text Quality (live snapshot per IMPLEMENTED screen):**

Use `getAISnapshot()` or `page.evaluate(() => document.body.innerText)` to capture visible text on each in-scope screen, then scan for:

- ASCII-only Turkish words (missing diacritics): `kalici→kalıcı`, `goruntulenme→görüntülenme`, `giris→giriş`, `olustur→oluştur`, `guncelle→güncelle`, `kullanici→kullanıcı`, `islem→işlem`, `duzenle→düzenle`, `cikis→çıkış`, `sifre→şifre`, `odul→ödül`, `gorev→görev`, `surec→süreç`
- Charset corruption / mojibake: `?` replacing letters, `�` replacement char, double-encoded UTF-8 (`Ã§` for `ç`, `Ã¼` for `ü`, `Ä°` for `İ`)
- TR/EN mixing inside the same UI context (e.g. "Kullanıcı List", "Edit Kullanıcı", "Sil Button")
- Date format: must be `DD.MM.YYYY` (flag `MM/DD/YYYY` or `YYYY-MM-DD` in user-facing context)
- Number format: must be `1.234,56` (flag `1,234.56` in user-facing context)
- Obvious typos (project-specific dictionary may live under `docs/brainstorming/` — read if present)

Log each issue as FINDING (VISUAL / TEXT) with `{screen, text, suggested_fix, severity=MEDIUM}`.

**1b. Responsive Check (viewport resize per IMPLEMENTED screen):**

For each in-scope screen, set three viewport sizes via `page.setViewportSize({ width, height })` and screenshot each:

- `375 × 667` — mobile (iPhone SE)
- `768 × 1024` — tablet (iPad portrait)
- `1440 × 900` — desktop

At each breakpoint, verify:
- No horizontal scroll: `await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)`
- Mobile menu opens correctly below 768px (hamburger visible and functional)
- Cards / grids reflow (no content cutoff, no overlapping)
- Text readable (no microscopic fonts due to missing responsive meta viewport)

Log FINDING (VISUAL / RESPONSIVE) per issue with `{screen, breakpoint, issue, evidence=screenshot, severity=HIGH}`.

**1c. State Coverage (empty / loading / error — triggered per screen):**

For each screen that displays lists/tables/cards, trigger each of the three states and verify a proper component renders:

- **Empty state**: apply a filter or search that matches nothing → verify an `EmptyState` component renders (not a blank area)
- **Loading state**: throttle the primary API call via `page.route()`:
  ```js
  await page.route('**/api/**', async route => {
    await new Promise(r => setTimeout(r, 3000));
    await route.continue();
  });
  ```
  Reload → verify a skeleton/spinner/loader renders during the 3s wait
- **Error state**: intercept the primary API call and force a 500:
  ```js
  await page.route('**/api/<resource>', route =>
    route.fulfill({ status: 500, body: '{"error":"forced"}' })
  );
  ```
  Reload → verify an `ErrorState` component renders (not a white screen, not raw JSON, not uncaught exception)

After each state test, `await page.unroute('**/api/**')` to clear the interceptor.

Log FINDING (VISUAL / STATE) with `{screen, state=empty|loading|error, observed, severity=HIGH for list/table, MEDIUM for detail}`.

### Pass 2: Interactive Element Testing

For every IMPLEMENTED screen, systematically test ALL interactive elements:

**A. Navigation Elements:**
- Every sidebar/navbar link → does it navigate to correct route?
- Every breadcrumb link → does it go back correctly?
- Logo/home link → does it go to dashboard/home?

**B. Buttons:**
- Every button on the page → click it
- Verify: does it perform the expected action? (open modal, submit form, navigate, toggle state)
- Disabled buttons → are they correctly disabled with visual feedback?
- Destructive buttons (delete, remove) → do they show confirmation?

**C. Links:**
- Every link on the page → click it
- Internal links → correct route?
- External links → opens correctly?
- Data drill-down links (table rows, cards, charts) → navigate to detail view?

**D. Form Elements:**
- Every input → can it receive focus and accept input?
- Dropdowns/selects → do they open and show options?
- Checkboxes/toggles → do they toggle state?
- Date pickers → do they open calendar?
- Form submit → does it validate and submit?
- Form reset/cancel → does it clear/navigate back?

**E. Data Interactions:**
- Table sorting → does clicking column headers sort?
- Table pagination → do page controls work?
- Search/filter → does it filter results?
- Export buttons → do they trigger download?
- Refresh/reload → does it fetch fresh data?

For each element, log:
- Element type and label/identifier
- Action performed
- Result: **WORKS** / **BROKEN** (wrong behavior) / **DEAD** (no response) / **ERROR** (JS error, crash)
- Screenshot if BROKEN, DEAD, or ERROR

**F. Modal / Dialog Lifecycle (for each modal/dialog on the page):**

- Open via trigger → dialog visible, focus moved inside (first focusable element or `autofocus`)
- Close via "X"/close button → dialog closed, focus returned to trigger
- Close via **ESC key** → dialog closed, focus returned to trigger
- Close via **backdrop click** → dialog closed (OR documented as blocked for destructive dialogs — compare against project convention)
- Tab key cycling inside modal → focus stays inside (trap intact, no leak to background)
- Nested modal (if applicable) → inner ESC closes inner only, outer stays open

Log FINDING (FUNCTIONAL / MODAL) per failing check with screenshot.

**G. Form Validation Matrix (for each form with a submit button):**

Run this matrix per form:

| # | Test Case | Input | Expected UI Response |
|---|-----------|-------|----------------------|
| 1 | Empty submit | Leave all required fields blank | Inline errors on each required field, submit blocked |
| 2 | Invalid format | Bad email / phone / date / number | Field-specific format error, submit blocked |
| 3 | Boundary | Exceed max length or go below min | Field-specific boundary error |
| 4 | Server error | Force API 500 on submit via `page.route()` | Toast / error surface with retry option (not white screen) |
| 5 | Valid submit | Fill all required correctly | Success path (toast + redirect / list refresh / modal close) |

Log FINDING (FUNCTIONAL / FORM) per failing case with `{screen, form, case, expected, actual, evidence}`.

**H. Table Data & Controls (for each table on in-scope screens):**

- **Column scan** via `page.evaluate`: no cells containing `"undefined"`, `"null"`, or empty string where a value is expected per ARCHITECTURE.md DTO
- **Pagination**: click next/prev → data changes, page counter updates, URL `?page=N` (or equivalent) updates
- **Sort**: click each sortable header → ASC/DESC indicator flips, first row changes, URL reflects sort state
- **Filter**: apply each filter control → result set changes, result counter updates, URL reflects filter state
- **Search**: type query → debounced update (200-500ms), results filter correctly, clearing the query restores full set

Log FINDING (DATA / TABLE) per issue with `{screen, control, expected, actual, evidence}`.

**I. Console Log Capture (running throughout Pass 2):**

BEFORE starting Pass 2 navigation, attach a listener on each page:
```js
const logs = [];
page.on('console', msg => logs.push({
  type: msg.type(),
  text: msg.text(),
  url: page.url(),
  at: new Date().toISOString()
}));
page.on('pageerror', err => logs.push({ type: 'pageerror', text: err.message, url: page.url() }));
```

At the end of Pass 2, filter `logs`:
- `error` / `pageerror` → each one is a FINDING (DATA / CONSOLE-ERROR, severity=HIGH)
- `warning` → cluster by message; if same warning fires >3× → FINDING (DATA / CONSOLE-WARN, severity=MEDIUM). Ignore well-known dev-mode warnings (React DevTools install hint, source map warnings from node_modules).

### Pass 3: USERTEST.md Scenario Execution

For each story section in USERTEST.md, for each scenario:

1. Navigate to the screen (use Playwright MCP tools ({{playwrightPrefix}}__browser_*))
2. Perform the described interaction step by step
3. Verify expected result
4. Take screenshot (save to `docs/e2e-evidence/`)
5. Log result: PASS or FAIL

FAIL logging must include:
- Scenario number and description
- Expected result (from USERTEST.md)
- Actual result (what happened)
- Screenshot path

### Pass 4: FUNCTIONAL VERIFICATION (API + DB + Business Rules)

After browser-level testing (Passes 1-3), verify the backend actually works correctly across ALL phases. This catches issues that browser testing misses: silent data loss, wrong API responses, unenforced business rules, and cross-phase data integrity problems.

**4a. Cross-Phase API Verification:**

1. Read ALL story files across ALL phases → extract every API endpoint
2. Read ARCHITECTURE.md → identify expected response formats, status codes
3. Read CLAUDE.md → get API base URL
4. For each endpoint:
   a. Call via `curl` → verify:
      - Status code correct (200, 201, 204, etc.)
      - Response body matches standard envelope `{ status, data, meta? }`
      - Data content is correct (lists return expected items, detail returns correct record)
   b. Cross-phase check: data created in Phase 1 must be correctly returned in Phase 2+ endpoints
      - Example: Phase 1 created users → Phase 2 "assign user to team" endpoint must list those users
5. Log each check as PASS or FAIL with detail

**4b. Cross-Phase DB Verification:**

1. Read ARCHITECTURE.md → identify ALL DB tables and relationships
2. Read CLAUDE.md → get DB service name and credentials
3. Verify data integrity across phases:
   a. Query each table → verify rows exist from earlier phase operations
   b. Verify foreign key relationships are intact:
      ```bash
      docker compose exec [db-service] psql -U [user] -d [db] -c "SELECT ... JOIN ... WHERE ..."
      ```
   c. Check for orphaned records (FK references to deleted/missing rows)
   d. Check for data consistency (totals match, statuses are valid enum values)
   e. Example: Phase 1 created users, Phase 2 assigned roles → verify users table + roles table + user_roles junction are all consistent
4. Log each check as PASS or FAIL with detail

**4c. Business Rule Negative Tests (All Phases):**

1. Read PRODUCT.md → extract ALL business rules across the entire product
2. Read ALL story files → extract authorization, validation, and constraint rules
3. For each testable rule, attempt the **forbidden action** via API:

   | Rule Type | Test Method | Expected |
   |-----------|------------|----------|
   | Authorization | Call endpoint without required role/token | 401 or 403 |
   | Validation | Send invalid/missing required fields | 422 with error details |
   | Uniqueness | Attempt duplicate creation | 409 or validation error |
   | Boundary | Exceed max length, min value, etc. | 422 with specific error |
   | Referential | Reference non-existent foreign key | 404 or 422 |
   | State transition | Attempt invalid status change | 422 or 409 |
   | Cross-entity | Violate cross-entity constraints (e.g., delete user with active assignments) | 409 or 422 |

4. Example: Rule "only admin can delete users" → `curl -X DELETE /api/users/1 -H "Authorization: Bearer [non-admin-token]"` → expect 403
5. Log each check as PASS or FAIL with detail

**4d. Browser DevTools Network Capture (live, during Pass 1-2 navigation):**

In parallel with curl-based verification (4a), capture every network request the browser makes during Pass 1-2. Attach once per page before navigation starts:

```js
const reqs = [];
const ress = [];
page.on('request', req => reqs.push({
  url: req.url(), method: req.method(), at: Date.now(), screenUrl: page.url()
}));
page.on('response', async res => {
  let body = null;
  try { body = await res.text(); } catch {}
  ress.push({
    url: res.url(), status: res.status(), contentType: res.headers()['content-type'], body
  });
});
```

At end of Pass 2, for each captured API response (filter to `/api/` or the project's API prefix):
- Status is 2xx/3xx → OK; unexpected 4xx/5xx → FINDING (DATA / NETWORK-STATUS, severity=HIGH)
- Response body parses as JSON AND matches ARCHITECTURE.md envelope (`{ status, data, meta? }` or project's convention) → OK; mismatch → FINDING (DATA / NETWORK-ENVELOPE, severity=HIGH)
- Response shape matches ARCHITECTURE.md DTO for that endpoint (key names, nested types) → OK; mismatch → FINDING (DATA / NETWORK-SHAPE, severity=MEDIUM)

Do not fail for endpoints not yet documented in ARCHITECTURE.md — log them as FINDING (DATA / UNDOCUMENTED-ENDPOINT, severity=LOW).

**4e. N+1 Query Detection (derived from 4d data):**

Group captured requests by `(method, path-pattern)` within each screen navigation window (from `goto` to `waitForPageLoad` complete + 1s idle). A path-pattern normalizes IDs (e.g. `/api/users/42` → `/api/users/:id`).

Flag any endpoint called **more than 3 times** within a single navigation window — this is a likely N+1 pattern in a list render (e.g. fetching each row's detail separately instead of batching).

Log FINDING (DATA / N+1) with:
- Screen URL
- Offending endpoint pattern
- Call count
- Sample URLs (first 3 of the N)
- Suggested fix hint: "batch endpoint / `include=` expand / JOIN on server / server-side aggregation"
- Severity: HIGH (list screen), MEDIUM (detail screen)

- If ANY functional verification fails → include in report with FAIL status

### Pass 5: COMPLIANCE AUDIT (Doc vs Codebase Gap Analysis)

After all testing passes, perform a comprehensive gap analysis between project docs and actual codebase. This catches gaps that browser and API testing miss: planned but unimplemented features, missing DB constraints, incomplete components.

**Only runs in `polish-full` mode. Skip entirely in `e2e-check` mode — Pass P replaces this.**

1. Read `asel-compliance-auditor`
2. Dispatch Compliance Auditor via Agent tool
   - Pass: project root, CLAUDE.md path, trigger mode = `E2E`
3. Auditor scans ALL docs → builds 5 inventories (endpoints, schema, screens, components, business rules)
4. Compares against codebase (static + runtime since app is deployed)
5. Auto-fixes small gaps directly (missing validation, constraints, states)
6. Generates stories for large gaps (missing endpoints, screens, features)
7. Include auditor results in report

### Pass 5b: Role-Based UI Visibility (both modes)

Independent of compliance-auditor — this checks the UI correctly hides/shows actions per role.

1. Read PRODUCT.md → extract role × permission matrix (common roles: admin, manager, user, viewer; project may define its own)
2. Read CLAUDE.md → get test credentials for each role (test accounts and passwords)
3. For each role:
   a. Log out (clear cookies / local storage), log in as that role
   b. Navigate to every in-scope screen
   c. Capture visible action inventory via `getAISnapshot()` — extract buttons, menu items, links, form submit buttons (all actionable elements)
   d. Cross-reference with PRODUCT.md permission matrix:
      - Role SHOULD see action X, action missing → FINDING (PRODUCT / RBAC-MISSING, severity=CRITICAL)
      - Role should NOT see action Y, action visible → FINDING (PRODUCT / RBAC-LEAK, severity=CRITICAL)
   e. Take a role-inventory screenshot for each screen: `docs/e2e-evidence/rbac-<role>-<screen>.png`

**If credentials are missing for any role in CLAUDE.md:** skip that role with a report-level WARNING (not a failure). Do NOT invent credentials.

### Pass P: Scope Inventory (e2e-check mode only)

**Only runs in `e2e-check` mode.** This is a lightweight, scope-filtered alternative to Pass 5's full compliance-auditor dispatch.

1. For each story in scope, read the story file → extract the expected-list:
   - Screens referenced (SCR-NNN)
   - Fields / actions / workflows specified in ACs
2. For each item in the expected-list, verify it is present in the live app (navigate, inspect, compare):
   - Screen EXISTS and is not placeholder/empty → OK
   - Field EXISTS on the correct screen → OK
   - Action/button EXISTS and triggers the expected flow → OK (Pass 2 already covers the interaction; here we only verify presence)
3. For each missing item → FINDING (PRODUCT / SCOPE-GAP) with `{story, screen, missing_item, acceptance_criterion_ref, severity=HIGH if AC-required else MEDIUM}`.

Do NOT auto-generate stories. Do NOT dispatch compliance-auditor. Just catalogue findings and return them in the bucketed summary (see Step 7).

