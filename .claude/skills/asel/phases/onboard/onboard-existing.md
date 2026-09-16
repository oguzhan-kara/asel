# Onboard Existing Project

> Reverse-engineer an existing codebase into Asel's documentation format. Scans code, generates all required docs, and sets up the project for Asel's development cycle.
> Before starting: Verify project root exists and has source code
> After completion: All Asel docs generated, ROUTEMAP ready for development

<HARD-GATE>
This is a ONE-TIME, INTERACTIVE skill with 13 approval gates.
Do NOT skip any step. Do NOT generate documents without user approval.
Do NOT modify existing source code — only create files under `docs/` and project root config files.
Every generated file MUST match Asel template format EXACTLY.
Reference ID system is MANDATORY (SVC-NN, API-NN, TBL-NN, CMP-NN, CTN-NN, SCR-NN, ADR-NNN).
API full spec format is MANDATORY (Auth, Request, Response, Errors, Notes) — summary tables are FORBIDDEN.
decisions.md MUST be updated at every step.
</HARD-GATE>

## General Rules

- Runs in main context (Skill tool) — interactive, 13 approval gates
- Conversation language: Turkish, document language: English
- Every generated file MUST match Asel template format exactly
- Do NOT touch existing source files — only create under `docs/` and project root
- Existing `README.md`, `Makefile`, `.gitignore`, `.env.example` → propose changes with diff summary, apply only after user approval
- If `docs/` already exists → ask user: "docs/ dizini zaten mevcut. Uzerine yazayim mi?"
- Reference ID system mandatory (SVC-NN, API-NN, TBL-NN, CMP-NN, CTN-NN, SCR-NN, ADR-NNN)
- API full spec format mandatory (Auth, Request, Response, Errors, Notes) — summary table FORBIDDEN
- Detect standard envelope pattern, flag if missing (do NOT force-change existing code)
- Update decisions.md at every step

## Progress Bar

Display and update at every step transition:

```
=== ONBOARDING ========================================================================
SCAN:     [done] Discovery → [done] Architecture → [>>] API → [ ] Database → [ ] UI
DOCUMENT: [ ] Core Docs → [ ] Architecture → [ ] Screens → [ ] Frontend
FINALIZE: [ ] ROUTEMAP → [ ] Project Setup → [ ] Review → [ ] Handoff
==================================================================================
```

### Symbols

| Symbol | Meaning |
|--------|---------|
| `[done]` | Completed |
| `[>>]` | Running (current step) |
| `[ ]` | Pending |
| `[FAIL]` | Failed (needs re-run) |

---

> Read `{{aselRoot}}/references/onboard-scan-document.md` now and follow it, then return here.
## Phase 3: FINALIZE (Steps 10-13)

### Step 10: ROUTEMAP Setup

**Create `docs/ROUTEMAP.md`** (template: `asel/templates/ROUTEMAP.template.md`):

```markdown
# Project Roadmap: [Project Name]

> Last updated: YYYY-MM-DD
> Current phase: DEVELOPMENT | E2E_POLISH | DOCUMENTATION
> Overall progress: 0% (new stories)

---

## Planning Phase [DONE — Onboarded]

| Step | Name | Status | Completed |
|------|------|--------|-----------|
| 1 | Discovery | [x] DONE (Onboarded) | YYYY-MM-DD |
| 2 | Gap Analysis | [x] DONE (Onboarded) | YYYY-MM-DD |
| 3 | Product Definition | [x] DONE (Onboarded) | YYYY-MM-DD |
| 4 | Feature Discovery | [x] DONE (Onboarded) | YYYY-MM-DD |
| 5 | Architecture | [x] DONE (Onboarded) | YYYY-MM-DD |
| 6 | Screen Design | [x] DONE (Onboarded) | YYYY-MM-DD |
| 6.5 | Theme & Visual Design | [x] DONE (Onboarded) | YYYY-MM-DD |
| 7 | Story Writing | [x] DONE (Onboarded) | YYYY-MM-DD |
| 8 | Final Review | [x] DONE (Onboarded) | YYYY-MM-DD |

---

## Development Phase [NOT STARTED]

> Stories completed: 0/0 (—)
> Current story: —
> Current step: —

_No stories yet. Use `asel change` to add new features._

---

## E2E & Polish Phase [NOT STARTED]

| Step | Name | Status | Completed |
|------|------|--------|-----------|
| E1 | E2E Browser Testing (E2E Tester) | [ ] PENDING | — |
| E2 | Test Hardening (Test Hardener) | [ ] PENDING | — |
| E3 | Performance Optimization (Perf Optimizer) | [ ] PENDING | — |
| E4 | UI Polish (UI Polisher) | [ ] PENDING | — |

---

## Documentation Phase [NOT STARTED]

| Step | Name | Status | Completed |
|------|------|--------|-----------|
| D1 | Specification | [ ] PENDING | — |
| D2 | Presentations (Sales + Technical) | [ ] PENDING | — |
| D3 | Rollout Guide | [ ] PENDING | — |
| D4 | User Guide | [ ] PENDING | — |

---

## Change Log

| Date | Type | Description | Affected |
|------|------|-------------|----------|
| YYYY-MM-DD | ONBOARD | Project onboarded to Asel framework | All docs |

---

## Status Legend
- `[ ] PENDING` — Not started
- `[~] IN PROGRESS` — Currently being worked on
- `[x] DONE` — Completed and verified
- `[!] NEEDS_REPLAN` — Affected by change, needs re-planning
- `[!!] BLOCKED_BY_CHANGE` — Cannot proceed until change is applied
- Effort: S (Small) | M (Medium) | L (Large) | XL (Extra Large)

## Step Values
- `—` — Not started
- `Plan` — Implementation planning
- `Dev` — Developer implementing
- `Gate` — Combined Gate (Gap + Compliance + Tests + Perf + Build)
- `Close` — Close & Commit
- `Review` — Reviewer checking (after every story)
- `Handoff` — Session handoff
- `E1` — E2E Browser Testing
- `E2` — Test Hardening
- `E3` — Performance Optimization
- `E4` — UI Polish
- `D1` — Specification document
- `D2` — Presentations (Sales + Technical)
- `D3` — Rollout Guide
- `D4` — User Guide
```

### Step 11: Project Setup

1. **Create/update `CLAUDE.md`:**
   - Project overview
   - `## Development` section: "Run `/asel` to start or continue any development work — it manages planning, implementation, quality gates, and deployment."
   - Tech stack
   - Quick commands (from existing Makefile or package.json scripts)
   - Docker services + URLs
   - Admin credentials → ASK user
   - Project structure
   - Conventions
   - Architecture docs list
   - `## Asel Session` section (empty — Story: —, Step: —, Mode: —)

2. **Create `docs/FUTURE.md`:**
   - Ask user: "Gelecekte eklemek istedigin feature'lar var mi?"
   - If yes → document them
   - If no → minimal file: "To be populated via asel change-analyst."

3. **Project config files (`README.md`, `Makefile`, `.gitignore`, `.env.example`):**

   **If file DOES NOT exist → create it:**
   - `README.md` → project overview, setup instructions, tech stack, commands
   - `Makefile` → minimal targets (help, build, up, down, test, logs, clean)
   - `.gitignore` → language/framework-appropriate ignores
   - `.env.example` → from existing `.env` (mask secret values with placeholders)

   **If file EXISTS → propose changes with user approval:**
   - Read the existing file
   - Analyze gaps (missing sections, outdated info, missing targets)
   - Present a diff-style summary of proposed changes:
     ```
     README.md mevcut. Onerilen degisiklikler:
     + [EKLEME] "Quick Start" bolumu (Docker setup adimlari)
     + [EKLEME] "Project Structure" bolumu
     ~ [GUNCELLEME] Tech stack bolumu (eksik: Redis, Prisma)
     - Degisiklik yok: Contributing, License bolumleri

     Uygulayayim mi? (evet / hayir / secmeli)
     ```
   - If user says "secmeli" → apply only approved items
   - If user says "hayir" → skip, log to decisions.md: "User declined [file] updates"
   - If user says "evet" → apply all proposed changes

### Step 12: Final Review

Follow asel-reviewer planning review pattern:
- Cross-check all reference IDs (SVC↔API↔TBL↔CMP↔SCR↔ADR)
- Orphaned references?
- GLOSSARY coverage sufficient?
- ROUTEMAP all info correct?
- ARCHITECTURE↔PRODUCT↔SCREENS consistency
- decisions.md completeness

If issues found → fix → re-check

### Step 13: Handoff

```
==================================================================================
  ONBOARDING COMPLETE
==================================================================================

  Project: [Name]
  Generated: X docs, Y ADRs, Z screens
  Reference IDs: SVC-01..NN, API-01..NN, TBL-01..NN, ...
  ROUTEMAP: Planning DONE, Development ready

  Sonraki adimlar:
  * "asel change" → Yeni feature ekle (change-analyst)
  * "asel dev" → Story gelistirmeye basla
  * "asel docs" → Dokumantasyon uret

==================================================================================
```

---

## Reference ID Assignment Strategy

| Prefix | Source | Ordering |
|--------|--------|----------|
| SVC-NN | Detected services/modules | Dependency order (foundational first) |
| API-NN | Route definitions | Domain-grouped, auth first, then alphabetical |
| TBL-NN | ORM models / migrations | Dependency order (parent tables first) |
| CMP-NN | React components | Atomic level: atoms 001-099, molecules 100-199, organisms 200-299, templates 300-399, pages 400-499 |
| CTN-NN | Docker containers | Dependency order (DB → app → proxy) |
| SCR-NN | Routes/pages | Navigation hierarchy (auth/landing first, then main flow) |
| ADR-NNN | Technology choices | Sequential by detection order |

## Error Handling

| Situation | Action |
|-----------|--------|
| No package.json/go.mod | Ask: "Bu projenin ana dizini neresi?" |
| Framework undetectable | Ask: "Hangi framework kullaniliyor?" |
| API routes dynamic/undetectable | List found ones, ask user for missing |
| No ORM/migration | Suggest connecting to running DB or ask user for schema |
| App not running | Component JSX → ASCII mockup (lower fidelity) |
| `docs/` already exists | Ask: "Uzerine yazayim mi?" |
| Very large codebase (>1000 files) | Structure first, then domain-by-domain deep dive |
| No standard envelope | Document current format, add migration note |
| No tests | decisions.md note: "Tests will be introduced with new stories" |

## When Complete

- All 13 steps completed with user approval
- Asel-format docs generated under `docs/`
- ROUTEMAP ready for development
- Reference ID system established
- Next: User triggers change/dev/docs via asel commands
