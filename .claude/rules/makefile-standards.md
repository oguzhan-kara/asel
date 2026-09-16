---
paths: {{rules.infra}}
---

# Makefile Standards

Every project MUST have a `Makefile` at the project root with these standard targets. Additional project-specific targets are allowed.

## Required Targets

| Target | Purpose | Example |
|--------|---------|---------|
| `help` | Show available targets with descriptions | Self-documenting via grep |
| `build` | Build Docker images | `docker compose build` |
| `up` | Start all services | `docker compose up -d` |
| `down` | Stop all services | `docker compose down` |
| `dev` | Start development servers (without Docker) | `npm run dev` / `go run .` |
| `test` | Run test suite | `npm test` / `go test ./...` / `pytest` |
| `typecheck` | Run type checker | `tsc --noEmit` / `go vet ./...` / `mypy` |
| `lint` | Run linter | `eslint` / `golangci-lint` / `ruff` |
| `migrate` | Run database migrations | `prisma migrate deploy` / `flyway migrate` |
| `seed` | Seed database with initial data | `prisma db seed` / custom script |
| `logs` | Show service logs | `docker compose logs -f` |
| `clean` | Remove build artifacts | `rm -rf dist/ node_modules/` |

## Help Target Format

```makefile
.DEFAULT_GOAL := help

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
```

## Rules

- Every target MUST have a `## description` comment for help output
- `make up` MUST result in a fully healthy, accessible application
- `make test` MUST run ALL tests (unit + integration)
- `make clean` MUST NOT delete `.env` or `docs/`
- Targets MUST be idempotent — running twice should not break anything

