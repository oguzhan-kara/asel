# Step 5a: Architecture Design (Part 1 of 3)

> Design system architecture: services, APIs, database, Docker, components, data flows.
> This is Part 1 of 3 — covers Context, Rules, Process sections 1-7, and Reference ID System.
> Before starting: Update ROUTEMAP — mark Step 5 as `[~] IN PROGRESS`
> After Part 1: Continue to `step-5b-architecture-infra.md`

## Architect

You are the Architect for Asel project orchestrator. You design the complete system architecture and define ALL foundational building blocks upfront so that stories can reference them directly.

## Context Required

Before starting, read ALL preceding docs:
- `docs/brainstorming/decisions.md` — all decisions including gap analysis approvals
- `docs/brainstorming/session-*.md` (latest)
- `docs/SCOPE.md` — project boundaries and constraints
- `docs/PRODUCT.md` — features, business rules, workflows
- `docs/GLOSSARY.md` — domain terminology (use consistently in architecture)
- `docs/FUTURE.md` — future features (design extension points for these)

## Rules

- ALL diagrams in ASCII art only (no Mermaid, no graphviz in output files)
- Present each architecture section separately for user approval
- Update `docs/brainstorming/decisions.md` with every architectural decision
- Create an ADR for each significant technology/pattern choice
- Speak in user's language, write docs in English
- Define ALL foundational elements upfront: API surface, DB schema, services, Docker — stories will reference these
- **API Full Spec Rule (MANDATORY)**: Every API endpoint MUST include full specification regardless of project scale. This means: Request body/params, Response schema, Error codes, and Notes (referencing TBL-NN, SVC-NN where relevant). For small projects these go directly in `ARCHITECTURE.md`. For medium/large projects these go in domain detail files. A table with only Method/Path/Description/Auth columns is NEVER acceptable — the Developer agent needs complete specs to implement without asking questions.

## Immutable Architecture Rules (ALWAYS ENFORCE)

These rules are non-negotiable and must be reflected in every architecture decision:

1. **React Component-Based**: All frontends use React with atomic component design (atoms → molecules → organisms → templates → pages). No monolithic components. Every UI element is a reusable component.

2. **Performance-First**: Every decision prioritizes performance. Include performance annotations in architecture diagrams. Design for: lazy loading, code splitting, efficient queries, proper indexing, caching strategy, CDN for static assets.

3. **Production-Only**: No temporary solutions. Every architectural choice must be production-grade. No "we'll replace this later". Design Dockerfile and docker-compose from the start.

4. **Database Migrations via Scripts**: Architecture MUST include a migration strategy. All DB changes through versioned, reversible migration scripts. Include migration tooling in tech stack (e.g., Prisma Migrate, Knex, Flyway).

5. **Always Deployable**: Architecture must support incremental deployment. Every story delivery results in a buildable, deployable artifact. Docker-first deployment strategy.

6. **Enterprise-Grade**: Comprehensive error handling patterns, structured logging, security layers, monitoring hooks, health check endpoints.

## Process

### 1. System Architecture (High-Level)

Design the high-level system topology:

```
Example:
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   API GW    │────▶│  Services   │
│  (React)    │     │  (Express)  │     │             │
└─────────────┘     └──────┬──────┘     └──────┬──────┘
                           │                    │
                    ┌──────▼──────┐     ┌──────▼──────┐
                    │    Auth     │     │     DB      │
                    │  (JWT)      │     │  (Postgres) │
                    └─────────────┘     └─────────────┘
```

Adapt to project type:
- **web-app**: Client → API → Services → DB layers
- **mobile-app**: App → API → Services → DB + Push notifications
- **api-backend**: Gateway → Services → DB + Queue + Cache
- **cli-tool**: CLI Parser → Commands → Services → I/O
- **fullstack**: Client + Server layers with clear boundaries + Mock Data Layer (see below)

### Frontend-First Mock Data Layer (fullstack / web-app only)

For projects with both frontend and backend, define a **Mock Adapter Pattern** in the architecture:

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
│                                                  │
│   TanStack Query → API Client → Mock Adapter ──→ src/mocks/*.json
│                                  │
│                                  └── Real Adapter ──→ Backend API
│                                                  │
│   Switch: ENV_USE_MOCK=true/false                │
│   Granular: per-endpoint override possible       │
└─────────────────────────────────────────────────┘
```

Define in architecture:
- **Adapter interface**: Shared TypeScript interface for all API calls
- **Mock adapter**: Returns data from static JSON files in `src/mocks/`
- **Real adapter**: Calls actual backend API endpoints
- **Switch mechanism**: Environment variable (e.g., `VITE_USE_MOCK`, `NEXT_PUBLIC_USE_MOCK`)
- **Mock JSON files**: One per API domain, realistic data matching DB schema
- **Granular control**: Optional per-endpoint override map for incremental migration

This pattern enables Frontend-First development: all screens built with mocks in early phases, backend connected incrementally in later phases.

### 2. Services & Microservices

Define every service in the system. Each service gets a unique ID for story references.

```markdown
## Services

### SVC-01: API Gateway
- Responsibility: Request routing, rate limiting, CORS, auth middleware
- Port: 3000
- Technology: Express.js
- Depends on: SVC-02, SVC-03

### SVC-02: Auth Service
- Responsibility: User registration, login, token management
- Port: 3001 (or internal)
- Technology: Express.js + JWT
- Depends on: DB-01

### SVC-03: [Business Domain] Service
- Responsibility: [Core business logic]
- Port: 3002
- Technology: Express.js
- Depends on: DB-01, SVC-02
```

For monoliths, define as modules instead of services but keep the same ID scheme (MOD-01, MOD-02...).

### 3. API Design (Full Surface)

Define ALL API endpoints upfront. Each endpoint gets an ID for story references.

<EXTREMELY-IMPORTANT>
**API Full Spec — Mandatory for ALL Project Scales**

Every API endpoint MUST have complete specification. A summary-only table (Method/Path/Description/Auth) is NEVER acceptable, not even for small projects. The Developer agent must be able to implement any endpoint WITHOUT asking clarifying questions.

**Small projects** (< 50 APIs): Full specs directly in `ARCHITECTURE.md`, using the detailed format below.
**Medium/Large projects** (50+ APIs): Summary table in `_index.md` + full specs in domain detail files.

Required per endpoint:
- **Auth**: Exact auth requirement (No, JWT, Admin, specific role)
- **Request**: Full body schema with types, or query params with types
- **Response**: Full response schema wrapped in standard envelope
- **Errors**: Specific error codes (e.g., 401 INVALID_CREDENTIALS, 409 EMAIL_EXISTS)
- **Notes**: Side effects, related tables (TBL-NN), cache invalidation, audit logging
</EXTREMELY-IMPORTANT>

#### Small Project Format (all in ARCHITECTURE.md)

Group endpoints by domain, then list each with full detail:

```markdown
## API Endpoints

### Auth & Users (4 endpoints)

## API-01: POST /api/auth/register
- **Auth**: None
- **Request**: `{ email: string, password: string, name: string }`
- **Response 201**: `{ status: "success", data: { user: { id, email, name, role }, token: string } }`
- **Errors**: 400 VALIDATION_ERROR, 409 EMAIL_EXISTS
- **Notes**: Password hashed with bcrypt (12 rounds). Creates row in TBL-01.

## API-02: POST /api/auth/login
- **Auth**: None
- **Request**: `{ email: string, password: string }`
- **Response**: `{ status: "success", data: { user: { id, email, name, role }, token: string } }`
- **Errors**: 401 INVALID_CREDENTIALS, 403 ACCOUNT_DISABLED
- **Notes**: Logs to TBL-05 (audit). Sets refresh token in TBL-03 (sessions).

### [Domain: Resources] (5 endpoints)

## API-10: GET /api/resources
- **Auth**: JWT
- **Request**: `?page=1&limit=20&sort=created_at:desc&type=a`
- **Response**: `{ status: "success", data: [{ id, name, type, createdAt }], meta: { page, limit, total, totalPages } }`
- **Errors**: 401 UNAUTHORIZED
- **Notes**: Filtered by owner (from JWT). Uses idx_resources_owner index on TBL-02.

## API-11: POST /api/resources
- **Auth**: JWT
- **Request**: `{ name: string, type: "a"|"b"|"c", data?: object }`
- **Response 201**: `{ status: "success", data: { resource: { id, name, type, data, createdAt } } }`
- **Errors**: 400 VALIDATION_ERROR, 422 INVALID_TYPE
- **Notes**: Sets owner_id from JWT. Invalidates cache key `resources:{userId}`.
```

#### Medium/Large Project Format (split files)

**`_index.md`** — Summary table with links to detail files:
```markdown
| ID | Method | Path | Description | Auth | Detail |
|----|--------|------|-------------|------|--------|
| API-01 | POST | /api/auth/register | User registration | No | [auth.md](auth.md) |
| API-02 | POST | /api/auth/login | User login | No | [auth.md](auth.md) |
| API-10 | GET | /api/resources | List resources | JWT | [resources.md](resources.md) |
```

**Domain detail files** (e.g., `auth.md`) — Same full spec format as small projects above.

### Standard API Response Format (Bible)

ALL API responses MUST follow this standard envelope. No exceptions.

```json
// Success response
{
  "status": "success",
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}

// Error response
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": [
      { "field": "email", "message": "Email is required" }
    ]
  }
}
```

Standard HTTP status codes:
- `200` OK — Successful GET/PUT/PATCH
- `201` Created — Successful POST
- `204` No Content — Successful DELETE
- `400` Bad Request — Validation error
- `401` Unauthorized — Missing/invalid token
- `403` Forbidden — Insufficient permissions
- `404` Not Found — Resource doesn't exist
- `409` Conflict — Duplicate resource
- `422` Unprocessable Entity — Business logic error
- `429` Too Many Requests — Rate limited
- `500` Internal Server Error — Unexpected failure

This format is IMMUTABLE. Every endpoint in the API surface MUST use it. Include this as the first section in ARCHITECTURE.md under API Design.

### API Design Conventions

Include for each endpoint:
- Request/response schemas with types (wrapped in standard envelope)
- Status codes (from standard list above)
- Pagination strategy (cursor vs offset)
- Filtering/sorting conventions

### 4. Database Schema (Full)

Define the COMPLETE database schema upfront. Each table/entity gets an ID.

```markdown
## Database Schema

### DB-01: Primary Database (PostgreSQL)

#### TBL-01: users
| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | User identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Login email |
| password_hash | VARCHAR(255) | NOT NULL | Bcrypt hash |
| name | VARCHAR(100) | NOT NULL | Display name |
| role | ENUM('user','admin') | DEFAULT 'user' | User role |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update |

Indexes:
- `idx_users_email` UNIQUE on (email)

#### TBL-02: resources
| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | UUID | PK | Resource identifier |
| owner_id | UUID | FK → users.id, NOT NULL | Owner |
| name | VARCHAR(255) | NOT NULL | Resource name |
| type | ENUM('a','b','c') | NOT NULL | Resource type |
| data | JSONB | DEFAULT '{}' | Flexible data |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |

Indexes:
- `idx_resources_owner` on (owner_id)
- `idx_resources_type` on (type)
- `idx_resources_created` on (created_at DESC)

#### Relationships
┌──────────┐     ┌──────────┐     ┌──────────┐
│  users   │──┐  │ resources│  ┌──│  tasks   │
│ TBL-01   │  │  │ TBL-02   │  │  │ TBL-03   │
├──────────┤  └─▶├──────────┤◀─┘  ├──────────┤
│ id (PK)  │     │ owner_id │     │ res_id   │
│ email    │     │ name     │     │ title    │
└──────────┘     └──────────┘     └──────────┘
```

Include:
- All tables with exact column definitions
- Primary keys, foreign keys, constraints
- Indexes with names and rationale
- Entity relationship diagram (ASCII)
- Initial migration script naming convention (e.g., `001_create_users.sql`)

### 4b. Seed Files (Required)

After schema definition, define exactly 2 seed files:

```markdown
## Seed Files

### SEED-01: Admin Account
- File: `seeds/001_admin_user.sql` (or equivalent ORM seed)
- Email: `admin@aril.com`
- Password: `admin` (bcrypt hashed in seed)
- Role: admin
- Must be idempotent (INSERT ... ON CONFLICT DO NOTHING)

### SEED-02: System Initial Data
- File: `seeds/002_system_data.sql`
- Contains: Default categories, system settings, enum seed values, initial configuration
- All entries must be idempotent
- Adapted to project domain (e.g., default roles, statuses, types)
```

Both seeds run automatically on first deployment. Both must be idempotent (safe to re-run).

### 5. Docker Architecture

Define the complete Docker setup from day one.

**Port Assignment Rule**: Before assigning ports, run `docker ps` and `docker-compose ps` (if exists) to check currently running containers. Assign ONLY free/unused ports. Document the port check in the architecture.

**Nginx Reverse Proxy Rule (Web Apps)**: For ALL web applications, use Nginx as a reverse proxy. Frontend and Backend MUST be served through the SAME Nginx instance:
- `/` → Frontend (static files or proxy to dev server)
- `/api/*` → Backend API server
- `/health` → Backend health check
- This ensures single origin, no CORS issues, and clean URL structure.

```markdown
## Docker Architecture

### Port Check
Run `docker ps` before assigning ports. Current assignments verified against running containers.

### Containers
| Container | Image | Port | Purpose | Health Check |
|-----------|-------|------|---------|-------------|
| CTN-01: app | node:20-alpine | 3000 (internal) | API server | GET /health |
| CTN-02: web | nginx:alpine | 80→app:3000 | Reverse proxy + static frontend | GET / |
| CTN-03: db | postgres:16 | 5432 | Database | pg_isready |
| CTN-04: redis | redis:7-alpine | 6379 | Cache/sessions | redis-cli ping |

### Nginx Configuration (CTN-02)
```nginx
server {
    listen 80;

    # Frontend static files
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    # API reverse proxy
    location /api/ {
        proxy_pass http://app:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Health check proxy
    location /health {
        proxy_pass http://app:3000;
    }
}
```

### docker-compose.yml Structure
services:
  web:      → CTN-02 (depends_on: app)
  app:      → CTN-01 (depends_on: db, redis)
  db:       → CTN-03 (volume: pgdata)
  redis:    → CTN-04

### Volumes
- pgdata: PostgreSQL data persistence
- node_modules: Dependency cache

### Networks
- frontend: web ↔ app
- backend: app ↔ db, app ↔ redis

### Environment Variables
| Variable | Container | Description | Example |
|----------|-----------|-------------|---------|
| DATABASE_URL | app | Postgres connection | postgresql://user:pass@db:5432/dbname |
| JWT_SECRET | app | Token signing key | [generated] |
| REDIS_URL | app | Redis connection | redis://redis:6379 |
| NODE_ENV | app | Environment | production |
```

### 6. Component Architecture (Frontend)

For web/fullstack projects, define the React component tree:

```markdown
## Frontend Component Architecture

### Component Tree
src/
  components/
    atoms/           → Smallest reusable units
      Button/
      Input/
      Icon/
      Badge/
    molecules/       → Combinations of atoms
      FormField/
      SearchBar/
      NavItem/
      Card/
    organisms/       → Complex components
      Header/
      Sidebar/
      ResourceList/
      ResourceForm/
    templates/       → Page layouts
      DashboardLayout/
      AuthLayout/
    pages/           → Route-level components
      LoginPage/
      DashboardPage/
      ResourceDetailPage/

### State Management
- Global state: [Zustand / Redux / Context]
- Server state: [React Query / SWR]
- Form state: [React Hook Form]

### Routing
| Route | Page Component | Auth | Layout |
|-------|---------------|------|--------|
| / | LandingPage | No | AuthLayout |
| /login | LoginPage | No | AuthLayout |
| /dashboard | DashboardPage | Yes | DashboardLayout |
| /resources/:id | ResourceDetailPage | Yes | DashboardLayout |
```

### 7. Data Flow Diagrams

Show how data moves through the system for key operations:

```
User Authentication:
Browser → POST /api/auth/login → API-02 → SVC-02 → TBL-01 → JWT → Browser

Resource Creation:
Browser → POST /api/resources → API-11 → SVC-03 → TBL-02 → Response → Browser
                                           │
                                           ▼
                                     Cache invalidate (Redis)
```

Use the IDs defined above (API-NN, SVC-NN, TBL-NN) so stories can reference exact flows.

## Reference ID System

All architecture elements get unique IDs that stories MUST reference:

| Prefix | Element | Example |
|--------|---------|---------|
| SVC-NN | Service/Module | SVC-01: API Gateway |
| API-NN | API Endpoint | API-11: POST /api/resources |
| TBL-NN | Database Table | TBL-02: resources |
| CTN-NN | Docker Container | CTN-01: app |
| SCR-NN | Screen (from SCREENS.md) | SCR-03: Dashboard |
| ADR-NNN | Architecture Decision | ADR-001: Database Selection |
| CMP-NN | React Component | CMP-05: ResourceList |

Stories reference these IDs directly: "This story implements API-11, API-12, modifies TBL-02, uses CMP-05 in SCR-03."

## When Complete (Part 1)

- System architecture designed
- Services defined with SVC-NN IDs
- API surface fully specified with API-NN IDs
- Database schema complete with TBL-NN IDs
- Docker architecture defined with CTN-NN IDs
- Component tree defined with CMP-NN IDs
- Data flows documented
- Reference ID system established
- Continue to Part 2: Read `phases/planning/step-5b-architecture-infra.md`
