## BUG — `<ID>`

**Type:** bug (investigation needed, possible multi-file root cause)
**Reported by:** <user / e2e-check / codex-review>
**Reported at:** YYYY-MM-DD HH:MM
**Severity:** <low / medium / high / critical>

### Description
<one paragraph: what is broken, when it shows up>

### Steps to reproduce
1. <step 1>
2. <step 2>
3. <observed broken behavior>

### Expected behavior
<what should happen>

### Actual behavior
<what does happen, with error messages / screenshots if available>

### Environment
- Version: vX.Y.Z (from production marker)
- Browser / runtime: <if applicable>
- User role: <if applicable>

### Triage
- Classification: BUGFIX (Bug Fix TDD pipeline)
- Architecture impact: <NONE (fix only) | additive (new column/endpoint needed)>
- If breaking change required: ADR + user approval BEFORE proceeding

### Linked
- ROUTEMAP entry: `<ID>`
- Worktree: `.claude/worktrees/<ID>`
- Branch: `fix/<id-slug>`
- Fix plan: `docs/maintenance/<ID>-<slug>.md` (created by Planner in FIX mode)

### Acceptance
- [ ] Reproduction test added (failing first, passing after fix)
- [ ] All existing tests still pass (regression-clean)
- [ ] E2E smoke test on affected flows
