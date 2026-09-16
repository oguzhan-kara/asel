# Phase Gate — 8-Step Process (reference for asel-phase-gate.md)

## 8-Step Process

Execute these steps sequentially. Each step MUST complete before the next begins.

### Step 1: DEPLOY

<EXTREMELY-IMPORTANT>
Docker deployment is MANDATORY for Phase Gate. ALL subsequent steps (smoke, E2E, UI, functional) require a running application. If deploy fails, the ENTIRE Phase Gate fails — there are NO steps that can run without Docker.

Do NOT skip deploy. Do NOT skip UI testing. Do NOT say "Docker is not running, skipping visual tests." If Docker fails, return FAIL immediately.
</EXTREMELY-IMPORTANT>

1. Run `make down` — stop all existing containers
2. **Disable mock mode** (Frontend-First projects): Set `VITE_USE_MOCK=false` (or equivalent env var from `.env`) before build. Phase Gate MUST test with real backend, never mocks.
3. Run `make build` — build all services
4. Run `make up` — start all services
5. Wait 30 seconds for services to become healthy
6. Run `docker compose ps` — verify all services are running and healthy
7. **If deploy fails → return FAILED status immediately. Do NOT proceed to ANY tests.**
8. **Mock file audit** (Frontend-First projects): After deploy, scan `src/mocks/` — list any remaining mock files. For each, check if the corresponding real API endpoint responds. Report: `Mock Audit: N files remaining, M endpoints still mock-backed`.
9. **Step log**: Save `docker compose ps` output to `docs/e2e-evidence/phase-N/docker-ps.txt`. Append to step-log.txt.

### Step 2: SMOKE TEST

Test basic connectivity:

| Check | Command | Expected |
|-------|---------|----------|
| Frontend | `curl -s -o /dev/null -w "%{http_code}" [FRONTEND_URL]` | 200 |
| API Health | `curl -s [API_URL]/api/health` | 200 + JSON with status |
| DB Connection | `docker compose exec [db-service] pg_isready` (or equivalent) | Connected |

- Read CLAUDE.md for actual URLs and service names
- If ANY smoke check fails → add to failure list for fix loop (Step 7)
- **Step log**: Save curl outputs to `docs/e2e-evidence/phase-N/smoke-results.txt`. Append to step-log.txt.

### Step 2.5: FULL TEST SUITE

Run the project's complete unit/integration test suite. Story-level Gates already ran tests per-story, but cross-story regressions can occur when multiple stories modify shared code.

Detect project type and run:

| Detection | Command |
|-----------|---------|
| `package.json` + jest/vitest | `npm test` |
| `go.mod` | `go test ./...` |
| `Cargo.toml` | `cargo test` |
| `pyproject.toml` | `pytest` |
| `pom.xml` | `mvn test` |
| `build.gradle` | `./gradlew test` |
| `Makefile` (has `test`) | `make test` |

- ALL tests must pass. If any fail → add to failure list for fix loop (Step 7)
- Record: total tests, passed, failed, skipped
- This step catches cross-story regressions that individual story Gates missed
- **Step log**: Save test output to `docs/e2e-evidence/phase-N/test-results.txt`. Append to step-log.txt.

### Step 3: E2E — USERTEST Scenarios (AI-driven)

1. Read `docs/ROUTEMAP.md` → extract story IDs for this phase (Phase N)
2. Read `docs/USERTEST.md` → filter scenarios belonging ONLY to this phase's stories
3. For each scenario:
   a. Use Playwright MCP tools ({{playwrightPrefix}}__browser_*) to navigate to the screen
   b. Read the Turkish scenario steps and execute them via browser automation
   c. Verify expected results (element visibility, text content, navigation)
   d. Take screenshot → save to `docs/e2e-evidence/phase-N/STORY-NNN-NN.png`
   e. Log result as PASS or FAIL with reason

**AI-driven execution**: Interpret Turkish scenario descriptions naturally. Use browser_snapshot to understand page state, browser_click/browser_type for interactions, browser_take_screenshot for evidence.

- If ANY scenario fails → add to failure list for fix loop (Step 7)
- **Step log**: Screenshots are the evidence. Append to step-log.txt with screenshot file list.

### Step 3.5: FUNCTIONAL VERIFICATION (API + DB + Business Rules)

After browser scenarios, verify the backend actually processed requests correctly. This step ensures the system **works as specified**, not just **looks like it works**.

**3.5a. API Verification:**

1. Read story files for this phase → extract API endpoints from acceptance criteria
2. Read ARCHITECTURE.md → identify expected response formats and status codes
3. Read CLAUDE.md → get API base URL
4. For each endpoint exercised during browser E2E (Step 3):
   a. Call the API directly via `curl` → verify:
      - Status code correct (200, 201, 204, etc.)
      - Response body matches standard envelope `{ status, data, meta? }`
      - Data content is correct (created record returned, list contains expected items)
   b. Example: Browser created user "Ali" → `curl GET /api/users` → verify "Ali" appears in response data
5. Log each check as PASS or FAIL with detail

**3.5b. DB Verification:**

1. Read ARCHITECTURE.md → identify DB tables and columns affected by this phase's stories
2. Read CLAUDE.md → get DB service name
3. For each data-mutating scenario from Step 3 (create, update, delete):
   a. Query DB directly:
      ```bash
      docker compose exec [db-service] psql -U [user] -d [db] -c "SELECT ... WHERE ..."
      ```
      (or equivalent for non-PostgreSQL databases)
   b. Verify:
      - Created records exist with correct field values
      - Updated records reflect new values
      - Deleted records are gone (or soft-deleted per architecture)
   c. Example: Browser created user → `SELECT * FROM users ORDER BY id DESC LIMIT 1` → verify row exists with correct name, email, role
4. Log each check as PASS or FAIL with detail

**3.5c. Business Rule Negative Tests:**

1. Read PRODUCT.md → extract business rules relevant to this phase's stories
2. Read story files → extract authorization, validation, and constraint rules from acceptance criteria
3. For each testable rule, attempt the **forbidden action** via API:

   | Rule Type | Test Method | Expected |
   |-----------|------------|----------|
   | Authorization | Call endpoint without required role/token | 401 or 403 |
   | Validation | Send invalid/missing required fields | 422 with error details |
   | Uniqueness | Attempt duplicate creation | 409 or validation error |
   | Boundary | Exceed max length, min value, etc. | 422 with specific error |
   | Referential | Reference non-existent foreign key | 404 or 422 |

4. Example: Rule "only admin can delete users" → `curl -X DELETE /api/users/1 -H "Authorization: Bearer [non-admin-token]"` → expect 403
5. Log each check as PASS or FAIL with detail

- If ANY functional verification fails → add to failure list for fix loop (Step 7)
- **Step log**: Save all curl/SQL outputs to `docs/e2e-evidence/phase-N/functional-results.txt`. Append to step-log.txt.

### Step 4: VISUAL — Screen Screenshots

1. Read `docs/SCREENS.md` → extract screens relevant to this phase
   - Cross-reference with ROUTEMAP to determine which screens are affected by this phase's stories
2. For each relevant screen:
   a. Use Playwright MCP tools ({{playwrightPrefix}}__browser_*) to navigate to the screen route
   b. Take full-page screenshot → save to `docs/e2e-evidence/phase-N/[screen-name].png`
   c. Analyze screenshot for:
      - Placeholder/empty page detection (generic "Coming Soon", Lorem Ipsum, empty containers)
      - Missing navigation elements
      - Broken layouts
   d. Log result as OK or ISSUE

- If placeholder/empty pages detected → add to failure list for fix loop (Step 7)
- **Step log**: Screenshot files are the evidence. Append to step-log.txt with screenshot file list.

### Step 5: TURKISH TEXT AUDIT

Scan all Turkish-facing pages for text quality issues. Turkish UI text is often generated with missing special characters or encoding problems.

1. For each screen visited in Steps 3-4, use `browser_snapshot` to extract all visible text
2. Scan for common Turkish text issues:

| Pattern | Problem | Fix |
|---------|---------|-----|
| `kalici` | Missing ı → kalıcı | Replace with correct Turkish |
| `goruntulenme` | Missing ö,ü → görüntülenme | Replace with correct Turkish |
| `giris` | Missing İ,ş → giriş | Replace with correct Turkish |
| `cikis` | Missing ç,ş → çıkış | Replace with correct Turkish |
| `olustur` | Missing ö,ş → oluştur | Replace with correct Turkish |
| `guncelle` | Missing ü → güncelle | Replace with correct Turkish |
| `duzenle` | Missing ü → düzenle | Replace with correct Turkish |
| `kullanici` | Missing ı → kullanıcı | Replace with correct Turkish |
| `islem` | Missing İ,ş → işlem | Replace with correct Turkish |
| ASCII-only text in Turkish context | Missing ç,ğ,ı,İ,ö,ş,ü,Ç,Ğ,Ö,Ş,Ü | Fix all occurrences |

3. **Detection method**: For each visible Turkish word, check if it contains only ASCII characters where Turkish special characters are expected. Use contextual understanding — "Kullanicilar" should be "Kullanıcılar", "Islemler" should be "İşlemler".

4. For each issue found:
   a. Identify the source file (component, translation file, or hardcoded string)
   b. Use Grep to find the exact string in source code
   c. Fix directly in source — replace incorrect text with proper Turkish
   d. Log: `[FILE:LINE] "kalici" → "kalıcı"`

5. Also check for:
   - Mixed language (half Turkish, half English on same screen)
   - Untranslated placeholder text ("Lorem ipsum", "TODO", "placeholder")
   - Inconsistent terminology (same concept called different names on different screens)
   - Date/number format (Turkish locale: DD.MM.YYYY, 1.234,56)

6. If ANY Turkish text issues found → fix them, add to fix list
7. Git commit (if fixes made): `fix(phase-N-gate): turkish text corrections`
8. **Step log**: Save list of fixes to `docs/e2e-evidence/phase-N/turkish-fixes.txt`. Append to step-log.txt. If zero issues, write "0 issues — all Turkish text verified via browser_snapshot" to the file.

### Step 6: UI POLISH (frontend-design driven)

<EXTREMELY-IMPORTANT>
This is the most critical step of Phase Gate. Every screen MUST look professional, enterprise-grade, and visually polished. Generic AI aesthetics are NOT acceptable. Use the `frontend-design` skill principles as your quality standard.
</EXTREMELY-IMPORTANT>

Read `docs/FRONTEND.md` for the project's design system.

**6.0 Full-App Automated Token Enforcement (MANDATORY — run before visual assessment):**

Per-story Gate checks only story files. Here we scan ALL frontend files to catch cross-story contamination, shared component drift, and anything that slipped through.

Run these checks on ALL `.tsx`, `.jsx`, `.css`, `.scss` files in the frontend source directory:

```bash
# CHECK 1: Hardcoded hex colors — CRITICAL
grep -rn '#[0-9a-fA-F]\{3,8\}' src/ --include='*.tsx' --include='*.jsx' --include='*.css'

# CHECK 2: Arbitrary pixel values in Tailwind — CRITICAL
grep -rn '\-\[\d\+px\]' src/ --include='*.tsx' --include='*.jsx'

# CHECK 3: Raw HTML form elements — HIGH
grep -rn '<input\b\|<button\b\|<select\b\|<textarea\b' src/ --include='*.tsx' --include='*.jsx'

# CHECK 4: Default Tailwind colors instead of semantic tokens — HIGH
grep -rn 'bg-white\|bg-gray-\|text-gray-\|border-gray-\|bg-slate-\|text-slate-\|border-slate-' src/ --include='*.tsx' --include='*.jsx'

# CHECK 5: Inline SVG instead of Icon atom — MEDIUM
grep -rn '<svg\b' src/ --include='*.tsx' --include='*.jsx'

# CHECK 6: Missing card elevation — MEDIUM
grep -rn 'shadow-none' src/ --include='*.tsx' --include='*.jsx'
```

For each match:
1. Read FRONTEND.md → find correct semantic token
2. Read `src/components/atoms/` → find correct atom component
3. Replace hardcoded value → semantic token / atom
4. Track every replacement

After ALL fixes → re-run all 6 checks → must return ZERO matches.
If still matches after 2 fix iterations → add remaining to failure list for Step 7.

Git commit (if fixes made): `fix(phase-N-gate): full-app design token enforcement`

Then assess and fix each screen against these criteria:

**6a. Visual Assessment (per screen):**

For each screen from Steps 3-4, use `browser_snapshot` + `browser_take_screenshot` to evaluate:

| Criterion | What to Check | Severity |
|-----------|--------------|----------|
| **Spacing & Rhythm** | Consistent padding/margins, visual breathing room, no cramped elements | HIGH |
| **Typography** | Correct font weights, sizes match hierarchy, readable contrast | HIGH |
| **Color Consistency** | Design tokens from FRONTEND.md applied, no random/default colors | HIGH |
| **Component Quality** | Buttons, inputs, tables, cards match design system | HIGH |
| **Empty States** | Meaningful empty states (not blank), with icon + message + CTA | MEDIUM |
| **Loading States** | Skeleton loaders or spinners, not frozen/blank screens | MEDIUM |
| **Responsive Layout** | No horizontal scroll, proper grid at standard widths | MEDIUM |
| **Micro-interactions** | Hover states, focus rings, transitions on buttons/links | LOW |
| **Icon Consistency** | Same icon set throughout, appropriate icon choices | LOW |
| **Shadow & Elevation** | Cards/modals have proper depth, not flat | LOW |

**6b. Professional Polish Fixes:**

For each screen that doesn't meet the standard:

1. Read the relevant component source files
2. Apply fixes using `frontend-design` skill principles:
   - Replace default/generic styling with design system tokens
   - Add proper spacing (use the spacing scale from FRONTEND.md)
   - Fix typography hierarchy (headings, body, labels, captions)
   - Add meaningful empty states with illustrations or icons
   - Add loading skeletons where data fetching occurs
   - Ensure hover/focus/active states on interactive elements
   - Apply consistent border-radius, shadows, transitions
   - Fix color usage (primary, secondary, accent, neutral per FRONTEND.md)
3. Take before/after screenshots → save to `docs/e2e-evidence/phase-N/polish/`

**6c. Cross-Screen Consistency Check:**

After individual fixes, verify consistency across ALL screens:
- Same header/navigation height and style
- Same sidebar width and behavior
- Same table styling (row height, header style, borders)
- Same button sizes and placement patterns
- Same form layout patterns
- Same card/panel styling
- Same empty state pattern

If inconsistencies found → fix the outlier to match the dominant pattern.

**6d. Design Doc Updates:**

If polish fixes introduced new patterns or refined existing ones:

1. Update `docs/FRONTEND.md` — add/refine:
   - New component variants discovered during polish
   - Spacing adjustments that became the standard
   - Color usage clarifications
   - Empty state pattern documentation
   - Loading state pattern documentation
2. Update `docs/SCREENS.md` — if screen layout changed significantly during polish:
   - Update ASCII mockups to reflect actual (polished) state
   - Add notes about polish-applied patterns

Git commit (if fixes made): `style(phase-N-gate): ui polish and design refinements`

**6e. Polish Evidence:**

For each polished screen, save:
- `docs/e2e-evidence/phase-N/polish/[screen]-before.png`
- `docs/e2e-evidence/phase-N/polish/[screen]-after.png`

### Step 6.5: COMPLIANCE AUDIT (Doc vs Codebase Gap Analysis)

After visual polish, verify that this phase's DONE stories are fully implemented as documented.

1. dispatch `Agent(subagent_type: "asel-compliance-auditor", prompt: …)`; model and effort come from the agent definition
   - Pass: project root, CLAUDE.md path, trigger mode = `PHASE_GATE`, phase number
3. Auditor builds 5 inventories (endpoints, schema, screens, components, business rules) from docs
4. Compares against actual codebase (static + runtime since app is already deployed)
5. Auto-fixes small gaps (missing validation, wrong constraint, missing state)
6. Generates stories for large gaps (missing endpoints, missing screens)
7. Parse auditor result:
   - Compliance rate, auto-fixes applied, stories generated
   - If stories generated → they are added to ROUTEMAP as PENDING `[AUDIT-GAP]` stories

Note: Compliance Auditor handles its own fixes and commits. This step does NOT feed into Step 7 fix loop.

### Step 7: FIX LOOP (2x retry)

If Steps 2-4 (including 3.5) produced ANY test failures (smoke, E2E, functional verification, visual):

Note: Turkish text fixes (Step 5), UI polish (Step 6), and compliance audit fixes (Step 6.5) are applied directly during their steps with their own commits. This fix loop handles TEST FAILURES from Steps 2-4 (including 3.5 functional verification).

**Attempt 1:**
1. Analyze all failures:
   - Read error logs (`docker compose logs`)
   - Review failed screenshots
   - Compare expected vs actual behavior
2. Fix source code / config / migration as needed
3. Git commit: `fix(phase-N-gate): [description of fix]`
4. Re-deploy: `make down && make build && make up` + 30s wait
5. Re-run ONLY the failed tests
6. If ALL now PASS → continue to Report
7. If still failures → Attempt 2

**Attempt 2:**
1. Same analysis + fix process
2. Git commit: `fix(phase-N-gate): [description of fix]`
3. Re-deploy + re-test failed items
4. If ALL now PASS → continue to Report
5. If STILL failures → mark as escalated, continue to Report with FAIL status

**Fix commit rules:**
- Conventional format: `fix(phase-N-gate): [description]`
- Separate from story commits — never amend story commits
- Include Co-Authored-By header

