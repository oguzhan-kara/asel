### Step 4: Invoke Codex

Build the output path:
```
TIMESTAMP=$(date -u +%Y%m%d-%H%M%S)
case $SCOPE in
  story)   REPORT="docs/reports/codex-review/story-${STORY_ID}-${TIMESTAMP}.md" ;;
  phase)   REPORT="docs/reports/codex-review/phase-${PHASE_NUMBER}-${TIMESTAMP}.md" ;;
  project) REPORT="docs/reports/codex-review/project-${TIMESTAMP}.md" ;;
esac
```

Announce to user:
```
═══ CODEX REVIEW ═══════════════════════════════════════════════
Scope:  {scope}
Target: {target}
Report: {REPORT}
─────────────────────────────────────────────────────────────────
Codex başlatılıyor (read-only sandbox, stdin'den prompt)...
```

Invoke Codex (foreground — may take minutes, show progress):
```bash
cat /tmp/asel-codex-prompt-$$.md | codex exec \
  --sandbox read-only \
  --skip-git-repo-check \
  -o "$REPORT" \
  - 2>&1 | tail -20
```

Notes on invocation:
- `--sandbox read-only` — Codex can read files and run read-only commands, but cannot write anywhere
- `--skip-git-repo-check` — project might not be a git repo yet
- `-o "$REPORT"` — Codex's final message (the review document) gets written here
- `-` at end reads prompt from stdin (via `cat | codex exec ... -`)
- Timeout: default Bash timeout 2min is NOT enough for project-scope. For phase/project scope use `timeout: 600000` (10min) on the Bash call
- Stdout (progress events) is shown live; we tail the last 20 lines for brevity

If Codex errors during execution, detect the failure mode from stderr and show a tailored message. Runtime errors that bypass Step 0 pre-flight:

**Auth error at runtime** (stderr contains `authentication`, `API key`, `401`, `Unauthorized`, `not logged in`):
```
═══ CODEX AUTH ÇALIŞMIYOR ════════════════════════════════════════════

Pre-flight geçti ama codex exec auth hatası verdi. Credentials expire
olmuş veya API key geçersiz olabilir.

Çözüm:
  codex login              # browser OAuth (yenile)
  # veya:
  codex login --api-key    # API key tekrar gir

Sonra yeniden dene: /asel-codex-review {scope} {target}
═══════════════════════════════════════════════════════════════════════
```

**Rate limit / quota** (stderr contains `rate limit`, `quota`, `429`):
```
═══ CODEX RATE LIMIT / QUOTA ═════════════════════════════════════════

OpenAI API kotası aşıldı veya rate limit'e takıldı.

Seçenekler:
  • Biraz bekle ve tekrar dene
  • platform.openai.com/usage adresinden kullanımı kontrol et
  • project scope yerine story scope'ta çalıştır (daha az token)
═══════════════════════════════════════════════════════════════════════
```

**Timeout / Bash 10dk cap** (command exceeded timeout):
```
═══ CODEX REVIEW TIMEOUT ═════════════════════════════════════════════

Review 10dk içinde tamamlanmadı (Bash tool cap). Muhtemelen project
scope çok büyük.

Kısmi rapor: {REPORT} (varsa)

Seçenekler:
  1. Phase scope'a böl: /asel-codex-review phase 1, sonra phase 2, ...
  2. Story scope'ta kritik story'leri tek tek review et
  3. Terminalde manuel çalıştır (Bash cap yok):
     cat /tmp/asel-codex-prompt-$$.md | codex exec \
       --sandbox read-only --skip-git-repo-check \
       -o {REPORT} -
═══════════════════════════════════════════════════════════════════════
```

**Other error**: show raw stderr + generic fallback options:
```
═══ CODEX REVIEW HATASI ══════════════════════════════════════════════

Codex exec şu hatayı verdi:

{stderr}

Seçenekler:
  1. Codex durumunu kontrol et: codex --version
  2. Manuel dene: codex exec --skip-git-repo-check "say OK"
  3. Daha küçük scope'la tekrar dene
  4. OpenAI status sayfası: status.openai.com
═══════════════════════════════════════════════════════════════════════
```

### Step 5: Verify Report

```bash
test -s "$REPORT" || { echo "Report is empty — Codex produced no output"; exit 1; }
head -5 "$REPORT"  # sanity check
```

Use Read tool to load the full report.

### Step 6: Parse Findings

Read the `## Findings` section. Extract each `### [F-N] [SEVERITY] [CATEGORY] Title` block into a structured list:

```
F-N | SEVERITY | CATEGORY | Title | Location | Suggested action | Effort | Affected story (if any)
```

Also extract `## Summary` counts and the `## Scope Verification` section.

### Step 7: Show Summary to User

```
═══ CODEX REVIEW TAMAMLANDI ════════════════════════════════════
Rapor: {REPORT}
─────────────────────────────────────────────────────────────────
Toplam: N bulgu
  CRITICAL: X    HIGH: Y    MEDIUM: Z    LOW: W
Kategori: BUG=a MISSING=b DIVERGENCE=c DOC-DRIFT=d SECURITY=e PERFORMANCE=f DEAD-CODE=g
─────────────────────────────────────────────────────────────────
Bulgular:

 [F-1] [CRITICAL] [BUG]        → suggested: bugfix   (S)
       src/auth/login.ts:42
       Plaintext password comparison

 [F-2] [HIGH]     [MISSING]    → suggested: change   (M)
       docs/ARCHITECTURE.md / no impl
       GET /api/users/:id endpoint documented but not implemented

 [F-3] [MEDIUM]   [DOC-DRIFT]  → suggested: manual   (S)
       ...
═══════════════════════════════════════════════════════════════════
```

Keep finding lines short (title + location truncated to fit). Group by severity (CRITICAL first).

### Step 8: Interactive Triage

Ask the user ONE question:
```
Hangi bulguları işleyelim?

  - numaralar virgülle: "1,3,5"
  - aralık: "1-5"
  - severity: "all-critical" | "all-high" | "all-critical-and-high"
  - hepsi: "all"
  - hiçbiri: "none"
  - detay iste: "detail 3" → F-3'ün tam içeriğini göster
```

Loop until user picks numbers or `none`:
- If `detail N` → show the full finding block from the report (not just the summary line), then re-ask
- If numbers → proceed to Step 9

### Step 9: Per-Finding Action Assignment

For each selected finding, show:
```
─── F-N [SEVERITY] [CATEGORY] ────────────────────────────────────
Title:           {title}
Location:        {location}
Affected story:  {story or "—"}
Codex suggests:  {action}  (effort: {effort})

Ne yapalım?
  b = bugfix    (asel FIX-NNN açsın, Developer + Gate + Commit pipeline)
  c = change    (asel change-analysis başlatsın, plan + user approval + dispatch)
  m = manual    (asel'e gönderme, el ile halledeceğim)
  s = skip      (bu bulguyu atla)
[default: {codex's suggestion}]
```

Accept single-letter (b/c/m/s) or word. If user hits enter with no input, use Codex's suggestion.

### Step 10: Execute Triage (auto-spawn asel by default)

After per-finding action assignment, show the triage summary and confirm execution mode:

```
═══ TRIAGE ÖZET ═══════════════════════════════════════════════════
Bugfix  → N finding   (F-1, F-3, F-7)
Change  → M finding   (F-2, F-5)
Manual  → K finding   (F-4 — sen ilgileneceksin)
Skip    → L finding   (F-6, F-8, ...)
─────────────────────────────────────────────────────────────────
Otomatik işlenecek: {N+M} finding
Rapor dosyası:     {REPORT}
─────────────────────────────────────────────────────────────────
Nasıl devam edelim?
  1. auto  — her finding için asel'i sırayla otomatik çalıştır (default, enter)
  2. copy  — kopyala-yapıştır blokları göster, asel'i ben başlatayım
  3. stop  — şimdilik durdur, raporu sakla, sonra döneceğim
```

Default: `auto`. If user presses enter or says `auto`/`evet`/`ok`, proceed.

#### 10a — Auto mode (DEFAULT)

Process findings in this order: **by action** (bugfix first, then change), **within action** by severity (CRITICAL → HIGH → MEDIUM → LOW), **within severity** by finding number.

For each finding, invoke asel via the Skill tool:

1. Announce next step:
   ```
   ─── [F-N] {severity} {category} → {bugfix|change} ───────────────
   Title:    {title}
   Location: {location}
   Affected: {story or "—"}
   ─────────────────────────────────────────────────────────────────
   Asel dispatch ediliyor ({i}/{total})...
   ```

2. Build the args string for asel:

   **For bugfix action:**
   ```
   bugfix

   Context (Codex F-N — from docs/reports/codex-review/<REPORT_BASENAME>):
   - Severity: {severity}
   - Category: {category}
   - Location: {location}
   - Issue: {full issue paragraph}
   - Recommended fix: {recommended fix paragraph}
   - Evidence: see report file F-N section
   - Affected story: {story or "—"}

   Asel: bu bir BUGFIX. FIX-NNN aç, Codex F-N referansını FIX-NNN plan dosyasının "Related Findings" bölümüne ekle. Fix'ten sonra commit mesajında `Closes Codex F-N` geçir.
   ```

   **For change action:**
   ```
   change

   Context (Codex F-N — from docs/reports/codex-review/<REPORT_BASENAME>):
   - Severity: {severity}
   - Category: {category}
   - Location: {location}
   - Issue: {full issue paragraph}
   - Recommended direction: {recommended fix paragraph}
   - Affected story: {story or "—"}
   - Full evidence: {REPORT} F-N

   Asel: Codex F-N bulgusuna göre change-analysis başlat. Change Analyst impact analizi yapsın, user onayına getirsin. Change Plan'a "Codex F-N origin" notu düşsün.
   ```

3. Invoke Skill tool:
   ```
   Skill(skill="asel", args=<the args above>)
   ```

4. Wait for the sub-skill to return. When it does, asel will have produced a FIX-NNN or change-plan result. Read asel's return value and parse for status markers:
   - `DONE` / `FIX-NNN DONE` / `[x] DONE` → success
   - `ESCALATED` / `FAILED` / `BLOCKED` → needs attention

5. Announce result:
   ```
   ─── [F-N] → {bugfix|change} sonuç ───────────────────────────────
   Status: {DONE | ESCALATED | FAILED}
   Asel artifact: {FIX-NNN path / change-plan path}
   ─────────────────────────────────────────────────────────────────
   ```

6. **On success** — continue to next finding in the queue.

7. **On ESCALATED / FAILED / BLOCKED** — STOP the auto loop, ask user:
   ```
   [F-N] asel tarafında {STATUS} durdu. Detay yukarıdaki asel çıktısında.
   Kalan sıra: F-A, F-B, ... ({k} finding bekliyor)

   Ne yapalım?
     c = continue  → sıradakilere geç, bu finding'i elle halledeceğim
     r = retry     → aynı finding'i tekrar asel'e dispatch et
     s = stop      → auto loop'u durdur, kalan blokları copy-paste olarak göster
   ```

   - `c` → skip this finding (keep its status as ESCALATED/FAILED in the final summary), continue loop
   - `r` → re-invoke asel with same args (max 2 retries per finding, then force continue)
   - `s` → break loop, for remaining findings fall back to copy mode (Step 10b)

8. After all findings processed, show final summary:
   ```
   ═══ AUTO-PROCESS TAMAMLANDI ══════════════════════════════════════
   Başarılı:     N finding   (F-1 → FIX-001, F-3 → FIX-002, ...)
   Escalated:    X finding   (F-5 — {asel status})
   Failed:       Y finding   (F-7 — {error})
   Skipped:      Z finding   (kalan copy mode'a düştü)
   Manuel:       K finding   (F-4 — doc decision gerekli)
   ─────────────────────────────────────────────────────────────────
   Rapor:            {REPORT}
   Asel artifacts:   docs/stories/phase-*/FIX-NNN-*.md
   Kalan manuel iş:  {manual list}
   ═══════════════════════════════════════════════════════════════════
   ```

#### 10b — Copy mode (fallback)

Only if user picked `copy` in Step 10 OR `stop` during auto loop. Print copy-paste blocks for each remaining triaged finding:

**For bugfix:**
```
═══ [F-N] → BUGFIX (copy-paste) ══════════════════════════════════
/asel bugfix

Context (Codex F-N):
- Severity: {severity}
- Category: {category}
- Location: {location}
- Issue: {issue paragraph}
- Recommended fix: {recommended fix}
- Evidence: {REPORT} F-N
- Affected story: {story or "—"}

Asel: bu bir BUGFIX. FIX-NNN aç, Codex F-N referansını plan dosyasına ekle.
═══════════════════════════════════════════════════════════════════
```

**For change:**
```
═══ [F-N] → CHANGE (copy-paste) ══════════════════════════════════
/asel change

Context (Codex F-N):
- Category: {category} ({severity})
- Location: {location}
- Issue: {issue paragraph}
- Recommended direction: {recommended fix}
- Affected story: {story or "—"}
- Full evidence: {REPORT} F-N

Asel: Codex F-N bulgusuna göre change-analysis başlat.
═══════════════════════════════════════════════════════════════════
```

For `manual` / `skip` findings: no block, just note in final summary.

#### 10c — Stop mode

If user picked `stop` at Step 10:
```
Triage saklandı. Rapor: {REPORT}
Sonra dönmek için: rapor dosyasını oku, ilgilendiğin finding'i elle /asel bugfix / change'e ver.
```

Skip Step 11 cleanup of the prompt file (keep /tmp prompt for debugging). Exit skill.

### Step 11: Cleanup

```bash
rm -f /tmp/asel-codex-prompt-$$.md
```

Keep the report file under `docs/reports/codex-review/` — that's intentional history.

