# Release Process

> Create a versioned release with git tag, GitHub release, ROUTEMAP production marker, and history consolidation. Activates (or refreshes) MAINTAIN mode.
> Before starting: Verify Documentation phase is COMPLETE (or user explicitly skips docs).
> After completion: Update ROUTEMAP — add production marker + consolidated history block, refresh maintenance.

## Trigger

When user says "release", "canliya al", "v1", or similar.

## Prerequisites

- Documentation phase COMPLETE (or user explicitly skips docs).
- `gh --version` succeeds and `gh auth status` is OK.
- `git remote get-url origin` points to github.com.
- Working tree on `main` is clean (no uncommitted work).
- For subsequent releases (post-v1): **no open PRs** for maintenance items (they must be merged or closed before release). Verify: `gh pr list --state open --label hotfix,bug,enhance` returns empty.
- For subsequent releases: **no open maintenance issues** that should ship in this release. Surface `gh issue list --state open --label hotfix,bug,enhance` to user — they decide ship-now vs defer-to-next-release.

If any check fails, STOP and report to user.

<EXTREMELY-IMPORTANT>
The release commit (production marker + history block + release notes file) is the **only** direct commit to `main` permitted in MAINTAIN mode. It is user-driven, atomic, and audit-trailed by the git tag + GitHub Release. Maintenance code changes still go through PRs.
</EXTREMELY-IMPORTANT>

## Process

### Step 1: Determine version

Read ROUTEMAP → determine version:

- First release ever → `v1.0.0`
- Has production marker + accumulated maintenance items → auto-calculate:
  - Only HOTFIX/BUG closed since last release → patch bump (v1.0.x)
  - Any ENH closed since last release → minor bump (v1.x.0)
- User says "v2" explicitly → major bump (v2.0.0)

For subsequent releases, derive the previous release date:

```bash
PREV_TAG=$(git describe --tags --abbrev=0 2>/dev/null)
PREV_DATE=$(git log -1 --format=%cI "$PREV_TAG")
```

### Step 2: Aggregate closed maintenance items

Subsequent releases only — for v1.0.0 this step is skipped (no maintenance history yet).

```bash
# Closed maintenance issues since previous release tag date
gh issue list \
  --state closed \
  --label hotfix,bug,enhance \
  --search "closed:>=$PREV_DATE" \
  --json number,title,labels,closedAt,url \
  --jq '.[] | {n: .number, t: .title, l: [.labels[].name], u: .url}'

# Merged PRs since previous release tag date (cross-check)
gh pr list \
  --state merged \
  --search "merged:>=$PREV_DATE" \
  --json number,title,url,mergedAt \
  --jq '.[] | {n: .number, t: .title, u: .url}'
```

Cross-reference: each closed issue with a hotfix/bug/enhance label should map to exactly one merged PR (issue title and PR title share the `<ID>: …` prefix). If a closed issue has no PR, surface to user — likely closed manually without shipping.

### Step 3: Generate release notes

Use template `phases/maintain/templates/release-notes.md`. Group items by label:

- **Hotfixes** (label: `hotfix`)
- **Bug fixes** (label: `bug`)
- **Enhancements** (label: `enhance`)

Each bullet: `**<ID>** — <title> ([#<issue>](url) / [#<PR>](url))`. For BUG/ENH, add a one-line user-visible impact line below the bullet.

Write to `docs/maintenance/release-notes-vX.Y.Z.md`. Ana Asel drafts → presents to user → edits if requested → user approves.

Autopilot rule: auto-approve only if no breaking-change ADRs (no files matching `docs/adr/*.md` newer than `$PREV_DATE`); otherwise force user review.

### Step 4: Create annotated git tag

```bash
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

### Step 5: Create GitHub Release

```bash
gh release create vX.Y.Z \
  --title "vX.Y.Z" \
  --notes-file docs/maintenance/release-notes-vX.Y.Z.md \
  --verify-tag
```

Capture release URL from output.

Variants:
- Pre-release / beta cuts: add `--prerelease`
- Draft (review before publish): add `--draft`, then publish later with `gh release edit vX.Y.Z --draft=false`

### Step 6: Update ROUTEMAP (release commit)

This is the only direct main commit in MAINTAIN mode. Edits performed in one atomic commit:

1. Add production marker:
   ```markdown
   ## Production: vX.Y.Z (YYYY-MM-DD)
   ```
2. For subsequent releases, add consolidated history block immediately under the marker:
   ```markdown
   ## v1.1.0 (2026-03-10)
   - HOTFIX-001: Login button label typo ([#12](issue-url) / [#13](pr-url))
   - BUG-001: Login timeout fix ([#14](issue-url) / [#15](pr-url))
   - ENH-001: PDF export ([#18](issue-url) / [#20](pr-url))
   ```
3. Ensure `docs/maintenance/` directory exists.
4. Stage release notes file (`docs/maintenance/release-notes-vX.Y.Z.md`) for commit.

```bash
git add ROUTEMAP.md docs/maintenance/release-notes-vX.Y.Z.md
git commit -m "$(cat <<EOF
chore(release): vX.Y.Z

Production marker, consolidated history, release notes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push origin main
```

ROUTEMAP no longer carries an open Maintenance table — open items live in GitHub. The `## Maintenance` table that may exist in older projects from before this convention can stay (legacy), but Ana Asel does NOT add to it after this release.

### Step 7: Telegram

Use Markdown link, payload uses `parse_mode=Markdown`:

```
[Project] vX.Y.Z released! (N fix, M enhancement)
[GitHub release](https://github.com/<org>/<repo>/releases/tag/vX.Y.Z)
```

### Step 8: Display

```
=== RELEASE ========================================================================
[Project] vX.Y.Z released
Git tag:        vX.Y.Z
GitHub release: https://github.com/<org>/<repo>/releases/tag/vX.Y.Z
Notes:          docs/maintenance/release-notes-vX.Y.Z.md
ROUTEMAP:       production marker + history block added
Maintenance:    active (GitHub flow — see phases/maintain/github-flow.md)
==================================================================================
```

## When Complete

- Git tag created and pushed: `vX.Y.Z`
- GitHub release published with categorized notes
- ROUTEMAP updated with production marker + consolidated history block
- Release notes file persisted under `docs/maintenance/release-notes-vX.Y.Z.md`
- Telegram notification sent (with release URL)
- Maintenance mode now active — all subsequent bugs/features go through GitHub issue + PR flow
- Next: Bugs/features go through maintain cycle → Read `phases/maintain/maintain-cycle.md`
