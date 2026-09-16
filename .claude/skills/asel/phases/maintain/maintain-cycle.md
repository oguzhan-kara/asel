# Maintain Cycle

> Post-release maintenance: HOTFIX, BUGFIX, and ENHANCE pipelines with frozen architecture.
> Before starting: Verify production marker exists in ROUTEMAP; run `phases/maintain/github-flow.md` prerequisite checks (gh auth, clean main, labels, .gitignore bootstrap).
> After completion: Issue auto-closed via PR; ROUTEMAP is **NOT** edited (state lives in GitHub).

<EXTREMELY-IMPORTANT>
MAINTAIN mode activates ONLY after a RELEASE (production marker exists in ROUTEMAP).
Before release, bugs are handled by BUGFIX mode (`phases/development/bugfix.md`) and changes by CHANGE mode — architecture is still flexible.
After release, architecture is FROZEN — only additive changes allowed.

**State during maintain lives in GitHub, not in ROUTEMAP.**
- Open items: `gh issue list --state open --label hotfix,bug,enhance`
- Open PRs: `gh pr list --state open`
- ROUTEMAP's Maintenance section is append-only at **release time** (consolidated history under each `## vX.Y.Z (date)` block)

ALL post-release code changes go through GitHub: issue → worktree → branch → PR → user-approved squash merge.
Direct commits to `main` are FORBIDDEN with two narrow exceptions documented in `phases/maintain/github-flow.md`:
1. One-shot bootstrap PR for `.gitignore` (still goes through PR — not actually a direct commit)
2. The release commit itself (release-process.md, user-driven, gated by tag + GitHub Release)
</EXTREMELY-IMPORTANT>

## Architecture Guard (Post-Release)

```
ARCHITECTURE.md = FROZEN after release
├── Existing endpoints: NO modify, NO delete (new endpoints OK)
├── Existing DB columns: NO rename, NO delete (new columns OK)
├── Existing component interfaces: NO breaking changes (new props OK)
├── Existing patterns: MUST be followed for new code
└── Breaking change needed? → ADR + explicit user approval REQUIRED
```

## Triage

When user reports a bug or requests a feature in MAINTAIN mode, Ana Asel auto-classifies:

| Type | Criteria | ID format | Pipeline |
|------|----------|-----------|----------|
| **HOTFIX** | Typo, label, single-file, obvious fix | `HOTFIX-NNN` | Issue → Worktree → Fix → Gate → PR → User merge |
| **BUGFIX** | Investigation needed, multi-file, root cause unknown | `BUG-NNN` | Issue → Worktree → Investigate → Plan → Fix(TDD) → Gate → E2E → PR → User merge |
| **ENHANCE** | New capability, new screen, new endpoint | `ENH-NNN` | Issue → Worktree → Impact → Plan → Dev → Gate → E2E → PR → User merge |

ID assignment: count via `gh issue list --state all --label <label> --json number --jq 'length'` + 1, zero-padded to 3 digits. ID gaps allowed.

Ana Asel announces the classification: "Bu bir [BUGFIX] olarak siniflandirildi. [BUG-NNN] olarak takip ediyorum."
User can override: "hayir bu hotfix" → reclassify (recompute ID).

## GitHub Flow Reference

All three pipelines share the GitHub flow defined in `phases/maintain/github-flow.md`. The shared steps are referenced as **GH-1 … GH-8**:

| Anchor | What |
|--------|------|
| GH-1 | Create GitHub issue (label, body from template) — captures `ISSUE_NUM` |
| GH-2 | Create worktree + branch from `origin/main` |
| GH-3 | Run pipeline body inside worktree (Plan / Dev / Gate / E2E) — `cd` + WORKTREE context block |
| GH-4 | Commit inside worktree (heredoc with `Closes #` and `Co-Authored-By`) |
| GH-5 | Push + open PR (template body) — captures `PR_NUM` |
| GH-6 | **USER APPROVAL** before merge (autopilot also waits) |
| GH-7 | `gh pr merge --squash --delete-branch` + worktree cleanup |
| GH-8 | Sync local main + telegram |

**Read `phases/maintain/github-flow.md` BEFORE starting any pipeline below.** It also documents prerequisite checks (gh auth + clean main + label bootstrap + `.gitignore` one-shot bootstrap PR), parallel-autopilot caveat (later items branched from origin/main don't see earlier in-flight fixes), and the WORKTREE honor rule for sub-agents.

---

## HOTFIX Pipeline

Lightest process — no plan file, no investigation. Still goes through full GitHub flow.

1. **GH-1** — `gh issue create --label hotfix --title "HOTFIX-NNN: <title>" --body-file …` (template: `{{aselRoot}}/phases/maintain/templates/issue-hotfix.md`)
2. **GH-2** — `git worktree add .claude/worktrees/HOTFIX-NNN -b hotfix/hotfix-nnn-<slug> origin/main`
3. **GH-3** — Pipeline body inside worktree:
   - Dispatch Developer agent (Agent):
     - Context: bug description, affected file(s), architecture guard rules, **WORKTREE block**
     - Developer reads code, makes minimal fix, runs ALL existing tests, fixes any failures
   - Dispatch Gate agent (Agent):
     - Verify: build passes, ALL existing tests pass (regression-clean), no pattern violations
     - Gate runs inside worktree (cwd via pre-dispatch `cd`, plus WORKTREE context block)
4. **GH-4** — Commit `fix(HOTFIX-NNN): <title>` inside worktree (heredoc with Closes # + Co-Authored-By)
5. **GH-5** — Push + PR (template: `{{aselRoot}}/phases/maintain/templates/pr-body.md`, label: `hotfix`)
6. **GH-6** — User approval → "evet" / "hayır" / "detay"
7. **GH-7** — `gh pr merge <PR> --squash --delete-branch` + worktree cleanup
8. **GH-8** — Sync local main, Telegram: `"[Project] HOTFIX-NNN: <title> done (X/Y — Z%) — PR #<N> merged"`

## BUGFIX Pipeline

Medium process — investigation + lightweight plan + Bug Fix TDD.

1. **GH-1** — `gh issue create --label bug --title "BUG-NNN: <title>" --body-file …` (template: `{{aselRoot}}/phases/maintain/templates/issue-bug.md`)
2. **GH-2** — `git worktree add .claude/worktrees/BUG-NNN -b fix/bug-nnn-<slug> origin/main`
3. **GH-3** — Pipeline body inside worktree:
   - Dispatch Planner agent in **FIX mode** (Agent):
     - Context: error description, **WORKTREE block**, architecture guard
     - Planner investigates: reads code at WORKTREE, traces code paths, finds root cause
     - Output: `docs/maintenance/BUG-NNN-<slug>.md` (lightweight fix plan, written inside worktree → carries into the PR)
     - Return: summary for user approval
   - User approves fix plan (autopilot: auto-approve plans — but **NOT** PR merge in GH-6)
   - Dispatch Developer agent (Agent) — **Bug Fix TDD**:
     - Context: fix plan file + architecture guard rules + **WORKTREE block**
     - Developer follows Bug Fix TDD protocol:
       a. Write a failing test that reproduces the bug
       b. Run test → confirm it FAILS (proves bug exists)
       c. Implement the fix
       d. Run test → confirm it PASSES (proves fix works)
       e. Run all tests → confirm no regressions
   - Dispatch Gate agent (Agent):
     - Full gate: build, tests, regression, pattern compliance — runs inside worktree
     - Gate verifies: reproduction test exists AND passes
   - E2E regression test (deploy + smoke + affected flows) inside worktree context
4. **GH-4** — Commit `fix(BUG-NNN): <title>` inside worktree (heredoc with Closes # + Co-Authored-By)
5. **GH-5** — Push + PR (template: `{{aselRoot}}/phases/maintain/templates/pr-body.md`, label: `bug`)
6. **GH-6** — User approval → "evet" / "hayır" / "detay"
7. **GH-7** — `gh pr merge <PR> --squash --delete-branch` + worktree cleanup
8. **GH-8** — Sync local main, Telegram: `"[Project] BUG-NNN: <title> done (X/Y — Z%) — PR #<N> merged"`

## ENHANCE Pipeline

Full process — impact analysis + full plan.

1. **GH-1** — `gh issue create --label enhance --title "ENH-NNN: <title>" --body-file …` (template: `{{aselRoot}}/phases/maintain/templates/issue-enhance.md`)
2. **GH-2** — `git worktree add .claude/worktrees/ENH-NNN -b feat/enh-nnn-<slug> origin/main`
3. **GH-3** — Pipeline body inside worktree:
   - Invoke `asel-change-analyst` skill (with **WORKTREE block** in context):
     - Impact analysis across all artifacts
     - Architecture guard check: is this additive or breaking?
     - If breaking → require ADR + user approval before proceeding
     - Change Plan with affected files, written inside worktree at `docs/maintenance/ENH-NNN-impact.md`
   - User approves change plan (autopilot: auto-approve plan, NOT merge)
   - Dispatch Planner agent (Agent):
     - Full story-style plan: `docs/maintenance/ENH-NNN-<slug>.md` (inside worktree)
   - User approves implementation plan (autopilot: auto-approve plan, NOT merge)
   - Dispatch Developer agent (Agent):
     - Full implementation with architecture guard, runs inside worktree
   - Dispatch Gate agent (Agent):
     - Full gate including regression + visual quality, runs inside worktree
   - E2E regression test inside worktree context
4. **GH-4** — Commit `feat(ENH-NNN): <title>` inside worktree (heredoc with Closes # + Co-Authored-By)
5. **GH-5** — Push + PR (template: `{{aselRoot}}/phases/maintain/templates/pr-body.md`, label: `enhance`)
6. **GH-6** — User approval → "evet" / "hayır" / "detay"
7. **GH-7** — `gh pr merge <PR> --squash --delete-branch` + worktree cleanup
8. **GH-8** — Sync local main, Telegram: `"[Project] ENH-NNN: <title> done (X/Y — Z%) — PR #<N> merged"`

## MAINTAIN + AUTOPILOT

Maintenance items support autopilot **for plan approvals only**. PR merge approval (GH-6) ALWAYS waits for the user, even in autopilot.

- User says "otopilot" in MAINTAIN mode → process all items returned by `gh issue list --state open --label hotfix,bug,enhance` sequentially
- One item at a time. Plan auto-approves; merge does NOT.
- HOTFIX: no plans to approve, runs end-to-end up to GH-6
- BUGFIX: auto-approve fix plan, runs end-to-end up to GH-6
- ENHANCE: auto-approve change plan + implementation plan, runs end-to-end up to GH-6
- **GH-6 is a hard stop in autopilot too.** When the user is unavailable, Ana Asel parks the item with PR open, surfaces "merge onayı bekleniyor", and either:
  - moves to the next open issue (parallel PRs are OK because they live in separate worktrees with separate branches), OR
  - if no more open issues, stops and shows a list of PRs awaiting approval (`gh pr list --state open`)

When the user later says "merge et" or approves individual PRs, GH-7/GH-8 run for that item.

**Parallel-item dependency caveat**: Each worktree branches from `origin/main` at GH-2 time. If BUG-002 starts while BUG-001's PR is still open, BUG-002 does NOT see BUG-001's fix. If they conflict, the user must merge BUG-001 first; Ana Asel then rebases BUG-002's worktree onto fresh main and re-runs gate. Best-effort overlap detection: Ana Asel runs `git diff --name-only origin/main..<other-branch>` between any two open maintain branches; on overlap, warns the user before starting the second item.

## Live State Display

Maintenance progress is rendered from `gh issue list` and `gh pr list` (live data, never from ROUTEMAP):

```
=== MAINTAIN (since v1.0.0) =========================================================
Open issues:        4
Open PRs (awaiting):  2
Closed since release: 1
[done] HOTFIX-001  →  [pr] BUG-001 (PR #15 awaiting)  →  [>>] BUG-002 (Gate)  →  [ ] ENH-001
==================================================================================
```

`[pr]` = PR open, GH-6 not yet entered or user said "hayır".
`[>>]` = pipeline body in flight inside worktree.
`[ ]` = open issue, no worktree yet.
`[done]` = closed issue (PR merged) since last release.

## Subsequent Releases

When user says "release" while in MAINTAIN mode → see `phases/release/release-process.md`.

The release process aggregates all closed issues + merged PRs since the previous production marker, generates categorized release notes, creates the git tag + GitHub Release, and **only at this point** writes a consolidated history block to ROUTEMAP under the new `## vX.Y.Z (date)` heading.

## Major Version (v2+)

When user says "v2 planla" or "yeni major versiyon":

1. Architecture UNFREEZES for new scope
2. Read `docs/FUTURE.md` — present planned future features to user
3. Start new Planning cycle (brainstorm → gap → product → architecture → screens → stories)
4. New phases added to ROUTEMAP under new major version
5. Development cycle runs as normal (pre-release rules — direct commits to `main` allowed again until release)
6. When complete, user says "release" → `v2.0.0` + `gh release create`
7. Architecture refreezes, MAINTAIN mode (with GitHub flow) resumes

## Maintenance Telegram Notifications

All maintenance notifications include progress `(X/Y — Z%)` computed from `gh issue list` (Y = open + closed-since-last-release; X = closed-since-last-release).

Progress `(X/Y — Z%)` is included only on notifications where progress has actually advanced (work completed or workflow state changed). Issue-opened notifications omit progress because nothing has been completed by opening an issue.

**Issue opened (GH-1)**: `"[Project] <ID>: <title> — issue [#<N>](url) açıldı"` (no progress fragment)
**PR opened (GH-5)**: `"[Project] <ID>: <title> — PR [#<N>](url) açıldı, merge onayı bekleniyor"` (no progress — still 0 closed for this item)
**DONE (GH-8)**: `"[Project] <ID>: <title> done (X/Y — Z%) — PR [#<N>](url) merged"` (X bumps by 1)
**ESCALATED**: `"[Project] <ID>: <title> — ESCALATED, müdahale gerekli"`
**FAILED**: `"[Project] <ID>: <title> — FAILED, müdahale gerekli"`

## When Complete

- Maintenance item processed (HOTFIX/BUGFIX/ENHANCE)
- GitHub issue closed (auto via PR's `Closes #` line in commit body — squash carries it)
- PR squash-merged with `--delete-branch`
- Local worktree removed, local `main` synced
- Telegram notification sent
- Next item: `gh issue list --state open` (autopilot continues, or wait for user command)
- ROUTEMAP **untouched** — it will be updated only at the next `release`
