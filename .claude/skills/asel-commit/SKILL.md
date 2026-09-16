---
name: asel-commit
description: Smart commit - analyze changes, group logically, generate conventional commit messages, optionally push & create PR
user-invocable: true
disable-model-invocation: true
allowed-tools: Bash(git:*), Bash(gh:*), Glob, Grep, Read
---

# Smart Commit

## Step 1: Analyze Changes

Current state:
!`git status --short`

Current branch:
!`git branch --show-current`

Staged diff:
!`git diff --cached --stat`

Unstaged diff:
!`git diff --stat`

Untracked files:
!`git ls-files --others --exclude-standard`

If no changes at all → inform user and STOP.

## Step 2: Group Changes Logically

Analyze ALL changed files (staged + unstaged + untracked) and group them by logical purpose:

- Related files that form a single coherent change → one commit
- Independent changes → separate commits
- Config/tooling changes → separate from feature code

Grouping signals:
- Same feature directory → likely same group
- Test file + implementation file → same group
- Migration + model change → same group
- Unrelated bug fix alongside a feature → separate groups

Present the proposed groups to the user:

```
Group 1: feat: add user authentication
  - src/auth/login.ts
  - src/auth/login.test.ts
  - src/middleware/auth.ts

Group 2: fix: correct date formatting in reports
  - src/utils/date.ts

Group 3: chore: update dependencies
  - package.json
  - package-lock.json
```

Wait for user confirmation before committing. User may request changes to grouping.

## Step 3: Generate Commit Messages

Use conventional commits format: `<type>(<scope>): <description>`

Types:
- `feat` — new feature
- `fix` — bug fix
- `refactor` — code restructuring without behavior change
- `docs` — documentation only
- `test` — adding/fixing tests
- `chore` — build, deps, config
- `perf` — performance improvement
- `style` — formatting, no logic change
- `ci` — CI/CD changes

Rules:
- Scope is optional, use when it adds clarity
- Description: imperative mood, lowercase, no period, max 72 chars
- If a group has 5+ files or complex changes, add a body with bullet points
- Body bullets explain WHY, not WHAT
- Every message ends with the co-author footer

Commit message template (heredoc form — keeps the blank line and the footer intact):

```
git commit -F - <<'MSG'
<type>(<scope>): <description>

<optional body>

Co-Authored-By: {{workflow.coAuthor}}
MSG
```

## Step 4: Execute Commits

For each approved group (in order):
1. `git add <files>` — only the files in that group
2. `git commit -m "<message>"` — with the generated message
3. Verify with `git log --oneline -1`

IMPORTANT:
- Never use `git add .` or `git add -A`
- Stage only the specific files in each group
- Skip files that look like secrets (.env, credentials, tokens)
- If a file looks sensitive, warn the user and exclude it

## Step 5: Push & PR (Ask First)

After all commits are done, ask the user:

"N commits created. Push to remote and/or create PR?"

Options:
- **Push only** → `git push` (set upstream if needed: `git push -u origin <branch>`)
- **Push + PR** → push, then `gh pr create --title "<title>" --body "<body>"`
- **Nothing** → done, commits are local only

If no remote configured → skip this step, inform user.

PR title: summarize all commits in one line.
PR body: list all commits as bullet points.
