# GitHub Flow (MAINTAIN sub-protocol)

> Shared sub-protocol used by **all** maintain pipelines (HOTFIX / BUGFIX / ENHANCE).
> Wraps the existing pipeline with: GitHub issue → worktree → branch → PR → user-approved squash merge → cleanup.
> Pre-release pipelines (DEV / BUGFIX / CHANGE before release) are **NOT** affected.

<EXTREMELY-IMPORTANT>
Post-release **maintenance commits** (HOTFIX/BUGFIX/ENHANCE code changes) MUST go through a Pull Request — direct push/commit to `main` is FORBIDDEN.

Two narrow exceptions, explicitly permitted:
1. **One-shot maintain bootstrap**: adding `.claude/worktrees/` to `.gitignore` on first MAINTAIN entry. This goes through a tiny chore PR (`chore(asel): ignore asel worktrees`), not a direct commit.
2. **Release process** (`phases/release/release-process.md`): the release commit (production marker on ROUTEMAP + release notes file) is user-driven, atomic, and audit-trailed by the git tag + GitHub Release. This is allowed as a direct commit on `main` because release is itself the gate.

There are NO other exceptions. ROUTEMAP is **NOT** edited during maintain — GitHub Issues + PRs hold the live state.
</EXTREMELY-IMPORTANT>

## State Model

GitHub is the source of truth during maintenance:

| State | Where it lives |
|-------|----------------|
| Open maintenance items (in-progress) | `gh issue list --state open --label hotfix,bug,enhance` |
| Open PRs awaiting merge approval | `gh pr list --state open` |
| Closed/merged history | `gh issue list --state closed` + `gh pr list --state merged` |
| Release-time consolidated history | ROUTEMAP `## vX.Y.Z (date)` section, written ONCE at next release |
| Production markers | ROUTEMAP `## Production: vX.Y.Z (date)` |

ROUTEMAP's Maintenance section is **append-only at release time**. It is NOT touched during maintain item processing.

## Prerequisites (run on first MAINTAIN entry, then once per session)

Run this checklist BEFORE starting any maintain pipeline. If a check fails, STOP and surface to user; never silently fall back.

```bash
# 1. gh CLI present and authenticated
gh --version || { echo "gh CLI required"; exit 1; }
gh auth status || { echo "gh auth login required"; exit 1; }

# 2. GitHub remote
REMOTE_URL=$(git remote get-url origin 2>/dev/null) || { echo "no origin remote"; exit 1; }
case "$REMOTE_URL" in *github.com*) ;; *) echo "origin is not github.com: $REMOTE_URL"; exit 1 ;; esac

# 3. Clean main — verify only, NEVER auto-reset (would destroy WIP)
git checkout main
git fetch --all --prune
test -z "$(git status --porcelain)" || { echo "main is dirty — commit, stash, or discard before maintain"; exit 1; }
# If user has uncommitted work on main, STOP. Surface to user with options:
#   (a) commit it on a non-maintain branch, (b) stash it, (c) discard it (user must run reset themselves).
# Ana Asel never runs `git reset --hard` on the user's behalf.

# 4. Worktree command available
git worktree list >/dev/null || { echo "git too old"; exit 1; }

# 5. Bootstrap labels (idempotent — gh exits non-zero on existing label, so swallow)
gh label create hotfix  --color BB0000 --description "Maintenance: typo/copy/single-file fix" 2>/dev/null || true
gh label create bug     --color D93F0B --description "Maintenance: investigation + Bug Fix TDD"   2>/dev/null || true
gh label create enhance --color 0E8A16 --description "Maintenance: additive new capability"      2>/dev/null || true

# 6. Bootstrap .gitignore for worktree paths (one-shot chore PR if missing)
if ! grep -qE '^\.claude/worktrees/' .gitignore 2>/dev/null; then
  # See "One-shot bootstrap PR" section below — this is run ONCE per project.
  echo "BOOTSTRAP_REQUIRED=1"
fi
```

### One-shot bootstrap PR (if `.gitignore` missing the worktree path)

When the prerequisite check returns `BOOTSTRAP_REQUIRED=1`, Ana Asel runs this **once per project**, before the first maintain item:

```bash
git checkout -b chore/asel-worktree-ignore origin/main
echo ".claude/worktrees/" >> .gitignore
git add .gitignore
git commit -m "$(cat <<'EOF'
chore(asel): ignore asel worktrees

Adds .claude/worktrees/ to .gitignore so MAINTAIN-mode worktrees
created by Asel don't pollute the working tree.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push -u origin chore/asel-worktree-ignore
gh pr create \
  --title "chore(asel): ignore asel worktrees" \
  --body "One-shot setup PR for Asel maintain mode. Adds \`.claude/worktrees/\` to \`.gitignore\`. Safe to merge — only modifies \`.gitignore\`." \
  --base main \
  --head chore/asel-worktree-ignore
```

User approves and merges this PR. After merge, `git checkout main && git pull --ff-only` and proceed to the maintain item.

## Conventions

| Item | Format | Example |
|------|--------|---------|
| Item ID | `<PREFIX>-NNN` (zero-padded 3 digits, derived from `gh issue list` count + 1 per type) | `BUG-007`, `HOTFIX-002`, `ENH-014` |
| Branch name | `<type>/<id-lowercase>-<slug>` | `fix/bug-007-login-timeout`, `hotfix/hotfix-002-button-label`, `feat/enh-014-pdf-export` |
| Worktree path | `.claude/worktrees/<ID>` | `.claude/worktrees/BUG-007` |
| Issue label | `hotfix` \| `bug` \| `enhance` | — |
| Commit message subject | `<type>(<ID>): <title>` | `fix(BUG-007): login times out on slow networks` |
| PR title | Same as commit subject | — |
| Squash merge commit subject | Same as PR title | — |

`<type>` mapping:

| Pipeline | type prefix | issue label | branch prefix |
|----------|-------------|-------------|---------------|
| HOTFIX | `fix` | `hotfix` | `hotfix/` |
| BUGFIX | `fix` | `bug` | `fix/` |
| ENHANCE | `feat` | `enhance` | `feat/` |

### ID assignment

To derive `<ID>` for a new item, count existing issues of the same type (open + closed):

```bash
COUNT=$(gh issue list --state all --label "<label>" --json number --jq 'length')
NEXT=$(printf "%03d" $((COUNT + 1)))
ID="<PREFIX>-${NEXT}"
```

ID gaps are allowed (closed/deleted issues leave gaps); the counter never reuses a number.

## Step Sequence

The pipeline file (`maintain-cycle.md`) calls these steps at marked anchor points. Each step is atomic — if it fails, Ana Asel STOPS and reports to user with the failing command + stderr.

### Step GH-1: Create GitHub issue (FIRST, before anything else)

```bash
gh issue create \
  --title "<ID>: <title>" \
  --label "<label>" \
  --body-file <(cat <<'EOF'
[See phases/maintain/templates/issue-<type>.md and substitute placeholders]
EOF
)
```

- Capture the returned issue number → `ISSUE_NUM`
- Announce: `"GitHub issue #${ISSUE_NUM} oluşturuldu — <ID>"`

### Step GH-2: Create worktree + branch from origin/main

```bash
git fetch origin main
git worktree add .claude/worktrees/<ID> -b <branch> origin/main
```

`<branch>` follows the convention table above. The worktree branches from the **freshly fetched** `origin/main`, so it always starts from the latest released-and-merged state.

<EXTREMELY-IMPORTANT>
**Parallel maintenance caveat**: When multiple maintain items run in parallel (autopilot or two manual sessions), each worktree branches from `origin/main` independently. If BUG-002 begins while BUG-001's PR is still open, BUG-002 does **not** see BUG-001's fix.

If a later item depends on an earlier item's fix:
- User must approve-merge the earlier PR first, then start the later item, OR
- After BUG-001 merges, rebase BUG-002 onto fresh origin/main: `cd .claude/worktrees/BUG-002 && git pull --rebase origin main` and re-run the gate inside the worktree.

Ana Asel flags this in autopilot when it detects two open items touching the same files (best-effort `git diff --name-only` overlap check).
</EXTREMELY-IMPORTANT>

### Step GH-3: Run pipeline body inside worktree

The pipeline-specific steps (Plan / Dev / Gate / E2E) execute against `.claude/worktrees/<ID>`.

Ana Asel prepares each Agent dispatch with two reinforcing mechanisms (so a sub-agent cannot miss the worktree):

1. **Pre-dispatch cd**: Ana Asel runs `cd .claude/worktrees/<ID>` in a Bash step immediately before the Agent dispatch (Agent tool inherits the parent session's cwd).
2. **Context block** in every Agent prompt:
   ```
   WORKTREE: .claude/worktrees/<ID>
   BRANCH: <branch>
   ISSUE: #<ISSUE_NUM>
   ARCHITECTURE: FROZEN (post-release — additive changes only)
   ```

The agent prompts (`developer-prompt.md`, `gate-prompt.md`, `planner-prompt.md`, `e2e-tester-prompt.md`, and the Gate Team Lead agent `asel-gate-lead`, dispatched by name with the Agent tool) carry a top-level directive: *"If your context block contains `WORKTREE:`, treat that path as the project root for all reads, writes, and shell commands."* This is the WORKTREE honor rule — both prompt and cwd reinforce it.

The Gate agent's "Run ALL tests" pass therefore executes inside the worktree, against the new branch state, guaranteeing existing tests still pass.

If Gate FAILS: STOP, do NOT push, do NOT open PR. Surface failure to user with 3 options (düzelt / atla / dur), per Anti-Patterns escalation rule.

### Step GH-4: Commit inside worktree

Inside `.claude/worktrees/<ID>`:

```bash
git add -A
git commit -m "$(cat <<'EOF'
<type>(<ID>): <title>

<short body — what changed and why, 1–3 lines>

Closes #<ISSUE_NUM>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

If pre-commit hook fails → fix the underlying issue and create a NEW commit (NEVER `--no-verify`, NEVER `--amend`).

### Step GH-5: Push + open PR

```bash
git push -u origin <branch>
gh pr create \
  --title "<type>(<ID>): <title>" \
  --body-file <(cat <<'EOF'
[See phases/maintain/templates/pr-body.md — must include "Closes #<ISSUE_NUM>" line and Co-Authored-By footer]
EOF
) \
  --base main \
  --head <branch>
```

- Capture PR number → `PR_NUM`
- Telegram: `"[Project] <ID>: <title> — PR [#${PR_NUM}](url) açıldı, merge onayı bekleniyor"`

### Step GH-6: USER APPROVAL gate (mandatory, even in autopilot)

Ana Asel presents:

```
=== PR READY ====================================================================
<ID>: <title>
PR: #<PR_NUM> — <pr_url>
Issue: #<ISSUE_NUM>
Gate: PASS
Tests: <N> passed, <M> regressions verified
Commits: 1 (squash target)

Merge edeyim mi? (evet / hayır / detay)
================================================================================
```

- `evet` → proceed to GH-7
- `hayır` → STOP, leave PR open. Item enters "awaiting" state (visible via `gh pr list`)
- `detay` → run `gh pr diff <PR_NUM>` summary + `gh pr checks <PR_NUM>`, ask again

**AUTOPILOT exception**: This step ALWAYS waits for user input. The autopilot's auto-approve rule does NOT apply to PR merges — this is by user decree (post-release safety).

### Step GH-7: Squash merge + cleanup

The squash-merge commit subject is taken from the PR title; the body is taken from the PR body. The PR body template (`templates/pr-body.md`) includes the Co-Authored-By footer so it carries through to the squash commit on `main`.

```bash
gh pr merge <PR_NUM> --squash --delete-branch
```

`--delete-branch` removes the remote branch. Then clean up the local worktree:

```bash
git worktree remove .claude/worktrees/<ID>
git fetch --prune
```

The issue is auto-closed by GitHub via the `Closes #<ISSUE_NUM>` line in the PR body.

### Step GH-8: Sync + telegram

- Pull main into the original working directory so user's local main is up to date:
  ```bash
  git checkout main && git pull --ff-only origin main
  ```
- Telegram: `"[Project] <ID>: <title> done (X/Y — Z%) — PR [#<PR_NUM>](url) merged"`
  where X/Y is computed from `gh issue list` (Y = open + closed-since-last-release; X = closed-since-last-release).

## Failure Handling

| Failure point | Action |
|---------------|--------|
| Prereq fail (gh / remote / dirty main / git worktree) | STOP, report exact failure, no fallback |
| Bootstrap PR rejected by user | STOP, no maintain item can proceed without `.gitignore` entry |
| GH-1 (issue create fails) | STOP, report gh stderr |
| GH-2 (worktree create fails — branch exists, dirty repo) | STOP, ask user. If branch leftover from previous attempt: `git branch -D <branch>` only after user confirms |
| GH-3 (Gate FAIL) | STOP with 3 options (düzelt/atla/dur). Worktree + branch + issue stay; PR not opened |
| GH-5 (push rejected — main moved) | Inside worktree: `git pull --rebase origin main`, re-run gate, push again |
| GH-6 (user says no) | Leave PR open; item awaiting |
| GH-7 (merge fails — conflicts) | STOP, ask user. Do NOT auto-resolve |

**Never delete a worktree before its branch is merged.** Cleanup only happens in GH-7 after a successful merge.

## Telegram Payload Format

Maintain notifications carry the issue/PR context:

```
[Project] BUG-007: Login timeout fix (3/5 — 60%)
Issue: [#42](url) | PR: [#58](url)
```

Use Markdown links — `notify-telegram.sh` uses `parse_mode=Markdown`.

## Worktree Hygiene

- `.claude/worktrees/` is project-local, gitignored (added by bootstrap PR)
- One worktree per active maintain item (HOTFIX / BUG / ENH)
- Stale worktrees (>7 days, no activity) → Ana Asel flags during next maintain entry; user decides keep/remove
- The user's primary working directory remains on `main` and is **never** dirtied by maintain work
- After every successful merge, `git fetch --prune` removes the deleted remote branch from local refs
