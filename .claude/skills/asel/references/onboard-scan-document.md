# Onboarding scan & document phases (reference for onboard-existing.md)

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

