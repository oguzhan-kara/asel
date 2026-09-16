---
name: asel-checkup
description: Project health check against current Asel standards. Detects and fixes infrastructure, config, and structure issues. Run with /asel-checkup.
user_invocable: true
auto_trigger: false
---

# Asel Checkup — Project Health Check & Fix

Projenin mevcut Asel standartlarına uygunluğunu kontrol eder, sorunları tespit eder ve düzeltir.

## Rules

- User-only — only when user explicitly calls `/asel-checkup`
- Asel MUST NEVER invoke this skill
- Conversation language: Turkish
- FIX mode: sadece rapor değil, sorunları doğrudan düzelt
- Sonunda her zaman Setup Verifier çalıştır

## Cross-Skill Path Convention

Bu skill agent prompt'larına erişirken **asel skill** dizinini kullanır (kendi dizininde `agents/` yoktur). Dispatch sırasında path'ler:
- Project path: `{{aselRoot}}/agents/<agent-prompt>.md`
- Global fallback: `~/{{aselRoot}}/agents/<agent-prompt>.md`

Bu dokümanda `agents/X.md` kısa formu yazıldığında, bunu `{{aselRoot}}/agents/X.md` (veya global fallback) olarak çözümleyin.

## Process

Checkup çalışır sırası:

```
1. Infra scan (1.x)          → infra, Makefile, ROUTEMAP, env files
2. Compliance Audit dispatch → Compliance Auditor trigger=CHECKUP
                                (Dim 1 + Dim 2 + Findings Sweep + story ops)
3. User approval             → kategorilere göre onay al
4. Fix (infra)               → mevcut davranış
5. DevOps Tuning (opsiyonel) → eğer infra-tuning.md yoksa
6. Setup Verifier            → her zaman son adım
7. Final Report
```

Compliance Audit adımı **sequential** — önce infra scan tamamlanır, sonra Compliance Auditor dispatch edilir (Agent tool, `model: "opus"`). Auditor kendi içinde 7 inventory çıkarır, gap matrix üretir, auto-fix uygular, story üretir/günceller ve rapor yazar. Checkup bu raporu user'a sunar ve sonraki adımlara geçer.

### Step 1: Infra Scan & Report

Run infra checks, collect findings. Do NOT fix yet — scan first.

#### 1.1 Infrastructure Directory

```bash
# Detect current structure
if [ -d "infra/" ]; then
  echo "INFRA_DIR=infra"
elif [ -d "docker/" ]; then
  echo "INFRA_DIR=docker (eski yapi — migration onerisi)"
fi

# Detect scattered infra directories at root level
# These should be consolidated under infra/
for dir in nginx redis postgres mongo kafka clickhouse emqx minio scripts; do
  if [ -d "$dir/" ]; then
    # Only flag if dir contains config/infra files (not source code)
    has_conf=$(find "$dir" -maxdepth 2 \( -name '*.conf' -o -name '*.sh' -o -name '*.sql' -o -name '*.xml' -o -name '*.js' -o -name 'Dockerfile*' \) 2>/dev/null | head -1)
    [ -n "$has_conf" ] && echo "SCATTERED: $dir/"
  fi
done
```

- `infra/` var, dağınık dizin yok → PASS
- `docker/` var → WARNING: `infra/`'ya taşınması önerilir
- Root-level `nginx/`, `redis/`, `postgres/`, `scripts/` vb. bulundu → WARNING: `infra/`'ya konsolide edilmeli
- Hiçbiri yok → SKIP (henüz infra oluşturulmamış)

#### 1.2 Service Tuning: Config File vs Inline

Detect ALL compose files: `docker-compose.yml`, `docker-compose.dev.yml`, `docker-compose.prod.yml`, `compose.yml`, `compose.*.yml`. Check EACH one.

Her compose file'daki her servis için:
- Tuning `command` args ile mi yapılmış? (örn: `postgres -c shared_buffers=256MB`)
- Tuning `environment` ile mi yapılmış? (örn: `KAFKA_NUM_PARTITIONS: 3`)
- Yoksa conf dosyası volume mount ile mi bağlanmış? (örn: `./infra/postgres/postgresql.conf:/etc/...`)

Conf dosyası ile bağlanmış → PASS
Inline tuning var → WARNING: conf dosyasına taşınmalı

#### 1.3 Init Container Check

Tüm compose file'larda `*-init` servis var mı? (minio-init, emqx-init, redis-init vs.)
- Init container bulundu → WARNING: entrypoint script'e taşınmalı
- Yok → PASS

#### 1.4 Makefile Targets

12 zorunlu target kontrolü:
`help, build, up, down, dev, test, typecheck, lint, migrate, seed, logs, clean`

Her eksik target → WARNING

#### 1.5 ROUTEMAP Tech Debt Section

- `docs/ROUTEMAP.md` var mı?
- İçinde `## Tech Debt` bölümü var mı? → yoksa WARNING
- `docs/brainstorming/decisions.md`'de hala `## Tech Debt` bölümü var mı? → varsa WARNING (ROUTEMAP'e taşınmalı)

#### 1.6 Reports

- `docs/reports/infra-tuning.md` var mı? → yoksa WARNING (DevOps Agent çalışmamış)
- `docs/reports/setup-verification.md` var mı? → yoksa WARNING

#### 1.7 Environment Files

- `.env.example` git'te mi? (`git ls-files .env.example`)
- `.env` gitignore'da mı? (`grep '.env' .gitignore`)

#### 1.8 Bug Patterns File Split

Bug patterns artık ayrı bir dosyada (`docs/brainstorming/bug-patterns.md`) tutulur. Eski projelerde `## Bug Patterns & Prevention Rules` hala `decisions.md` içinde olabilir → migration gerekir.

```bash
DEC=docs/brainstorming/decisions.md
BP=docs/brainstorming/bug-patterns.md

if [ -f "$DEC" ] && grep -q '^## Bug Patterns & Prevention Rules' "$DEC"; then
  echo "MIGRATION_NEEDED: bug patterns still in decisions.md"
fi
if [ -f "$BP" ]; then
  echo "BP_FILE_EXISTS"
fi
```

- `decisions.md`'de section yok + `bug-patterns.md` yok → PASS (henüz hiç pattern yok, normal)
- `decisions.md`'de section yok + `bug-patterns.md` var → PASS (zaten migre)
- `decisions.md`'de section var + `bug-patterns.md` yok → WARNING (migration — Step 4.7'de uygulanır)
- `decisions.md`'de section var + `bug-patterns.md` var → WARNING (merge migration — Step 4.7'de uygulanır)

### Step 2: Present Infra Findings

```
═══ ASEL CHECKUP — INFRA SCAN ═══════════════════════════════════════════

  | # | Check | Status | Detail |
  |---|-------|--------|--------|
  | 1 | Infra directory | PASS/WARN | infra/ veya docker/ |
  | 2 | Service tuning | PASS/WARN | N servis inline, M conf dosyasi |
  | 3 | Init containers | PASS/WARN | N init container bulundu |
  | 4 | Makefile targets | PASS/WARN | N/12 target mevcut |
  | 5 | ROUTEMAP Tech Debt | PASS/WARN | Bölüm var/yok |
  | 6 | Reports | PASS/WARN | infra-tuning + setup-verification |
  | 7 | Environment files | PASS/WARN | .env.example + .gitignore |
  | 8 | Bug patterns split | PASS/WARN | bug-patterns.md migrated / needs migration |

  Infra issue: N
  Otomatik düzeltilebilir: M

═══════════════════════════════════════════════════════════════════════════
```

Infra scan raporlanır, user'a bilgi amaçlı gösterilir — henüz onay istenmez. Önce Compliance Audit dispatch edilir, sonra aggregated rapor + tek onay gate'i yapılır.

### Step 2.5: Compliance Audit Dispatch

<EXTREMELY-IMPORTANT>
Compliance Auditor **Dim 1 + Dim 2 + Leftover Findings Sweep**'i tek bir dispatch'te yapar. Checkup bunları kendi içinde tekrar etmez — Auditor'un 7 inventory'sine güvenir.
</EXTREMELY-IMPORTANT>

1. Read `{{aselRoot}}/asel-compliance-auditor` (global fallback: `~/{{aselRoot}}/asel-compliance-auditor`)
2. Dispatch Compliance Auditor via Agent tool
   - Pass: project root, CLAUDE.md path, `trigger_mode: CHECKUP`
3. Auditor runs (5-10 dakika):
   - Step 1: 7 inventory (5 forward: endpoint/schema/screen/component/BR + 1f feature coverage + 1g leftover findings)
   - Step 2-3: codebase static + runtime scan
   - Step 4: gap matrix (6 dimension + leftover findings)
   - Step 5: auto-fix small gaps (kod yazımı OK, küçük düzeltmeler: missing constraint, validation, empty state)
   - Step 6: story operations
     - **Path A** — overlap varsa existing PENDING story'ye AC ekle
     - **Path B** — yoksa yeni story üret (3 prefix: `[AUDIT-GAP]` / `[PRODUCT-GAP]` / `[FINDING-SWEEP]`)
   - Step 7: `docs/reports/compliance-audit-report.md` yazar
4. **Verify audit report exists** (MANDATORY — Bash):
   ```bash
   test -s docs/reports/compliance-audit-report.md && echo "AUDIT_EXISTS" || echo "AUDIT_MISSING"
   ```
   - `AUDIT_MISSING` → re-dispatch Auditor with explicit Write instruction
   - Still missing → present error, STOP
5. Parse Auditor's `COMPLIANCE_AUDIT_STATUS` return block → extract:
   - Forward gap counts (endpoint/schema/screen/component/BR)
   - Feature coverage (NO_STORY, PARTIAL)
   - Leftover findings (new, already-in-debt)
   - Auto-fixes applied count
   - Path A updates (existing stories modified)
   - Path B new stories (by prefix)

### Step 3: Aggregated Report & Category Approval

Checkup user'a **4 kategori halinde** toplu rapor sunar ve her biri için ayrı onay alır:

```
═══ ASEL CHECKUP — AGGREGATED REPORT ════════════════════════════════════

[A] Infra Health        — N düzeltme (hepsi otomatik)
    - docker/ → infra/ migration
    - 3 servis inline tuning → conf dosyası
    - 2 init container → entrypoint script
    - 4 Makefile target eklenecek
    - bug-patterns.md migration (decisions.md'den ayrıştırma) [varsa]
    Uygula? [evet/hayır/seçmeli]

[B] Forward Compliance  — Story→Code gaps (Compliance Auditor Dim 2)
    - Auto-fixed: X gap (commit: abc1234)
    - Path A: Y PENDING story'ye AC eklendi
    - Path B: Z yeni [AUDIT-GAP] story üretildi
    Sonuç report: docs/reports/compliance-audit-report.md
    Onayla? [evet/hayır]  (Auditor zaten uyguladı — bu sadece acknowledge)

[C] Feature Coverage    — PRODUCT/SCOPE → Story gaps (Dim 1)
    - NO_STORY: X feature (PRODUCT.md'de var, story yok)
      → P yeni [PRODUCT-GAP] story üretildi
    - PARTIAL: Y feature (kısmi kapsam)
      → Q PENDING story'ye AC eklendi
    Listeyi göster? [evet → liste] / Onayla [evet/hayır]

[D] Leftover Findings   — Gate/Review history sweep (1g)
    - Scanned: N gate + M review reports
    - New findings: K (zaten Tech Debt'te olmayanlar)
    - Path A: R PENDING story'ye AC eklendi
    - Path B: S yeni [FINDING-SWEEP] story üretildi
    Listeyi göster? [evet → liste] / Onayla [evet/hayır]

═══════════════════════════════════════════════════════════════════════════
```

**Önemli:** Kategori [B], [C], [D] Compliance Auditor zaten çalıştırmış ve sonuç ürünlerini (commit, story dosyası, AC ekleme) uygulamış. Buradaki "onay" retroaktif bir acknowledge — user detayları inceler, herhangi bir üretimi geri almak isterse manuel intervention yapar (örneğin yanlış yaratılmış story'yi silmek, yanlış Path A AC'sini geri almak). Checkup bu rollback'i kendi yapmaz; user'a kontrol imkanı sunar.

**Sadece kategori [A] (infra health)** bu adımda henüz uygulanmamıştır. `evet` derse Step 4'te uygulanır.

### Step 4: Fix Infra (user approves [A])

User "evet" / "düzelt" derse, sırayla:

**3.1 Infra consolidation** (scattered dirs + `docker/` → `infra/`):

İki kaynak tipi konsolide edilir:

**A) `docker/` dizini varsa:**
- `mkdir -p infra/docker`
- Dockerfile'ları `infra/docker/`'a taşı
- Conf dosyalarını `infra/<servis>/`'e taşı
- Eski `docker/` dizinini sil

**B) Dağınık root-level dizinler varsa** (`nginx/`, `redis/`, `postgres/`, `scripts/` vb.):
- Her dağınık dizin için: `mkdir -p infra/<servis>/` → içerikleri taşı
- Dockerfile'lar → `infra/docker/`'a
- Conf dosyaları (`.conf`, `.xml`, `.sql`) → `infra/<servis>/`'e
- Entrypoint/init script'ler (`.sh`) → `infra/<servis>/`'e
- Eski root-level dizini sil

**Her iki case için sonra:**
- **TÜM** compose dosyalarındaki (`docker-compose*.yml`, `compose*.yml`) volume path'leri güncelle (ör: `./nginx/nginx.conf:` → `./infra/nginx/nginx.conf:`, `./redis/redis.conf:` → `./infra/redis/redis.conf:`)
- Makefile'daki path referanslarını güncelle
- ARCHITECTURE.md'deki path referanslarını güncelle (varsa)

**3.2 Inline tuning → conf dosyası:**
- Her inline tuned servis için `infra/<servis>/<servis>.conf` oluştur
- Tuning parametrelerini conf dosyasına taşı
- `docker-compose.yml`'de `command`/`environment`'ı conf mount + komutla değiştir

**3.3 Init container → entrypoint:**
- Her init container için:
  - Init script içeriğini `infra/<servis>/docker-entrypoint.sh` olarak kaydet
  - Ana servisin volume'una mount et, entrypoint olarak çalıştır veya depends_on ile ana servis başladığında script çalıştır
  - Init container servisini `docker-compose.yml`'den kaldır
  - Script idempotent olmalı (tekrar çalışsa sorun olmamalı)

**3.4 Makefile eksik targets:**
- Eksik target'ları Makefile'a ekle (proje tipine uygun komutlarla)

**3.5 ROUTEMAP Tech Debt:**
- Bölüm yoksa `## Tech Debt` tablosu ekle (Change Log'dan önce)
- `decisions.md`'de `## Tech Debt` varsa → ROUTEMAP'e taşı, decisions.md'den kaldır

**3.6 Environment:**
- `.env.example` yoksa `.env`'den secrets çıkarılarak oluştur
- `.gitignore`'da `.env` yoksa ekle

**3.7 Bug Patterns Migration** (decisions.md → bug-patterns.md):

1.8 Check `MIGRATION_NEEDED` raporladıysa uygula. Idempotent — yoksa atla, merge case'i destekler.

```bash
DEC=docs/brainstorming/decisions.md
BP=docs/brainstorming/bug-patterns.md

# 1) Migration gerekiyor mu?
if [ ! -f "$DEC" ] || ! grep -q '^## Bug Patterns & Prevention Rules' "$DEC"; then
  echo "NO_MIGRATION"  # Zaten migre veya hiç yoktu — atla
  exit 0
fi

# 2) Bölümü decisions.md'den çek (başlık dahil, sonraki '## ' başlığına kadar)
SECTION=$(awk '
  /^## Bug Patterns & Prevention Rules[[:space:]]*$/ {capture=1; next}
  capture && /^## / {capture=0}
  capture {print}
' "$DEC")

# 3) bug-patterns.md'yi oluştur veya merge et
if [ ! -f "$BP" ]; then
  mkdir -p docs/brainstorming
  {
    printf '# Bug Patterns & Prevention Rules\n\n'
    printf 'Runtime knowledge base of bugs that have occurred and rules to prevent them.\n'
    printf 'Read by: Planner (warnings), Gate/Scouts (compliance check), Developer (awareness).\n\n'
    printf '## Patterns\n\n'
    printf '%s\n' "$SECTION"
  } > "$BP"
else
  # Zaten varsa: SECTION'ı bug-patterns.md'nin sonuna ekle (dedup check de yap)
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    # Her satır için fF dedup (PAT-NNN imzasına göre)
    if ! grep -qF "$line" "$BP" 2>/dev/null; then
      printf '%s\n' "$line" >> "$BP"
    fi
  done <<< "$SECTION"
fi

# 4) decisions.md'den bölümü sil (başlık + altındaki tüm satırlar, sonraki '## ' hariç)
awk '
  /^## Bug Patterns & Prevention Rules[[:space:]]*$/ {skip=1; next}
  skip && /^## / {skip=0}
  !skip {print}
' "$DEC" > "$DEC.tmp" && mv "$DEC.tmp" "$DEC"

# 5) Doğrula
grep -q '^## Bug Patterns & Prevention Rules' "$DEC" && echo "FAIL: section remains in decisions.md" || echo "OK: migrated"
test -s "$BP" && echo "OK: bug-patterns.md non-empty" || echo "WARN: bug-patterns.md is empty"
```

Migration sonrası:
- `decisions.md` → `## Bug Patterns & Prevention Rules` bölümü yok
- `bug-patterns.md` → header + tüm pattern'lar `## Patterns` altında
- Dosya sistemine yazıldı ama git commit kullanıcı kontrolünde

### Step 5: DevOps Tuning (if missing)

`docs/reports/infra-tuning.md` yoksa:
1. DevOps Agent'ı dispatch et — Read `{{aselRoot}}/asel-devops` (global fallback: `~/{{aselRoot}}/asel-devops`), mode: mid-project
2. Agent infra'yı tune eder, rapor yazar

### Step 6: Setup Verification (always)

Her zaman en son çalışır:
1. `make down` → `make build` → `make up` (uygulama ayağa kalkmazsa up et)
2. Setup Verifier Agent'ı dispatch et — Read `{{aselRoot}}/asel-setup-verifier` (global fallback: `~/{{aselRoot}}/asel-setup-verifier`)
3. Agent raporlar → `docs/reports/setup-verification.md`
4. FAIL olursa fix loop dene (max 2)

### Step 7: Final Report

```
═══ ASEL CHECKUP — TAMAMLANDI ════════════════════════════════════════════

  [A] Infra Health
      Düzeltmeler: N uygulandı
      Bug Patterns migration: [Uygulandı / Zaten migre / Gerekmiyor]

  [B] Forward Compliance (Story→Code, Compliance Auditor)
      Auto-fixed: X gap (küçük düzeltmeler — commit: [hash])
      Path A (PENDING story AC ekleme): Y
      Path B (yeni [AUDIT-GAP] story): Z
      Overall forward compliance: X/Y (%)

  [C] Feature Coverage (PRODUCT/SCOPE→Story)
      NO_STORY → yeni [PRODUCT-GAP] story: P
      PARTIAL → PENDING story AC ekleme: Q

  [D] Leftover Findings (Gate/Review sweep)
      Scanned: N gate + M review reports
      New findings: K
      Path A (PENDING story AC): R
      Path B (yeni [FINDING-SWEEP] story): S

  [E] Infra Operations
      DevOps Tuning: [Çalıştı / Zaten mevcut]
      Setup Verification: [PASS / FAIL]

  Raporlar:
  - Compliance Audit: docs/reports/compliance-audit-report.md
  - Infra Tuning: docs/reports/infra-tuning.md
  - Setup Verification: docs/reports/setup-verification.md

  Proje Asel standartlarına uygun. Yeni story'ler ROUTEMAP'e eklendi,
  mevcut PENDING story'lere AC güncellemeleri yapıldı. Devam etmek için:
  "asel otopilot" → yeni story'leri geliştirmeye başla

═══════════════════════════════════════════════════════════════════════════
```
