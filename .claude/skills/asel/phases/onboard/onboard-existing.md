# Onboard Existing Project

> Reverse-engineer an existing codebase into Asel's documentation format. Scans code, generates all required docs, and sets up the project for Asel's development cycle.
> Before starting: Verify project root exists and has source code
> After completion: All Asel docs generated, ROUTEMAP ready for development

<HARD-GATE>
This is a ONE-TIME, INTERACTIVE skill with 13 approval gates.
Do NOT skip any step. Do NOT generate documents without user approval.
Do NOT modify existing source code — only create files under `docs/` and project root config files.
Every generated file MUST match Asel template format EXACTLY.
Reference ID system is MANDATORY (SVC-NN, API-NN, TBL-NN, CMP-NN, CTN-NN, SCR-NN, ADR-NNN).
API full spec format is MANDATORY (Auth, Request, Response, Errors, Notes) — summary tables are FORBIDDEN.
decisions.md MUST be updated at every step.
</HARD-GATE>

## General Rules

- Runs in main context (Skill tool) — interactive, 13 approval gates
- Conversation language: Turkish, document language: English
- Every generated file MUST match Asel template format exactly
- Do NOT touch existing source files — only create under `docs/` and project root
- Existing `README.md`, `Makefile`, `.gitignore`, `.env.example` → propose changes with diff summary, apply only after user approval
- If `docs/` already exists → ask user: "docs/ dizini zaten mevcut. Uzerine yazayim mi?"
- Reference ID system mandatory (SVC-NN, API-NN, TBL-NN, CMP-NN, CTN-NN, SCR-NN, ADR-NNN)
- API full spec format mandatory (Auth, Request, Response, Errors, Notes) — summary table FORBIDDEN
- Detect standard envelope pattern, flag if missing (do NOT force-change existing code)
- Update decisions.md at every step

## Progress Bar

Display and update at every step transition:

```
=== ONBOARDING ========================================================================
SCAN:     [done] Discovery → [done] Architecture → [>>] API → [ ] Database → [ ] UI
DOCUMENT: [ ] Core Docs → [ ] Architecture → [ ] Screens → [ ] Frontend
FINALIZE: [ ] ROUTEMAP → [ ] Project Setup → [ ] Review → [ ] Handoff
==================================================================================
```

### Symbols

| Symbol | Meaning |
|--------|---------|
| `[done]` | Completed |
| `[>>]` | Running (current step) |
| `[ ]` | Pending |
| `[FAIL]` | Failed (needs re-run) |

---

## Phase 1: SCAN (Steps 1-5)

Scans the codebase, collects data, validates with user. NO FILES WRITTEN in this phase — only internal data structures are built.

### Step 1: Codebase Discovery

**Scan:**
- `package.json` / `go.mod` / `Cargo.toml` / `pyproject.toml` / `pom.xml` → language & framework
- `docker-compose.yml`, `Dockerfile*`, `nginx.conf` → container setup
- `tsconfig.json`, `.eslintrc*`, `Makefile`, `.env.example` → tooling
- Directory structure (depth 3) → architecture pattern
- `git log --oneline -20` → project maturity
- README, existing docs

**Detect:**
- Project type: fullstack | api-backend | frontend-only | cli-tool | monorepo
- Language, framework, package manager
- DB type, cache, auth strategy
- Test framework, CI/CD
- Docker setup

**Present to user:**
```
PROJECT SCAN RESULTS
====================
Type:       fullstack (React + Express)
Language:   TypeScript
Frontend:   React 18 + Vite + TailwindCSS
Backend:    Express.js + Prisma ORM
Database:   PostgreSQL
Cache:      Redis
Auth:       JWT
Tests:      Vitest + Jest
Docker:     3 containers (app, db, redis)

Dogru mu? Eksik/yanlis var mi?
```
→ **User approval required**

### Step 2: Architecture Pattern Detection

**Scan:**
- Import/require graph → dependency direction
- Directory structure → MVC / Clean Architecture / Hexagonal / flat
- Service boundaries → monolith / modular / microservices
- Middleware chain, guard/pipe patterns
- State management (Redux, Zustand, Context)
- Routing pattern (file-based, React Router, custom)

**Detect:**
- Architectural pattern name
- SVC-NN assignment (per service/module)
- Layer separation (controller, service, repository, model)
- Dependency graph (ASCII)

**Present ASCII architecture diagram → user approval required**

### Step 3: API Surface Extraction

**Scan (framework-specific):**

| Framework | Scan Target |
|-----------|-------------|
| Express | `router.get/post/put/delete`, `app.METHOD` |
| NestJS | `@Controller`, `@Get/@Post/@Put/@Delete` decorators |
| Fastify | `fastify.METHOD` registrations |
| Next.js | `app/api/**/route.ts`, `pages/api/**/*.ts` |
| Go (Gin) | `gin.GET/POST/PUT/DELETE` |
| Go (Echo) | `echo.GET/POST/PUT/DELETE` |
| Go (net/http) | `mux.HandleFunc`, `http.HandleFunc` |

**Per endpoint extract:**
- HTTP method + path
- Auth requirement (middleware/guard detection)
- Request validation schema (Zod, Joi, class-validator, Go struct tags)
- Response type (return type, handler code analysis)
- Error codes used
- Pagination pattern

**Assign API-NN** (domain-grouped, auth first)

**Standard envelope check:**
- Is `{ status, data, meta }` format used?
- If not → decisions.md note: "Current API format: [actual]. Future stories should migrate."

**Present endpoint list (domain-grouped) → user approval required**

### Step 4: Database Schema Extraction

**Scan (ORM-specific):**

| ORM/Tool | Scan Target |
|----------|-------------|
| Prisma | `schema.prisma` |
| TypeORM | `@Entity` decorated classes |
| Sequelize | Model definitions |
| Drizzle | Schema files |
| Knex | Migration files |
| GORM (Go) | Model structs with `gorm:""` tags |
| Raw SQL | `*.sql` files, `migrations/` |

**Detect:**
- All tables: column name, type, constraint, default
- Indexes (from migration files or model decorators)
- Foreign key relationships
- Seed data presence
- Migration strategy (tool, naming, location)

**Assign TBL-NN** (dependency order — parent tables first)
**Generate ASCII ER diagram**

**Present table list + ER diagram → user approval required**

If no migrations found → decisions.md: "No migration history. Migrations required for future DB changes."

### Step 5: UI & Frontend Analysis

**Scan:**
- `src/components/**/*.tsx` → component inventory
- `src/pages/**/*.tsx` or `app/**/*.tsx` → page/route inventory
- `src/layouts/**/*.tsx` → layout patterns
- `tailwind.config.*` / CSS variables / theme files → design tokens
- Navigation structure (router config, sidebar/menu components)

**Detect:**
- CMP-NN assignment (atomic design classification):
  - Atoms: 001-099, Molecules: 100-199, Organisms: 200-299, Templates: 300-399, Pages: 400-499
- SCR-NN assignment (route-based)
- Design tokens: colors, fonts, spacing, border-radius
- Navigation flow
- Pattern library: form patterns, table patterns, modal patterns

**If app is running (Docker up):**
- Use Playwright MCP tools ({{playwrightPrefix}}__browser_*) to navigate each route
- Take screenshots → use as reference
- Extract computed styles → more accurate design tokens

**If app is NOT running:**
- Analyze component JSX → generate ASCII mockups (lower fidelity)
- User review is more critical

**Present component tree + screen list → user approval required**

---

## Phase 2: DOCUMENT (Steps 6-9)

Generates Asel-format documents from scan data. Each document follows: outline → approval → generate → review → fix → approval.

### Step 6: Core Docs (SCOPE, PRODUCT, GLOSSARY, decisions.md)

1. **Create `docs/brainstorming/decisions.md`:**
   - All detected decisions (tech stack, DB, auth, patterns)
   - Date: onboarding date
   - Category: Architecture, Product, UX, Performance
   - Label each with "Onboarded"

2. **Create `docs/SCOPE.md`** (template: `asel/templates/SCOPE.template.md`):
   - Vision → ASK user (cannot detect from code)
   - Problem statement → ASK user
   - Target users → auth roles + user input
   - In scope → detected features
   - Success metrics → ASK user
   - Constraints → detected (tech stack, dependencies)

3. **Create `docs/PRODUCT.md`** (template: `asel/templates/PRODUCT.template.md`):
   - Features (MoSCoW) → from API surface + UI screens
   - Business rules → inferred from code logic + user input
   - Workflows → detected user journeys
   - Non-functional requirements → ASK user
   - Integration points → detected 3rd party dependencies

4. **Create `docs/GLOSSARY.md`** (template: `asel/templates/GLOSSARY.template.md`):
   - Domain terms → model names, enum values, constants
   - Abbreviations → abbreviations in code
   - Technical terms → framework-specific terminology

**CRITICAL:** SCOPE and PRODUCT require information FROM user — vision/problem/success metrics cannot be extracted from code. Ask one at a time (asel-brainstormer pattern).

**User approval required after each document**

### Step 7: Architecture Documentation

**Scale detection:**
- API count < 50 AND table count < 30 → single `docs/ARCHITECTURE.md`
- API count 50-200 → split: `docs/architecture/{api,db,services,flows,journeys}/`
- API count > 200 → split + sub-domain files

**Generate (asel-architect format exactly):**

1. **`docs/ARCHITECTURE.md`:**
   - System Overview (ASCII diagram — from Step 2)
   - Technology Stack (with ADR references)
   - Services (SVC-NN — from Step 2)
   - API Full Specs (API-NN — from Step 3, EVERY endpoint with Auth/Request/Response/Errors/Notes)
   - Database Schema (TBL-NN — from Step 4, all columns/types/constraints/indexes)
   - Seed Files (from existing seed data)
   - Docker Architecture (CTN-NN — from Step 1)
   - Frontend Component Tree (CMP-NN — from Step 5)
   - Data Flows (ASCII — frontend → API → service → DB)
   - User Journeys (ASCII — SCR-NN → API-NN)
   - Security Architecture (from auth middleware, CORS, rate limiting)
   - Performance Architecture (from caching, indexing, lazy loading)
   - Conventions (naming, project structure — ASCII tree)
   - Reference ID Registry (all IDs)

2. **`docs/adrs/ADR-NNN-*.md`** (per technology decision):
   - ADR-001: Database selection
   - ADR-002: Authentication strategy
   - ADR-003: Frontend framework
   - ADR-004+: Other detected decisions
   - Format: `asel/templates/ADR.template.md`

**Split structure (if applicable):**
- `docs/architecture/api/_index.md` + domain files
- `docs/architecture/db/_index.md` + domain files
- `docs/architecture/services/_index.md`
- `docs/architecture/flows/_index.md`
- `docs/architecture/journeys/_index.md`

**Present section by section → user approval required**

### Step 8: Screen Documentation

**Scale detection:**
- Screen count < 10 → single `docs/SCREENS.md`
- Screen count 10+ → split: `docs/screens/SCR-NNN-*.md` (flat, no subdirs)

**Generate (asel-screen-designer format):**

1. UI Pattern Library (from existing component patterns)
2. Navigation Flow (ASCII — from route structure)
3. Screen Index (SCR-NN list)
4. Per screen:
   - ASCII mockup (from screenshot or JSX analysis)
   - Elements table
   - States (loading, empty, error)
   - Responsive notes
   - **Drill-Down Map** (mandatory — clickable data → target screen)
5. Component Library section

**If app is running:** Playwright MCP tools ({{playwrightPrefix}}__browser_*) navigate → screenshot reference → more accurate ASCII mockups
**If app is NOT running:** infer from JSX → user validation is critical

**Present screen by screen → user approval required**

### Step 9: Frontend Design System

**Generate:**

1. **`docs/FRONTEND.md`** (asel-theme-designer format):
   - Color Palette → from CSS variables / Tailwind config
   - Typography → from font imports / Tailwind config
   - Spacing → base unit + scale
   - Layout tokens → sidebar width, header height, max-width
   - Component tokens → border-radius, shadows, transitions
   - Dark/light mode status

2. **`docs/mockups/*.html`** (3 files):
   - `01-dashboard.html` → main dashboard
   - `02-data-list.html` → a list page
   - `03-form-detail.html` → form/detail page
   - Self-contained, CSS custom properties inline
   - Using existing design tokens
   - Responsive (1440px + 768px)

**If app is running:** extract computed styles → more accurate tokens
**If app is NOT running:** from CSS/Tailwind config → user confirmation

**Present token list + mockup review → user approval required**

---

## Phase 3: FINALIZE (Steps 10-13)

### Step 10: ROUTEMAP Setup

**Create `docs/ROUTEMAP.md`** (template: `asel/templates/ROUTEMAP.template.md`):

```markdown
# Project Roadmap: [Project Name]

> Last updated: YYYY-MM-DD
> Current phase: DEVELOPMENT | E2E_POLISH | DOCUMENTATION
> Overall progress: 0% (new stories)

---

## Planning Phase [DONE — Onboarded]

| Step | Name | Status | Completed |
|------|------|--------|-----------|
| 1 | Discovery | [x] DONE (Onboarded) | YYYY-MM-DD |
| 2 | Gap Analysis | [x] DONE (Onboarded) | YYYY-MM-DD |
| 3 | Product Definition | [x] DONE (Onboarded) | YYYY-MM-DD |
| 4 | Feature Discovery | [x] DONE (Onboarded) | YYYY-MM-DD |
| 5 | Architecture | [x] DONE (Onboarded) | YYYY-MM-DD |
| 6 | Screen Design | [x] DONE (Onboarded) | YYYY-MM-DD |
| 6.5 | Theme & Visual Design | [x] DONE (Onboarded) | YYYY-MM-DD |
| 7 | Story Writing | [x] DONE (Onboarded) | YYYY-MM-DD |
| 8 | Final Review | [x] DONE (Onboarded) | YYYY-MM-DD |

---

## Development Phase [NOT STARTED]

> Stories completed: 0/0 (—)
> Current story: —
> Current step: —

_No stories yet. Use `asel change` to add new features._

---

## E2E & Polish Phase [NOT STARTED]

| Step | Name | Status | Completed |
|------|------|--------|-----------|
| E1 | E2E Browser Testing (E2E Tester) | [ ] PENDING | — |
| E2 | Test Hardening (Test Hardener) | [ ] PENDING | — |
| E3 | Performance Optimization (Perf Optimizer) | [ ] PENDING | — |
| E4 | UI Polish (UI Polisher) | [ ] PENDING | — |

---

## Documentation Phase [NOT STARTED]

| Step | Name | Status | Completed |
|------|------|--------|-----------|
| D1 | Specification | [ ] PENDING | — |
| D2 | Presentations (Sales + Technical) | [ ] PENDING | — |
| D3 | Rollout Guide | [ ] PENDING | — |
| D4 | User Guide | [ ] PENDING | — |

---

## Change Log

| Date | Type | Description | Affected |
|------|------|-------------|----------|
| YYYY-MM-DD | ONBOARD | Project onboarded to Asel framework | All docs |

---

## Status Legend
- `[ ] PENDING` — Not started
- `[~] IN PROGRESS` — Currently being worked on
- `[x] DONE` — Completed and verified
- `[!] NEEDS_REPLAN` — Affected by change, needs re-planning
- `[!!] BLOCKED_BY_CHANGE` — Cannot proceed until change is applied
- Effort: S (Small) | M (Medium) | L (Large) | XL (Extra Large)

## Step Values
- `—` — Not started
- `Plan` — Implementation planning
- `Dev` — Developer implementing
- `Gate` — Combined Gate (Gap + Compliance + Tests + Perf + Build)
- `Close` — Close & Commit
- `Review` — Reviewer checking (after every story)
- `Handoff` — Session handoff
- `E1` — E2E Browser Testing
- `E2` — Test Hardening
- `E3` — Performance Optimization
- `E4` — UI Polish
- `D1` — Specification document
- `D2` — Presentations (Sales + Technical)
- `D3` — Rollout Guide
- `D4` — User Guide
```

### Step 11: Project Setup

1. **Create/update `CLAUDE.md`:**
   - Project overview
   - `## Development` section: "Run `/asel` to start or continue any development work — it manages planning, implementation, quality gates, and deployment."
   - Tech stack
   - Quick commands (from existing Makefile or package.json scripts)
   - Docker services + URLs
   - Admin credentials → ASK user
   - Project structure
   - Conventions
   - Architecture docs list
   - `## Asel Session` section (empty — Story: —, Step: —, Mode: —)

2. **Create `docs/FUTURE.md`:**
   - Ask user: "Gelecekte eklemek istedigin feature'lar var mi?"
   - If yes → document them
   - If no → minimal file: "To be populated via asel change-analyst."

3. **Project config files (`README.md`, `Makefile`, `.gitignore`, `.env.example`):**

   **If file DOES NOT exist → create it:**
   - `README.md` → project overview, setup instructions, tech stack, commands
   - `Makefile` → minimal targets (help, build, up, down, test, logs, clean)
   - `.gitignore` → language/framework-appropriate ignores
   - `.env.example` → from existing `.env` (mask secret values with placeholders)

   **If file EXISTS → propose changes with user approval:**
   - Read the existing file
   - Analyze gaps (missing sections, outdated info, missing targets)
   - Present a diff-style summary of proposed changes:
     ```
     README.md mevcut. Onerilen degisiklikler:
     + [EKLEME] "Quick Start" bolumu (Docker setup adimlari)
     + [EKLEME] "Project Structure" bolumu
     ~ [GUNCELLEME] Tech stack bolumu (eksik: Redis, Prisma)
     - Degisiklik yok: Contributing, License bolumleri

     Uygulayayim mi? (evet / hayir / secmeli)
     ```
   - If user says "secmeli" → apply only approved items
   - If user says "hayir" → skip, log to decisions.md: "User declined [file] updates"
   - If user says "evet" → apply all proposed changes

### Step 12: Final Review

Follow asel-reviewer planning review pattern:
- Cross-check all reference IDs (SVC↔API↔TBL↔CMP↔SCR↔ADR)
- Orphaned references?
- GLOSSARY coverage sufficient?
- ROUTEMAP all info correct?
- ARCHITECTURE↔PRODUCT↔SCREENS consistency
- decisions.md completeness

If issues found → fix → re-check

### Step 13: Handoff

```
==================================================================================
  ONBOARDING COMPLETE
==================================================================================

  Project: [Name]
  Generated: X docs, Y ADRs, Z screens
  Reference IDs: SVC-01..NN, API-01..NN, TBL-01..NN, ...
  ROUTEMAP: Planning DONE, Development ready

  Sonraki adimlar:
  * "asel change" → Yeni feature ekle (change-analyst)
  * "asel dev" → Story gelistirmeye basla
  * "asel docs" → Dokumantasyon uret

==================================================================================
```

---

## Reference ID Assignment Strategy

| Prefix | Source | Ordering |
|--------|--------|----------|
| SVC-NN | Detected services/modules | Dependency order (foundational first) |
| API-NN | Route definitions | Domain-grouped, auth first, then alphabetical |
| TBL-NN | ORM models / migrations | Dependency order (parent tables first) |
| CMP-NN | React components | Atomic level: atoms 001-099, molecules 100-199, organisms 200-299, templates 300-399, pages 400-499 |
| CTN-NN | Docker containers | Dependency order (DB → app → proxy) |
| SCR-NN | Routes/pages | Navigation hierarchy (auth/landing first, then main flow) |
| ADR-NNN | Technology choices | Sequential by detection order |

## Error Handling

| Situation | Action |
|-----------|--------|
| No package.json/go.mod | Ask: "Bu projenin ana dizini neresi?" |
| Framework undetectable | Ask: "Hangi framework kullaniliyor?" |
| API routes dynamic/undetectable | List found ones, ask user for missing |
| No ORM/migration | Suggest connecting to running DB or ask user for schema |
| App not running | Component JSX → ASCII mockup (lower fidelity) |
| `docs/` already exists | Ask: "Uzerine yazayim mi?" |
| Very large codebase (>1000 files) | Structure first, then domain-by-domain deep dive |
| No standard envelope | Document current format, add migration note |
| No tests | decisions.md note: "Tests will be introduced with new stories" |

## When Complete

- All 13 steps completed with user approval
- Asel-format docs generated under `docs/`
- ROUTEMAP ready for development
- Reference ID system established
- Next: User triggers change/dev/docs via asel commands
