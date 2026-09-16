# Commit Conventions

All commits MUST follow Conventional Commits format. This enables automated changelog generation and semantic versioning.

## Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
Co-Authored-By: Claude <noreply@anthropic.com>
```

## Types

| Type | When | Example |
|------|------|---------|
| `feat` | New feature or capability | `feat(auth): add OAuth2 device code flow` |
| `fix` | Bug fix | `fix(api): correct pagination offset calculation` |
| `docs` | Documentation only | `docs: complete planning phase` |
| `style` | Code style, formatting (no logic change) | `style(ui): apply design token enforcement` |
| `refactor` | Code change that neither fixes nor adds feature | `refactor(service): extract validation logic` |
| `perf` | Performance improvement | `perf(db): add index on orders.customer_id` |
| `test` | Adding or fixing tests | `test(auth): add refresh token rotation tests` |
| `chore` | Build, CI, tooling, deps | `chore: sync asel skill set` |

## Scope

- Use the feature/module name: `auth`, `users`, `api`, `db`, `ui`
- Story reference for development: `feat(STORY-003): user management CRUD`
- Fix reference for pre-release bugfix: `fix(FIX-001): login button alignment`
- Gate/Phase reference: `fix(phase-1-gate): turkish text corrections`
- **Post-release maintenance** (see `phases/maintain/maintain-cycle.md`):
  - HOTFIX: `fix(HOTFIX-002): login button label typo`
  - BUGFIX: `fix(BUG-007): login times out on slow networks`
  - ENHANCE: `feat(ENH-014): pdf export for reports`
  - All maintenance commits land on `main` ONLY via squash-merged PRs — NEVER directly

## Rules

- **Subject line max 72 characters**
- **Imperative mood**: "add feature" not "added feature"
- **No period at end** of subject line
- **Body** explains WHAT and WHY, not HOW
- **Footer** for breaking changes: `BREAKING CHANGE: removed /api/v1 endpoints`
- **Co-Authored-By** header when Claude assists
