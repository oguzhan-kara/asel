# Dev Phase Bug Handling (BUGFIX Mode)

> Pre-release bug handling. Architecture is NOT frozen. No E2E requirement.
> Fix entries go to current phase's ROUTEMAP table.

When user reports a bug during development (before any release — no production marker):

- "X sayfasında bug var", "login çalışmıyor", "hata alıyorum", "şu bozuk"
- Architecture is NOT frozen — fixes can modify existing code freely
- No E2E requirement — Gate is sufficient
- Fix entries go to current phase's ROUTEMAP table, not a separate maintenance table

## Triage (Pre-Release)

Ana Asel auto-classifies based on bug description:

| Type | Criteria | Prefix | Pipeline |
|------|----------|--------|----------|
| **QUICKFIX** | Typo, label, CSS, single-file, obvious cause | `FIX-NNN` | Fix → Gate → Commit |
| **BUGFIX** | Investigation needed, multi-file, root cause unknown | `FIX-NNN` | Investigate → Plan → Fix → Gate → Commit |

Ana Asel announces: "Bu bir [QUICKFIX/BUGFIX] olarak sınıflandırıldı. FIX-NNN olarak takip ediyorum."
User can override: "hayır bu bugfix" → reclassify.

## FIX Numbering

FIX numbers are sequential per project, independent of story numbers:
- `FIX-001`, `FIX-002`, etc.
- Read ROUTEMAP → find highest existing FIX-NNN → increment

## QUICKFIX Pipeline

Lightest process — no plan file, no investigation. Asel handles directly (direct dispatch).

1. Ana Asel adds to ROUTEMAP Development Phase table:
   `FIX-NNN | quickfix | [title] | [▶] IN PROGRESS | Fix`
2. Dispatch Developer agent (Task, model: "sonnet"):
   - Context: bug description, affected file(s), NO architecture guard (pre-release)
   - Developer reads code, makes fix, runs ALL existing tests, fixes any failures
3. Dispatch Gate agent (Task, model: "opus"):
   - Verify: build passes, existing tests pass
4. Close & Commit:
   - Commit: `fix(FIX-NNN): [title]`
   - Update ROUTEMAP: Status = `[x] DONE`, Step = `Done`
   - **Bootstrap `docs/brainstorming/bug-patterns.md` if missing** (same snippet as dev-cycle Step 7)
   - Append to `bug-patterns.md` under `## Patterns`:
     `- [DATE] PAT-NNN [FIX-NNN]: [pattern] — Prevention: [rule] — Affected: [layer]`
5. Telegram: `"🔧 [Project]\nFIX-NNN: [title] ✓"`
6. Display:
   ```
   ═══ QUICKFIX ═══════════════════════════════════════════════════════════
   FIX-NNN: [title] — DONE
   ═══════════════════════════════════════════════════════════════════════
   ```
7. Return to previous activity (if story was IN PROGRESS, resume it)

## BUGFIX Pipeline (Pre-Release)

Medium process — investigation + lightweight plan. Asel handles directly (direct dispatch).

1. Ana Asel adds to ROUTEMAP: `FIX-NNN | bugfix | [title] | [▶] IN PROGRESS | Investigate`
2. Dispatch Planner agent in **FIX mode** (Task, model: "opus"):
   - Planner investigates: reads error description, traces code paths, finds root cause
   - Output: `docs/stories/phase-N/FIX-NNN-title.md` (lightweight fix plan)
   - Return: summary for user approval
3. User approves fix plan (autopilot: auto-approve)
4. Update ROUTEMAP Step = `Fix`
5. Dispatch Developer agent (Task, model: "sonnet") — **Bug Fix TDD**:
   - Context: fix plan file, NO architecture guard (pre-release)
   - Developer follows Bug Fix TDD protocol (defined in `asel-developer`):
     a. Write a failing test that reproduces the bug
     b. Run test → confirm it FAILS (proves bug exists)
     c. Implement the fix
     d. Run test → confirm it PASSES (proves fix works)
     e. Run all tests → confirm no regressions
6. Dispatch Gate agent (Task, model: "opus"):
   - Full gate: build, tests, regression
   - Gate verifies: reproduction test exists AND passes
7. Close & Commit:
   - Commit: `fix(FIX-NNN): [title]`
   - Update ROUTEMAP: Status = `[x] DONE`, Step = `Done`
   - **Bootstrap `docs/brainstorming/bug-patterns.md` if missing** (same snippet as dev-cycle Step 7)
   - Append to `bug-patterns.md` under `## Patterns`:
     `- [DATE] PAT-NNN [FIX-NNN]: [pattern] — Root Cause: [cause] — Prevention: [rule] — Affected: [layer]`
8. Telegram: `"🔧 [Project]\nFIX-NNN: [title] ✓"`
9. Display:
   ```
   ═══ BUGFIX ═════════════════════════════════════════════════════════════
   FIX-NNN: [title] — DONE
   Root cause: [one-line from planner]
   Test: [reproduction test file:name]
   ═══════════════════════════════════════════════════════════════════════
   ```
10. Return to previous activity

## BUGFIX + AUTOPILOT

When bug is reported during autopilot:
- Autopilot PAUSES on current story
- Bug pipeline runs (QUICKFIX or BUGFIX)
- After fix is done → autopilot RESUMES from where it paused

## BUGFIX vs CHANGE vs MAINTAIN

| Aspect | BUGFIX (pre-release) | CHANGE | MAINTAIN (post-release) |
|--------|---------------------|--------|------------------------|
| Trigger | "bug var", "hata", "bozuk" | "ekle", "değiştir", "kaldır" | Bug/feature after release |
| Architecture | Flexible | Flexible | FROZEN |
| E2E required | No | No | Yes (BUGFIX/ENHANCE) |
| Plan location | `docs/stories/phase-N/` | N/A (dispatches to skills) | `docs/maintenance/` |
| ROUTEMAP | Dev Phase table | Dev Phase (status flags) | Maintenance table |
| Pipeline | Fix → Gate → Commit | Impact → Dispatch skills | Fix → Gate → E2E → Commit |
