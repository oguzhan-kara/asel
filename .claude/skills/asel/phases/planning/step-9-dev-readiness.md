# Step 9: Development Readiness Audit

> Planner → Developer → Gate pipeline her story'yi soru sormadan, assumption yapmadan çalıştırabilir mi? %100 netlik kontrolü.
> Before starting: Update ROUTEMAP — mark Step 9 as `[~] IN PROGRESS`
> After completion: Update ROUTEMAP — mark Step 9 as `[x] DONE` with date, set `Current phase: PLANNING COMPLETE`

<EXTREMELY-IMPORTANT>
**ASEL DIRECT EXECUTION — DO NOT DELEGATE TO AN AGENT.**

Step 9 is executed by Ana Asel directly. It is NOT dispatched via Agent tool, NOT delegated to any agent. This audit requires holistic cross-document judgment that only the orchestrator with full planning context can perform.

The fundamental question Step 9 answers:
> "Tüm story'leri baştan sona implement etsek, ortaya çıkan ürün PRODUCT.md, SCOPE.md ve decisions.md'de tanımlanan ürünle birebir aynı olur mu?"
>
> If YES → ready for development.
> If NO → stories are incomplete, something was planned but never assigned to a story.
</EXTREMELY-IMPORTANT>

You are the Dev-Readiness Auditor. Your single goal: verify every story can be autonomously developed by Planner → Developer → Gate without any human question, assumption, or ambiguity — AND that the sum of all stories equals the planned product.

**Two core tests:**
1. **Per-story**: "If the Planner/Developer/Gate encounters this, will it NEED to ask a question or MAKE an assumption?" → YES = GAP, NO = PASS.
2. **Holistic (A8)**: "If ALL stories are implemented perfectly, does the result match what PRODUCT/SCOPE/decisions defined?" → NO = GAP, YES = PASS.

## Context Required

Before starting, read ALL:
- `docs/ROUTEMAP.md`
- `docs/brainstorming/decisions.md`
- `docs/SCOPE.md`, `docs/PRODUCT.md`, `docs/GLOSSARY.md`, `docs/FUTURE.md`
- `docs/ARCHITECTURE.md` (+ split files if scale-adaptive)
- `docs/SCREENS.md` (+ split files if scale-adaptive)
- `docs/FRONTEND.md` (if UI project)
- `docs/stories/phase-*/STORY-*.md` (ALL stories)

## Rules

- Run ALL 7 phases in order (A → G)
- Each gap: classify as **AUTO-FIX** or **NEEDS-DECISION**
- AUTO-FIX: update the doc/story directly, track the change
- NEEDS-DECISION: present to user with 2-3 specific options (NEVER open-ended questions)
- After all gaps resolved: re-scan Phase A to verify ZERO ambiguity
- Speak Turkish to user. Update docs in English.
- **ZERO tolerance**: even 1 ambiguity = FAIL. No exceptions.

---

## Phase A: Per-Story Autonomy Audit

Run these 7 checks for EACH story file.

### A1. API Contract Exhaustiveness

For each endpoint in the story's API Contract table:

| Cell | PASS | FAIL (Planner will guess) |
|------|------|---------------------------|
| Ref | Architecture API ID exists | Missing or wrong ID |
| Method | GET/POST/PUT/PATCH/DELETE | Missing |
| Path | Full path with params (e.g., `/api/users/:id`) | Partial or missing |
| Request | ALL fields with TypeScript types | "user data", field without type |
| Response (data) | ALL fields with TypeScript types | "resource", field without type |
| Auth | `Public` or `JWT` or `JWT + Role:[Admin,Editor]` | "Auth required", "protected" |
| Status Codes | ALL relevant: success + 400/401/403/404/409/422 | Only happy path (200/201) |

**Missing endpoint detection**: Cross-reference story's ACs with API contract table. If AC implies an API operation but no endpoint listed → GAP.

**List endpoint extras** (MUST be in story or will be guessed):
- Default page size (e.g., 50)
- Default sort field + direction
- Filterable fields list
- Response meta format: `{ total, page, pageSize, totalPages }`

### A2. DB Schema Exhaustiveness

For each table change in the story:

| Element | PASS | FAIL (Developer will guess) |
|---------|------|------------------------------|
| Column name | Explicit: `user_id` | Vague or missing |
| Column type | With size: `VARCHAR(255)`, `UUID`, `JSONB` | "string", "number" |
| Nullable | `NOT NULL` or `NULLABLE` stated | Not mentioned |
| Default | `DEFAULT NOW()` or `DEFAULT 0` or `NONE` | Not mentioned |
| Constraints | `UNIQUE`, `CHECK(...)`, `FK REFERENCES x(y)` | Missing FK targets |
| Indexes | Column list + type: `BTREE(email) UNIQUE` | "add indexes" |
| FK cascade | `ON DELETE CASCADE/SET NULL/RESTRICT` | FK without cascade behavior |
| Audit fields | `created_at, updated_at, created_by, updated_by` | Missing (enterprise default) |
| Migration dir | Both `up` and `down` mentioned | Only `up` or not mentioned |

### A3. Screen Specification Exhaustiveness (UI stories only)

For each screen ID the story references, verify in SCREENS.md:

| Element | PASS | FAIL (Developer will invent) |
|---------|------|-------------------------------|
| ASCII mockup | Complete layout, all sections visible | "TBD", placeholder, incomplete |
| Buttons/links | Each has action: navigate/modal/API call/toggle | Button without defined behavior |
| Form fields | Type + validation rule + error message (TR) + placeholder (TR) | "input field" without details |
| Table columns | Field name + display format + sortable? + filterable? + clickable? | "data table" without columns |
| Empty state | Specific Turkish text + CTA button text | Not mentioned → Developer skips |
| Loading state | Skeleton shape OR spinner specified | Not mentioned → Developer skips |
| Error state | Error message text (TR) + retry action | Not mentioned → Developer skips |
| Navigation in | How user reaches this screen (route, menu, link) | Not specified |
| Navigation out | Where user can go from here (links, buttons, breadcrumbs) | Not specified |
| Pagination | Type: numbered/infinite + items per page | Missing on list screens |

### A4. Business Rule Completeness

Cross-reference story's Description and ACs with PRODUCT.md:

| Check | PASS | FAIL (Developer will assume) |
|-------|------|-------------------------------|
| Quantified limits | "max 5 items", "timeout: 30 seconds" | "limited", "reasonable timeout" |
| Status transitions | "PENDING → ACTIVE via approve button by Admin role" | "status changes" |
| Calculations | `total = sum(items.price * items.qty) - discount` | "calculate total" |
| Conditionals | "if quantity > 100 → apply 10% discount" | "apply discount when appropriate" |
| Authorization | "Admin: delete, Editor: edit, Viewer: read-only" | "authorized users can manage" |
| Validation rules | "email: RFC 5322, name: 2-100 chars, alphanumeric + space" | "validate input" |
| Error messages | "duplicate email → 409, message: 'E-posta zaten kayıtlı'" | "handle errors" |
| Sort/filter defaults | "sort: created_at DESC, filter: status=ACTIVE" | "sort and filter" |

### A5. Acceptance Criteria Precision

For EACH AC in the story:

| Check | PASS | FAIL (Gate can't verify) |
|-------|------|--------------------------|
| Testable | Specific input → specific output defined | "system works correctly" |
| No subjective words | Measurable condition with number/value | "fast", "user-friendly", "proper" |
| Expected value | "displays 'Kayıt başarılı' toast, table refreshes" | "shows success" |
| Boundary defined | "name: min 2, max 100 chars" | "validates name" |
| Error AC exists | "empty name → red border + 'Ad zorunludur'" | Only happy path ACs |
| UI state AC exists | "while loading → skeleton, on error → retry button" | Only data ACs |

### A6. Test Scenario Executability

For EACH test scenario in the story:

| Check | PASS | FAIL (Gate can't run test) |
|-------|------|----------------------------|
| Input specified | `POST /api/users { name: "Test", email: "a@b.com" }` | "send valid data" |
| Expected output | `201, { id: uuid, name: "Test", email: "a@b.com" }` | "success response" |
| Error scenario | `POST empty name → 400, { code: "VALIDATION_ERROR" }` | "test validation" |
| Edge case | `POST 101-char name → 400, "Max 100 characters"` | "test limits" |
| Setup required | "Prerequisite: create user first via POST /api/users" | Assumes data exists |

### A7. Ambiguity Scan

Grep each story file for ambiguous language. **ZERO matches required.**

| Word/Phrase | Why dangerous | Auto-fix pattern |
|-------------|--------------|------------------|
| `appropriate` | Developer chooses arbitrarily | → specific value/rule |
| `as needed` / `if needed` / `when necessary` | Nobody knows when | → explicit condition |
| `etc.` / `and so on` / `and more` | Unbounded scope | → list ALL items |
| `similar to` / `like` / `same as` | Similar HOW? | → exact behavior spec |
| `should be` / `should have` | Obligation unclear | → `MUST` or remove |
| `relevant` / `related` | Which ones? | → list specific items |
| `TBD` / `TODO` / `to be decided` | Not decided = not buildable | → decide NOW |
| `may` / `might` / `could` / `possibly` | Optional or required? | → `MUST` or `SKIP` |
| `some` / `various` / `several` (no count) | How many? | → exact count or list |
| `properly` / `correctly` / `well` | What's "proper"? | → expected behavior |
| `fast` / `quickly` / `efficiently` (no metric) | How fast? | → `< 200ms` or similar |
| `standard` / `default` / `normal` (no def) | Whose standard? | → reference specific standard |
| `where applicable` | Applicable WHEN? | → explicit condition |
| `handle errors` / `error handling` | Which errors, how? | → specific error → response mapping |

### A8. Doc → Story Reverse Coverage

Every feature, rule, decision, and architectural component in docs MUST have a story that implements it. Otherwise features get planned but never built.

**Source documents to scan (ALL 4 mandatory):**

1. Read `docs/PRODUCT.md` → extract all business rules, features, user workflows
2. Read `docs/SCOPE.md` → extract all in-scope features
3. Read `docs/brainstorming/decisions.md` → extract all APPROVED decisions (skip REJECTED/DEFERRED)
4. Read `docs/ARCHITECTURE.md` → extract all implementable items:
   - Services (SVC-NN) that need code
   - Infrastructure components (Docker services, Nginx config, Makefile targets)
   - Middleware, auth flows, caching layers, background jobs
   - Seed files (SEED-01, SEED-02, etc.)
   - Integration adapters, event systems, scheduled tasks

**For each extracted item** → search ALL story files for a reference (in Description, AC, Architecture Reference, or DB Changes section).

| Result | Action |
|--------|--------|
| Item in story AC | PASS |
| Item in story Description or Architecture Reference | PASS |
| Item in FUTURE.md (deferred) | PASS (intentionally deferred) |
| Item is pure documentation (ADR, README) — no code needed | PASS (non-implementable) |
| Item not in any story or FUTURE.md | **FAIL** — create story or add to existing story |

**Classification of ARCHITECTURE.md items:**

| Item Type | Implementable? | Example |
|-----------|---------------|---------|
| Service definition (SVC-NN) | YES — needs code | SVC-03: Cache Service |
| Docker container (CTN-NN) | YES — needs config | CTN-04: Redis |
| API endpoint (API-NN) | YES — needs code | API-15: POST /api/orders |
| DB table (TBL-NN) | YES — needs migration | TBL-08: audit_logs |
| Seed file (SEED-NN) | YES — needs script | SEED-02: system data |
| Middleware/auth flow | YES — needs code | JWT auth + RBAC |
| Caching strategy | YES — needs code | Redis cache for user sessions |
| Tech stack choice | NO — just a decision | "Using Prisma ORM" |
| Naming convention | NO — just a rule | "camelCase for files" |
| ADR record | NO — just documentation | ADR-003: chose PostgreSQL |

Only check implementable items for story coverage.

**decisions.md scanning rules:**
- Only scan APPROVED items (ignore REJECTED, DEFERRED, PENDING)
- A decision like "Use bcrypt for password hashing" → check if the story that implements auth mentions bcrypt
- A decision like "Add audit logging for all CRUD operations" → check if stories include audit log implementation
- A decision that only affects HOW something is built (not WHAT) → check it's referenced in the relevant story's Architecture Reference

**Auto-fix:** If item maps cleanly to an existing story → add to that story's AC or Architecture Reference. If not → flag for user: "Bu item hangi story'de olmalı, yoksa yeni story mi açalım?"

---

## Phase B: Cross-Story Contract Audit

### B1. Data Schema Consistency

For each entity that appears in multiple stories:
1. Extract field names from EACH story referencing that entity
2. Field names MUST be identical across all stories (not `user_id` in one, `userId` in another)
3. Types MUST be identical
4. If Story B reads data created by Story A → ALL fields Story B uses MUST exist in Story A's schema

### B2. Shared Resource Ownership

| Check | How | GAP condition |
|-------|-----|---------------|
| Components | List all components across stories → count creators | Component created by 2+ stories |
| Services | List all services across stories → count creators | Service created by 2+ stories |
| Utilities | List shared utilities → verify owner story | Utility assumed but no story creates it |
| Config files | docker-compose, Makefile, .env → verify creator | Config needed but no story handles it |
| Middleware | Auth, logging, validation middleware → verify creator | Middleware used but no story creates it |

### B3. Dependency Correctness

| Check | GAP condition |
|-------|---------------|
| No cycles | Circular dependency detected in graph |
| No missing targets | `Blocked by: STORY-NNN` → STORY-NNN doesn't exist |
| No implicit deps | Story B uses table/API/component from A, doesn't declare dependency |
| Valid order | ROUTEMAP story order ≠ topological sort order |
| Phase boundaries | Story in Phase 2 depends on Phase 2 story that comes AFTER it |

### B4. API Route Uniqueness

| Check | GAP condition |
|-------|---------------|
| No duplicate routes | Two stories define same METHOD + PATH |
| No param conflicts | `/users/:id` vs `/users/me` in same phase (`:id` catches "me") |
| Prefix consistency | Mixed: `/api/users` vs `/users/api` |

### B5. Migration Ordering

| Check | GAP condition |
|-------|---------------|
| FK target exists | Story adds FK → target table created by earlier story |
| No conflicting ALTERs | Two stories in same phase ALTER same column |
| Seed data order | Seed references FK → parent not seeded yet |

---

## Phase C: Architecture Executability Audit

### C1. Tech Stack Explicitness

For each technology in ARCHITECTURE.md:

| Element | PASS | FAIL (Developer picks randomly) |
|---------|------|----------------------------------|
| Library | `recharts` | "a chart library" |
| Version | `^2.8.0` or `latest LTS` | No version |
| Package manager | `npm` / `pnpm` / `yarn` | Not specified |
| Runtime | `Node.js 20 LTS` | "Node.js" |
| Build tool | `Vite 5.x` | "bundler" |
| Test framework | `Vitest 1.x` or `Jest 29` | "testing framework" |
| ORM / DB driver | `Prisma 5.x` or `pg 8.x` | "ORM" |
| Validation lib | `Zod 3.x` or `Joi 17` | "validation" |
| State management | `Zustand 4.x` or `Redux Toolkit 2.x` | "state management" |

### C2. Infrastructure Completeness

| Element | Must Have | Location |
|---------|----------|----------|
| Docker services | image, ports, volumes, env vars, healthcheck per service | ARCHITECTURE.md |
| Docker network | Network name + driver | ARCHITECTURE.md |
| Makefile targets | build, up, down, test, migrate, seed, clean, logs | ARCHITECTURE.md |
| .env.example | Every var: name + description + example + required? | ARCHITECTURE.md |
| Nginx config | Upstream blocks + location rules (web-app only) | ARCHITECTURE.md |
| Port assignments | Every service explicit port, no conflicts | ARCHITECTURE.md |

### C3. Auth Flow Completeness (if auth exists anywhere in stories)

| Element | PASS | FAIL (Developer invents auth flow) |
|---------|------|-------------------------------------|
| Login flow | Step-by-step: input → validate → hash compare → token → response | "login endpoint" |
| Token storage | `httpOnly cookie` or `localStorage` | Not specified |
| Token format | `JWT` with payload fields: `{ sub, role, exp, iat }` | "token" |
| Token refresh | Endpoint + trigger (exp - 5min) + silent refresh flow | Not specified |
| Session timeout | `24h` or `sliding 30min` | "configurable" |
| Password rules | `min 8, 1 uppercase, 1 digit, 1 special` | "strong password" |
| Role model | Complete matrix: role × resource × action (CRUD) | "admin and user" |
| Registration | Required fields + email verification? + auto-login? | "can register" |
| Password reset | Email flow: request → token (exp 1h) → reset → confirm | "forgot password" |
| Logout | Token invalidation strategy (blacklist/rotation/expiry) | Not specified |

### C4. Error Handling Strategy

| Element | PASS | FAIL (Developer improvises) |
|---------|------|------------------------------|
| API error envelope | `{ status: "error", error: { code, message, details? } }` | Not defined |
| Error code enum | `VALIDATION_ERROR, NOT_FOUND, UNAUTHORIZED, FORBIDDEN, CONFLICT, INTERNAL` | Ad-hoc codes |
| Frontend error boundary | Component name + fallback UI + error reporting | Not mentioned |
| Network errors | Timeout duration + retry count + fallback UI | Not specified |
| Form validation display | Inline on blur + summary on submit + error message format | Not specified |
| 500 errors | Generic user message (TR) + full error to structured logs | Not specified |

### C5. File/Directory Convention

| Element | PASS | FAIL (Developer creates random structure) |
|---------|------|-------------------------------------------|
| Directory tree | Complete: `src/routes/`, `src/services/`, `src/components/`, etc. | Partial or missing |
| File naming | `camelCase.ts` for files, `PascalCase.tsx` for components | Not specified |
| Module pattern | `barrel exports via index.ts` or `direct imports` | Not specified |
| Test location | `co-located: *.test.ts` or `separate: __tests__/` | Not specified |
| Migration naming | `NNN_description.sql` or `NNN_description.ts` | Not specified |

### C6. Domain-Specific Technical Depth

<EXTREMELY-IMPORTANT>
This is the check that catches PROJECT-SPECIFIC gaps. C1-C5 are structural/generic. C6 scans for domain concepts mentioned in ARCHITECTURE.md, PRODUCT.md, and stories that lack sufficient implementation specs for the Planner to create a self-contained plan.

Without C6, the Planner reads a story saying "implement RADIUS authentication" but has no attribute mapping, packet flow, or dictionary spec — so it GUESSES.
</EXTREMELY-IMPORTANT>

**Process:**

1. **Scan** ARCHITECTURE.md + PRODUCT.md + ALL stories for domain-specific technical concepts
2. **For each concept found**, check: is there enough spec for Planner to embed in a plan?
3. **If NO** → create a new spec document under `docs/` and update story references

**Detection triggers** — grep ARCHITECTURE.md, PRODUCT.md, and stories for these patterns:

| Area | Trigger Keywords | Required Spec (if triggered) | Output File |
|------|-----------------|------------------------------|-------------|
| Middleware/pipeline | middleware, pipeline, filter chain, interceptor, hook chain | Chain order, per-layer responsibility, context propagation, error handling flow | `docs/MIDDLEWARE.md` |
| Error catalog | error code, error type, error classification, hata kodu | Complete error code enum: code + HTTP status + user message (TR) + dev message (EN) + domain grouping | `docs/ERROR_CODES.md` |
| Protocols | RADIUS, Diameter, MQTT, gRPC, GraphQL, SOAP, LDAP, SAML, OAuth provider, S3, SMTP | Attribute/field mapping, message/packet flow diagrams, library/driver spec, connection config | `docs/PROTOCOLS.md` |
| DSL/grammar | DSL, rule engine, expression parser, query language, formula, custom syntax | Formal grammar (EBNF), data types, operators, compile/interpret output, example expressions | `docs/DSL_GRAMMAR.md` |
| WebSocket/SSE events | WebSocket, SSE, real-time, live update, push notification, event stream | Event type catalog: event name + payload JSON schema + direction (server→client / bidirectional) + auth + reconnect strategy | `docs/WEBSOCKET_EVENTS.md` |
| Algorithms | algorithm, scoring, ranking, allocation, hash chain, anomaly detection, rate limit formula, cost model, matching | Formula/pseudocode, input/output types, edge cases, time complexity, example calculation | `docs/ALGORITHMS.md` |
| Config/env management | environment variable, config management, feature flag, tenant config | ALL vars: name + type + default + description + required? + group | `docs/CONFIG.md` |
| Testing strategy | test strategy, coverage target, test framework, integration test, e2e test | Framework choice, pattern (unit/integration/e2e split), coverage targets, CI integration, fixture/seed strategy | `docs/TESTING.md` |
| State machines | state machine, status transition, workflow engine, finite state | State diagram: states + transitions + guards + actions + who can trigger | `docs/STATE_MACHINES.md` |
| Integration adapters | adapter, connector, 3rd party integration, external API, vendor API | Interface definition (Go interface / TS interface), mock/simulator pattern, retry/circuit-breaker config | `docs/INTEGRATIONS.md` |
| Caching strategy | cache layer, Redis cache, CDN, memoization, cache invalidation | What to cache + key pattern + TTL + invalidation trigger + cache-aside vs write-through | `docs/CACHING.md` |
| Queue/async jobs | message queue, job queue, worker, background job, async processing, event bus | Queue provider + topic/channel list + message schema + retry policy + DLQ strategy + idempotency | `docs/ASYNC_JOBS.md` |

**For each triggered area:**

1. Check if adequate spec ALREADY exists (in ARCHITECTURE.md sections, ADRs, or separate doc)
2. If YES and sufficient detail → PASS (Planner can embed from existing doc)
3. If YES but shallow ("we use Redis for caching" without key pattern/TTL/invalidation) → GAP → expand existing doc
4. If NO → GAP → create new spec document

**New spec document creation rules:**
- Write in English
- Include enough detail for Planner to embed relevant sections in story plans
- Cross-reference with architecture component IDs and story numbers
- Add to each referencing story's Architecture Reference section: `- Spec: docs/[FILE].md`
- Present to user for review before finalizing

**Sufficiency test for each spec:**
> "Can the Planner copy a section from this spec directly into a plan's Architecture Context, and will the Developer (sonnet) be able to implement it without reading any other source?"
> If YES → sufficient. If NO → expand.

---

## Phase D: Design System Completeness (UI projects ONLY)

### D1. Token Coverage

FRONTEND.md must have **class-name-level tokens** (not just color values). Planner needs class names for Design Token Map.

| Category | Required Tokens | FAIL |
|----------|----------------|------|
| Colors | primary, secondary, accent, success, warning, error, info + surface (card, page, elevated) + text (primary, secondary, muted, inverse) + border (default, strong) | Missing token or no class name |
| Typography | heading-lg/md/sm, body-lg/md/sm, caption, overline + weights | Only "heading: 24px" without class |
| Spacing | section, card, input, inline, stack + responsive variants | Only pixel values |
| Shadows | card, modal, dropdown, header, none | Not defined |
| Radii | card, button, input, modal, badge, full | Not defined |
| Z-index | modal, dropdown, tooltip, header, sidebar, overlay | Not defined |
| Transitions | duration (fast: 150ms, normal: 300ms) + easing | Not defined |

### D2. Screen Mockup Completeness

For EVERY screen in SCREENS.md:
- [ ] No `TBD`, `placeholder`, or empty regions
- [ ] ALL interactive elements annotated with component name
- [ ] ALL data fields labeled
- [ ] Responsive notes if applicable

### D3. Component Hierarchy

| Level | Must Define | Check |
|-------|------------|-------|
| Atoms | Button, Input, Select, Textarea, Icon, Badge, Avatar, Label | Each exists with variants listed |
| Molecules | SearchBar, StatCard, FormField, MenuItem, NavLink, DropdownMenu | Key molecules listed |
| Organisms | DataTable, FormPanel, Header, Sidebar, Modal, PageLayout | Core organisms listed |

Every screen element in SCREENS.md MUST map to an atom/molecule/organism. Unmapped element = GAP.

### D4. Form Specification

For EVERY form across ALL stories:

| Element | PASS | FAIL |
|---------|------|------|
| Field list | ALL fields with labels (TR) | Incomplete list |
| Field types | text/email/password/number/date/select/checkbox/radio/textarea | Missing type |
| Validation per field | Required? + min/max + pattern + custom rule | "validate" without rules |
| Error messages | Turkish, specific per rule: "E-posta formatı geçersiz" | Generic "Gerekli alan" for all |
| Placeholder text | Turkish hint: "ornek@email.com" | Missing |
| Submit: success | What happens: toast text + redirect/close + data refresh | "show success" |
| Submit: failure | What happens: error display + focus first error field | Not specified |
| Initial values | Defaults for create / populated values for edit | Not specified for edit forms |

---

## Phase E: Decision Completeness

### E1. No Open Decisions

Grep `docs/brainstorming/decisions.md` for: `PENDING`, `OPEN`, `TBD`, `UNDECIDED`, `?`
Each found → present to user for immediate resolution.

### E2. No TBD in Any Doc

Grep ALL files in `docs/` for: `TBD`, `TODO`, `FIXME`, `HACK`, `PLACEHOLDER`, `TEMP`, `XXX`
Each found → resolve or remove.

### E3. Every "OR" Resolved

Grep for unresolved alternatives: `X or Y`, `X veya Y`, `Option A / Option B`, `alternatively`
Each found → present to user → decide → update doc.

---

## Phase F: Phase 1 Bootstrap Readiness

### F1. Scaffold Story

STORY-001 (or first story) MUST create ALL project infrastructure:

| Element | Must be in first story or earlier | Check |
|---------|----------------------------------|-------|
| Package init | package.json, tsconfig, etc. | In STORY-001 scope |
| Docker setup | Dockerfile(s), docker-compose.yml | In STORY-001 scope |
| Makefile | All standard targets | In STORY-001 scope |
| Directory structure | All architectural directories | In STORY-001 scope |
| Database setup | Initial migration + connection config | In STORY-001 scope |
| Health check | `GET /api/health` endpoint | In STORY-001 scope |
| .env.example | All vars listed | In STORY-001 scope |
| Lint/format config | ESLint + Prettier (or equiv.) | In STORY-001 scope |
| Auth foundation | If auth used in ANY later story | In STORY-001 or STORY-002 |

If first story doesn't cover → expand its scope or create STORY-000 infrastructure story.

### F2. Pattern Establishment

Phase 1 stories have NO existing files to use as `Pattern ref`. Verify:
- Each Phase 1 story that creates a first-of-kind file acknowledges this
- ARCHITECTURE.md has enough structural guidance for each file type:
  - Route handler structure (3-5 line description)
  - Service structure
  - Component structure
  - Test structure
  - Migration structure

Without this, Developer (sonnet) has NO model to follow → guesses structure.

---

## Phase G: Holistic Functional Completeness

<EXTREMELY-IMPORTANT>
This is the FINAL and MOST CRITICAL check. Phases A-F verify that stories are well-written and consistent. Phase G asks a fundamentally different question:

> "Tüm story'ler kusursuz implement edilse bile, ortaya çıkan ürün gerçek dünyada kullanılabilir mi? Fonksiyonel olarak tamam mı?"

Phase G re-runs Step 2's functional completeness checklist — but this time against the WRITTEN STORIES, not brainstorming output. Story decomposition often loses implicit requirements that were obvious in the brainstorming but never made it into any story.
</EXTREMELY-IMPORTANT>

### G1. Entity Lifecycle Completeness

For EVERY entity/resource across ALL stories, verify the full lifecycle is covered:

| Check | How | GAP condition |
|-------|-----|---------------|
| **Create** | Story with POST endpoint or create form | Entity has read/update but no create |
| **Read (list)** | Story with GET list endpoint + list screen | Entity created but never listed |
| **Read (detail)** | Story with GET detail endpoint + detail screen | Entity listed but no detail view |
| **Update** | Story with PUT/PATCH endpoint + edit form | Entity created but never editable |
| **Delete/Archive** | Story with DELETE endpoint or soft-delete | Entity created but never removable |
| **Relationship cascade** | For each FK: what happens on parent delete? | Parent entity has delete story but child cascade undefined |
| **Ownership** | Who creates this entity? Who can see/edit/delete? | Entity exists but no authorization rules in any story |

**Process**: Build entity inventory from ARCHITECTURE.md (TBL-NN) → cross-reference with ALL stories → flag missing lifecycle operations.

### G2. User Flow Completeness

For EVERY user workflow in PRODUCT.md, trace the COMPLETE flow across stories:

| Check | How | GAP condition |
|-------|-----|---------------|
| **Happy path** | Every step has a story with matching AC | Step in workflow has no story |
| **Error recovery** | What if step N fails? Can user retry? Go back? | No error/retry path in any story |
| **Cancellation** | Can user abort mid-flow? What gets cleaned up? | Multi-step flow with no cancel/abort |
| **Reversal** | Can completed flow be undone? (cancel order, revoke approval) | Irreversible action with no undo story |
| **Timeout/Expiry** | What if user abandons mid-flow? (draft order, pending approval) | Stateful flow with no expiry handling |
| **Parallel access** | What if two users do the same flow simultaneously? | Concurrent edit with no conflict handling story |

**Process**: Extract workflows from PRODUCT.md → for each workflow, trace every step across stories → flag broken links.

### G3. Data Integrity & Consistency

For EVERY piece of data displayed on any screen:

| Check | How | GAP condition |
|-------|-----|---------------|
| **Source exists** | Dashboard shows "total revenue" → which story calculates it? | Aggregated/derived data shown on screen but no story computes it |
| **Update mechanism** | Screen shows "last login" → which story writes it? | Display field with no write source |
| **Stale data handling** | List shows cached data → what triggers refresh? | Screen shows data that can change but no refresh/polling/websocket story |
| **Drill-down target** | Table shows count "45 alerts" → can user click to see list? | Aggregated number displayed but detail view missing |
| **Cross-entity consistency** | Order total = sum of line items — who enforces this? | Derived value with no enforcement story |

**Process**: Read SCREENS.md → for each data element on each screen → trace to the story that writes/calculates it → flag orphan data.

### G4. Role & Permission Completeness

For EVERY role defined in PRODUCT.md or ARCHITECTURE.md:

| Check | How | GAP condition |
|-------|-----|---------------|
| **Role can do its job** | Admin role → can manage users, settings, reports | Role defined but not all capabilities in stories |
| **Role is restricted** | Viewer role → cannot edit, delete, or create | Restriction not enforced in any story's AC |
| **Role transitions** | Can a user's role change? Who changes it? | Roles exist but no role management story |
| **First user problem** | Who creates the first admin? Seed data? Registration? | No story handles initial admin creation |
| **Multi-role user** | Can a user have multiple roles? How resolved? | Multi-role mentioned but resolution undefined |

### G5. Edge Case & Boundary Completeness

For the PRODUCT as a whole (not per-story):

| Check | How | GAP condition |
|-------|-----|---------------|
| **Empty system** | Fresh install — every screen works with zero data? | Story assumes data exists, no empty state flow |
| **First-time user** | New user signs up — what's the onboarding path? | Auth story exists but no onboarding story |
| **Bulk operations** | User has 500 records — can they bulk edit/delete/export? | CRUD stories only handle single items |
| **Search & discovery** | User has 1000+ records — how do they find what they need? | List screens with no search/filter story |
| **Notification gaps** | Important state change (approval, rejection, assignment) — who gets notified? | State transitions exist but no notification story |
| **Audit trail usage** | Audit fields exist (created_by, updated_by) — but can admin VIEW the history? | Audit fields in schema but no audit log screen story |
| **Settings & config** | System has configurable behavior — where does admin configure it? | Business rules reference config values but no settings screen story |
| **Scheduled/recurring** | System has time-based behavior (expiry, reminders, reports) — what triggers it? | Time-dependent logic but no cron/scheduler story |

### G6. Integration & External Dependency Completeness

For EVERY external system or integration in PRODUCT.md/ARCHITECTURE.md:

| Check | How | GAP condition |
|-------|-----|---------------|
| **Connection failure** | External API down → what does our system do? | Integration story has no fallback/retry |
| **Data sync** | External data changes → how does our system know? | One-time import but no sync story |
| **Rate limiting** | External API has rate limits → how do we handle? | Integration story ignores rate limits |
| **Authentication** | External API needs credentials → how managed? | Integration story doesn't cover credential management |

### Phase G Resolution

For each GAP found:

1. **Check PRODUCT.md** — is this feature supposed to exist?
   - YES → missing story. Create new story or expand existing.
   - NOT MENTIONED → present to user: "Bu fonksiyonel eksiklik PRODUCT.md'de yok ama ürünün kullanılabilirliği için gerekli. Ekleyelim mi?"

2. **User approves** → determine action:
   - **Fits in existing PENDING story** → add to that story's AC + update Description
   - **New story needed** → create story file with full spec (A1-A7 compliant), add to ROUTEMAP
   - **PRODUCT.md update needed** → add feature/rule to PRODUCT.md, then create/update story

3. **User rejects** → note in decisions.md: `[DATE] [Phase G] Rejected: [item] — [user's reason]`

**After Phase G resolution**: Re-run Phase A (A1-A7) on any NEW or UPDATED stories to ensure they meet autonomy standards.

---

## Resolution Protocol

### Auto-Fix (update directly, track change)

| Gap Type | Default Fix |
|----------|------------|
| Missing API status codes | Add: 400, 401, 403, 404, 422, 500 |
| Missing audit fields | Add: created_at, updated_at, created_by, updated_by |
| Missing empty/loading/error states | Add enterprise defaults from Step 2 |
| Missing FK cascade | Add: `ON DELETE RESTRICT` (safe default) |
| `should` → obligation | Replace with `MUST` |
| Missing pagination spec | Add: server-side, 50/page, sort by created_at DESC |
| Missing nullable spec | Add: `NOT NULL` (safe default) |
| Missing column default | Add: `NONE` (explicit no default) |
| Missing migration direction | Add: "reversible: up + down" |

### Create New Spec Document (C6 gaps)

When C6 finds a domain concept without adequate spec:

1. **Create** the spec doc under `docs/` (see C6 output file column)
2. **Content**: write comprehensive spec based on ARCHITECTURE.md + PRODUCT.md + stories + decisions.md + WebSearch if needed
3. **Sufficiency test**: "Can Planner embed a section from this directly into a plan?" — if not, expand
4. **Update story references**: add `- Spec: docs/[FILE].md` to each referencing story's Architecture Reference section
5. **Update ARCHITECTURE.md**: add cross-reference to new spec doc in relevant section
6. **Present to user**: show summary of created doc, get confirmation before finalizing
7. **Track**: log in report as "NEW_DOC: docs/[FILE].md — [reason]"

Multiple spec docs may be created in a single audit. This is expected and correct — a complex project (telecom, fintech, IoT) may need 5-10 domain spec documents.

### Needs Decision (present with options)

Format:
```
[Check ID] [Story/Doc] — KARAR GEREKLİ
Gap: [what's missing/ambiguous]
Impact: [Planner/Developer/Gate ne yapamaz]
Seçenekler:
  A) [option with pros]
  B) [option with pros]
  C) [option with pros]
Hangisi?
```

User decides → update doc → move to next gap.

---

## After All Phases Complete

### Re-Verification (MANDATORY)

1. Re-run Phase A7 (Ambiguity Scan) on ALL updated stories → MUST be ZERO matches
2. Re-run Phase B1-B3 on updated cross-story contracts → MUST PASS
3. Re-run Phase E1-E3 on all docs → MUST be ZERO open items

If ANY re-verification fails → fix and re-verify again (max 3 iterations).

### Report

Write to `docs/reports/dev-readiness.md`:

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

## When Complete

- Dev-readiness report at `docs/reports/dev-readiness.md`
- All stories verified for autonomous development
- All cross-story contracts verified consistent
- All architecture specs complete for implementation
- Zero ambiguities in any doc
- Update ROUTEMAP → Step 9 `[x] DONE` with date
- Set `Current phase: PLANNING COMPLETE`
- Announce: "Development Readiness Audit PASSED. Tüm story'ler otonom geliştirme için hazır. 'development phase' de ki başlayalım."
- Next: User triggers development phase → Read `phases/development/dev-cycle.md`

---

## Mid-Project Dev-Readiness Audit

Triggered when user says "dev-readiness", "readiness check", "otonom kontrol", "geliştirme hazırlık" during development phase.

This is NOT the initial Step 9 audit — the project already has DONE stories and active development. The goal is to verify that REMAINING (PENDING/NEEDS_REPLAN) stories are still autonomously developable after changes that occurred during development.

### When to Use

- After a CHANGE analysis added/modified stories
- After Gap Review (Mid-Project Re-Scan) added new stories
- Before starting a new phase (Phase 2, Phase 3, etc.)
- When Planner or Developer escalated due to missing spec
- When user feels docs may have drifted from implementation

### Context (Mid-Project)

Before starting, read:
- `docs/ROUTEMAP.md` — identify DONE vs PENDING stories
- `docs/brainstorming/decisions.md` — development decisions since initial audit
- ALL docs (same as initial audit)
- ALL story files (DONE + PENDING)
- Existing source code (for drift detection)

### Scope Differences from Initial Audit

| Phase | Initial (Step 9) | Mid-Project |
|-------|-------------------|-------------|
| **A: Per-Story** | ALL stories | Only PENDING + NEEDS_REPLAN stories |
| **B: Cross-Story** | ALL stories | DONE→PENDING contracts (does implementation match what PENDING stories expect?) |
| **C: Architecture** | Full check | Delta check — what changed since last audit? New tech introduced? |
| **C6: Domain Specs** | Create from docs | Also check existing spec docs against ACTUAL implementation — has implementation diverged? |
| **D: Design System** | Full check | Delta — new tokens/components introduced during dev that aren't in FRONTEND.md? |
| **E: Decisions** | docs/ only | Also scan code for TODO/FIXME/HACK comments that represent undocumented decisions |
| **F: Bootstrap** | Phase 1 scaffold | SKIP (already bootstrapped) |

### Mid-Project Extra Checks

#### M1. Implementation Drift Detection

For DONE stories, spot-check that implementation matches docs:
- Grep source for API endpoints → compare with ARCHITECTURE.md endpoint list
- Grep source for DB table/column names → compare with story schemas
- Grep source for env vars → compare with CONFIG.md (if exists)
- If drift found → update docs to match implementation (implementation wins post-dev)

#### M2. New Story Completeness

For stories added AFTER initial audit (via CHANGE or Gap Review):
- Run FULL Phase A (all 7 checks) — these stories never went through Step 9
- Run C6 domain check — new stories may reference concepts not yet spec'd

#### M3. Cross-Phase Contract

If auditing before a new phase:
- Verify Phase N-1 DONE stories created everything Phase N PENDING stories expect
- Check: tables, API endpoints, components, services, middleware, config
- Each missing dependency → GAP (either Phase N-1 missed it or Phase N story has wrong assumption)

### Mid-Project Report

Write to `docs/reports/dev-readiness-rescan-YYYY-MM-DD.md`:

```markdown
# Dev-Readiness Re-Scan

> Date: YYYY-MM-DD
> Context: [after CHANGE / before Phase N / user-triggered]
> Stories audited: N PENDING (M DONE skipped)
> Result: PASS / FAIL

## Scope
- PENDING stories checked: [list]
- New stories (post-initial audit): [list]
- DONE stories drift-checked: [list]

## Findings
| # | Check | Story/Doc | Gap | Resolution |
|---|-------|-----------|-----|------------|

## Drift Detected
| # | Area | Doc Says | Code Says | Fix |
|---|------|----------|-----------|-----|

## New Spec Documents Created
| # | Document | Reason | Stories |
|---|----------|--------|--------|

## Summary
- PENDING stories ready: X/Y
- Drift fixes: N
- New docs created: N
- User decisions: N
- **Remaining stories ready for autonomous dev: YES/NO**
```

### Important Rules for Mid-Project

- Do NOT re-audit DONE stories for Phase A (they're already built)
- DO check DONE stories for drift (M1) — docs may need updating
- PENDING stories get FULL Phase A audit (same rigor as initial)
- New stories (never audited) get FULL treatment including C6
- If drift found: implementation wins — update docs, NOT code
- All changes go through user approval — no silent doc updates
- Update `decisions.md` with audit findings
