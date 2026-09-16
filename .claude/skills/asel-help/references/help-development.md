```
═══════════════════════════════════════════════════════════════════════════
  DEVELOPMENT — Story story kodla
═══════════════════════════════════════════════════════════════════════════

  Her story 7 adimdan gecer (SEQUENTIAL — Review → Commit sirasi):

  Plan → Dev → Lint → Gate → Review+Finding → Commit → Handoff

  Plan:        Mimariyi okur, task'lara boler, self-validate (embedded QG)
  Dev:         Her task icin developer (wave sistemi, paralel dispatch)
  Lint:        Hardcoded deger/TODO/raw HTML hizli grep taramas
  Gate:        6 kontrol — gap, compliance, security, test, perf, build, UI
               Backend story → UI pass atlanir
               Escalation attempt counter (max 3) — attempts.log
  Review:      Reviewer (sonnet) → Phase 1 Doc + Phase 2 Impact +
               Phase 3 Finding Resolution. Commit ONCESINDE calisir.
               Bash safety-net: unresolved finding grep kontrolu
               Commit HENUZ yapilmaz — tum doc edit'leri stage'lenir
  Commit:      SINGLE unified commit — story code + review doc edits +
               finding fixes + USERTEST + decisions + ROUTEMAP tech debt
               Bug Pattern dedup (grep -cF) + safety gate (review.md)
               Her commit artik Review'dan gecmis kod ile gider
  Handoff:     ROUTEMAP guncelle + sonraki story

  Step-Log & Attempts (deterministik evidence):
  ├── STORY-NNN-step-log.txt: Her adim sonunda append
  │   STEP_N NAME: EXECUTED | items=X | evidence=file | result=PASS
  ├── STORY-NNN-attempts.log: Her re-dispatch oncesi append
  │   Hard bound: 3 total re-dispatch per story (wc -l ile kontrol)
  └── story-done-guard.sh hook: DONE transition'unda tum kaniti dogrular
      Eksik artifact varsa → BLOCK (Edit tool durur, ROUTEMAP yazilmaz)

  Frontend-First (fullstack/web-app projeleri):
  ├── Phase 1: Foundation (setup, auth, infra, mock adapter scaffold)
  ├── Phase 2: UI Shell (TUM ekranlar + mock JSON data + routing + tema)
  ├── Phase 3+: Backend (API + DB + mock→real gecis per domain)
  ├── Mock Adapter: TanStack Query → API Client → Mock/Real Adapter
  ├── Gecis: VITE_USE_MOCK=true/false (veya endpoint bazli granular)
  ├── Backend story'de mock retire ZORUNLU (Planner task ekler)
  ├── Gate: mock dosya kontrol (implement edilen API icin mock kaldiysa → FIX)
  ├── Reviewer: phase sonu mock sweep
  └── Phase Gate: USE_MOCK=false ile deploy + mock file audit

  Tech Debt Tracking:
  ├── ROUTEMAP ## Tech Debt tablosunda izlenir (decisions.md degil)
  ├── Gate: DEFERRED → ROUTEMAP'e yazar (hedef story + OPEN)
  ├── Planner: hedef story planinda OPEN debt'leri dahil eder
  ├── Gate: hedef story tamamlaninca ✓ RESOLVED isaretler
  └── Reviewer: Tech Debt Pickup — kapanmamis item FINDING olur

  Phase 1 STORY-001 Sonrasi (otomatik):
  DevOps Agent → Setup Verifier → Gate → Commit → Review
  ├── DevOps: ARCHITECTURE.md'den deployment model okur
  │   (single node / cluster / hybrid)
  ├── Her servisi best-practice ile tune eder
  │   (PostgreSQL, Redis, Nginx, Kafka, ClickHouse, EMQX, MongoDB)
  ├── Rapor: docs/reports/infra-tuning.md
  └── setup-guard.sh her iki raporu da kontrol eder

  Akilli Ozellikler:
  ├── Basit task'lar hizli model (sonnet), zor task'lar guclu model (opus)
  ├── L/XL story'lerde en az 1 high-complexity task zorunlu
  ├── Bagimsiz task'lar paralel calisir (wave sistemi)
  ├── Her wave arasi build check (deterministik, Ana Asel calistirir)
  ├── Context refs dispatch oncesi dogrulanir (eksik context onlenir)
  ├── Gate hook ile commit Gate'siz yapilamaz
  ├── Guvenlik taramas: OWASP + bagimlilik CVE kontrolu
  └── Telegram bildirimleri hook ile deterministik (LLM bagimli degil)

═══════════════════════════════════════════════════════════════════════════
  AUTOPILOT — Phase-scoped otonom calistir
═══════════════════════════════════════════════════════════════════════════

  "otopilot" de → Asel MEVCUT FAZIN story'lerini sirayla, otonom calistirir.
  Phase Gate PASS sonrasi DURUR. Yeni faz icin tekrar "otopilot" demelisin.

  Neden phase-scoped? Faz siniri dogal kullanici checkpoint'i — test
  deploy, screenshot, demo, go/no-go karari. Fazi otomatik gecmek bu
  kontrolu alirdi.

  Direct Execution Pipeline (Ana Asel herseyi dogrudan calistirir):

  ┌──────────────────────────────────────────────────────┐
  │  1.    Plan (opus, embedded Quality Gate)             │
  │  2.    Dev (wave by wave, paralel dispatch)           │
  │        Inter-wave build (deterministik)               │
  │  2.5   Pre-Gate Lint (grep)                           │
  │  3.    Gate (opus, UI pass skip if no UI)             │
  │        Escalation: attempts.log counter (max 3)       │
  │  4.    Review + Finding Resolution (sonnet)           │
  │        Bash safety-net unresolved check               │
  │        Hicbir commit YAPILMAZ — tum edit stage'lenir  │
  │  5.    Commit (SINGLE unified commit)                 │
  │        Bug Pattern dedup + safety gate                │
  │  6.    Post-processing → sonraki story (ayni fazda)  │
  └──────────────────────────────────────────────────────┘

  Phase Bounds (ONEMLI):

  ├── AUTOPILOT MEVCUT FAZ ile sinirlidir — faz gecmez
  ├── Faz bitince: Phase Gate calistir → PASS → DUR
  │   Kullaniciya ozet banner goster: "Phase N tamamlandi, devam icin
  │   otopilot de" (veya son faz ise /asel polish)
  ├── Sonraki faza gecmek icin: tekrar "otopilot" komutu gerekir
  └── Story Loop sadece ayni faz icindeki story'leri isler

  Within-phase Kurallari:

  ├── Tum adimlar Ana Asel tarafindan — ara katman yok
  ├── Story'ler SIRAYLA — paralel story yok
  ├── Autocompact context yonetimi — DURMA
  ├── "Devam edeyim mi?" SORMA — otomatik sonraki story'e gec
  ├── Sorun olursa DURUR, 3 secenek sunar:
  │   1. "duzelt" → sen duzelt, "devam" de
  │   2. "atla"   → story'yi atla, sonrakine gec
  │   3. "dur"    → otopilot tamamen dur
  └── Telegram hook ile deterministik (ROUTEMAP edit → otomatik bildirim)

═══════════════════════════════════════════════════════════════════════════
  BUG DUZELTME — Release oncesi ve sonrasi
═══════════════════════════════════════════════════════════════════════════

  Release ONCESI (mimari esnek):
  ├── QUICKFIX: Typo, CSS, tek dosya → hemen duzelt
  └── BUGFIX:   Arastirma gerekli → test yaz, duzelt, dogrula (TDD)

  Release SONRASI (mimari FROZEN):
  ├── HOTFIX:  Acil tek dosya duzelme
  ├── BUGFIX:  Arastirma + TDD + E2E test
  └── ENHANCE: Yeni ozellik + etki analizi + E2E test

  Bug Fix TDD: Once bug'i reproduce eden test yaz → test FAIL etmeli
  → fix yap → test PASS etmeli → tum testler PASS etmeli

═══════════════════════════════════════════════════════════════════════════
  E2E & POLISH — Proje geneli kalite
═══════════════════════════════════════════════════════════════════════════

  Docker ZORUNLU. 6 agent sirayla calisir:

  | # | Ne Yapar | Odak |
  |---|----------|------|
  | E0 | Seed Data | Gercekci TR veri, tum tablolar dolu, pagination/chart/filter |
  | E1 | E2E Test | Tum ekranlar, butonlar, formlar, API, DB |
  | E2 | Test Hardener | Eksik testleri yaz, coverage arttir |
  | E3 | Perf Optimizer | N+1 query, index, cache, pool tuning |
  | E4 | UI Polisher | Design token, responsive, enterprise gorunum |
  | E5 | Fonksiyonel Kabul | AC + BR + UAT dogrulama, ACCEPTED/REJECTED rapor |

═══════════════════════════════════════════════════════════════════════════
  DOCUMENTATION — 4 dokuman seti
═══════════════════════════════════════════════════════════════════════════

  | # | Icerik | Dil | Format |
  |---|--------|-----|--------|
  | D1 | Teknik Spesifikasyon | EN | Markdown |
  | D2 | Sunumlar (Satis + Teknik) | EN | HTML |
  | D3 | Kurulum Rehberi | EN | PDF |
  | D4 | Kullanici Kilavuzu | TR | PDF + screenshot |

═══════════════════════════════════════════════════════════════════════════
  RELEASE & MAINTAIN — Canliya al, bakim yap
═══════════════════════════════════════════════════════════════════════════

  Release: Git tag + versiyon + production marker + Telegram
  Maintain: Bug/feature geldiginde otomatik siniflandirir

  Versiyon otomatik hesaplanir:
  ├── Sadece HOTFIX/BUGFIX → patch (v1.0.1)
  ├── ENHANCE var → minor (v1.1.0)
  └── "v2 planla" → major (v2.0.0, yeni planning cycle)

═══════════════════════════════════════════════════════════════════════════
  PHASE GATE — Phase sinirinda kalite kapisi
═══════════════════════════════════════════════════════════════════════════

  Tum story'ler bitince otomatik calisir. Docker ZORUNLU.

  Deploy → Smoke → Unit Tests → E2E (browser) →
  API + DB dogrulama → Ekran kontrol → Turkce metin →
  UI polish → Uyumluluk denetimi → Fix Loop (2x)

═══════════════════════════════════════════════════════════════════════════
  KALITE ZINCIRLERI & TRACEABILITY
═══════════════════════════════════════════════════════════════════════════

  Her asama bir oncekini dogrulamali — hicbir bilgi kaybolmamali:

  Brainstorm ──→ Docs ──→ Stories ──→ Code ──→ Tests ──→ USERTEST
       │            │          │          │         │          │
       ▼            ▼          ▼          ▼         ▼          ▼
  Step 8:       Step 9:    Gate       Gate      Gate       E2E
  Reviewer      A8 Doc→   Pass 1     Pass 3    Pass 1.7   Tester
  Check 12:     Story     Req→Code   Test      AC→Test    Pass 3
  Brainstorm→   Reverse   Trace      Exec      Coverage   USERTEST
  Doc Trace     Coverage                                  Execution

  Kalite Gate'leri Tam Haritasi:

  PLANNING FAZINDA:
  ┌─────────────────────────────────────────────────────────┐
  │ Step 2:  Gap Analysis (7 adim, 14 enterprise default)   │
  │ Step 8:  Final Review (12 kontrol)                      │
  │   └─ YENi #12: Brainstorm → Doc traceability           │
  │ Step 9:  Dev-Readiness (6 faz, 27+ kontrol)            │
  │   └─ YENi A8: Doc → Story reverse coverage             │
  │   └─ C6: Domain-specific technical depth               │
  └─────────────────────────────────────────────────────────┘

  DEVELOPMENT FAZINDA (her story, 8 step sequential):
  ┌─────────────────────────────────────────────────────────┐
  │ Step 1: Plan (embedded Quality Gate icinde)             │
  │   ├─ Min satir/task sayisi (S/M/L/XL)                  │
  │   ├─ Embedded spec kontrolu (API, DB, UI)              │
  │   ├─ Task complexity cross-check (L/XL → min 1 high)   │
  │   ├─ Context refs validation                            │
  │   └─ Pattern refs kontrolu                              │
  │                                                         │
  │ Step 2: Dev (wave by wave)                              │
  │   ├─ Context refs pre-validation (dispatch oncesi)      │
  │   └─ Inter-wave build (deterministik, Asel calistirir) │
  │                                                         │
  │ Step 2.5: Pre-Gate Lint                                 │
  │   ├─ Hardcoded hex color grep                           │
  │   ├─ TODO/FIXME/HACK grep                               │
  │   └─ Raw HTML element grep                              │
  │                                                         │
  │ Step 3: Gate (6-pass, opus)                             │
  │   ├─ Pass 1: Requirements Tracing (AC → code)          │
  │   ├─ Pass 2: Compliance (arch, API envelope, naming)    │
  │   ├─ Pass 2.5: Security (OWASP, CVE, auth)             │
  │   ├─ Pass 3: Test Execution (unit + full suite)         │
  │   ├─ Pass 4: Performance (N+1, index, cache)            │
  │   ├─ Pass 5: Build Verification                         │
  │   ├─ Pass 6: UI Quality + Design Token Enforcement      │
  │   ├─ Bulgu siniflandirma: FIXABLE / ESCALATE / DEFERRED │
  │   ├─ FIXABLE default — Gate duzeltir (test, config, vs) │
  │   ├─ DEFERRED → ROUTEMAP Tech Debt (hedef story)        │
  │   ├─ Escalation: attempts.log counter (max 3 re-disp.)  │
  │   └─ "Observation/Non-Blocking" YASAK — her bulgu aksiyonlu │
  │                                                         │
  │ Step 4: Review + Finding Resolution (Commit ONCESINDE)  │
  │   ├─ Phase 1: Doc Review (cross-doc, glossary, arch)    │
  │   ├─ Phase 2: Story Impact (deterministic grep trigger) │
  │   ├─ Phase 3: Finding Resolution (6 section parse +     │
  │   │           Bash safety-net: unresolved grep)         │
  │   ├─ Tech Debt Pickup (hedef story'deki D-N'ler kapandi)│
  │   └─ Hicbir commit yapilmaz — tum edit stage'lenir      │
  │                                                         │
  │ Step 5: Commit (SINGLE unified commit)                  │
  │   ├─ USERTEST + decisions.md + Bug Pattern (dedup grep) │
  │   ├─ Safety gate: review.md var mi (Bash test -s)       │
  │   ├─ git add -A + SINGLE git commit (hepsini bundle)   │
  │   └─ Her commit Review'dan gecmis kod                   │
  │                                                         │
  │ Artifact Verification (story-done-guard.sh hook):       │
  │   plan + gate + review + step-log + USERTEST entry +   │
  │   sifir unresolved finding → hepsi zorunlu              │
  │   Eksikse ROUTEMAP'e [x] DONE yazilamaz (PreToolUse)    │
  └─────────────────────────────────────────────────────────┘

  PHASE SINIRINDA:
  ┌─────────────────────────────────────────────────────────┐
  │ Phase Gate (8 adim): Deploy → Smoke → Tests → E2E →    │
  │   API+DB → Ekran → Turkce metin → UI polish → Fix Loop │
  │                                                         │
  │ Evidence Enforcement:                                   │
  │ ├── Her adim step-log.txt'e EXECUTED yazmalı            │
  │ ├── UI-conditional steps: SKIPPED_NO_UI (fazda UI yoksa)│
  │ ├── Ana Asel kanıt doğrular (Bash, LLM değil)          │
  │ └── Kanıt yoksa → PASS override → FAIL                 │
  └─────────────────────────────────────────────────────────┘

  E2E & POLISH:
  ┌─────────────────────────────────────────────────────────┐
  │ E0: Seed Data (tum tablolara gercekci Turkce veri)      │
  │ E1: E2E Browser Test (USERTEST.md senaryolari dahil)    │
  │ E2: Test Hardener (coverage arttir)                     │
  │ E3: Perf Optimizer (N+1, index, cache)                  │
  │ E4: UI Polisher (design token, responsive)              │
  │ E5: Fonksiyonel Kabul (AC + BR + USERTEST dogrulama)    │
  │     → ACCEPTED/REJECTED raporu + fix task listesi       │
  └─────────────────────────────────────────────────────────┘

  HOOK TABANLI ENFORCEMENT (deterministik, LLM bagimli degil):
  ├── gate-guard.sh       → Gate'siz commit engeller (PreToolUse Bash)
  ├── quality-scan.sh     → Pre-commit kalite + guvenlik taramasi (PreToolUse)
  ├── story-done-guard.sh → YENi: [x] DONE transition'unda tum evidence
  │                         dogrular (plan/gate/review/step-log/USERTEST/
  │                         unresolved findings). Eksikse Edit BLOCK'lanir
  │                         (PreToolUse Edit|Write)
  ├── setup-guard.sh      → Infra tuning + setup verification'siz ilerleme
  │                         engeller (PostToolUse Edit|Write)
  ├── phase-gate-guard.sh → Phase done ama Gate yoksa uyarir (PostToolUse)
  └── notify-hook.sh      → ROUTEMAP edit → Telegram (DONE/ESCALATED/FAILED)

  KALITE STANDARTLARI (rules — her zaman aktif):
  ├── 13 mimari kural (API envelope, atomic design, migrations, no init containers, BIGSERIAL PK vs)
  ├── ROUTEMAP disiplini (step bitince HEMEN guncelle)
  ├── Production-grade (MVP yasak, her feature tam ve uretim-hazir)
  ├── Strict protocol (step atlama yasak, context baskisi protokolu)
  ├── Naming conventions (PascalCase, kebab-case, snake_case)
  ├── Makefile standart hedefler (12 zorunlu target)
  ├── i18n hazirlik (Turkce default, Ingilizce secondary)
  ├── .env guvenlik (.env.example git'te, .env gitignore'da)
  └── Conventional commits (feat/fix/chore format)

```
