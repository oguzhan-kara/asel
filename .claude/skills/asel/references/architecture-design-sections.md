# Architecture design sections (reference for step-5a-architecture-design.md)

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

````markdown
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
````

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

