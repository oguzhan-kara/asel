# Legacy Gate — Passes 4-6 & Report (reference for asel-legacy-gate.md)

#### Pass 4: Performance Analysis

##### 4.1 Query Analysis

Scan ALL database queries in the story's code:

**SQL / ORM Queries:**
- N+1 detection: loops with individual queries → batch/join
- Missing indexes: WHERE, JOIN, ORDER BY columns without indexes
- Full table scans: queries without proper filtering
- SELECT *: replace with specific column selection
- Unoptimized JOINs: check join order, missing FK indexes
- Missing LIMIT/pagination: unbounded result sets
- COUNT on large tables: consider approximate/cached counts

**ORM-Specific:**
- Eager vs lazy loading
- Query count per request (target: <10 per endpoint)
- Raw query fallback for complex queries

**Big Data Sources (ClickHouse, TimescaleDB, etc.):**
- Partition pruning, column selection, aggregation push-down
- Time range filtering, materialized views, sorting key alignment

##### 4.2 Caching Analysis

For each caching candidate:
```markdown
### CACHE-V-N: [Description]
- Data: [What to cache]
- Location: Redis | In-memory | CDN | Browser | None
- TTL: [Duration with justification]
- Invalidation: [Strategy]
- Decision: CACHE / SKIP (with reasoning)
```

##### 4.3 Frontend Performance (if UI story)
- Bundle size impact
- Lazy loading: new routes/heavy components use React.lazy
- Memoization: expensive renders use React.memo/useMemo/useCallback
- Image optimization, virtualization for large lists
- Re-render check: no unnecessary re-renders

##### 4.4 API Performance
- Response payload size: no over-fetching
- Pagination: all list endpoints paginated
- Compression: gzip/brotli enabled

#### Pass 5: Build Verification

Detect project type and run appropriate build command:

| Detection File | Project Type | Build Command |
|----------------|-------------|---------------|
| `tsconfig.json` | TypeScript | `tsc --noEmit` |
| `package.json` + `vite` | React/Vite | `npm run build` |
| `package.json` + `next` | Next.js | `npm run build` |
| `package.json` (general) | Node.js | `npm run build` (if script exists) |
| `go.mod` | Go | `go build ./...` |
| `Cargo.toml` | Rust | `cargo build` |
| `pyproject.toml` | Python | `python -m py_compile` + `mypy` (if configured) |

Rules:
- Run type check FIRST (`tsc --noEmit`) then full build
- Build fail → include in findings as CRITICAL
- Do NOT run Docker build (that's Deploy Engineer's job)

#### Pass 6: UI Quality & Visual Testing (if applicable)

<EXTREMELY-IMPORTANT>
This pass is NOT just functional testing — it is a **visual quality gate**. A screen that "works" but looks generic, default, or unprofessional is a FINDING. The standard is enterprise-grade: would this pass a client demo? If not, it FAILS.
</EXTREMELY-IMPORTANT>

**6.1 Functional Testing** — use Playwright MCP tools ({{playwrightPrefix}}__browser_*) skill:
- Navigate to relevant page/screen
- Test user interactions (clicks, form fills, navigation)
- Verify CRUD operations work end-to-end
- Take screenshot of each state

**6.2 Layout Compliance** — compare against SCREENS.md mockup:
- Structure matches: correct sections, panels, columns
- Navigation elements present and functional
- Data drill-down: ALL entity references clickable/navigable

**6.3 Visual Quality Assessment** — use `browser_snapshot` + `browser_take_screenshot`:

For each screen, evaluate and score (PASS / NEEDS_FIX / CRITICAL):

| Criterion | PASS | NEEDS_FIX | CRITICAL |
|-----------|------|-----------|----------|
| **Design Tokens** | All colors/fonts/spacing from FRONTEND.md CSS variables | Some hardcoded values | Default/gray-only palette, no project identity |
| **Typography** | Clear hierarchy (h1→h6→body→caption), proper weights/sizes | Minor inconsistencies | All same size/weight, no hierarchy |
| **Spacing** | Consistent rhythm, breathing room, aligned grid | Cramped in places | No spacing system, elements touching/overlapping |
| **Color** | Primary/secondary/accent used meaningfully per FRONTEND.md | Some random colors | All gray/default, no visual personality |
| **Components** | Buttons, inputs, cards match design system, polished | Minor styling gaps | Default browser/library styling, no customization |
| **Empty States** | Icon/illustration + descriptive text + CTA | Generic "No data" text | Blank white space, nothing rendered |
| **Loading States** | Skeleton loaders matching content shape | Generic spinner only | No loading indication, frozen UI |
| **Error States** | Clear message + retry action + proper styling | Basic error text | No error handling visible |
| **Interactive States** | Hover, focus, active, disabled all styled | Missing some states | No hover/focus at all |
| **Tables** | Proper alignment, row hover, headers styled, responsive | Minor alignment issues | Default HTML table, no styling |
| **Forms** | Labels, validation, grouping, tab order, error display | Minor label/spacing issues | No validation feedback, poor layout |
| **Icons** | Consistent icon set, meaningful choices, proper sizing | Mixed icon sources | No icons, or broken/missing icons |
| **Shadows/Elevation** | Cards/modals have depth per design system | Inconsistent elevation | Everything flat, no visual depth |
| **Transitions** | Smooth state changes (300ms ease), navigation transitions | Some jarring transitions | No transitions at all |
| **Responsive** | Works at 1024px, 1440px, 1920px without horizontal scroll | Minor issues at edges | Broken layout, horizontal scroll |

**Scoring:**
- ALL PASS → Pass 6 PASS
- Any NEEDS_FIX → Add to fix list (Gate fixes directly)
- Any CRITICAL → Add to fix list as HIGH priority

**6.4 Automated Token & Component Enforcement (MANDATORY before visual review):**

<EXTREMELY-IMPORTANT>
This is the automated safety net. Run these grep commands on ALL files created/modified by the current story. Every match is a FINDING that Gate MUST fix directly.

**Step 1: Identify target files**
Get the list of new/modified files from the story's plan steps → filter to `.tsx`, `.jsx`, `.css`, `.scss` files.

**Step 2: Run enforcement checks**

```bash
# CHECK 1: Hardcoded hex colors — CRITICAL
grep -rn '#[0-9a-fA-F]\{3,8\}' [story-files] --include='*.tsx' --include='*.jsx' --include='*.css'
# Expected: ZERO matches
# Fix: Replace with semantic token class from FRONTEND.md (e.g., #0f172a → text-text-primary)

# CHECK 2: Arbitrary pixel values in Tailwind — CRITICAL
grep -rn '\-\[\d\+px\]' [story-files] --include='*.tsx' --include='*.jsx'
# Expected: ZERO matches
# Fix: Replace with token class (e.g., text-[14px] → text-body-md, p-[20px] → p-section)

# CHECK 3: Raw HTML elements with shadcn/ui equivalents — CRITICAL
grep -rn '<input\b\|<button\b\|<select\b\|<textarea\b\|<dialog\b\|<table\b' [story-files] --include='*.tsx' --include='*.jsx' | grep -v 'components/ui/'
# Expected: ZERO matches (use shadcn/ui: Input, Button, Select, Textarea, Dialog, Table from @/components/ui/)
# Fix: Replace with shadcn/ui component. If not installed: npx shadcn@latest add [component]

# CHECK 4: Competing UI library imports — CRITICAL
grep -rnE "from ['\"](@mui/|antd|@chakra-ui/|@mantine/|react-bootstrap|@headlessui/react)" [story-files] --include='*.tsx' --include='*.jsx' --include='*.ts' --include='*.js'
# Expected: ZERO matches
# Fix: Replace with shadcn/ui equivalent from @/components/ui/

# CHECK 5: Default Tailwind colors instead of semantic tokens — HIGH
grep -rn 'bg-white\|bg-gray-\|text-gray-\|border-gray-\|bg-slate-\|text-slate-\|border-slate-' [story-files] --include='*.tsx' --include='*.jsx'
# Expected: ZERO matches
# Fix: Replace with semantic tokens (bg-white → bg-surface-card, text-gray-500 → text-text-secondary)

# CHECK 6: Inline SVG instead of Icon atom — MEDIUM
grep -rn '<svg\b' [story-files] --include='*.tsx' --include='*.jsx'
# Expected: ZERO matches outside atom definitions
# Fix: Replace with <Icon> atom

# CHECK 7: Missing card elevation — MEDIUM
grep -rn 'shadow-none' [story-files] --include='*.tsx' --include='*.jsx'
# Expected: ZERO matches on card/panel components
# Fix: Replace with shadow-card or appropriate elevation token
```

**Step 3: Fix all matches**
For each match:
1. Read FRONTEND.md to find the correct semantic token
2. Read existing atoms in `src/components/atoms/` to find the correct component
3. Replace hardcoded value → semantic token / atom component
4. Track every replacement in the fix log

**Step 4: Re-run checks**
After ALL fixes → re-run all 6 grep checks → must return ZERO matches.
If any remain after 2 fix iterations → escalate with explanation.

**Severity mapping:**
| Check | Severity | Auto-fixable? |
|-------|----------|---------------|
| Hardcoded hex colors | CRITICAL | YES — replace with FRONTEND.md token |
| Arbitrary pixel values | CRITICAL | YES — replace with typography/spacing token |
| Raw HTML elements (shadcn/ui) | CRITICAL | YES — replace with shadcn/ui component from `@/components/ui/` |
| Competing UI library imports | CRITICAL | YES — replace with shadcn/ui equivalent |
| Default Tailwind colors | HIGH | YES — replace with semantic token |
| Inline SVG | MEDIUM | YES — replace with Icon atom |
| Missing elevation | MEDIUM | YES — add shadow token |
</EXTREMELY-IMPORTANT>

**6.5 Turkish Text Quality Check:**


Scan all visible text on the screen using `browser_snapshot`:
- Check for ASCII-only Turkish words: kalici→kalıcı, goruntulenme→görüntülenme, giris→giriş, olustur→oluştur, guncelle→güncelle, kullanici→kullanıcı, islem→işlem, duzenle→düzenle, cikis→çıkış
- Check date format: must be DD.MM.YYYY (not MM/DD/YYYY or YYYY-MM-DD)
- Check number format: must be 1.234,56 (not 1,234.56)
- Check for untranslated English text in Turkish UI context
- If issues found → Grep source files → fix directly

**6.6 Cross-Screen Consistency** (if multiple screens in story):
- Same header/navigation height, colors, and behavior
- Same sidebar width and interaction pattern
- Same table row height, header style, and action button placement
- Same button sizes, colors, and position conventions
- Same form field layout and label positioning
- Same card/panel border-radius, shadow, and padding
- If new screen doesn't match existing patterns → fix to match

**6.7 API Testing** — use Bash tool:
- Send requests to API endpoints
- Verify response status codes and body structure
- Test error cases and edge cases

### Phase 2: FIX

After all 6 passes complete, you have a full findings list. Now fix everything fixable:

1. **Classify each finding**: FIXABLE, ESCALATE, or DEFERRED
2. **Fix all FIXABLE items directly** — edit source code, write tests, create migrations, fix types
3. **Track every fix**: file path, what was changed, why
4. **After ALL fixes applied** → re-run tests (`npm test`) and build (`tsc --noEmit` / `npm run build`)
5. **If re-check reveals new issues** → fix those too (max 2 internal fix iterations)
6. **If fix breaks something** → revert that specific fix, mark as ESCALATE with explanation
7. **DEFERRED items** → write each to `ROUTEMAP.md` under `## Tech Debt` table with target story reference

<HARD-GATE>
**FIXABLE by default.** If Gate can fix it (write code, write tests, add config), it IS fixable. Gate is the last quality checkpoint before commit — anything left unfixed ships broken.

**FIXABLE includes ALL of the following — Gate MUST fix them:**
- Missing tests for implemented code (handlers, services, edge cases)
- Missing error handling, missing validation, missing TTL/expiry
- Divergence from plan (implementation differs from story spec) → fix code OR record decision in decisions.md with rationale
- Missing configuration (ACL rules, cache config, env vars)
- Incomplete implementations (partial feature, missing edge cases)
- Performance issues detectable from code (N+1, missing index, missing pagination)

**ESCALATE** — ONLY when fix requires:
- Architectural redesign (changing patterns established across multiple stories)
- User/business decision (ambiguous requirement, conflicting specs)
- External dependency not available

**DEFERRED** — ONLY when ALL of these are true:
- The feature/module this finding belongs to literally does not exist yet (future story)
- The code touched by this story cannot fully address it because the target subsystem is unbuilt
- Has a specific target story reference (e.g., "STORY-027 will create DashboardCounter")

**If in doubt → FIXABLE.** Gate has full code access. Write the test. Add the config. Fix the handler. Do not defer work that can be done now.

NEVER use "Observations", "Notes", "Non-Blocking", or "Advisory" categories. Every finding MUST be FIXABLE, ESCALATE, or DEFERRED. There is no fourth option.
</HARD-GATE>

### Phase 3: REPORT

Write full report to `docs/stories/phase-N/STORY-NNN-gate.md`:

```markdown
# Gate Report: STORY-NNN

## Summary
- Requirements Tracing: Fields X/Y, Endpoints X/Y, Workflows X/Y, Components X/Y
- Gap Analysis: X/Y acceptance criteria passed
- Compliance: COMPLIANT | NON-COMPLIANT
- Tests: X/X story tests passed, Y/Y full suite passed
- Test Coverage: X/Y ACs have negative tests, Z/W business rules covered
- Performance: N issues found, X fixed
- Build: PASS | FAIL
- Screen Mockup Compliance: X/Y elements implemented (if UI story)
- UI Quality: X/15 criteria PASS, Y NEEDS_FIX, Z CRITICAL (if UI story)
- Token Enforcement: N violations found, X fixed (if UI story)
- Turkish Text: N issues found, X fixed (if UI story)
- Overall: PASS | ESCALATE

## Fixes Applied
| # | Category | File | Change | Verified |
|---|----------|------|--------|----------|
| 1 | Performance | src/services/user.service.ts:45 | N+1 → eager loading | Tests pass |
| 2 | Test | src/__tests__/user.test.ts | Added 3 missing AC tests | Tests pass |
| 3 | Compliance | src/api/users.controller.ts:22 | Fixed API envelope format | Tests pass |
| 4 | Build | src/components/UserForm.tsx:8 | Fixed type error (missing prop) | Build pass |
| 5 | Migration | migrations/005_add_idx.sql | Added index on orders.customer_id | Applied |

## Escalated Issues (cannot fix without architectural change or user decision)
### [E-1] [CRITICAL] [Short description]
- Source: [Which pass found this]
- Expected: [from story/architecture/product]
- Actual: [what's implemented/observed]
- Why escalated: [requires architectural redesign / user decision / missing feature too large]
- Suggested approach: [recommendation]

## Deferred Items (tracked in ROUTEMAP → Tech Debt)
| # | Finding | Target Story | Written to ROUTEMAP |
|---|---------|-------------|---------------------|
| D-1 | [Short description] | STORY-NNN | YES |

## Performance Summary
### Queries Analyzed
| # | File:Line | Query/Pattern | Issue | Severity | Status |
|---|-----------|--------------|-------|----------|--------|

### Caching Verdicts
| # | Data | Location | TTL | Decision | Status |
|---|------|----------|-----|----------|--------|

## Token & Component Enforcement (UI stories)
| Check | Matches Before | Matches After | Status |
|-------|---------------|---------------|--------|
| Hardcoded hex colors | N | 0 | FIXED |
| Arbitrary pixel values | N | 0 | FIXED |
| Raw HTML elements (shadcn/ui) | N | 0 | FIXED |
| Competing UI library imports | N | 0 | FIXED |
| Default Tailwind colors | N | 0 | FIXED |
| Inline SVG | N | 0 | FIXED |
| Missing elevation | N | 0 | FIXED |

## Verification
- Tests after fixes: X/X passed
- Build after fixes: PASS
- Token enforcement: ALL CLEAR (0 violations)
- Fix iterations: N (max 2)

## Passed Items
- [List of all passed checks with evidence]
```

