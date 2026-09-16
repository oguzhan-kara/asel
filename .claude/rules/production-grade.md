---
description: Enforces production-grade quality in all planning and development. No MVP, no shortcuts.
globs: *
---

# Production-Grade Rule

## NEVER use MVP approach

This team builds **production-grade software only**. There is no MVP phase, no "simplify for now", no "we can improve later".

### Planning
- Every feature planned must be the **complete, final version** — not a stripped-down starter
- Do NOT split features into "basic now, advanced later" unless the user explicitly requests phasing
- Do NOT suggest "simplified version first" or "we can add this in a future phase"
- Scope documents define what IS built vs what is NOT built — not what is "MVP" vs "post-MVP"
- Use **"Core Features"** and **"Extended Features"** instead of MVP/post-MVP language

### Development
- Every component, API, service must be **production-ready** when implemented
- Full error handling, full validation, full edge case coverage
- No placeholder implementations, no TODO stubs, no "good enough for now"
- Performance optimization is part of the story, not a follow-up
- Accessibility, i18n, responsive design are baseline — not enhancements

### Banned Terms
- "MVP", "minimum viable", "basic version", "simplified version"
- "We can improve this later", "good enough for now", "phase 2 enhancement"
- "Quick and dirty", "temporary solution", "starter implementation"

### What IS Acceptable
- Phasing by **feature completeness** (Phase 1 = Auth complete, Phase 2 = Dashboard complete)
- Deferring **entire features** to later phases (not half-baking them)
- Explicit "Out of Scope" items in SCOPE.md (features we choose NOT to build)
- Gate DEFERRED items: only when the target subsystem literally does not exist yet — tracked in `ROUTEMAP → Tech Debt` with mandatory target story. This is NOT "good enough for now" — it is "cannot build without the dependency"
