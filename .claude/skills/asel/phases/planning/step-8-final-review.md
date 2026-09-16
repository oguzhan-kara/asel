# Step 8: Final Review

> Dispatch Reviewer agent for comprehensive planning consistency check.
> Before starting: Update ROUTEMAP — mark Step 8 as `[~] IN PROGRESS`
> After completion: Update ROUTEMAP — mark Step 8 as `[x] DONE` with date

## Process

1. **Update ROUTEMAP**: Mark Step 8 as `[~] IN PROGRESS`
2. dispatch `Agent(subagent_type: "asel-reviewer", prompt: …)` with context "planning-review"; model and effort come from the agent definition
3. Agent writes report → `docs/reports/planning-review.md`
4. Agent returns summary → Asel reads summary
5. Agent checks:
   - All stories reference architecture components
   - All stories reference relevant screens
   - All stories with DB changes specify migration requirements
   - GLOSSARY covers all domain terms
   - FUTURE.md items don't overlap with current scope
   - Architecture has extension points for FUTURE.md items
   - No orphaned references
   - No contradictions between docs
   - Stories are truly development-ready (no ambiguity)
6. Present findings → fix if needed
7. **Update ROUTEMAP**: Mark Step 8 as `[x] DONE` with date

## When Complete

- Planning review report generated at `docs/reports/planning-review.md`
- All consistency checks passed (or issues fixed)
- Update ROUTEMAP → Step 8 `[x] DONE`
- Next: Read `phases/planning/step-9-dev-readiness.md`
