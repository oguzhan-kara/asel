# Step 5c: Architecture Output (Part 3 of 3)

> README, Makefile, config files, CLAUDE.md, project skills, scale-adaptive structure, output files.
> This is Part 3 of 3 — covers Process sections 13-17, Scale-Adaptive Structure, and Output Files.
> Before starting: Ensure Part 2 (step-5b) is complete.
> After completion: Update ROUTEMAP — mark Step 5 as `[x] DONE` with date

## Process (continued from Part 2)

### 13. README.md Generation

After architecture design is complete, generate a project `README.md` at the project root:

```markdown
# [Project Name]

[1-2 sentence description]

> Read `{{aselRoot}}/references/architecture-output-templates.md` now and follow it, then return here.
> Read `{{aselRoot}}/references/architecture-output-claudemd.md` now and follow it, then return here.
## Scale-Adaptive File Structure

<EXTREMELY-IMPORTANT>
Detect project scale and split architecture files accordingly. Single monolithic files become unmanageable for Claude Code at scale.
</EXTREMELY-IMPORTANT>

### Scale Detection

| Scale | Threshold | Approach |
|-------|-----------|----------|
| **Small** | < 50 APIs, < 30 tables, < 10 flows | Single `ARCHITECTURE.md` |
| **Medium** | 50-200 APIs, 30-100 tables | Domain-based split |
| **Large** | 200+ APIs, 100+ tables | Domain + sub-domain split |

### Split Structure (Medium/Large)

When splitting, `ARCHITECTURE.md` becomes an index/summary. Details go to domain files:

```
docs/
├── ARCHITECTURE.md              ← summary, general decisions, tech stack
├── architecture/
│   ├── api/
│   │   ├── _index.md            ← API-NNN | name | method | path (one-line each)
│   │   ├── user-management.md   ← full API specs for this domain
│   │   ├── billing.md
│   │   └── reporting.md
│   ├── db/
│   │   ├── _index.md            ← TBL-NNN | name | key relationships
│   │   ├── user-tables.md
│   │   └── billing-tables.md
│   ├── services/
│   │   ├── _index.md            ← SVC-NNN | name | responsibility
│   │   └── ...
│   ├── flows/
│   │   ├── _index.md            ← FLW-NNN | name | trigger
│   │   ├── data-ingestion.md
│   │   └── payment-processing.md
│   └── journeys/
│       ├── _index.md            ← JRN-NNN | persona | flow summary
│       ├── new-user-onboarding.md
│       └── admin-reporting.md
```

**Index files** contain one-line summaries — lightweight and scannable.
**Domain files** contain full specs — loaded only when needed.

### Extension Points for FUTURE.md

When designing architecture, check `docs/FUTURE.md` and ensure:
- Database schema has room for future features (nullable columns, junction tables, JSONB flexibility)
- API design allows versioning and extension
- Component architecture supports lazy-loaded future modules
- Service boundaries account for future integrations
- Document extension points in ARCHITECTURE.md under a "## Extension Points" section

## ARCHITECTURE.md Template

Use the template from `templates/ARCHITECTURE.template.md` as the base structure. The template is located in the asel skill directory at `~/{{aselRoot}}/templates/ARCHITECTURE.template.md`.

## Output Files

- `docs/ARCHITECTURE.md` — Full architecture document with ALL sections above
- `docs/adrs/ADR-001-*.md` through `ADR-NNN-*.md` — One per decision
- `README.md` — Project README at root (generated after architecture is finalized)
- `Makefile` — Project Makefile at root (help as default target)
- `.gitignore` — Git ignore rules adapted to stack
- `.env.example` — Environment variable template with placeholders
- `CLAUDE.md` — Project context for Claude Code (includes Docker URLs, admin credentials, conventions)
- `.claude/skills/*/SKILL.md` — Project-specific skills (if patterns detected)
- Update `docs/brainstorming/decisions.md`

## When Complete

- Architecture summary complete
- Number of ADRs created
- Key technology choices documented
- Service count, API count, Table count, Container count
- File structure: single file or split (N domain files)
- Seed files defined (SEED-01, SEED-02)
- README.md generated
- Makefile generated
- .gitignore and .env.example generated
- CLAUDE.md generated
- Extension points for FUTURE.md documented
- Reference ID registry summary
- Project-specific skills created: N (list names) or "None needed"
- Update ROUTEMAP → Step 5 `[x] DONE`
- Next: Read `phases/planning/step-6-screen-design.md`
