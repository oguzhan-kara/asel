---
name: asel-deploy
description: Use when user says "deploy", "deploy et", "build and up", or wants to build and run the project using the Makefile in the project root. Reads Makefile targets dynamically and executes build+up sequence.
---

# Asel Deploy — Makefile-Based Build & Up

Build and deploy the project using the Makefile in the project root.

## Process

### Step 1: Read Makefile

If `Makefile` exists in the project root, read targets from it. Else if `package.json` has `build`/`start` scripts, use `npm run build && npm run start`. Else if a `docker-compose*.yml` file exists, use `docker compose build && docker compose up -d`. Else STOP and ask the user how to build/run the project.

When a `Makefile` is present, extract available targets — focus on:
- `build` or similar (compile, bundle)
- `up` or similar (start, run, deploy)
- `down` or `stop`
- `ps` or `status`
- `logs`
- `migrate` or `db-migrate`
- `typecheck` or `lint`

Present discovered targets to user:

```
═══ MAKEFILE TARGETS ══════════════════════════════
  build:     make build
  up:        make up
  down:      make down
  ps:        make ps
  logs:      make logs
═══════════════════════════════════════════════════
```

### Step 2: Pre-Build Checks

Run in order, stop on first failure:

1. **Port check** — `docker ps --format '<.Ports>'` (Go template field) to detect port conflicts
2. **Env check** — verify `.env` exists if `.env.example` exists
3. **Dependency check** — if `package.json` exists and `node_modules` missing → `npm install`

### Step 3: Build

Run the build command determined in Step 1 (`make build`, `npm run build`, or `docker compose build`).

- On SUCCESS → proceed to Step 4
- On FAILURE → show full error output, ask user how to proceed

### Step 4: Up

Run the up command determined in Step 1 (`make up`, `npm run start`, or `docker compose up -d`).

Wait 5 seconds, then verify:

```bash
make ps  # or docker compose ps / process check for the npm-run fallback
```

- All containers running → proceed to Step 5
- Any container exited/restarting → show logs for failed container:
  ```bash
  docker compose logs --tail=50 <service-name>
  ```
  Report to user and ask how to proceed.

### Step 5: Health Check

If Makefile has a `health` or `healthcheck` target → run it.

Otherwise, detect from docker-compose or Makefile:
- Web app → `curl -sf http://localhost:<port>/health || curl -sf http://localhost:<port>/`
- API → `curl -sf http://localhost:<port>/api/health`

Report result.

### Step 6: Status Report

```
═══ DEPLOY REPORT ═════════════════════════════════
  Build:        ✓ SUCCESS
  Containers:   3/3 running
  Health:       ✓ OK (http://localhost:3000)

  Commands:
    make ps     — container status
    make logs   — view logs
    make down   — stop all
═══════════════════════════════════════════════════
```

## Error Recovery

| Error | Action |
|-------|--------|
| Port conflict | Show conflicting container, suggest `make down` first or port change |
| Build failure | Show error, let user decide |
| Container crash | Show last 50 lines of logs for crashed service |
| Health check fail | Show container status + logs, suggest checking `.env` |

## Rules

- NEVER run `make down` without user confirmation — it destroys running containers
- If build fails, do NOT attempt `make up`
- Always show the actual error output, not a summary
- Speak in user's language (Turkish conversation, English commands)
