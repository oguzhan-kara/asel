# Scope: Single Story Review

You are reviewing a single story's implementation against its design.

## Target

- Story ID: `<STORY_ID>`
- Story file: `<STORY_FILE>`
- Plan file (if exists): `<PLAN_FILE>`
- Gate report (if exists): `<GATE_REPORT>`
- Review report (if exists): `<REVIEW_REPORT>`

## What To Read (in order)

1. **Story file** — `<STORY_FILE>`
   - Extract: ACs, in-scope components, data model, API contracts
2. **Plan file** — `<PLAN_FILE>` (if exists)
   - Extract: task decomposition, architecture specs, expected file paths
3. **Existing Gate + Review reports** — `<GATE_REPORT>`, `<REVIEW_REPORT>`
   - These are PRIOR reviews by Asel's own agents. Do NOT trust them blindly — you are the independent check. But if they mention unresolved findings, verify whether those are still real.
4. **Project-wide design docs** (read for context, not the whole file):
   - `docs/ARCHITECTURE.md` — only the sections the story touches
   - `docs/PRODUCT.md` — the feature this story delivers
   - `docs/SCREENS.md` — only screens the story owns (if UI story)
5. **Implementation code** — file paths referenced in the plan + story
6. **Tests** — unit/integration tests for this story

## What To Check

### Story-scope checks
- [ ] Every AC in the story has a corresponding code implementation (trace AC → file:line)
- [ ] Every AC has test coverage (positive + negative paths)
- [ ] API endpoints declared in the story exist, return the declared shape, handle error cases
- [ ] DB fields declared in the story exist in migrations and match types
- [ ] UI elements declared in SCREENS are present in the component (if UI story)
- [ ] Error handling, validation, and edge cases (empty/null/max-length) exist
- [ ] No placeholder code (TODO, `throw new Error("not implemented")`, console.log debug output)
- [ ] No disabled/commented-out code blocks pretending to be implemented
- [ ] Mock data or stub responses not shipping as real implementations

### Integration checks
- [ ] Code respects the documented architecture boundaries (no layer leaks)
- [ ] Uses shared patterns established by earlier stories (consistency)
- [ ] Doesn't duplicate existing utilities

### Evidence sources
- For BUG: run the logic mentally against an input, show where it fails
- For MISSING: quote the AC from story, show that no file implements it
- For DIVERGENCE: quote story spec + quote actual code, show the mismatch
- For DOC-DRIFT: quote doc + quote code, show the disagreement

## Do NOT check
- Other stories' scope (cross-story is project-scope review's job)
- Phase-level concerns (phase boundary is phase-scope review's job)
- Performance/load testing (static analysis only)

## Report Back

Follow the output format defined in the reviewer instructions. Scope value: `story`. Target value: `<STORY_ID>`.
