---
name: asel-codex-review
description: Run an independent Codex CLI review of the current project at story, phase, or project scope. Codex writes a findings report; this skill summarizes and helps you route findings to asel bugfix/change. User-only — invoke via /asel-codex-review.
user_invocable: true
auto_trigger: false
effort: xhigh
---

# Asel Codex Review — Independent External Review

Dispatch an independent review pass via the OpenAI Codex CLI and translate the findings into asel bugfix/change actions.

## Rules

- **User-only** — only when user explicitly calls `/asel-codex-review`. Asel orchestrator MUST NEVER invoke this skill.
- Conversation language: Turkish. Report language: English.
- Codex runs `--sandbox read-only` — it cannot write files. The report is captured via `-o`.
- **End-to-end flow:** run Codex → summarize report → user triages → skill spawns asel via Skill tool for each triaged finding (auto mode is the default). Copy-paste fallback only when user explicitly opts out.
- If Codex CLI is missing or broken, STOP with a clear install instruction.

## Cross-Skill Path Convention

Templates are under this skill's own directory:
- Project path: `.claude/skills/asel-codex-review/templates/<name>.md`
- Global fallback: `~/.claude/skills/asel-codex-review/templates/<name>.md`

Short form `templates/X.md` resolves via the above.

## Process

### Step 0: Pre-flight

Run these checks in order. On any failure, STOP and print a tailored, platform-aware fix guide. Do NOT proceed until the user resolves it.

Gather environment context first (used in error messages):
```bash
OS=$(uname -s)                      # Darwin | Linux
ARCH=$(uname -m)                    # x86_64 | arm64 | aarch64
NODE_VERSION=$(node --version 2>/dev/null || echo "none")
NPM_PREFIX=$(npm config get prefix 2>/dev/null || echo "unknown")
HAS_BREW=$(command -v brew >/dev/null 2>&1 && echo yes || echo no)
```

#### 0.1 — Is `codex` on PATH?

```bash
command -v codex >/dev/null 2>&1
```

If NOT found → this is the **not-installed** case. STOP and show:

```
═══ CODEX CLI YÜKLÜ DEĞİL ═══════════════════════════════════════════

Bu skill OpenAI Codex CLI'yi kullanıyor. Makinanda bulunamadı.

Tespit edilen ortam:
  OS:     {OS} ({ARCH})
  Node:   {NODE_VERSION}
  npm:    prefix={NPM_PREFIX}
  brew:   {HAS_BREW}

── Kurulum (önerilen: npm global) ───────────────────────────────────
Önce Node.js 18+ gerekli. {NODE_VERSION} eğer "none" veya <18 ise:
  • macOS + brew:   brew install node
  • Linux (apt):    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs
  • nvm kullanıcısı: nvm install 20 && nvm use 20

Sonra Codex CLI:
  npm install -g @openai/codex@latest

Eğer EACCES permission hatası alırsan (npm prefix /usr/local altındaysa):
  sudo chown -R $(id -u):$(id -g) "{NPM_PREFIX}" ~/.npm-cache
  npm install -g @openai/codex@latest

Alternatif: npm prefix'i kullanıcı dizinine al (sudo gerektirmez):
  mkdir -p ~/.npm-global
  npm config set prefix ~/.npm-global
  echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc   # veya ~/.bashrc
  source ~/.zshrc
  npm install -g @openai/codex@latest

── Doğrulama ────────────────────────────────────────────────────────
  codex --version

Sonra: codex login (ilk seferinde bir kez, aşağıdaki auth adımı)

Kurdun, tekrar dene: /asel-codex-review
═══════════════════════════════════════════════════════════════════════
```

#### 0.2 — Does `codex` run?

```bash
CODEX_VERSION_OUTPUT=$(codex --version 2>&1)
CODEX_VERSION_EXIT=$?
```

If exit code is non-zero → analyze `$CODEX_VERSION_OUTPUT`:

**Pattern A — Missing optional dependency** (npm optional-deps bug):
```
Missing optional dependency @openai/codex-<platform>
```
STOP and show:
```
═══ CODEX CLI BOZUK (optional dependency eksik) ═════════════════════

Hata: npm optional-deps mekanizması platform binary'sini çekmemiş.
Platform beklenen: codex-{OS,lowercased}-{ARCH,mapped}
  • Darwin x86_64  → @openai/codex-darwin-x64
  • Darwin arm64   → @openai/codex-darwin-arm64
  • Linux  x86_64  → @openai/codex-linux-x64
  • Linux  aarch64 → @openai/codex-linux-arm64

── Çözüm ────────────────────────────────────────────────────────────
  npm uninstall -g @openai/codex
  npm cache clean --force
  npm install -g @openai/codex@latest --force

Eğer EACCES permission hatası alırsan:
  sudo chown -R $(id -u):$(id -g) "{NPM_PREFIX}" ~/.npm-cache
  npm install -g @openai/codex@latest --force

── Doğrulama ────────────────────────────────────────────────────────
  codex --version
═══════════════════════════════════════════════════════════════════════
```

**Pattern B — Permission error** (`EACCES`, `EPERM`):
STOP and show:
```
═══ CODEX CLI PERMISSION HATASI ══════════════════════════════════════

npm global dizininde yetkisiz bir durum var.

── Çözüm (npm prefix ownership) ─────────────────────────────────────
  sudo chown -R $(id -u):$(id -g) "{NPM_PREFIX}" ~/.npm-cache
  npm install -g @openai/codex@latest --force

Veya npm'i kullanıcı dizinine al (sudo gerektirmez, kalıcı):
  mkdir -p ~/.npm-global
  npm config set prefix ~/.npm-global
  echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
  source ~/.zshrc
  npm install -g @openai/codex@latest

── Doğrulama ────────────────────────────────────────────────────────
  codex --version
═══════════════════════════════════════════════════════════════════════
```

**Pattern C — Other error** (unknown):
STOP and show the raw error + generic reinstall:
```
═══ CODEX CLI ÇALIŞMIYOR ═════════════════════════════════════════════

codex --version şu hatayı verdi:

{CODEX_VERSION_OUTPUT}

── Genel çözüm (temiz yeniden kurulum) ──────────────────────────────
  npm uninstall -g @openai/codex
  npm cache clean --force
  npm install -g @openai/codex@latest --force
  codex --version

Hala çözülmezse: https://developers.openai.com/codex/cli adresine bak
veya raw error mesajını issue olarak aç.
═══════════════════════════════════════════════════════════════════════
```

#### 0.3 — Is `codex` authenticated?

Check for credential file. Codex CLI stores auth under `~/.codex/auth.json` (or similar — exact path depends on version).

```bash
test -f ~/.codex/auth.json || test -f ~/.codex/credentials.json
```

If missing, STOP and show:
```
═══ CODEX CLI AUTH EKSİK ═════════════════════════════════════════════

Codex CLI yüklü ve çalışıyor ama authentication yok.

── Seçenek 1: API key ile (en hızlı, CI-friendly) ───────────────────
OpenAI platform.openai.com/api-keys adresinden API key al, sonra:
  codex login --api-key

── Seçenek 2: Browser-based OAuth (interaktif) ──────────────────────
  codex login
Tarayıcı açılır, OpenAI hesabınla login ol.

── Seçenek 3: Env var (geçici, session için) ────────────────────────
  export CODEX_API_KEY=sk-...
  (kalıcı yapmak için ~/.zshrc'ye ekle)

── Doğrulama ────────────────────────────────────────────────────────
  codex exec --skip-git-repo-check "say OK"

Bu komut birkaç saniye içinde "OK" benzeri bir yanıt vermeli.
═══════════════════════════════════════════════════════════════════════
```

Note: If the auth file check is unreliable on some versions, skip 0.3 — Step 4 (codex exec) will fail with a clear auth error, which the skill should catch and show the Pattern above.

#### 0.4 — Asel project detected

```bash
test -f docs/ROUTEMAP.md
```

If missing, STOP:
```
═══ ASEL PROJESİ DEĞİL ═══════════════════════════════════════════════

docs/ROUTEMAP.md bulunamadı — bu dizin bir Asel projesi değil gibi.

Çözüm:
  • Doğru dizine `cd` yap
  • Yeni proje başlatacaksan önce: /asel (NEW mode çalışır)
  • Mevcut kodbase'i onboard edeceksen: /asel (ONBOARD mode)
═══════════════════════════════════════════════════════════════════════
```

#### 0.5 — Reports directory

```bash
mkdir -p docs/reports/codex-review
```

No error — just ensure the path exists.

### Step 1: Determine Scope

Parse the user's invocation args:

| User input | Scope | Target |
|------------|-------|--------|
| `/asel-codex-review story STORY-001` | `story` | `STORY-001` |
| `/asel-codex-review phase 2` | `phase` | `2` |
| `/asel-codex-review project` | `project` | — |
| `/asel-codex-review` (no args) | ask user | — |

If no args, ask ONE question:
```
Codex review scope?
  1. story — tek story'yi review et (STORY-NNN ver)
  2. phase — phase'deki tüm DONE story'ler
  3. project — proje geneli (uzun sürer, büyük rapor)
```

For story scope: if STORY-NNN not given, list DONE stories from ROUTEMAP → let user pick.
For phase scope: if phase number not given, list phases with DONE count → let user pick.

### Step 2: Validate Scope Target

Run target-specific validation:

**story scope:**
```bash
STORY_FILE=$(ls docs/stories/phase-*/${STORY_ID}-*.md 2>/dev/null | head -1)
test -f "$STORY_FILE" || { echo "Story file not found"; exit 1; }
```
Also detect (may not exist — OK if absent):
- `PLAN_FILE=$(ls docs/stories/phase-*/${STORY_ID}-plan.md 2>/dev/null | head -1)`
- `GATE_REPORT=$(ls docs/stories/phase-*/${STORY_ID}-gate.md 2>/dev/null | head -1)`
- `REVIEW_REPORT=$(ls docs/stories/phase-*/${STORY_ID}-review.md 2>/dev/null | head -1)`

**phase scope:**
```bash
PHASE_DIR="docs/stories/phase-${PHASE_NUMBER}"
test -d "$PHASE_DIR" || { echo "Phase directory not found"; exit 1; }
STORY_LIST=$(ls "$PHASE_DIR"/STORY-*.md 2>/dev/null | xargs -n1 basename | grep -oE 'STORY-[0-9]+' | sort -u | paste -sd,)
test -n "$STORY_LIST" || { echo "No stories in phase"; exit 1; }
```

**project scope:** no additional target validation.

### Step 3: Compose Codex Prompt

Build a single prompt by concatenating:
1. `templates/codex-instructions.md` (always)
2. Scope-specific template, with `<VAR>` placeholders interpolated:
   - story → `templates/scope-story.md` with `<STORY_ID>`, `<STORY_FILE>`, `<PLAN_FILE>`, `<GATE_REPORT>`, `<REVIEW_REPORT>`
   - phase → `templates/scope-phase.md` with `<PHASE_NUMBER>`, `<STORY_LIST>`
   - project → `templates/scope-project.md` (no vars)

Write the composed prompt to `/tmp/asel-codex-prompt-$$.md` (using `$$` for unique per-run).

Use Read tool to load templates, do interpolation in-memory, then Write to `/tmp`.

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

## Anti-Patterns

| Bad | Why | Instead |
|-----|-----|---------|
| Forcing the user to copy-paste /asel prompts for every finding | Pure friction — user already made triage decisions, losing control is NOT the concern at that point | **Auto-spawn asel via Skill tool** as default (Step 10a). Copy-paste only as opt-out fallback |
| Spawning ALL findings in parallel via asel | Stories have inter-dependencies, parallel asel invocations conflict on ROUTEMAP/FIX numbering | ALWAYS sequential one-at-a-time (Step 10a loop) |
| Ignoring asel escalation/failure mid-loop | Bad finding silently breaks pipeline, later findings inherit broken state | STOP on ESCALATED/FAILED, ask user: continue/retry/stop |
| Let Codex write to arbitrary files | Codex might overwrite real code | ALWAYS `--sandbox read-only` |
| Run project-scope with default Bash timeout | Review can take 10+ minutes | Use `timeout: 600000` for phase/project |
| Trust Codex findings blindly | Codex may hallucinate locations | Require evidence quotes; skill preserves report file for audit |
| Delete report after triage | Lost audit trail | Report stays in `docs/reports/codex-review/` |
| Invoke from within asel orchestrator | Skill is user-manual by design | Asel must never call this skill |

## Integration Notes

- **No changes required to asel skill.** The `/asel bugfix` and `/asel change` modes already accept free-form context — the Skill-tool invocation passes the finding details as `args`, asel picks them up like any manual `/asel bugfix <context>` call.
- **Sequencing:** auto mode processes findings one at a time. Each asel invocation runs its full pipeline (Plan → Dev → Gate → Commit for bugfix; or Change Analyst → Plan → user approval → dispatch for change) before the next finding starts. Expect minutes-to-tens-of-minutes per finding.
- **Context growth:** each asel invocation stays in the current session's conversation context. After processing 3-5 findings, context can get heavy — user can `/clear` between batches if needed.
- **User escape hatch:** copy mode (10b) and stop mode (10c) remain available. If a user prefers manual control for sensitive findings, they can opt out at the Step 10 prompt.
