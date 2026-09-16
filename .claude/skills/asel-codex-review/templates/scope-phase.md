# Scope: Phase Review

You are reviewing all DONE stories in a development phase for cross-story consistency, integration, and phase-boundary readiness.

## Target

- Phase number: `<PHASE_NUMBER>`
- Phase directory: `docs/stories/phase-<PHASE_NUMBER>/`
- Stories in scope: `<STORY_LIST>`

## What To Read (in order)

1. **ROUTEMAP** — `docs/ROUTEMAP.md`
   - Filter to Phase <PHASE_NUMBER> table
   - Confirm which stories are DONE, which are PENDING
   - ONLY review DONE stories + any FIX-NNN in this phase
2. **Every DONE story file** — `docs/stories/phase-<PHASE_NUMBER>/STORY-*.md`
3. **Plan + Gate + Review reports** per story (if they exist)
4. **Design docs** (read sections relevant to this phase):
   - `docs/ARCHITECTURE.md` — phase scope areas
   - `docs/PRODUCT.md` — features this phase delivers
   - `docs/SCREENS.md` — screens this phase owns
   - `docs/SCOPE.md` — phase boundary definition
   - `docs/brainstorming/decisions.md` — any ADRs + decisions from this phase
5. **All implementation code** affected by this phase's stories
6. **All tests** for this phase

## What To Check

### Cross-story consistency
- [ ] Shared contracts (types, API envelopes, error shapes) match across stories
- [ ] Database schema is coherent (FKs resolve, no orphan columns, naming consistent)
- [ ] Component reuse: later stories use primitives built by earlier stories instead of duplicating
- [ ] Naming conventions consistent across files created in this phase
- [ ] Layer boundaries respected (no cross-layer imports added as shortcuts)
- [ ] Design tokens used consistently (if UI — no hardcoded colors, pixel values, raw HTML)

### Phase completeness
- [ ] Every story marked DONE in ROUTEMAP has actual working code
- [ ] Every story's ACs are still satisfied (not broken by later stories)
- [ ] FIX-NNN entries resolved the issues they claimed (verify with code)
- [ ] Integration paths between stories work end-to-end (e.g., story A emits event, story B consumes)

### False-DONE detection
- [ ] No stubbed/mocked implementations labeled as complete
- [ ] No disabled features behind `if (false)` / feature flags set to off / commented-out imports
- [ ] No endpoints declared in docs but returning 501/404/mock data
- [ ] No "will be implemented in STORY-X" comments left in DONE stories
- [ ] Test coverage matches story AC coverage (not just "tests pass" but "tests actually cover the ACs")

### Phase-boundary readiness
- [ ] Phase deliverables (per SCOPE.md) are all present
- [ ] No tech debt flagged as blocking phase closure left in ROUTEMAP Tech Debt table
- [ ] No unresolved findings from prior gate/review reports

### Evidence sources
- For cross-story BUG: show story A's output + story B's input + where they misalign
- For false-DONE: quote story AC, show the file that should implement it, show it's empty/stub
- For inconsistency: show two stories doing the same thing differently

## Do NOT check
- Other phases (out of scope)
- PENDING stories in this phase (they're not supposed to be done yet)
- Full project-level rollout concerns (project-scope review handles that)

## Report Back

Follow the output format defined in the reviewer instructions. Scope value: `phase`. Target value: `phase-<PHASE_NUMBER>`.

Group findings by story when possible — add `**Affected story:** STORY-NNN` line to each finding to help Asel route fixes.
