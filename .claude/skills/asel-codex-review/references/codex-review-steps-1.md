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

