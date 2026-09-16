# Dev-readiness audit Phase A-C (reference for step-9-dev-readiness.md)

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

