# Architecture: [Project Name]

## System Overview

[1-2 paragraph description of the system architecture approach]

```
[ASCII system architecture diagram with service IDs]

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  CTN-02     │────▶│  CTN-01     │────▶│  CTN-03     │
│  web        │     │  app        │     │  db         │
│  (Nginx)    │     │  (Node)     │     │  (Postgres) │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────▼──────┐
                    │  CTN-04     │
                    │  redis      │
                    └─────────────┘
```

## Technology Stack

| Layer | Technology | Rationale | ADR |
|-------|-----------|-----------|-----|
| Frontend | [e.g., React + TypeScript] | [Why] | ADR-001 |
| Backend | [e.g., Node.js + Express] | [Why] | ADR-002 |
| Database | [e.g., PostgreSQL] | [Why] | ADR-003 |
| Cache | [e.g., Redis] | [Why] | ADR-004 |
| Auth | [e.g., JWT] | [Why] | ADR-005 |
| ORM/Query | [e.g., Prisma] | [Why] | ADR-006 |
| Migration | [e.g., Prisma Migrate] | [Why] | — |
| Hosting | [e.g., Docker Compose] | [Why] | — |

## Services

### SVC-01: [Service Name]
- **Responsibility**: [What it does]
- **Port**: [Port number]
- **Technology**: [Stack]
- **Depends on**: [Other services]
- **Health check**: [Endpoint]

### SVC-02: [Service Name]
...

## API Design

### Reference ID Convention
All endpoints use `API-NN` IDs for story references.

<!-- IMPORTANT: Every endpoint MUST have full spec (Auth, Request, Response, Errors, Notes).
     Small projects: full specs inline below.
     Medium/Large projects: summary _index.md + domain detail files. -->

### Authentication (N endpoints)

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
- **Notes**: Sets refresh token in TBL-03 (sessions). Logs to TBL-05 (audit).

### [Domain Resources] (N endpoints)

## API-10: GET /api/resources
- **Auth**: JWT
- **Request**: `?page=1&limit=20&sort=created_at:desc`
- **Response**: `{ status: "success", data: [{ id, name, type, createdAt }], meta: { page, limit, total, totalPages } }`
- **Errors**: 401 UNAUTHORIZED
- **Notes**: Filtered by owner (from JWT). Uses idx_resources_owner on TBL-02.

### System

## API-99: GET /health
- **Auth**: None
- **Request**: —
- **Response**: `{ status: "success", data: { uptime, version, db: "ok", redis: "ok" } }`
- **Errors**: 503 SERVICE_UNAVAILABLE (if DB or Redis down)
- **Notes**: Used by Docker health check and monitoring.

### Standard API Response Format (Bible)

```json
// Success
{ "status": "success", "data": { ... }, "meta": { "page", "limit", "total", "totalPages" } }

// Error
{ "status": "error", "error": { "code": "UPPER_SNAKE_CASE", "message": "...", "details?": [] } }
```

Standard status codes: 200 OK | 201 Created | 204 No Content | 400 Bad Request | 401 Unauthorized | 403 Forbidden | 404 Not Found | 409 Conflict | 422 Unprocessable | 429 Rate Limited | 500 Internal Error

### API Conventions
- Pagination: [cursor/offset based]
- Date format: ISO 8601
- ID format: UUID v4

## Database Schema

### DB-01: Primary Database (PostgreSQL)

#### TBL-01: [table_name]
| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Identifier |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update |

Indexes:
- `idx_[table]_[column]` on ([column])

#### TBL-02: [table_name]
...

#### Entity Relationships
```
[ASCII ER diagram with table IDs]

┌──────────┐     ┌──────────┐
│ TBL-01   │──┐  │ TBL-02   │
│ users    │  └─▶│ resources │
├──────────┤     ├──────────┤
│ id (PK)  │     │ owner_id │
└──────────┘     └──────────┘
```

### Migration Strategy
- Tool: [e.g., Prisma Migrate]
- Naming: `NNN_description.sql` (sequential)
- Location: `migrations/` or `prisma/migrations/`
- Rollback: Every migration has up + down
- Initial migration: `001_initial_schema.sql`

### Seed Files

#### SEED-01: Admin Account
- File: `seeds/001_admin_user.sql`
- Email: `admin@example.com`
- Password: `admin` (bcrypt hashed)
- Role: admin
- Idempotent: INSERT ... ON CONFLICT DO NOTHING

#### SEED-02: System Initial Data
- File: `seeds/002_system_data.sql`
- Contains: [Default categories, system settings, initial configuration]
- Idempotent: All entries safe to re-run
- Run order: After SEED-01

## Docker Architecture

### Containers
| ID | Container | Image | Port | Purpose | Health Check |
|----|-----------|-------|------|---------|-------------|
| CTN-01 | app | node:20-alpine | 3000 | API server | GET /health |
| CTN-02 | web | nginx:alpine | 80 | Frontend + proxy | GET / |
| CTN-03 | db | postgres:16 | 5432 | Database | pg_isready |
| CTN-04 | redis | redis:7-alpine | 6379 | Cache | redis-cli ping |

### Nginx Configuration (CTN-02)
```nginx
server {
    listen 80;
    location / { root /usr/share/nginx/html; try_files $uri $uri/ /index.html; }
    location /api/ { proxy_pass http://app:3000; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; }
    location /health { proxy_pass http://app:3000; }
}
```

### docker-compose Structure
```yaml
services:
  web:    # CTN-02 → depends_on: app
  app:    # CTN-01 → depends_on: db, redis
  db:     # CTN-03 → volume: pgdata, config: infra/postgres/postgresql.conf
  redis:  # CTN-04 → config: infra/redis/redis.conf
```

### Infrastructure Config (infra/ directory)
```
infra/
├── docker/              ← Dockerfiles only
│   ├── Dockerfile.api
│   └── Dockerfile.web
├── postgres/            ← postgresql.conf, init.sql
├── redis/               ← redis.conf
├── nginx/               ← nginx.conf
├── [service]/           ← Per-service config files
```

All service tuning via config files mounted as read-only volumes. No inline tuning in docker-compose.yml.

### Volumes
- `pgdata`: PostgreSQL data persistence

### Networks
- `frontend`: web ↔ app
- `backend`: app ↔ db, app ↔ redis

### Environment Variables
| Variable | Container | Description | Example |
|----------|-----------|-------------|---------|
| DATABASE_URL | app | DB connection | postgresql://... |
| JWT_SECRET | app | Token key | [generated] |
| NODE_ENV | app | Environment | production |

## Mock Data Layer (Frontend-First projects only)

### Adapter Pattern
```typescript
// Shared interface — both mock and real adapters implement this
interface ApiAdapter {
  get<T>(path: string, params?: Record<string, unknown>): Promise<T>
  post<T>(path: string, body: unknown): Promise<T>
  put<T>(path: string, body: unknown): Promise<T>
  delete<T>(path: string): Promise<T>
}
```

### Mock File Structure
```
src/mocks/
├── auth.json          # Login/register responses
├── users.json         # User CRUD responses
├── dashboard.json     # Dashboard aggregated data
└── [domain].json      # Per-domain mock data
```

### Switch Mechanism
```
ENV_USE_MOCK=true       → All endpoints use mock adapter
ENV_USE_MOCK=false      → All endpoints use real adapter
```

Per-endpoint override (optional, for incremental migration):
```typescript
const overrides: Record<string, 'mock' | 'real'> = {
  '/api/users': 'real',     // Already implemented
  '/api/dashboard': 'mock', // Still mock
}
```

### Mock → Real Migration
When a backend story implements an API endpoint:
1. Wire real adapter for that endpoint
2. Delete corresponding mock JSON (or entries)
3. Update override map if using granular control
4. Verify screen works with real data

## Frontend Component Architecture

### Component Tree (Atomic Design)
```
src/
  components/
    atoms/           → CMP-01..09
    molecules/       → CMP-10..19
    organisms/       → CMP-20..29
    templates/       → CMP-30..34
    pages/           → CMP-40..49
```

### Component Registry
| ID | Component | Type | Location |
|----|-----------|------|----------|
| CMP-01 | Button | atom | components/atoms/Button |
| CMP-10 | SearchBar | molecule | components/molecules/SearchBar |
| CMP-20 | Header | organism | components/organisms/Header |

### State Management
- Global: [Zustand/Redux/Context]
- Server: [React Query/SWR]
- Forms: [React Hook Form]

### Routing
| Route | Page | Auth | Layout |
|-------|------|------|--------|
| / | LandingPage | No | AuthLayout |
| /dashboard | DashboardPage | Yes | DashboardLayout |

## Data Flows

### [Flow 1: Authentication]
```
Browser → API-02 → SVC-01 → SVC-02 → TBL-01 → JWT → Browser
```

### [Flow 2: Core Operation]
```
Browser → API-11 → SVC-01 → SVC-03 → TBL-02 → Cache → Response
```

## User Journeys

### [Journey 1]
```
[ASCII journey referencing SCR-NN and API-NN IDs]
```

## Security Architecture

- **Authentication**: [JWT strategy]
- **Authorization**: [RBAC model]
- **Input Validation**: [Strategy]
- **CORS**: [Policy]
- **Rate Limiting**: [Rules]

## Performance Architecture

- **Caching**: [Strategy, TTLs]
- **CDN**: [Static asset delivery]
- **DB Optimization**: [Indexing strategy, query patterns]
- **Frontend**: [Code splitting, lazy loading, memoization]
- **API**: [Pagination, compression, field selection]

## Conventions

### Naming
- Files: [convention]
- Components: PascalCase
- API routes: kebab-case
- DB tables: snake_case
- DB columns: snake_case

### Project Structure
```
[ASCII directory tree]
```

## Reference ID Registry

| Prefix | Range | Element |
|--------|-------|---------|
| SVC-NN | 01-99 | Services/Modules |
| API-NN | 01-99 | API Endpoints |
| TBL-NN | 01-99 | Database Tables |
| CTN-NN | 01-99 | Docker Containers |
| CMP-NN | 01-99 | React Components |
| SCR-NN | 01-99 | Screens (in SCREENS.md) |
| ADR-NNN | 001-999 | Architecture Decisions |

## ADR References

- ADR-001: [Title] — [Brief summary]
- ADR-002: [Title] — [Brief summary]
