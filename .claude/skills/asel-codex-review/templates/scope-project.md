# Scope: Project-Wide Review

You are reviewing the entire project — every DONE story across every phase, every doc, the whole codebase — for global coverage, consistency, and drift.

## Target

- Project root: current working directory
- All DONE stories + all design docs
- Entire `src/` (or equivalent) tree

## What To Read (prioritized — spend budget on high-value files)

1. **ROUTEMAP** — `docs/ROUTEMAP.md`
   - Full: list of all stories, their status, all phases, tech debt table
   - Note which stories are DONE (in scope) vs PENDING (out of scope for implementation review)
2. **Core design docs** (full read):
   - `docs/PRODUCT.md` — full feature inventory
   - `docs/SCOPE.md` — phase boundaries
   - `docs/ARCHITECTURE.md` — API + schema + component inventory
   - `docs/SCREENS.md` — full screen inventory (if UI project)
   - `docs/brainstorming/decisions.md` — all decisions + ADR references
   - `docs/adrs/*.md` — all ADRs
3. **All DONE story files** — `docs/stories/phase-*/STORY-*.md` + `FIX-*.md`
4. **Entire code tree** — `src/`, `app/`, or equivalent; migrations; tests; infra configs
5. **Prior Asel agent reports** — `docs/reports/*.md`, any phase-gate reports
   - Note unresolved findings carried over across phases

## What To Check (project-scope only — things per-story and per-phase review miss)

### Reverse coverage (PRODUCT → Code)
- [ ] Every feature mentioned in PRODUCT.md has a story implementing it
- [ ] Every feature with a story DONE has actual code implementing it
- [ ] No features in PRODUCT with NO_STORY status (unplanned)
- [ ] No PARTIAL features (story exists but only covers part of the feature)

### Forward coverage (Code → PRODUCT)
- [ ] No code for features NOT in PRODUCT (scope creep)
- [ ] No orphan endpoints, orphan tables, orphan screens (built but not specified)

### Schema integrity
- [ ] Every DB table in ARCHITECTURE has a migration
- [ ] Every migration matches a declared table
- [ ] FK relationships documented and enforced
- [ ] Seed data (if any) matches current schema

### API integrity
- [ ] Every endpoint in ARCHITECTURE has a handler
- [ ] Every handler has a route registration
- [ ] Error envelope consistent across endpoints
- [ ] Auth/authorization applied consistently

### UI integrity (if UI project)
- [ ] Every screen in SCREENS has a route + component
- [ ] Design tokens applied project-wide (grep for hex colors, arbitrary px, raw HTML)
- [ ] Component library consistent (no mix of raw HTML + shadcn/ui)
- [ ] Empty/loading/error states present on data-driven screens

### Dead code / false-done / drift
- [ ] No leftover stubs, TODOs, commented-out "will add later" blocks
- [ ] No feature flags set to off for features claimed DONE
- [ ] No mocks shipping as production implementation
- [ ] Docs and code match — if docs say field X, field X exists with that type

### Cross-phase regressions
- [ ] Features from Phase 1 still work after Phase 2/3 changes
- [ ] Database migrations are additive (no destructive changes breaking past data)
- [ ] Shared utilities used consistently — no Phase 2 reimplementing Phase 1 helpers

### Security baseline
- [ ] No secrets in repo (env.local, config, sample files)
- [ ] Auth enforced where docs specify
- [ ] Input validation on every external boundary (API, form, file upload)
- [ ] Output encoding on every rendered value

### Tech debt reality check
- [ ] Tech debt table in ROUTEMAP matches actual code state (debt items still present, not silently fixed)
- [ ] Target stories referenced in tech debt exist

## Report Back

Follow the output format defined in the reviewer instructions. Scope value: `project`. Target value: `project`.

**Budget discipline:** prioritize HIGH/CRITICAL findings. A project review can balloon — cap LOW-severity findings at 10. If there are more, group them as "additional minor observations" and summarize.

Group findings logically:
- By feature/module (rather than file order) — easier for Asel to route
- Add `**Affected story:** STORY-NNN` when traceable; `**Affected feature:** <name from PRODUCT>` otherwise
