# Planner — Plan Template & Validation (reference for asel-planner.md)

Create a step-by-step plan:

```markdown
# Implementation Plan: STORY-NNN - [Title]

## Goal
[One sentence: what this story delivers]

## Architecture Context
[EMBED relevant sections from ARCHITECTURE.md — not just references]

### Components Involved
- [Component name]: [Layer, responsibility, file path pattern]
- [Component name]: [Layer, responsibility, file path pattern]

### Data Flow
[Copy the relevant data flow from ARCHITECTURE.md. Show the exact sequence: user action → frontend → API → service → repository → DB]

### API Specifications
[For each endpoint this story touches, specify:]
- `POST /api/resource` — Create resource
  - Request body: `{ field1: string, field2: number }`
  - Success response: `{ status: "success", data: { id, field1, field2 }, meta?: { ... } }`
  - Error response: `{ status: "error", error: { code: "VALIDATION_ERROR", message: "..." } }`
  - Status codes: 201 Created, 400 Bad Request, 401 Unauthorized

### Database Schema

<EXTREMELY-IMPORTANT>
ARCHITECTURE.md is the DESIGN. Migration files are the TRUTH. When both exist, migration files WIN.

Before embedding any table schema in the plan:
1. Check if migration files exist for this table (glob: `migrations/*[table_name]*` or similar)
2. If YES → read the migration file → use EXACT column names, types, constraints from it
3. If NO → use ARCHITECTURE.md design (this is the first story creating this table)
4. Also read existing model/entity files if they exist — they reflect actual implementation

NEVER guess column names. NEVER assume ARCHITECTURE.md is current after Story-001.
</EXTREMELY-IMPORTANT>

[Embed ACTUAL table schema — from migration files if they exist, from ARCHITECTURE.md only if this story creates the table:]
```sql
-- Source: migrations/003_create_resource.sql (ACTUAL)
-- OR Source: ARCHITECTURE.md TBL-005 (DESIGN — no migration yet)
CREATE TABLE resource (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field1 VARCHAR(255) NOT NULL,
  field2 INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
-- Indexes: ...
```

### Screen Mockups
[Copy relevant ASCII mockups from SCREENS.md for each screen this story implements:]
```
┌─────────────────────────────────────┐
│  Header                             │
├─────────────────────────────────────┤
│  [Form fields]                      │
│  [Action buttons]                   │
└─────────────────────────────────────┘
```
- Navigation: [How user reaches this screen]
- Drill-down targets: [Clickable elements → destination screens]

### Design Token Map (UI stories ONLY — MANDATORY)

<EXTREMELY-IMPORTANT>
The Developer (sonnet) writes hardcoded hex colors and arbitrary pixel values when token names are not explicitly provided. This is the #1 frontend quality issue. You MUST embed the EXACT token class names the Developer should use.

Before writing this section:
1. Read `docs/FRONTEND.md` — extract ALL semantic token names (colors, typography, spacing, shadows, radii)
2. Glob `src/components/atoms/`, `src/components/molecules/` — list existing reusable components
3. Check previous stories' implementations for patterns already established
</EXTREMELY-IMPORTANT>

```markdown
#### Color Tokens (from FRONTEND.md)
| Usage | Token Class | NEVER Use |
|-------|-------------|-----------|
| Primary text | `text-text-primary` | `text-[#0f172a]`, `text-gray-900` |
| Secondary text | `text-text-secondary` | `text-[#64748b]`, `text-gray-500` |
| Primary button bg | `bg-primary` | `bg-[#3b82f6]`, `bg-blue-500` |
| Card border | `border-border-default` | `border-[#e2e8f0]`, `border-gray-200` |
| Card background | `bg-surface-card` | `bg-white`, `bg-[#ffffff]` |
| [... extract ALL relevant tokens from FRONTEND.md]

#### Typography Tokens
| Usage | Token Class | NEVER Use |
|-------|-------------|-----------|
| Page title | `text-heading-lg font-bold` | `text-[24px]`, `text-2xl` |
| Section title | `text-heading-md font-semibold` | `text-[17px]`, `text-xl` |
| Body text | `text-body-md` | `text-[14px]`, `text-sm` |
| Caption | `text-caption` | `text-[10px]`, `text-xs` |

#### Spacing & Elevation Tokens
| Usage | Token Class | NEVER Use |
|-------|-------------|-----------|
| Card shadow | `shadow-card` | `shadow-none`, no shadow |
| Card radius | `rounded-card` | `rounded-md`, `rounded-lg` (inconsistent) |
| Section padding | `p-section` | `p-[20px]`, `p-4` (arbitrary) |

#### Existing Components to REUSE (DO NOT recreate)
| Component | Path | Use For |
|-----------|------|---------|
| `<Input>` | `src/components/atoms/Input.tsx` | ALL form fields — NEVER raw `<input>` |
| `<Button>` | `src/components/atoms/Button.tsx` | ALL buttons — NEVER raw `<button>` |
| `<StatCard>` | `src/components/molecules/StatCard.tsx` | Dashboard stat displays |
| `<DataTable>` | `src/components/organisms/DataTable.tsx` | ALL tables |
| `<Icon>` | `src/components/atoms/Icon.tsx` | ALL icons — NEVER inline SVG |
| `<ConfirmDialog>` *(or project equivalent)* | `src/components/molecules/ConfirmDialog.tsx` | ALL confirm/alert/prompt flows — NEVER `alert()`/`confirm()`/`prompt()` |
| `<SafeHtml>` *(or project equivalent)* | `src/components/atoms/SafeHtml.tsx` | ALL rendered HTML strings — NEVER `dangerouslySetInnerHTML`/`innerHTML` |
| [... list ALL atoms/molecules relevant to this story — including any dialog/rawhtml wrappers the project uses]
```

**RULE: If this story has UI and this section is empty, the plan is INCOMPLETE. Re-read FRONTEND.md and glob components.**

## Prerequisites
- [x] STORY-NNN completed (what it provides: [specific outputs])
- [x] Dependencies installed

## Task Decomposition Rules

> Each task is dispatched to a FRESH Developer subagent with isolated context.
> Asel orchestrator extracts the context sections listed in `Context refs` and passes them directly to the Developer.
> The Developer does NOT read this plan file.

**Granularity:**
- Each task touches 1-3 files (ideally 1-2)
- Each task takes ~2-5 minutes of focused implementation
- Each task must be independently verifiable
- If a task would touch 5+ files or take 10+ minutes → split further
- Group by functional unit (e.g., "User endpoint" = route + service + test), NOT by layer
- DB migration tasks come first (other tasks may depend on schema)
- Tests can be in the same task as the code they test

## Plan Content Rules

<EXTREMELY-IMPORTANT>
### No Implementation Code in Plans

Plans are CONTEXT POOLS, not codebases. They describe WHAT to build with enough context for the Developer (sonnet) to implement correctly.

**Plan MUST include:** embedded architecture specs, API contracts, DB schema, design tokens, task decomposition
**Plan MUST NOT include:** full function bodies, complete route handlers, full component JSX, import statement lists

### Pattern References (CRITICAL for Developer Quality)

The Developer agent runs on sonnet — it needs explicit guidance on HOW the project does things. Instead of writing code, reference existing files that demonstrate the pattern:

For EVERY task that creates a new file, identify the closest existing file of the same type and add a `Pattern ref` field. The Developer will read this file and follow its structure.

Before writing pattern refs, glob the project to find existing files:
- Routes: `src/**/routes/*.ts` or `server/src/routes/*.ts`
- Services: `src/**/services/*.ts` or `server/src/services/*.ts`
- Components: `src/**/components/**/*.tsx` or `client/src/components/**/*.tsx`
- Validators: `src/**/validators/*.ts`
- Tests: `src/**/*.test.ts` or `src/**/*.spec.ts`
- Migrations: `migrations/*` or `prisma/migrations/*`
- Models: `src/**/models/*.ts` or `src/**/entities/*.ts`

If the project is new (Phase 1, STORY-001) and no existing files exist yet, note "First of its kind — establish pattern" and provide a brief structural guideline (3-5 lines max, not full code).
</EXTREMELY-IMPORTANT>

## Tasks

### Task 1: [Name — specific, actionable]
- **Files:** Create `src/...`, Modify `src/...`
- **Depends on:** — (none — first task)
- **Complexity:** low | medium | high
- **Pattern ref:** Read `src/services/auditLog.ts` — follow same service structure
- **Context refs:** [Sections from this plan to extract: e.g., "Architecture Context > Components Involved", "Database Schema"]
- **What:** [Specific description with exact field names, types, patterns]
- **Verify:** [Exact command to check this task worked]

### Task 2: [Core Logic]
- **Files:** Create `src/...`
- **Depends on:** Task 1
- **Complexity:** low | medium | high
- **Pattern ref:** Read `src/routes/health.ts` — follow same express router pattern
- **Context refs:** [e.g., "Architecture Context > Data Flow", "API Specifications > POST /api/resource", "Database Schema"]
- **What:** [Specific description]
- **Verify:** [How to check]

### Complexity Guide
- **low:** Single-file CRUD, simple validation, basic UI component, config change
- **medium:** Multi-file feature with DB + API + service, standard auth, form with validation
- **high:** OAuth/SSO flows, real-time systems, complex state machines, payment processing, multi-service orchestration, encryption/security, performance-critical algorithms

### Story Effort → Task Complexity Mapping

Read the story's Effort Estimate (S/M/L/XL). Larger stories naturally have more complex tasks:

| Story Effort | Default Task Complexity | Rationale |
|-------------|------------------------|-----------|
| **S** | Most tasks low, max 1 medium | Simple story, straightforward tasks |
| **M** | Mix of low + medium | Standard feature, some multi-file work |
| **L** | Most tasks medium, at least 1 high | Large feature, core logic tasks need opus |
| **XL** | Most tasks medium/high, multiple high | Complex feature, majority needs opus quality |

For L and XL stories: if a task involves core business logic, data orchestration, or multi-service integration → mark as **high** (dispatches to opus). Do NOT default everything to low/medium for large stories — that sends complex work to sonnet which produces lower quality code.

### Task 3: [UI Implementation]
- **Files:** Create `src/components/...`
- **Depends on:** Task 2
- **Context refs:** [e.g., "Screen Mockups > SCR-001", "Design Token Map", "Architecture Context > Components Involved"]
- **What:** [Specific description]
- **Tokens:** Use ONLY classes from Design Token Map — zero hardcoded hex/px
- **Components:** Reuse atoms/molecules from Component Reuse table — NEVER raw HTML elements
- **Note:** Invoke `frontend-design` skill for professional quality
- **Verify:** `grep -r '#[0-9a-fA-F]' src/components/[new-files]` → must return ZERO matches

### Task 4: [Integration]
- **Files:** Modify `src/...`
- **Depends on:** Task 2, Task 3
- **Context refs:** [e.g., "Architecture Context > Data Flow"]
- **What:** [Connect components]
- **Verify:** [How to check]

### Task 5: [Tests]
- **Files:** Create `src/__tests__/...`
- **Depends on:** Task 2, Task 4
- **Context refs:** [e.g., "Acceptance Criteria Mapping", "API Specifications"]
- **What:** [Test scenarios from story]
- **Verify:** All tests pass

## Acceptance Criteria Mapping
| Criterion | Implemented In | Verified By |
|-----------|---------------|-------------|
| [AC-1] | Task 2 | Task 5, Test 1 |
| [AC-2] | Task 3 | Task 5, Test 2 |

## Story-Specific Compliance Rules
[Extract from ARCHITECTURE.md, PRODUCT.md, ADRs, FRONTEND.md — only rules relevant to THIS story]

- API: [e.g., "Standard envelope required for /api/users endpoints"]
- DB: [e.g., "Migration script required for users table changes"]
- UI: [e.g., "Design tokens from FRONTEND.md — no hardcoded colors", "Data drill-down: user name must link to profile"]
- Business: [e.g., "Max 3 login attempts before lockout per PRODUCT.md rule BR-05"]
- ADR: [e.g., "JWT auth per ADR-002, bcrypt hashing per ADR-003"]

## Bug Pattern Warnings
[Read `docs/brainstorming/bug-patterns.md` (under `## Patterns`). For each pattern whose `Affected` layer overlaps with this story's scope, add a warning here. Developer MUST read these before implementing.]

- [e.g., "PAT-001: List endpoints with FK relations MUST use eager loading (N+1 bug in STORY-015)"]
- [e.g., "PAT-003: All Turkish UI text must use proper characters — grep for ASCII-only Turkish after implementation"]

If `bug-patterns.md` does not exist yet, or no patterns match this story → write "No matching bug patterns."

## Tech Debt (from ROUTEMAP)
[Read `docs/ROUTEMAP.md` → `## Tech Debt` table. Find OPEN items (Status not `✓ RESOLVED`) whose Target story matches THIS story. List each one — Developer MUST address these during implementation.]

- [e.g., "D-001 (from STORY-015 Gate): Counter TTL not set — implement EXPIRE in DashboardCounter.increment()"]
- [e.g., "D-003 (from STORY-020 Gate): EMQX ACL simplified — set proper per-topic ACL rules"]

If no Tech Debt section exists or no items target this story → write "No tech debt items for this story."

## Mock Retirement (Frontend-First projects only)
[If `src/mocks/` directory exists AND this story implements backend API endpoints: scan mock files for endpoints matching this story's API surface. List each mock that must be retired — Developer MUST switch to real adapter and delete mock file.]

- [e.g., "Mock: src/mocks/users.json → endpoints GET /api/users, POST /api/users — switch to real adapter"]

If no mocks directory or story has no backend API endpoints → write "No mock retirement for this story."

## Risks & Mitigations
- [Risk 1]: [Mitigation]
```

### 3. Pre-Validation & Quality Gate (Before Writing Plan)

Run ALL checks below. Fix any issues BEFORE writing the plan file. This replaces the external Plan Quality Gate — Planner self-validates.

**a. Minimum substance** (read story Effort field):

| Story Effort | Min Plan Lines | Min Task Count |
|-------------|---------------|----------------|
| S | 30 | 2 |
| M | 60 | 3 |
| L | 100 | 5 |
| XL | 120 | 6 |

**b. Required sections** (plan MUST have these headers):
- `## Goal` or `## Objective`
- `## Architecture Context`
- `## Tasks` (with numbered `### Task` blocks)
- `## Acceptance Criteria Mapping`

**c. Embedded specs** (NOT just references):
- If story has API → plan has endpoint details (HTTP methods, paths, request/response fields)
- If story has DB → plan has column definitions with SQL/ORM types
- If story has UI → plan has Design Token Map section with class names

**d. Task complexity cross-check:**
- If story is L or XL and zero tasks marked `Complexity: high` → add at least 1 high-complexity task

**e. Context refs validation:**
- For each task, verify `Context refs` point to actual section headers you wrote in the plan
- If any ref points to non-existent section → fix before writing

**Architecture Compliance:**
- [ ] Each task's files are in the correct architectural layer
- [ ] No cross-layer imports planned
- [ ] Dependency direction is correct
- [ ] Component names match ARCHITECTURE.md naming conventions

**API Compliance (if story has API):**
- [ ] All endpoints use standard envelope format
- [ ] Proper HTTP methods
- [ ] Input validation step exists for each endpoint
- [ ] Error responses specified for each endpoint

**Database Compliance (if story has DB changes):**
- [ ] Migration step exists in plan steps
- [ ] Both `up` and `down` migration mentioned
- [ ] Indexes specified for query columns
- [ ] **CRITICAL: If tables already exist (migration files found) → embedded schema matches ACTUAL migration files, NOT just ARCHITECTURE.md**
- [ ] **Column names verified** against existing migrations/models (exact match — not "similar")
- [ ] **Column types verified** against existing migrations/models
- [ ] **Relationship/FK columns verified** against existing migrations

**UI Compliance (if story has screens):**
- [ ] Screen mockup embedded from SCREENS.md
- [ ] Atomic design level specified for each component
- [ ] Drill-down targets identified for all clickable data
- [ ] Empty, loading, and error states mentioned
- [ ] `frontend-design` skill usage noted for UI steps
- [ ] **CRITICAL: Design Token Map section populated** — color, typography, spacing, elevation tokens listed with exact class names
- [ ] **CRITICAL: Component Reuse table populated** — existing atoms/molecules listed with paths, "NEVER raw HTML" rules stated
- [ ] **CRITICAL: Each UI step references token map** — "Use ONLY classes from Design Token Map" included in step description

**Task Decomposition:**
- [ ] Each task touches ≤3 files (ideally 1-2)
- [ ] No single task requires 5+ files or 10+ minutes
- [ ] Tasks ordered by dependency (DB first, then logic, then UI, then integration)
- [ ] Each task has `Depends on` field (task numbers or "—" for no dependency)
- [ ] Each task has `Context refs` field specifying which plan sections the Developer needs
- [ ] **CRITICAL: Each task creating new files has `Pattern ref` field** — existing file for Developer to follow
- [ ] Tasks are functionally grouped (not layer-grouped)
- [ ] Independent tasks (no shared dependencies) can be parallelized by Asel
- [ ] Total task count is reasonable (3-8 tasks for a typical story)
- [ ] NO implementation code in tasks — specs + pattern refs only

**Test Compliance:**
- [ ] Test task exists covering each acceptance criterion
- [ ] Test file paths specified
- [ ] Test scenarios from story included

**Self-Containment Check:**
- [ ] API specs embedded (not "see ARCHITECTURE.md")
- [ ] DB schema embedded (not "see data model")
- [ ] **DB schema source noted** — "Source: migrations/NNN_xxx.sql" or "Source: ARCHITECTURE.md (new table)"
- [ ] Screen mockups embedded (not "see SCREENS.md")
- [ ] Business rules stated inline (not "see PRODUCT.md")
- [ ] Every task's `Context refs` point to sections that actually exist in this plan

If any check fails → fix the plan before writing.

### 4. Write Plan File

Save the plan to `docs/stories/phase-N/STORY-NNN-plan.md`.

### 5. Return Summary

Return a concise summary to Asel orchestrator (NOT the full plan):

```
PLANNER SUMMARY
================
Story: STORY-NNN — [Title]
Tasks: N bite-sized tasks (M waves — wave 1: Task 1,3; wave 2: Task 2,4; wave 3: Task 5)
Components: [list of architecture components touched]
Screens: [list of screens implemented]
API Endpoints: [list of endpoints]
DB Changes: [migrations needed or "none"]
Pre-Validation: PASS (all checks passed)
Risks: [key risks if any]

Plan saved: docs/stories/phase-N/STORY-NNN-plan.md
```

If re-dispatched with user feedback, also include:
```
Revisions made:
- [what changed based on feedback]
```

