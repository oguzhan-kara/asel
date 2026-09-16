---
name: asel-changelog
description: Generate technical & business changelogs from git commits, grouped by date
allowed-tools: Bash(git:*), Bash(ls:*), Bash(mkdir:*), Bash(wc:*), Glob, Grep, Read, Write, Edit
---

# Changelog Generator

## Step 0: Current State

Find last changelog date:
!`ls -1d docs/changelog/????-??-??/ 2>/dev/null | sort -r | head -1 | xargs -I{} basename {} || echo "NO_CHANGELOG"`

Pending commits since last changelog:
!`LAST=$(ls -1d docs/changelog/????-??-??/ 2>/dev/null | sort -r | head -1 | xargs -I{} basename {}); if [ -z "$LAST" ]; then git log --oneline --format="%h %s" | head -30; else git log --oneline --after="$LAST" --format="%h %s" | head -30; fi`

If no pending commits → inform user and STOP.

Group commits by date (YYYY-MM-DD). Process each date separately.

## Step 1: Detect Project Structure

Detect project type by checking these files (in order):
1. `CLAUDE.md` in project root → project structure description (most reliable)
2. `package.json` / `go.mod` / `Cargo.toml` / `pyproject.toml` / `pom.xml` → language/framework
3. Directory structure → `src/`, `backend/`, `frontend/`, `lib/`, `cmd/`, `internal/`, `packages/`

**Dynamic Category Creation:**
Based on project structure, define 2-5 categories. Examples:

| Project Type | Categories |
|-------------|-----------|
| Fullstack (Go+React) | Backend, Frontend, Infra |
| React SPA | Components, Pages, Config |
| Go service | Core, API, Config |
| Python ML | Model, Pipeline, Config |
| Monorepo | Per-package names |
| Generic | Source, Config |

For each category determine:
- Which directories belong to it
- Path shortening rules (remove common prefix within category)
- Everything not matching a category → last category (Config/Infra/Other)

## Step 2: Collect Details Per Day

For each date group:
1. `git log --after="PREV_DAY" --before="NEXT_DAY" --format="%h %s" --stat` → commit info
2. `git diff --stat FIRST_HASH~1..LAST_HASH` → total line changes
3. Detect migration files (if any):
   - Find files matching `**/migrations/**/*.sql` that were added/modified in this date range
   - Read SQL content of new migration files
4. Map changed files to Step 1 categories
5. Shorten paths (remove category-specific common prefix)

## Step 3: Write technical.md

For each day create `docs/changelog/YYYY-MM-DD/technical.md`:

```markdown
# Technical Changelog — YYYY-MM-DD

## Git References
| Commit | Description |
|--------|------------|
| `hash` | message |

## Database Migrations
(if migrations exist — migration name as H3, SQL fenced block, bullet explanation)
(if no migrations — OMIT this entire section)

## Changed Files (N files, +X / -Y lines)

### [Category 1]
| File | Change |
|------|--------|
| `short/path` | Brief description |

### [Category 2]
...
```

Rules:
- Empty categories are NOT written
- Paths in shortened form
- Change description is 1 line max
- Database Migrations section only appears when migrations exist

## Step 4: Write business.md

For each day create `docs/changelog/YYYY-MM-DD/business.md`:

```markdown
# Release Notes — Month D, YYYY

## New Features
### Feature Name
- User-facing description (non-technical language)

## Improvements
### Area Name
- Improvement detail

## Bug Fixes
- Fix description
```

AI reasoning rules:
- Categorize by commit prefix: `feat:` → New Features, `fix:` → Bug Fixes, everything else → Improvements
- Group related commits under a single feature/improvement heading
- Avoid technical jargon — write from user perspective
- Empty sections are NOT written
- Date format: `February 7, 2026` (English, no leading zero on day)

## Step 5: Commit & Push

```bash
git add docs/changelog/
git commit -m "docs(changelog): add YYYY-MM-DD changelog"
```

- Multiple days → separate commit per day
- Check `git remote` → if no remote, skip push (no error)
- If remote exists → `git push`
- If push fails (auth, network) → inform user but do NOT consider skill failed

## Step 6: Report

For each day processed:
- Number of commits processed
- List of created files
- Push status (pushed / skipped / failed)
