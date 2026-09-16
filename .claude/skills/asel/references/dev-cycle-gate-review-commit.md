# Gate, Review, and Commit steps (reference for dev-cycle.md)

## Step 3 — GATE: Quality Gate with Escalation

<EXTREMELY-IMPORTANT>
Gate is a MANDATORY step. You MUST dispatch the Gate Team Lead via Agent tool. A manual `tsc --noEmit` or `npm test` does NOT count as Gate. Gate runs 6 comprehensive passes distributed across 3 parallel scouts (Analysis: gap+compliance+security+perf, Test/Build: tests+build, UI: visual quality) then consolidates fixes and writes a gate report. NEVER skip Gate. NEVER mark Gate as DONE without dispatching `asel-gate-lead`. If the team architecture fails, fall back to legacy `asel-legacy-gate`.
</EXTREMELY-IMPORTANT>

1. Update ROUTEMAP: Step = `Gate`
2. Update CLAUDE.md session: Step = Gate
3. Display progress bar (Gate step active)
4. **Dispatch 3 scouts IN PARALLEL** (one response, 3 Agent tool calls — Asel main session is the only place with Agent dispatch capability; subagents cannot nest-dispatch). Dispatch each by name — `asel-gate-scout-analysis`, `asel-gate-scout-testbuild`, `asel-gate-scout-ui`; model and effort come from the agent definition.
   - Scout Analysis dispatch prompt:
     ```
     You are the Analysis Scout for the Asel Gate team.
     Story: docs/stories/phase-N/STORY-NNN-*.md
     Plan:  docs/stories/phase-N/STORY-NNN-plan.md
     Implemented files: [list from plan]
     UI story: YES|NO
     Maintenance mode: YES|NO
     Return ONLY the <SCOUT-ANALYSIS-FINDINGS> block. Do NOT edit any file.
     ```
   - Scout Test/Build dispatch prompt: same template, dispatched as `asel-gate-scout-testbuild`, returns `<SCOUT-TESTBUILD-FINDINGS>`.
   - Scout UI dispatch prompt: same template, dispatched as `asel-gate-scout-ui`, returns `<SCOUT-UI-FINDINGS>`. If `has_ui: false`, scout returns empty block (no-op).
5. **Collect all 3 findings blocks.** If any scout fails, retry that scout once; if it still fails, note the gap in the Team Lead dispatch.
6. **Dispatch Gate Team Lead** — `Agent(subagent_type: "asel-gate-lead", prompt: …)`; model and effort come from the agent definition:
   ```
   You are the Gate Team Lead.

   Context:
   - Story: docs/stories/phase-N/STORY-NNN-*.md
   - Plan:  docs/stories/phase-N/STORY-NNN-plan.md
   - UI story: YES|NO
   - Maintenance mode: YES|NO

   Scout findings (raw, as returned):

   <SCOUT-ANALYSIS-FINDINGS>
   [paste full block]
   </SCOUT-ANALYSIS-FINDINGS>

   <SCOUT-TESTBUILD-FINDINGS>
   [paste full block]
   </SCOUT-TESTBUILD-FINDINGS>

   <SCOUT-UI-FINDINGS>
   [paste full block — or "Skipped (no UI)"]
   </SCOUT-UI-FINDINGS>

   Proceed with merge, fix, verify, report. Return Asel summary.
   ```
7. Team Lead runs internally: Phase 0 Input → Phase 1 Merge → Phase 2 FIX (single writer) → Phase 3 Verify → Phase 4 Report (writes `docs/stories/phase-N/STORY-NNN-gate.md`) → Phase 5 Return Summary
8. **Verify gate report exists** (MANDATORY — Bash tool, NOT LLM judgment):
   ```bash
   test -s docs/stories/phase-N/STORY-NNN-gate.md && echo "GATE_REPORT_EXISTS" || echo "GATE_REPORT_MISSING"
   ```
   - `GATE_REPORT_EXISTS` → proceed to parse result
   - `GATE_REPORT_MISSING` → re-dispatch Team Lead (with same scout findings) and explicit instruction: "Gate report was NOT written to disk. You MUST use the Write tool to save the report to docs/stories/phase-N/STORY-NNN-gate.md before returning."
   - Still missing after retry → present error to user, STOP
9. Parse Gate result:
   - **PASS** → append step-log, continue to Step 4
   - **ESCALATE** → Escalation (below)

Append step-log on PASS:
```bash
echo "STEP_3 GATE: EXECUTED | items=6 passes (3 scouts + lead) | evidence=docs/stories/phase-N/STORY-NNN-gate.md | result=PASS" \
  >> docs/stories/phase-N/STORY-NNN-step-log.txt
```

**Escalation (Ana Asel handles directly — attempt counter enforced):**

1. **Read attempt count first** (Bash):
   ```bash
   ATTEMPTS=$(wc -l < docs/stories/phase-N/STORY-NNN-attempts.log 2>/dev/null || echo 0)
   ```
   - If `ATTEMPTS >= 3` → STOP escalation, set ROUTEMAP Step = `Escalated`, present to user. Do NOT loop further. This is a hard mathematical bound.
2. **Append attempts.log BEFORE dispatch:**
   ```bash
   echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) Developer opus gate-escalation" \
     >> docs/stories/phase-N/STORY-NNN-attempts.log
   ```
3. Read Gate's escalation findings from `docs/stories/phase-N/STORY-NNN-gate.md`
4. Re-dispatch Developer via Agent tool with the escalation model (`agents.developer.escalationModel`), not the default — upgraded for difficult fixes
   - Pass: plan file path, gate findings, project root
5. **Append attempts.log again** (for the re-Gate dispatch):
   ```bash
   echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) Gate opus re-check" \
     >> docs/stories/phase-N/STORY-NNN-attempts.log
   ```
6. Re-dispatch Gate via Agent tool
7. Parse second Gate result:
   - **PASS** → append step-log, continue to Step 4
   - **ESCALATE** → Update ROUTEMAP Step = `Escalated`, present issues to user, offer 3 options (düzelt/atla/dur)

```
Escalation Summary (attempt-counter enforced):
Gate internal fix (2 loops) → ESCALATE
  → attempts.log count check (must be < 3)
  → Ana Asel re-dispatch Developer (opus) + append attempts.log
    → Re-dispatch Gate (opus) + append attempts.log
      → PASS → continue
      → ESCALATE → present to user (3 options)
Hard bound: {{workflow.maxRedispatch}} total re-dispatches per story. The attempts.log file is
the source of truth — survives compaction.
```

## Step 4 — REVIEW + FINDING RESOLUTION

<EXTREMELY-IMPORTANT>
Review runs BEFORE Commit. This is a SEQUENTIAL protocol — NOT the old parallel pattern. The single git commit in Step 5 captures EVERYTHING: story code (Step 2) + Review's doc edits (this step, Phase 1) + Story Impact edits (Phase 2) + Finding Resolution fixes (Phase 3). No intermediate commits inside Step 4.

If you catch yourself running `git commit -m "docs(STORY-NNN): post-review ..."` or `git commit -m "fix(STORY-NNN): resolve findings"` inside this step — STOP. You are violating the sequential protocol. All edits in Step 4 land in the Step 5 unified commit.
</EXTREMELY-IMPORTANT>

1. Update ROUTEMAP: Step = `Review`
2. Update CLAUDE.md session: Step = Review
3. **Verify transition write** (Bash, deterministic):
   ```bash
   grep -q '^- Step: Review' CLAUDE.md || echo "WARN: CLAUDE.md session did not register Step=Review"
   ```
4. Display progress bar (Review step active)

### Phase 1 — Doc Review

5. dispatch `Agent(subagent_type: "asel-reviewer", prompt: …)`; model and effort come from the agent definition
   - Pass: completed story reference, context type "post-story", project root
   - Reviewer runs checks #2-#14 (doc consistency, glossary, architecture, tech debt, mock sweep, etc.)
   - Reviewer also runs check #1 (next story impact) and #10 (story updates) but ONLY reports findings — does NOT edit story files
7. **Verify review report exists** (MANDATORY — Bash tool, NOT LLM judgment):
   ```bash
   test -s docs/stories/phase-N/STORY-NNN-review.md && echo "REVIEW_EXISTS" || echo "REVIEW_MISSING"
   ```
   - `REVIEW_EXISTS` → proceed
   - `REVIEW_MISSING` → append attempts.log (`<ts> Reviewer sonnet missing-report`), re-dispatch Reviewer with explicit Write instruction
   - Still missing → append attempts.log, re-dispatch ONE more time with an explicit opus model override
   - Still missing after 3rd attempt (attempts.log ≥ 3 entries total for this story) → mark story Step = `Escalated`, present to user: "Review agent failed to produce report after 3 attempts."
8. Read review summary.
9. **Do NOT commit Review's doc edits here.** Any files the Reviewer touched are staged by Step 5's unified commit.

### Phase 2 — Story Impact Update (opus — deterministic trigger)

10. **Bash trigger check** (deterministic, NOT LLM parse):
    ```bash
    UPDATED=$(grep -cE '\| *UPDATED *\|' docs/stories/phase-N/STORY-NNN-review.md 2>/dev/null)
    ```
11. If `UPDATED` = 0 → proceed to Phase 3
12. If `UPDATED` > 0 → dispatch Story Impact agent via Agent tool:
    - Pass: review report path, affected story file paths, project root
    - Prompt: "Read the review report. For each story marked UPDATED in the Impact table, edit the story file: update dependencies, technical approach, acceptance criteria, or effort estimate as described. Do NOT change stories marked NO_CHANGE."
13. Do NOT commit story file edits here — they also land in Step 5.
14. Proceed to Phase 3.

### Phase 3 — Finding Resolution (MANDATORY before Step 5)

Review reports contain findings in 5 sections. Each finding MUST be resolved before proceeding to Commit (Step 5). Skipping this phase is a skill violation. `story-done-guard.sh` hook will block the eventual DONE edit if any unresolved finding remains.

15. **Parse review report** — extract findings from these sections:
    - `## Issues` → any row with Resolution = ESCALATED or DEFERRED (verify DEFERRED items were actually written to ROUTEMAP)
    - `## Cross-Doc Consistency` → contradictions found > 0
    - `## Decision Tracing` → orphaned (approved but not applied) > 0
    - `## USERTEST Completeness` → type = MISSING
    - `## Tech Debt Pickup` → NOT addressed (CRITICAL) > 0
    - `## Mock Status` → missed retirements > 0

    Also check: if `## Issues` table has FIXED items → verify the fix exists (file was actually changed). If not → treat as unresolved.

16. **Deterministic unresolved check** — Bash safety net (the SAME grep `story-done-guard.sh` runs at DONE time):
    ```bash
    UNRESOLVED=$(grep -cE '\| +(ESCALATED|OPEN|NEEDS_ATTENTION) +\|' docs/stories/phase-N/STORY-NNN-review.md 2>/dev/null)
    ```
    If `UNRESOLVED > 0` but LLM parse in step 15 said zero → re-parse, surface the missed rows, fix them. Trust the grep.

17. **If `UNRESOLVED = 0` and LLM parse found no findings** → skip to step 20 (append step-log, proceed to Step 5).

18. **For each finding, apply resolution by category:**

    | Category | Action |
    |----------|--------|
    | Cross-Doc contradiction | Fix the inconsistent doc NOW (edit file — NO commit) |
    | Orphaned decision | Apply the decision to code/config/doc NOW, or if out of scope → DEFER |
    | USERTEST missing | Write the missing USERTEST section NOW (edit file — NO commit) |
    | Tech Debt not addressed (CRITICAL) | ESCALATE to user — story cannot close with unresolved targeted tech debt |
    | Mock not retired | Delete the mock file NOW (edit file — NO commit) |

    **DEFER** = add entry to `docs/ROUTEMAP.md → ## Tech Debt` table:
    ```
    | D-NNN | [description from finding] | STORY-NNN (source) | STORY-MMM (target) | OPEN |
    ```
    Choose the nearest relevant upcoming story as target. The ROUTEMAP edit lands in Step 5's unified commit — do NOT commit it separately.

    **ESCALATE** = present finding to user with options:
    ```
    Review Finding — [category]:
    [finding detail]

    1. Fix now (describe what will change)
    2. Defer to STORY-MMM as tech debt
    3. Accept risk and close anyway
    ```
    Wait for user choice. In AUTOPILOT mode: auto-select option 1 (fix now) for non-CRITICAL, option 2 (defer) for CRITICAL.

19. **Re-run Bash unresolved check** (same grep as step 16). Must be 0 before proceeding. If still > 0 → loop Phase 3 (same findings not resolved yet) or escalate.

20. Append step-log:
    ```bash
    echo "STEP_4 REVIEW: EXECUTED | items=<finding-count> findings (fixed=F deferred=D escalated=E) | evidence=docs/stories/phase-N/STORY-NNN-review.md | result=PASS" \
      >> docs/stories/phase-N/STORY-NNN-step-log.txt
    ```

21. Proceed to Step 5 (Commit).

## Step 5 — COMMIT: Single Unified Commit

<EXTREMELY-IMPORTANT>
This is ONE commit per story. It captures EVERYTHING accumulated during Steps 2-4:
- Story code from Dev (Step 2)
- Review-driven doc edits (Step 4 Phase 1)
- Story Impact edits to upcoming story files (Step 4 Phase 2, if any)
- Finding Resolution fixes (Step 4 Phase 3)
- USERTEST.md entry, decisions.md updates, bug-patterns.md entries
- ROUTEMAP Tech Debt entries

NO intermediate commits from Step 4. Every commit in git history has already passed Review — bisect and revert remain clean.
</EXTREMELY-IMPORTANT>

1. Update ROUTEMAP: Step = `Commit`
2. Update CLAUDE.md session: Step = Commit
3. **Verify transition write** (Bash):
   ```bash
   grep -q '^- Step: Commit' CLAUDE.md || echo "WARN: CLAUDE.md session did not register Step=Commit"
   ```
4. **Safety gate: review.md must exist** (Bash, deterministic — protects resume from the old parallel protocol):
   ```bash
   test -s docs/stories/phase-N/STORY-NNN-review.md || { echo "ERROR: review.md missing — Step 4 Review did not run. Back to Step 4." >&2; }
   ```
   If `review.md` is missing, Ana Asel re-enters Step 4 before continuing. This handles in-flight projects that started on the old commit-before-review flow.
5. Update `docs/USERTEST.md` — append manual test scenarios for this story (see USERTEST format below). If the story has no UI → add "Bu story icin manuel test senaryosu yok (backend/altyapi)" note.
6. Update `docs/brainstorming/decisions.md` — append any decisions made during development.
7. **Bug Pattern entry with dedup** (if Gate fixed issues or escalation occurred):
   - Read gate report for fixes applied
   - **Bootstrap `bug-patterns.md` if missing** (Bash, idempotent):
     ```bash
     F=docs/brainstorming/bug-patterns.md
     if [ ! -f "$F" ]; then
       mkdir -p docs/brainstorming
       printf '# Bug Patterns & Prevention Rules\n\nRuntime knowledge base of bugs that have occurred and rules to prevent them.\nRead by: Planner (warnings), Gate/Scouts (compliance check), Developer (awareness).\n\n## Patterns\n\n' > "$F"
     fi
     ```
   - For each non-trivial fix (not just typos):
     - Draft pattern description (short, literal)
     - **Dedup check** (Bash, deterministic — skip if pattern already recorded):
       ```bash
       grep -cF "Pattern: [description]" docs/brainstorming/bug-patterns.md 2>/dev/null
       ```
     - If zero → append to `bug-patterns.md` under `## Patterns`:
       `- [DATE] PAT-NNN [STORY-NNN]: [pattern] — Root Cause: [cause] — Prevention: [rule] — Affected: [layer]`
     - If already present → skip (no duplicate noise)
   - Skip the entire section if Gate passed with zero fixes
8. **Stage everything** — story code + Review doc edits + Story Impact edits + Finding Resolution fixes + USERTEST + decisions + bug-patterns + ROUTEMAP tech debt:
   ```
   git add -A
   ```
9. **Single git commit** for the whole story:
   ```
   git commit -m "feat(STORY-NNN): [story title]

   - [list of key changes]
   - [endpoints added/modified]
   - [migrations if any]
   - [tests added]
   - Review findings resolved: <count> (deferred: <count>)

   Co-Authored-By: {{workflow.coAuthor}}"
   ```
10. Capture commit hash.
11. **Append step-log:**
    ```bash
    HASH=$(git log -1 --pretty=%h)
    echo "STEP_5 COMMIT: EXECUTED | items=1 commit=${HASH} | evidence=git log -1 | result=PASS" \
      >> docs/stories/phase-N/STORY-NNN-step-log.txt
    ```
12. Proceed to Step 6 (Post-Processing & Handoff).

### USERTEST.md Format

Screen-focused and business-focused manual test scenarios. Written in Turkish.

```markdown
# Manual Test Scenarios

> Son guncelleme: YYYY-MM-DD
> Test ortami: [CLAUDE.md'den Docker URL]

---

## STORY-003: Kullanici Yonetimi

**Ekran:** Kullanici Listesi (SCR-010)

| # | Senaryo | Beklenen Sonuc |
|---|---------|----------------|
| 1 | Sol menuден "Kullanicilar" sayfasina git | Kullanici listesi tabloda gorunur |
| 2 | "Yeni Kullanici" butonuna tikla | Kullanici olusturma formu acilir |
| 3 | Formu doldur ve kaydet | Basarili mesaji, liste guncellenir |
```

Rules:
- Her story icin ayri `## STORY-NNN: [Title]` section
- Her ekran icin ayri `**Ekran:** [Name] (SCR-NNN)` alt bolumu
- Story'de UI yoksa → "Bu story icin manuel test senaryosu yok (backend/altyapi)" notu
- **Sadece UI senaryolari**: Kullanicinin browser'da gorebilecegi, yapabilecegi, dogrulayabilecegi aksiyonlar
- **API endpoint testi YAZMA**: API dogrulamasi Phase Gate Step 3.5'te otomatik yapiliyor

