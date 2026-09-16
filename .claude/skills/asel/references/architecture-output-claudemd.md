# Architecture output: CLAUDE.md generation (reference for step-5c-architecture-output.md)

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

