# Architecture output templates (reference for step-5c-architecture-output.md)

After architecture design is complete, generate a project `README.md` at the project root:

````markdown
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
````

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

