# Environment Configuration

All sensitive configuration MUST be managed through environment variables. No exceptions.

## File Structure

| File | In Git | Purpose |
|------|--------|---------|
| `.env.example` | YES | Template with placeholder values, all required vars documented |
| `.env` | NO (.gitignore) | Actual values for local development |
| `.env.test` | NO (.gitignore) | Test-specific overrides (if needed) |

## Rules

- **`.env.example` MUST exist** in every project root — it's the documentation for required env vars
- **`.env` MUST be in `.gitignore`** — never commit real credentials
- **Every env var in code MUST be in `.env.example`** — if code reads `process.env.FOO`, `.env.example` must have `FOO=`
- **Placeholder values in `.env.example`** — use descriptive placeholders, not real values:
  - `DATABASE_URL=postgresql://user:password@localhost:5432/dbname`
  - `JWT_SECRET=change-me-to-a-random-secret`
  - `API_KEY=your-api-key-here`
- **NEVER hardcode secrets in source** — no API keys, passwords, tokens in code files
- **Docker Compose** uses `.env` automatically — reference vars with `${VAR_NAME}`

## Required Variables (common across projects)

| Variable | Purpose | Example |
|----------|---------|---------|
| `NODE_ENV` | Environment | `development` / `production` |
| `DATABASE_URL` | DB connection | `postgresql://...` |
| `REDIS_URL` | Redis connection | `redis://localhost:6379` |
| `JWT_SECRET` | Token signing | Random 256-bit string |
| `ENCRYPTION_KEY` | Data encryption | Random 256-bit string |
| `PORT` | Server port | `3000` |

## Naming Convention

- UPPER_SNAKE_CASE: `DATABASE_URL`, `JWT_SECRET`
- Prefix by service for multi-service: `POSTGRES_USER`, `REDIS_PORT`
- Boolean vars: `ENABLE_*`, `DISABLE_*` (not `IS_*`)
