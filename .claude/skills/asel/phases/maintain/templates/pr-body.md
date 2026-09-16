## Summary

<one paragraph: what changed and why>

Closes #<ISSUE_NUM>

## Type

- [ ] HOTFIX — single-file copy/label fix
- [ ] BUGFIX — root cause fix with reproduction test
- [ ] ENHANCE — new capability (additive)

## Changes

- <bullet 1: file/module + what changed>
- <bullet 2>
- <bullet 3>

## Architecture Guard (post-release)

- [ ] No existing endpoint modified or deleted
- [ ] No existing DB column renamed or deleted
- [ ] No existing component interface broken
- [ ] If any of the above is unchecked, ADR linked: `docs/adr/<NNNN>-<slug>.md`

## Tests

- New tests added: <count + brief description, or NONE for HOTFIX>
- Reproduction test (BUGFIX only): <test path + name>
- Full suite result: <PASS / FAIL — must be PASS to merge>
- Regression check: <PASS — no existing tests broken>

## Gate Report

- Gap: PASS / N/A
- Compliance: PASS
- Security: PASS
- Tests: PASS (X passed, 0 failed)
- Performance: PASS / N/A
- Build: PASS
- UI Quality: PASS / N/A

Full gate report: `docs/maintenance/<ID>-gate-report.md`

## E2E Regression

- [ ] Affected flows smoke-tested (BUGFIX / ENHANCE only — N/A for HOTFIX)
- [ ] No regressions in adjacent flows

## Manual verification

<bulleted reproduction-then-fix walkthrough — what reviewer (you, the user) should click/run to confirm>

## Linked

- Issue: #<ISSUE_NUM>
- ROUTEMAP entry: `<ID>` (will appear in next release's history block — not edited during maintain)
- Worktree: `.claude/worktrees/<ID>` (will be removed on merge)
- Plan: `docs/maintenance/<ID>-<slug>.md` (BUGFIX/ENHANCE only)

---

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
