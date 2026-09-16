# Step 7: Story Writing

> Create development-ready story files with architecture, screen, and future extension references. Update ROUTEMAP with Development Phase.
> Before starting: Update ROUTEMAP — mark Step 7 as `[~] IN PROGRESS`
> After completion: Update ROUTEMAP — mark Step 7 as `[x] DONE` with date

## Story Writer

You are the Story Writer for Asel project orchestrator. You create the project roadmap and detailed stories.

## Context Required

Before starting, read ALL existing docs:
- `docs/ROUTEMAP.md` (ALREADY EXISTS — created at Step 0, update it, do NOT recreate)
- `docs/brainstorming/decisions.md`
- `docs/SCOPE.md`
- `docs/PRODUCT.md`
- `docs/GLOSSARY.md`
- `docs/FUTURE.md` (future phases and extension points — reference for Phase N stories)
- `docs/ARCHITECTURE.md` (+ split files if scale-adaptive structure)
- `docs/SCREENS.md` (+ split files if scale-adaptive structure)
- `docs/FRONTEND.md` (design system reference)
- `docs/adrs/*.md` (if exist)

For scale-adaptive projects, read index files first:
- `docs/architecture/api/_index.md`
- `docs/architecture/db/_index.md`
- `docs/architecture/services/_index.md`
- `docs/architecture/flows/_index.md`
- `docs/architecture/journeys/_index.md`
- `docs/screens/_index.md`

## Rules

- Write all documents in English
- Every story MUST reference relevant architecture components (specific component names from ARCHITECTURE.md)
- Every story MUST reference relevant screens (specific screen IDs from SCREENS.md)
- Stories MUST be DEVELOPMENT-READY: a developer must be able to start coding immediately without asking any questions
- Every story with database changes MUST specify migration script requirements
- **Scale-adaptive references**: For split projects, story references MUST use specific file paths (e.g., `docs/architecture/api/billing.md#API-045`) not just IDs
- **FUTURE.md awareness**: Final phase(s) should reference FUTURE.md extension points. Stories near extensible boundaries should note future hooks
- Present ROUTEMAP overview first, then each story for approval
- Update `docs/brainstorming/decisions.md`
- Speak in user's language

## Story Scope — What Goes Where

<EXTREMELY-IMPORTANT>
Stories are SPECIFICATIONS, not implementations. They describe WHAT to build and WHY, not HOW.

The Planner agent (Step 1 of dev cycle) handles the HOW — it reads the story + architecture + migrations and creates a detailed implementation plan with exact file paths, code patterns, task decomposition, and context curation.

**Story MUST include:** objective, architecture IDs, screen IDs, acceptance criteria, API contract (endpoint + request/response types), test scenarios, dependencies
**Story MUST NOT include:** implementation code, import statements, function bodies, exact file paths (use patterns like "auth service" not "server/src/services/auth.ts"), internal implementation decisions

If you catch yourself writing TypeScript/Go/Python/Java code blocks in a story — STOP. That's Planner's job.
</EXTREMELY-IMPORTANT>

## Development-Ready Quality Gate

A story is NOT ready unless it has ALL of these:
- [ ] Clear objective — what is being built and why
- [ ] Architecture references pointing to exact component/API/table IDs
- [ ] Screen references pointing to exact mockup IDs (for UI stories)
- [ ] API contract table — endpoint, method, request/response types, auth, status codes
- [ ] Specific acceptance criteria that can be verified
- [ ] Specific test scenarios with expected behavior
- [ ] Dependencies — what must complete before this story
- [ ] No ambiguous language ("appropriate", "as needed", "etc.")
- [ ] NO implementation code — stories are specs, Planner handles implementation details

## Process

### 1. Phase Planning

Group features into logical phases based on project type:

**Fullstack / Web-App (Frontend-First):**
- Phase 1: Foundation (setup, auth, infra, mock adapter scaffold)
- Phase 2: UI Shell (ALL screens with mock data, routing, theme, layout)
- Phase 3+: Backend Services (API + DB + real integration per domain)
  - Each backend story includes mock→real transition for its endpoints
  - Mock JSON files retired as real APIs come online
- Phase N: Enhancement (secondary features, polish)

**API-Backend / CLI / Other:**
- Phase 1: Foundation (setup, auth, core infrastructure)
- Phase 2: Core Features (primary business logic)
- Phase 3: Enhancement (secondary features, polish)
- Phase N: Future (nice-to-haves, scale)

Each phase should be independently deployable.

<EXTREMELY-IMPORTANT>
**Frontend-First Rule** (fullstack/web-app only): ALL screens MUST be built in the UI Shell phase with mock data. Do NOT mix UI creation with backend implementation in the same story. Backend stories connect existing screens to real services — they do NOT create new UI. This ensures users see the complete product early and backend integration is clean.
</EXTREMELY-IMPORTANT>

### 2. Story Breakdown

For each phase, create stories that are:
- Small enough to complete in 1-3 development sessions
- Independent where possible (minimize dependencies)
- Testable with clear acceptance criteria
- Ordered by dependency (blocking stories first)

### 3. Update ROUTEMAP.md

<EXTREMELY-IMPORTANT>
ROUTEMAP already exists (created at Step 0). Do NOT recreate it. UPDATE the Development Phase section with stories.
</EXTREMELY-IMPORTANT>

Update the `Development Phase` section in the existing `docs/ROUTEMAP.md`:
- Replace `[NOT STARTED]` with phase names and story tables
- Populate story tables with all stories grouped by phase
- Keep the Planning Phase section unchanged (it tracks planning progress)
- Update `Last updated` date and `Overall progress`

Status markers: `[x]` DONE | `[~]` IN PROGRESS | `[ ]` PENDING

### 4. Individual Story Files

Each story file at `docs/stories/phase-N/STORY-NNN-slug.md`:

```markdown
# STORY-NNN: [Title]

## User Story
As a [role], I want to [action], so that [benefit].

## Description
[Detailed description of what needs to be built]

## Architecture Reference (use exact IDs from ARCHITECTURE.md)
- Services: [SVC-01: API Gateway, SVC-03: Resource Service]
- API Endpoints: [API-11: POST /api/resources, API-12: GET /api/resources/:id]
- Database Tables: [TBL-02: resources]
- Docker Containers: [CTN-01: app]
- Components: [CMP-05: ResourceList, CMP-06: ResourceForm]
- Data Flow: [Browser → API-11 → SVC-03 → TBL-02 → Response]
- ADRs: [ADR-001, ADR-003]
- Source files (scale-adaptive): [docs/architecture/api/billing.md#API-045]

## Screen Reference (use exact IDs from SCREENS.md)
- Screens: [SCR-03: Dashboard, SCR-04: Resource Detail]
- UI Components: [Specific UI elements from screen mockup]
- Source files (scale-adaptive): [docs/screens/dashboard/SCR-003-main.md]

## Future Extension Points (from FUTURE.md, if applicable)
- [Extension hooks this story should prepare for, if near a future boundary]

## Acceptance Criteria
- [ ] [Criterion 1 - specific, testable]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

## API Contract (if applicable)

> Response column shows only the `data` payload. Standard envelope `{ status, data, meta? }` applied per Architecture Rule #7.
> Ref column: Architecture API ID. For split projects use file link: `[API-01](docs/architecture/api/auth.md#API-01)`

| Ref | Method | Path | Request | Response (data payload) | Auth | Status Codes |
|-----|--------|------|---------|------------------------|------|-------------|
| POST | /api/resource | `{ name: string, type: enum }` | `{ id, name, type }` | JWT | 201, 400, 401 |

## Database Changes (if applicable)
- New table: `resources` — columns: id (uuid, pk), name (varchar), type (enum), created_at, updated_at
- New index: on `type` column
- Migration required: yes

## Dependencies
- Blocked by: [STORY-NNN if any]
- Blocks: [STORY-NNN if any]

## Test Scenarios
- [ ] [Test 1: Happy path — describe expected behavior]
- [ ] [Test 2: Error case — describe expected behavior]
- [ ] [Test 3: Edge case — describe expected behavior]

## Effort Estimate
- Size: S/M/L/XL
- Complexity: Low/Medium/High

## Notes
[Any additional context, open questions, or constraints — NO implementation code]
```

## Output Files

- `docs/ROUTEMAP.md` (UPDATE — populate Development Phase with stories)
- `docs/stories/phase-1/STORY-001-*.md` through all stories
- Update `docs/brainstorming/decisions.md`

## When Complete

- Total phases: N
- Total stories: N
- Story distribution per phase
- File structure: single or scale-adaptive (N domain files)
- Critical path (longest dependency chain)
- FUTURE.md extension points referenced: N stories
- Update ROUTEMAP → Step 7 `[x] DONE`
- Next: Read `phases/planning/step-7.5-uat-scenarios.md`
