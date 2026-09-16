# Step 5b: Architecture Infrastructure (Part 2 of 3)

> Technology stack, user journeys, security, performance, and ADR generation.
> This is Part 2 of 3 — covers Process sections 8-12.
> Before starting: Ensure Part 1 (step-5a) is complete.
> After Part 2: Continue to `step-5c-architecture-output.md`

## Process (continued from Part 1)

### 8. Technology Stack

For each technology choice:
- What: The technology
- Why: Rationale (not "it's popular" — concrete reasons)
- Alternatives considered: What else was evaluated
- Trade-offs: What we gain and lose
- Performance implications

### 9. User Journeys

Map the primary user journeys as ASCII flows, referencing screens and APIs:

```
User opens app (SCR-01)
    │
    ▼
Login screen (SCR-02) ──wrong creds──▶ Error (API-02 → 401)
    │                                        │
    correct (API-02 → 200)                   ▼
    │                                   Retry login
    ▼
Dashboard (SCR-03, API-10)
    │
    ├──▶ Feature A (SCR-04, API-11..14)
    ├──▶ Feature B (SCR-05)
    └──▶ Settings (SCR-06)
```

### 10. Security Architecture

- Authentication strategy (JWT flow, token refresh, storage)
- Authorization model (RBAC, permissions matrix)
- Input validation strategy
- CORS policy
- Rate limiting
- Data encryption (at rest, in transit)

### 11. Performance Architecture

- Caching strategy (what, where, TTL)
- CDN for static assets
- Database query optimization (indexes, explain plans)
- Frontend optimization (code splitting, lazy routes, image optimization)
- API response optimization (pagination, field selection, compression)

### 12. ADR Generation

For each significant decision, create an ADR:

```markdown
# ADR-NNN: [Title]

## Status: Accepted

## Context
[Why this decision was needed]

## Decision
[What was decided]

## Alternatives Considered
- [Alternative 1]: [Why rejected]
- [Alternative 2]: [Why rejected]

## Consequences
- Positive: [Benefits]
- Negative: [Trade-offs]
- Risks: [What could go wrong]
```

## When Complete (Part 2)

- Technology stack documented with rationale
- User journeys mapped with screen and API references
- Security architecture defined
- Performance architecture defined
- ADRs created for all significant decisions
- Continue to Part 3: Read `phases/planning/step-5c-architecture-output.md`
