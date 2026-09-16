# E2E-CHECK Cycle — Mid-Project Scoped Browser Test

Dispatcher for the `E2E-CHECK` mode. Invoked from `SKILL.md` when user says "test et", "browser kontrol", "gez", "son N story test et", "phase N test et", "e2e check", or provides `/asel e2e-check <scope>`.

This phase wraps the `e2e-tester` agent in `e2e-check` mode (scoped, dated report, no auto-write) and routes bucketed findings to `asel bugfix` / `asel change` after bulk user approval.

## Step 1 — Parse Scope Argument

The trigger may include a scope argument. Accepted forms:

| Scope | Meaning |
|-------|---------|
| `all` | All DONE stories across all phases |
| `phase-N` | Only DONE stories in Phase N (e.g. `phase-2`) |
| `STORY-NNN` | Single story (e.g. `STORY-012`) |
| `last-N` | Last N DONE stories in ROUTEMAP order (e.g. `last-3`) |

**If no argument provided → ASK the user before proceeding:**

```
E2E-CHECK scope gerekli. Hangi scope ile çalışalım?

  all         → tüm DONE story'ler (tam proje)
  phase-N     → sadece Phase N'deki DONE story'ler (örn: phase-2)
  STORY-NNN   → tek story (örn: STORY-012)
  last-N      → son N DONE story (örn: last-3)

Seçimin:
```

Wait for user response, then validate:
- `all` — always valid
- `phase-N` — N must match an existing phase in ROUTEMAP
- `STORY-NNN` — must exist and be DONE in ROUTEMAP (if IN PROGRESS, warn and confirm)
- `last-N` — N must be ≤ total DONE story count

If invalid → explain and re-ask.

## Step 2 — Pre-Check

Before dispatching e2e-tester, verify:

1. App is running — `docker ps` shows expected containers
2. Credentials exist in `CLAUDE.md` for all roles that Pass 5b needs (warn if missing, continue anyway)
3. Playwright MCP tools ({{playwrightPrefix}}__browser_*) server is running AND is NOT in headless mode
   - If not running: start it WITHOUT `--headless` flag
   - If running in headless mode: stop and restart WITHOUT `--headless`
4. Target DONE stories can be located in ROUTEMAP (scope produces a non-empty list)

If any blocker → report to user and stop.

## Step 3 — Dispatch E2E Tester

Dispatch `Agent(subagent_type: "asel-e2e-tester", prompt: …)`; model and effort come from the agent definition. Context bundle:

```
mode: e2e-check
scope: <scope-argument>
report_path: docs/reports/e2e-check-<scope>-<YYYY-MM-DD>.md
headless: false
story_list: [resolved list of STORY-NNN ids matching scope]
screen_inventory: [resolved list of screens from those stories]
```

The agent runs Passes 1 / 1a / 1b / 1c / 2 / 2-F / 2-G / 2-H / 2-I / 3 / 4 / 4d / 4e / 5b / P (see e2e-tester-prompt.md → Pass Selection by Mode). It SKIPS Pass 5 (compliance-auditor dispatch).

The agent writes the full report to `docs/reports/e2e-check-<scope>-<YYYY-MM-DD>.md` and returns the **bucketed bulk-approval summary** (BUG list + SCOPE list with IDs).

## Step 4 — Present Findings for Bulk Approval

Show the returned summary to the user verbatim, then ask:

```
Yukarıda N BUG + M SCOPE bulgu listelendi.

Kararını bekliyorum. Şu formatlardan birini kullan:

  all                        → tüm BUG + tüm SCOPE onaylı
  bugs                       → sadece BUG'ları al, SCOPE'u reddet
  scope                      → sadece SCOPE'u al, BUG'ları reddet
  none                       → hepsini reddet, sadece rapor kalsın
  B1,B3,S2,S5                → elle seç (finding ID'leri virgülle)
  B1-B4,S1-S3                → aralık seç

Bulgular `asel bugfix` ve `asel change`'e toplu gönderilecek.
```

Wait for user response. Parse the selection into two lists:

- `accepted_bugs` — list of BUG finding IDs (B1, B2, ...)
- `accepted_scope` — list of SCOPE finding IDs (S1, S2, ...)

If user chose `none` → STOP, return report path only.

## Step 5 — Route Accepted Findings

**5a. BUG items → `asel bugfix` (batch):**

If `accepted_bugs` is non-empty:

1. Build a BUG bundle from the report: `{ finding_id, severity, category, screen, issue, evidence, expected_vs_actual }` for each selected ID
2. Read `phases/development/bugfix.md`
3. Follow its protocol with the bundle as input — each finding becomes a FIX-NNN entry in ROUTEMAP. Reuse TDD flow (test → fix → verify) per finding or group by screen where appropriate.
4. bugfix.md owns the actual story/FIX creation and execution — this cycle just hands off.

**5b. SCOPE items → `asel change` (single dispatch):**

If `accepted_scope` is non-empty:

1. Build a SCOPE bundle: `{ finding_id, severity, screen, missing_item, story_ref, rationale, evidence }` for each selected ID
2. Read `phases/change/change-analysis.md`
3. Follow its protocol with the SCOPE bundle as the change request. Change mode:
   - Runs impact analysis
   - Drafts new story/stories OR adds AC(s) to existing PENDING stories
   - Requests user approval per change proposal (change mode's existing flow — do NOT duplicate here)
   - Writes to ROUTEMAP + story files on approval

**This cycle does NOT write stories itself.** It delegates to `bugfix` and `change`, which own their respective output.

## Step 6 — Summary Back to User

Once both routes complete (or only the ones chosen), return:

```
E2E-CHECK tamamlandı.

Scope: <scope>
Rapor: docs/reports/e2e-check-<scope>-<date>.md
Kanıt: docs/e2e-evidence/

Routing:
  Bugfix pipeline: X FIX-NNN eklendi (detay: ROUTEMAP Development Phase Fixes)
  Change mode:     Y yeni story / Z AC eklemesi önerildi (detay: change mode çıktısı)

Reddedilen bulgular sadece raporda kaldı.
```

Update ROUTEMAP if fixes/stories were created (both `bugfix.md` and `change-analysis.md` already do this — do not double-write).

## Rules

- **Never skip user approval** — always ask for bulk selection between e2e-tester output and routing
- **Never dispatch compliance-auditor** — e2e-check uses Pass P (scope inventory), not Pass 5
- **Never write stories directly** — `asel bugfix` and `asel change` own story/FIX creation
- **Report file is dated** — never overwrite a previous e2e-check report (different date → different file)
- **Headless MUST be OFF** — verify Playwright MCP tools ({{playwrightPrefix}}__browser_*) server command before dispatch
- **If credentials are missing for any role** — Pass 5b skips that role with a WARNING (not a failure); document in final summary

## Error Paths

| Condition | Response |
|-----------|----------|
| App not running | Tell user: "Önce `/asel deploy` ile projeyi ayağa kaldır." STOP. |
| Scope resolves to empty DONE list | "Seçilen scope'ta DONE story yok. Farklı scope dene." STOP. |
| Playwright MCP tools ({{playwrightPrefix}}__browser_*) headless override failed | "Playwright MCP tools ({{playwrightPrefix}}__browser_*) server non-headless başlatılamadı. Manuel kontrol: `server.sh` komutunda `--headless` flag'i olmamalı." STOP. |
| e2e-tester agent crashed mid-run | Preserve any partial report; surface the failure with logs; do NOT route to bugfix/change |
| User input in Step 4 malformed | Re-ask with example formats; do not guess |
