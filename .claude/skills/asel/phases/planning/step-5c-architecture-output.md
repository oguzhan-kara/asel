# Step 5c: Architecture Output (Part 3 of 3)

> README, Makefile, config files, CLAUDE.md, project skills, scale-adaptive structure, output files.
> This is Part 3 of 3 — covers Process sections 13-17, Scale-Adaptive Structure, and Output Files.
> Before starting: Ensure Part 2 (step-5b) is complete.
> After completion: Update ROUTEMAP — mark Step 5 as `[x] DONE` with date

## Process (continued from Part 2)

### 13. README.md Generation

After architecture design is complete, generate a project `README.md` at the project root:

```markdown
# [Project Name]

[1-2 sentence description]

## Tech Stack
[Key technologies from architecture]

## Prerequisites
- Node.js 20+
- Docker & Docker Compose
- [Other requirements]

## Quick Start
```bash
git clone [repo-url]
cd [project]
cp .env.example .env
make install
make up
make migrate
make seed
make help
```

## Project Structure
[Key directories from architecture]

## API Documentation
[Brief summary with link to full docs]

## Development
[How to run locally, run tests, etc.]

## Deployment
[Docker deployment instructions]
```

Adapt sections to actual project stack and structure.

### 14. Makefile Generation

Generate a `Makefile` at the project root. Default target MUST be `help`. Adapt targets to actual project stack. Follow the **nar-hr pattern** — categorized help, section headers, echo feedback, safety checks.

```makefile
# [Project Name] Makefile

-include .env
export

.PHONY: help up down restart status logs build build-fresh deploy-dev deploy-prod \
        infra-up infra-down db-migrate db-backup db-restore db-console db-reset \
        test test-watch test-coverage lint lint-fix typecheck \
        clean docker-clean dev start stop backup

help:
	@echo ""
	@echo "  [Project Name] - Komutlar"
	@echo "  =========================="
	@echo ""
	@echo "  Servisler:"
	@echo "    make up              Tum servisleri baslat"
	@echo "    make down            Tum servisleri durdur"
	@echo "    make restart         Servisleri yeniden baslat"
	@echo "    make status          Servis durumlarini goster"
	@echo "    make logs            Loglari goster (SERVICE=backend)"
	@echo ""
	@echo "  Infra:"
	@echo "    make infra-up        Sadece altyapi (postgres, redis)"
	@echo "    make infra-down      Sadece altyapiyi durdur"
	@echo ""
	@echo "  Build & Deploy:"
	@echo "    make build           Docker image build"
	@echo "    make build-fresh     Build (cache'siz)"
	@echo "    make deploy-dev      Dev ortami deploy (build + up)"
	@echo "    make deploy-prod     Prod deploy (backup + build + up)"
	@echo ""
	@echo "  Veritabani:"
	@echo "    make db-migrate      Migration'lari uygula"
	@echo "    make db-backup       Veritabani yedegi al"
	@echo "    make db-restore      Yedekten geri yukle (BACKUP=dosya)"
	@echo "    make db-console      DB konsolu ac"
	@echo "    make db-reset        Veritabanini sifirla (DIKKAT)"
	@echo ""
	@echo "  Kalite:"
	@echo "    make test            Testleri calistir"
	@echo "    make test-watch      Testleri watch modunda calistir"
	@echo "    make test-coverage   Test coverage raporu"
	@echo "    make lint            Lint kontrolu"
	@echo "    make lint-fix        Lint otomatik duzeltme"
	@echo "    make typecheck       TypeScript tip kontrolu"
	@echo ""
	@echo "  Temizlik:"
	@echo "    make clean           Build artifact'larini temizle"
	@echo "    make docker-clean    Docker volume ve image'lari sil"
	@echo ""
	@echo "  Kisayollar:"
	@echo "    make dev = deploy-dev    make start = up"
	@echo "    make stop = down         make backup = db-backup"
	@echo ""

# ── Servis komutlari ──

up:
	@echo "[Project] baslatiliyor..."
	@docker compose up -d
	@echo "Baslatildi: http://localhost:[port]"

down:
	@echo "[Project] durduruluyor..."
	@docker compose down
	@echo "Durduruldu."

restart:
	@echo "[Project] yeniden baslatiliyor..."
	@docker compose down
	@docker compose up -d
	@echo "Yeniden baslatildi."

status:
	@docker compose ps

logs:
	@docker compose logs -f $(SERVICE)

# ── Altyapi ──

infra-up:
	@echo "Altyapi baslatiliyor..."
	@docker compose up -d postgres redis
	@echo "Altyapi hazir."

infra-down:
	@echo "Altyapi durduruluyor..."
	@docker compose stop postgres redis
	@echo "Altyapi durduruldu."

# ── Build & Deploy ──

build:
	@echo "Docker image'lar build ediliyor..."
	@docker compose build
	@echo "Build tamamlandi."

build-fresh:
	@echo "Docker image'lar sifirdan build ediliyor..."
	@docker compose build --no-cache
	@echo "Fresh build tamamlandi."

deploy-dev: build up
	@echo "Dev ortami deploy edildi."

deploy-prod:
	@read -p "PROD deploy yapilacak. Emin misiniz? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	@echo "Prod deploy baslatiliyor..."
	@$(MAKE) db-backup
	@$(MAKE) build
	@$(MAKE) up
	@echo "Prod deploy tamamlandi."

# ── Veritabani ──

db-migrate:
	@echo "Migration'lar uygulanıyor..."
	@docker compose exec app npm run migrate
	@echo "Migration'lar tamamlandi."

db-backup:
	@echo "Veritabani yedekleniyor..."
	@mkdir -p backups
	@docker compose exec -T postgres pg_dump -U $${POSTGRES_USER:-postgres} $${POSTGRES_DB:-app} > backups/backup-$$(date +%Y%m%d-%H%M%S).sql
	@echo "Yedekleme tamamlandi."

db-restore:
	@test -n "$(BACKUP)" || (echo "Kullanim: make db-restore BACKUP=backups/dosya.sql" && exit 1)
	@read -p "Veritabani $(BACKUP) dosyasindan geri yuklenecek. Emin misiniz? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	@echo "Veritabani geri yukleniyor..."
	@docker compose exec -T postgres psql -U $${POSTGRES_USER:-postgres} $${POSTGRES_DB:-app} < $(BACKUP)
	@echo "Geri yukleme tamamlandi."

db-console:
	@docker compose exec postgres psql -U $${POSTGRES_USER:-postgres} $${POSTGRES_DB:-app}

db-reset:
	@read -p "DIKKAT: Veritabani tamamen sifirlanacak. Emin misiniz? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	@echo "Veritabani sifirlaniyor..."
	@docker compose exec app npm run migrate:reset
	@docker compose exec app npm run seed
	@echo "Veritabani sifirlandi."

# ── Kalite ──

test:
	@echo "Testler calistiriliyor..."
	@npm test
	@echo "Testler tamamlandi."

test-watch:
	@npm run test:watch

test-coverage:
	@echo "Coverage raporu olusturuluyor..."
	@npm run test:coverage

lint:
	@npm run lint

lint-fix:
	@npm run lint:fix

typecheck:
	@npm run typecheck

# ── Temizlik ──

clean:
	@echo "Build artifact'lari temizleniyor..."
	@rm -rf dist/ build/ .next/
	@echo "Temizlendi."

docker-clean:
	@read -p "Docker volume ve image'lar silinecek. Emin misiniz? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	@echo "Docker temizleniyor..."
	@docker compose down -v --rmi local
	@echo "Docker temizlendi."

# ── Kisayollar ──

dev: deploy-dev
start: up
stop: down
backup: db-backup
```

**Makefile Generation Rules:**
- Section header'lari ZORUNLU: `# ── [Section] ──` format
- Her target'ta `@echo` ile kullanici feedback'i (ne yapiliyor, ne oldu)
- Destructive operasyonlarda `read -p` onay: `db-reset`, `db-restore`, `docker-clean`, `deploy-prod`
- `deploy-prod` otomatik backup yapar (make db-backup)
- `docker compose` kullan (`docker-compose` DEGIL — v2 syntax)
- Help: manual `@echo` (grep tabanli help YASAK)
- Kisayollar section'i en sonda
- `-include .env` + `export` en basta
- Adapt targets to actual project stack:
  - If using Prisma: `db-migrate` → `npx prisma migrate deploy`, seed → `npx prisma db seed`
  - If using Knex: adjust migration commands accordingly
  - If project has no DB → omit Veritabani section
  - Add project-specific prod targets as needed
  - Infra services adapt to actual docker-compose services (postgres, redis, etc.)

### 15. Project Config Files

Generate these project root files:

**`.gitignore`** — Adapt to stack:
```
node_modules/
dist/
build/
.next/
.env
.env.local
*.log
.DS_Store
coverage/
.nyc_output/
```

**`.env.example`** — Document ALL env vars from architecture with placeholder values:
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Authentication
JWT_SECRET=change-me-to-random-secret
JWT_EXPIRY=24h

# Redis
REDIS_URL=redis://localhost:6379

# App
NODE_ENV=development
PORT=3000
```

### 16. CLAUDE.md Generation

Generate a project-level `CLAUDE.md` for Claude Code context preservation:

```markdown
# CLAUDE.md - [Project Name]

## Project Overview
[1-2 sentences from architecture]

## Tech Stack
[Key technologies]

## Development
- Run `/asel` to start or continue any development work — it manages planning, implementation, quality gates, and deployment.

## Quick Commands
- `make help` — Show all available commands
- `make up` — Start Docker services
- `make down` — Stop Docker services
- `make test` — Run tests
- `make migrate` — Run DB migrations
- `make seed` — Seed database

## Docker Services
| Service | URL | Purpose |
|---------|-----|---------|
| Web (Nginx) | http://localhost:[port] | Frontend + API proxy |
| API | Internal :3000 | Backend API |
| DB | localhost:[port] | PostgreSQL |
| Redis | localhost:[port] | Cache |

## Admin Access
- URL: http://localhost:[port]/login
- Email: admin@aril.com
- Password: admin

## Project Structure
[Key directories]

## Conventions
- API responses: Standard envelope `{ status, data, meta? }`
- Components: Atomic design (atoms/molecules/organisms/templates/pages)
- Migrations: Sequential numbered scripts in migrations/
- Naming: Components=PascalCase, routes=kebab-case, DB=snake_case

## Architecture Docs
- `docs/ARCHITECTURE.md` — Full system design
- `docs/PRODUCT.md` — Business rules
- `docs/ROUTEMAP.md` — Project progress
- `docs/stories/` — Individual story specs

## Notifications
- Telegram Bot Token: <telegram-bot-token>
- Telegram Chat ID: <telegram-chat-id>
```

Adapt to actual project details.

### 17. Project-Specific Skill Detection

After architecture is complete, analyze the design for repetitive patterns that would benefit from project-specific skills.

**Pattern Detection Checklist:**

| Pattern | Signal | Skill Type |
|---------|--------|------------|
| 5+ similar CRUD endpoints | API surface has repeating REST patterns | `crud-scaffolder` |
| 5+ similar React pages (list/detail/form) | Component tree has repeating page structures | `page-generator` |
| Complex domain validation rules | Business rules that need consistent enforcement | `domain-validator` |
| Custom DB migration pattern | Multi-DB, ClickHouse, or non-standard migrations | `migration-generator` |
| Repetitive test structure | All tests follow same AAA pattern with same setup | `test-scaffolder` |
| Custom deployment steps | Non-standard Docker, multi-stage, or cloud-specific | `deploy-helper` |
| Data transformation pipelines | ETL, import/export with consistent format | `pipeline-generator` |

**Process:**

1. Review the completed architecture for repeating patterns
2. For each detected pattern, propose a skill:
   ```
   Detected: 12 CRUD endpoint (API-01 through API-12), all follow same pattern
   Proposed: crud-scaffolder skill
   What it does: Given entity name + fields → generates route, controller, service, model, migration, test
   ```
3. Present proposals to user — user approves which ones to create
4. For each approved skill, create `[project-root]/.claude/skills/[skill-name]/SKILL.md`

**Project Skill Structure:**

```markdown
---
name: [skill-name]
description: Project-specific skill for [project]. [What it does].
---

# [Skill Name]

## Purpose
[What pattern this automates]

## Input
[What the user provides — entity name, fields, etc.]

## Output
[What files/code gets generated]

## Template
[The actual pattern to follow, with placeholders]

## Architecture References
[Which SVC-NN, API-NN, TBL-NN patterns this follows]

## Usage Example
User: "Create CRUD for Product entity with name, price, category"
→ Generates: route, controller, service, model, migration, tests
```

**Rules:**
- Only propose skills for patterns that repeat 5+ times
- Skills reference architecture components (SVC-NN, API-NN, etc.)
- Skills must produce code that follows ALL Immutable Architecture Rules
- If no repetitive patterns detected, skip this step (not every project needs custom skills)
- Document created skills in ARCHITECTURE.md under a "Project Skills" section

## Scale-Adaptive File Structure

<EXTREMELY-IMPORTANT>
Detect project scale and split architecture files accordingly. Single monolithic files become unmanageable for Claude Code at scale.
</EXTREMELY-IMPORTANT>

### Scale Detection

| Scale | Threshold | Approach |
|-------|-----------|----------|
| **Small** | < 50 APIs, < 30 tables, < 10 flows | Single `ARCHITECTURE.md` |
| **Medium** | 50-200 APIs, 30-100 tables | Domain-based split |
| **Large** | 200+ APIs, 100+ tables | Domain + sub-domain split |

### Split Structure (Medium/Large)

When splitting, `ARCHITECTURE.md` becomes an index/summary. Details go to domain files:

```
docs/
├── ARCHITECTURE.md              ← summary, general decisions, tech stack
├── architecture/
│   ├── api/
│   │   ├── _index.md            ← API-NNN | name | method | path (one-line each)
│   │   ├── user-management.md   ← full API specs for this domain
│   │   ├── billing.md
│   │   └── reporting.md
│   ├── db/
│   │   ├── _index.md            ← TBL-NNN | name | key relationships
│   │   ├── user-tables.md
│   │   └── billing-tables.md
│   ├── services/
│   │   ├── _index.md            ← SVC-NNN | name | responsibility
│   │   └── ...
│   ├── flows/
│   │   ├── _index.md            ← FLW-NNN | name | trigger
│   │   ├── data-ingestion.md
│   │   └── payment-processing.md
│   └── journeys/
│       ├── _index.md            ← JRN-NNN | persona | flow summary
│       ├── new-user-onboarding.md
│       └── admin-reporting.md
```

**Index files** contain one-line summaries — lightweight and scannable.
**Domain files** contain full specs — loaded only when needed.

### Extension Points for FUTURE.md

When designing architecture, check `docs/FUTURE.md` and ensure:
- Database schema has room for future features (nullable columns, junction tables, JSONB flexibility)
- API design allows versioning and extension
- Component architecture supports lazy-loaded future modules
- Service boundaries account for future integrations
- Document extension points in ARCHITECTURE.md under a "## Extension Points" section

## ARCHITECTURE.md Template

Use the template from `templates/ARCHITECTURE.template.md` as the base structure. The template is located in the asel skill directory at `~/{{aselRoot}}/templates/ARCHITECTURE.template.md`.

## Output Files

- `docs/ARCHITECTURE.md` — Full architecture document with ALL sections above
- `docs/adrs/ADR-001-*.md` through `ADR-NNN-*.md` — One per decision
- `README.md` — Project README at root (generated after architecture is finalized)
- `Makefile` — Project Makefile at root (help as default target)
- `.gitignore` — Git ignore rules adapted to stack
- `.env.example` — Environment variable template with placeholders
- `CLAUDE.md` — Project context for Claude Code (includes Docker URLs, admin credentials, conventions)
- `.claude/skills/*/SKILL.md` — Project-specific skills (if patterns detected)
- Update `docs/brainstorming/decisions.md`

## When Complete

- Architecture summary complete
- Number of ADRs created
- Key technology choices documented
- Service count, API count, Table count, Container count
- File structure: single file or split (N domain files)
- Seed files defined (SEED-01, SEED-02)
- README.md generated
- Makefile generated
- .gitignore and .env.example generated
- CLAUDE.md generated
- Extension points for FUTURE.md documented
- Reference ID registry summary
- Project-specific skills created: N (list names) or "None needed"
- Update ROUTEMAP → Step 5 `[x] DONE`
- Next: Read `phases/planning/step-6-screen-design.md`
