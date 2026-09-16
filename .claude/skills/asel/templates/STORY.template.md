# STORY-NNN: [Title]

## User Story
As a [role], I want to [action], so that [benefit].

## Description
[Detailed description of what needs to be built — WHAT and WHY, not HOW]

## Architecture Reference (exact IDs from ARCHITECTURE.md)
- **Services**: [SVC-NN: Name — what this story uses/modifies]
- **API Endpoints**: [API-NN: METHOD /path — endpoints in this story]
- **Database Tables**: [TBL-NN: name — tables created/modified]
- **Docker Containers**: [CTN-NN: name — if container config changes]
- **Components**: [CMP-NN: Name — components created/used]
- **Data Flow**: [e.g., Browser → API-11 → SVC-03 → TBL-02 → Response]
- **ADRs**: [ADR-NNN — relevant architectural decisions]

## Screen Reference (exact IDs from SCREENS.md)
- **Screens**: [SCR-NN: Name — screens implemented/affected]
- **UI Elements**: [Key elements from the screen mockup]
- **States**: [Loading, Error, Empty — which states to implement]

## Acceptance Criteria
- [ ] AC-1: [Specific, testable criterion]
- [ ] AC-2: [Specific, testable criterion]
- [ ] AC-3: [Specific, testable criterion]

## API Contract (if applicable)

> Response column shows only the `data` payload. Standard envelope `{ status, data, meta? }` applied per Architecture Rule #7.
> Ref column: Architecture API ID. For split projects use file link: `[API-01](docs/architecture/api/auth.md#API-01)`

| Ref | Method | Path | Request | Response (data payload) | Auth | Status Codes |
|-----|--------|------|---------|------------------------|------|-------------|
| API-15 | POST | /api/resource | `{ name: string, type: enum }` | `{ id, name, type }` | JWT | 201, 400, 401 |

## Database Changes (if applicable)
- New table: [name] — columns: [column specs]
- New index: [on which columns]
- Migration required: yes/no

## Dependencies
- **Blocked by**: [STORY-NNN — what must complete first]
- **Blocks**: [STORY-NNN — what is waiting for this]

## Test Scenarios
- [ ] T-1: [Happy path — describe expected behavior]
- [ ] T-2: [Error case — describe expected behavior]
- [ ] T-3: [Edge case — describe expected behavior]

## Effort Estimate
- **Size**: S / M / L / XL
- **Complexity**: Low / Medium / High

## Notes
[Any additional context, open questions, or constraints]
[NO implementation code — Planner handles implementation details]
