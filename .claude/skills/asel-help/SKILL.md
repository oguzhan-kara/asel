---
name: asel-help
description: Internal reference card. Only invoke when user explicitly types /asel-help slash command. Never auto-trigger.
user_invocable: true
auto_trigger: false
---

# Asel Help — Kullanım Kılavuzu

Asel'in nasıl çalıştığını ve nasıl kullanıldığını gösterir.

## Rules

- Read-only — NO file changes
- Display in user's language (Turkish)
- Do NOT auto-invoke — only when user explicitly calls `/asel-help`
- Show the full guide below, formatted exactly as specified

## Output

Display the following guide:

```
═══════════════════════════════════════════════════════════════════════════
                        ASEL — PROJE YASAM DONGUSU
═══════════════════════════════════════════════════════════════════════════

  Asel, yazilim projelerini fikirden uretime kadar yonetir.
  5 faz, 20 mod, otomatik kalite kontrolleri ve enforcements.

  PLANNING → DEVELOPMENT → E2E & POLISH → DOCUMENTATION → RELEASE

═══════════════════════════════════════════════════════════════════════════
  PLANNING — Projeyi tasarla
═══════════════════════════════════════════════════════════════════════════

  10 adimda projenin tum dokumantasyonunu olusturur:

  | # | Adim | Ne Yapar | Cikti |
  |---|------|----------|-------|
  | 1 | Kesfet | Projeyi anlama, soru-cevap | Karar dosyasi |
  | 2 | Gap Analizi | Eksikleri bul (14 enterprise default otomatik) | Onaylanan ozellikler |
  | 3 | Urun Tanimi | Scope, ozellikler, is kurallari | SCOPE, PRODUCT, GLOSSARY |
  | 4 | Gelecek Planı | Rakip analizi, gelecek ozellikler | FUTURE.md |
  | 5 | Mimari | Servisler, API, DB, Docker, componentler | ARCHITECTURE, ADRs |
  | 6 | Ekran Tasarimi | ASCII mockup, UI pattern library | SCREENS.md |
  |     | Completeness Gate | Rakip analiz, GAP+WOW, geriye dok entegrasyon | Tum doc'lar |
  | 6.5 | Tema | HTML mockup, design system | FRONTEND.md |
  | 7 | Story Yazimi | Gelistirme-hazir story dosyalari | Story dosyalari, ROUTEMAP |
  | 7.5 | UAT Senaryolari | Is akisi bazli kabul senaryolari | UAT.md |
  | 8 | Son Kontrol | Tum dokumanlar arasi tutarlilik | Review raporu |
  | 9 | Dev-Readiness | Otonom gelistirme icin %100 netlik auditi | Readiness raporu |

  Her adimda kullanici onayi alinir. Onaysiz ilerlenmez.

  Enterprise Defaults (17 item otomatik eklenir):
  Empty States, Loading, Audit Trail, First-Time Setup,
  Credential Security, Confirm Dialogs, Navigation Shell
  (breadcrumb+sidebar+shortcuts), Server Pagination,
  Filter Debounce, Virtual Scrolling, Data Export,
  Health Check, DB Migrations, Code Splitting,
  Global Search (/, Ctrl+K), Contextual Help (+glossary CMS),
  Deep Linking (URL state)

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

═══════════════════════════════════════════════════════════════════════════
  MID-PROJECT KOMUTLARI — Development sirasinda kullanilabilir
═══════════════════════════════════════════════════════════════════════════

  Otopilot veya normal dev sirasinda istedigin zaman kullanabilirsin:

  | Komut | Ne Yapar | Ne Zaman Kullan |
  |-------|----------|-----------------|
  | /asel gap review | Eksik feature/flow tara, | Yeni feature kesfedildi, |
  |                  | yeni story ekle | scope genisletme lazim |
  | /asel dev-readiness | PENDING story'leri | Change sonrasi, yeni phase |
  |                     | otonom dev icin denetle | oncesi, drift suphesi |
  | /asel [degisiklik] | Etki analizi + doc/story | Gereksinim degisti, |
  |                    | guncelle | musteri yeni bisey istedi |
  | /asel [bug] | QUICKFIX veya BUGFIX | Release oncesi bug bulundu |
  |             | pipeline (TDD) | |
  | /asel audit | Doc vs code gap analizi | Compliance, uyumluluk |
  |             | | kontrolu lazim |
  | /asel devops | Infra tune/optimize | Yeni servis eklendi, |
  |              |                    | performans sorunu var |
  | /asel deploy | Docker build + up | Test ortami lazim |
  | /asel uat | UAT senaryolari uret/ | Yeni story eklendi, |
  |           | guncelle | is akisi degisti |
  | /asel seed | Test verisi uret ve yukle | E2E oncesi, test ortami |
  | /asel kabul | Fonksiyonel kabul raporu | AC + BR dogrulama, |
  |             |                          | fix task listesi cikar |
  | /asel e2e-check [scope] | Scoped browser testi    | Bitmis story'leri gercek |
  |                         | (Playwright MCP tools ({{playwrightPrefix}}__browser_*), headless  | tarayicida gez: visual + |
  |                         | OFF), bulgular toplu    | functional + data + RBAC + |
  |                         | onay -> bugfix/change   | console/network; scope: all/ |
  |                         | pipeline                | phase-N/STORY-NNN/last-N |
  | /asel [soru] | Doc'lardan cevap ver | Proje hakkinda soru var |

  Ornek Senaryolar:

  "Musteri yeni bir rapor ekrani istedi"
    → /asel [degisiklik aciklamasi] → etki analizi → story eklenir
    → /asel dev-readiness → yeni story denetlenir
    → /asel otopilot devam → gelistirme devam eder

  "Phase 2 bitmek uzere, Phase 3'e gecmeden once kontrol"
    → /asel dev-readiness → PENDING story'ler denetlenir
    → drift varsa doc'lar guncellenir

  "Otopilot calisirken bir bug farkedildi"
    → otopilot durur (veya ayri session'da)
    → /asel [bug aciklamasi] → QUICKFIX/BUGFIX pipeline

  "Yeni bir entegrasyon eklenmesi gerekiyor"
    → /asel gap review → fonksiyonel eksikler taranir
    → yeni story'ler eklenir, ROUTEMAP guncellenir
    → /asel otopilot devam → yeni story'ler de gelistirilir

═══════════════════════════════════════════════════════════════════════════
  OLUSTURULAN DOKUMANLAR
═══════════════════════════════════════════════════════════════════════════

  docs/
  ├── ROUTEMAP.md       ← Proje durumu (tek kaynak)
  ├── ARCHITECTURE.md   ← Sistem mimarisi
  ├── PRODUCT.md        ← Is kurallari, ozellikler
  ├── SCOPE.md          ← Proje sinirlari
  ├── GLOSSARY.md       ← Terimler sozlugu
  ├── FUTURE.md         ← Gelecek ozellikler
  ├── SCREENS.md        ← Ekran tasarimlari
  ├── FRONTEND.md       ← Design system
  ├── USERTEST.md       ← Manuel test senaryolari (Turkce)
  ├── brainstorming/    ← Karar ve oturum notlari
  ├── adrs/             ← Mimari karar kayitlari
  ├── stories/          ← Story + plan + gate + review dosyalari
  ├── maintenance/      ← Release sonrasi fix planlari
  ├── reports/          ← E2E, test, performans raporlari
  └── output/           ← Spec, sunum, rehber, kilavuz

═══════════════════════════════════════════════════════════════════════════
  MODLAR — 19 farkli calisma modu
═══════════════════════════════════════════════════════════════════════════

  | Mod | Ne Zaman | Ne Yapar |
  |-----|----------|----------|
  | NEW | Yeni proje | Sifirdan planning baslatir |
  | ONBOARD | Mevcut kod var | Kodu tarar, doc olusturur |
  | CONTINUE | Yarim kalmis is | Kaldiği yerden devam eder |
  | DEV | Planning tamam | Story story gelisitrir |
  | AUTOPILOT | Tam otonom | Tum story'leri sirayla yapar |
  | BUGFIX | Bug var (release oncesi) | QUICKFIX veya BUGFIX pipeline |
  | CHANGE | Degisiklik istegi | Etki analizi + plan |
  | POLISH | Kalite fazi | E2E + test + perf + UI |
  | DOCS | Dokumantasyon | 4 dokuman seti olusturur |
  | DEPLOY | Deploy et | Docker build + up |
  | RELEASE | Canliya al | Git tag + versiyon |
  | MAINTAIN | Release sonrasi | HOTFIX/BUGFIX/ENHANCE |
  | GAP REVIEW | Eksik tara | Mevcut scope'u tara, yeni gap bul, story ekle |
  | DEV-READINESS | Readiness kontrol | PENDING story'leri otonom dev icin denetle |
  | UAT | Kabul senaryosu | Is akisi bazli UAT senaryolari uret/guncelle |
  | SEED | Test verisi | Gercekci seed data uret ve yukle |
  | ACCEPTANCE | Fonksiyonel kabul | AC + BR + USERTEST dogrulama raporu |
  | DEVOPS | Infra tune | Docker servislerini best-practice tune eder |
  | AUDIT | Uyumluluk | Doc vs code gap analizi |
  | E2E-CHECK | Scoped browser test | Story/phase/all scope'unda Playwright MCP tools ({{playwrightPrefix}}__browser_*) ile visual + functional + data + RBAC tarama, bulgular toplu onay -> bugfix/change |
  | ASK | Soru | Doc'lardan cevap verir |

═══════════════════════════════════════════════════════════════════════════
  NASIL KULLANILIR?
═══════════════════════════════════════════════════════════════════════════

  Gelistirme:
   /asel                → Fikrini anlat, planning baslar
   /asel onboard        → Mevcut projeyi Asel'e aktar
   /asel devam          → Kaldigin yerden devam et
   /asel development    → Story gelistirmeye gec
   /asel otopilot       → Tam otonom calistir
   /asel [degisiklik]   → Etki analizi yap
   /asel [bug aciklama] → Bug duzelt (QUICKFIX/BUGFIX)
   /asel headless       → Phase-scoped autopilot, her story fresh
                          claude -p sub-session'da (context isolation)
   /asel deploy         → Docker build + up
   /asel [soru]         → Doc'lardan cevap al
   /asel gap review     → Fonksiyonel eksikleri tara, story ekle
   /asel dev-readiness  → PENDING story'leri otonom dev icin denetle
   /asel e2e-check      → Scoped browser testi (mid-project)
     all                  tum DONE story'leri tara
     phase-N              sadece Phase N (orn: phase-2)
     STORY-NNN            tek story (orn: STORY-012)
     last-N               son N DONE story (orn: last-3)
     (argumantasiz calistirirsan scope sorulur)
   /asel polish         → E2E & kalite fazi
   /asel audit          → Doc vs code kontrolu
   /asel docs           → Dokumantasyon olustur

  Canliya Alma:
   /asel release        → Git tag + production marker
   /asel [bug]          → HOTFIX/BUGFIX (mimari frozen)
   /asel [feature]      → ENHANCE (mimari frozen)
   /asel v2 planla      → Yeni major versiyon

  Yardimci Komutlar:
   /asel-help           → Bu kilavuz
   /asel-setup          → Gelistirici ortam kurulumu
   /asel-checkup        → Proje saglik kontrolu (4 boyut)
                          [A] Infra Health — docker/infra, Makefile,
                              tuning conf, init container, env, ROUTEMAP
                          [B] Forward Compliance (Story→Code)
                              Compliance Auditor dispatch eder,
                              kucuk gaplar auto-fix,
                              Path A: PENDING story'ye AC ekleme,
                              Path B: yeni [AUDIT-GAP] story
                          [C] Feature Coverage (PRODUCT/SCOPE→Story)
                              NO_STORY/PARTIAL gaplar icin
                              [PRODUCT-GAP] story uretimi
                          [D] Leftover Findings (Gate/Review sweep)
                              Eski protokol non-blocking/observation
                              + escalated/deferred findings taranir
                              [FINDING-SWEEP] story uretimi
                          + DevOps Tuning (yoksa) + Setup Verifier
   /asel-deploy         → Docker build & up
   /asel-commit         → Akilli commit
   /asel-changelog      → Degisiklik listesi olustur

═══════════════════════════════════════════════════════════════════════════
  SON DEGISIKLIKLER (CHANGELOG)
═══════════════════════════════════════════════════════════════════════════

  Tam changelog: {{aselRoot}}/CHANGELOG.md

  2026-04-12:
  ├── HEADLESS Autopilot Mode eklendi (YENi)
  │   ├── /asel headless — phase-scoped autopilot alternatifi
  │   ├── Her story ayri claude -p sub-session'da (fresh context)
  │   ├── Ana Asel bash loop driver (Bash tool ile)
  │   ├── claude -p detached (nohup & disown, foreground Bash
  │   │   call — NOT run_in_background), 10dk cap'e takilmaz
  │   ├── Idempotency guard: PID file + pgrep check, cifte
  │   │   dispatch yasak (eski "prev.log" sorunu cozuldu)
  │   ├── Adaptive backoff polling: 5 → 10 → 20 → 30 dk
  │   │   (4 reasoning turn, 65dk budget)
  │   │   Context: 4-16K/story (sabit 5dk'dan %65 az)
  │   │   1-satir status: step=STEP_X elapsed=Nm poll=K/4
  │   ├── Terminal state: PID alive check + ROUTEMAP
  │   │   (sentinel file kaldirildi, crash detection bonus)
  │   ├── Log plain text (JSON degil), tail -f ile izlenebilir
  │   ├── Priority: IN PROGRESS > NEEDS_REPLAN > PENDING
  │   ├── Outcome: ROUTEMAP + exit code cross-check
  │   │   (0=DONE 1=ESCALATED 2=FAILED 3=crash)
  │   ├── ESCALATED/FAILED → STOP, user'a sunulur
  │   ├── Phase Gate de claude -p ile calisir (ayni pattern)
  │   └── Live izleme: ayri terminalde tail -f log
  ├── asel-checkup 4 boyutlu aggregated report
  │   ├── [A] Infra Health (eski davranis)
  │   ├── [B] Forward Compliance (Story→Code) — Compliance Auditor
  │   ├── [C] Feature Coverage (PRODUCT/SCOPE→Story, reverse)
  │   └── [D] Leftover Findings (Gate/Review history sweep)
  ├── Compliance Auditor expansion
  │   ├── 7 inventory (eskiden 5): +1f Feature, +1g Leftover Findings
  │   ├── 1f: PRODUCT/SCOPE → Story reverse-coverage (FEAT-NNN)
  │   │   NO_STORY / PARTIAL gap tipleri
  │   ├── 1g: Gate/Review history sweep (FIND-NNN)
  │   │   Eski protokol Observations/Notes/Non-Blocking/Advisory
  │   │   + Escalated/Deferred/Non-Resolved rows taranir
  │   │   ROUTEMAP Tech Debt ile dedup
  │   ├── Path A (prefer): PENDING story'ye AC ekleme
  │   │   Overlap kriteri: entity+layer match, scope <=25% balloon
  │   │   NEVER DONE veya IN PROGRESS story dosyasina dokunur
  │   └── Path B: yeni story uretimi (3 prefix)
  │       [AUDIT-GAP] (1a-1e doc/code),
  │       [PRODUCT-GAP] (1f feature coverage),
  │       [FINDING-SWEEP] (1g leftover findings)
  └── CHECKUP trigger mode — MANUAL ile ayni scan davranisi,
      rapor context'i farkli (asel-checkup'a aggregated donus)

  2026-04-11:
  ├── Dev-Cycle Determinism Hardening (Tier 1 + Tier 2)
  │   ├── story-done-guard.sh hook — [x] DONE transition'unda
  │   │   tum evidence dogrulanir (plan/gate/review/step-log/
  │   │   USERTEST/unresolved findings). Eksikse Edit BLOCK'lanir
  │   ├── STORY-NNN-step-log.txt — her adim sonunda append
  │   │   (Phase Gate pattern'inin per-story mirror'i)
  │   ├── STORY-NNN-attempts.log — escalation counter,
  │   │   hard bound 3 re-dispatch per story (wc -l ile kontrol)
  │   ├── Finding Resolution Bash safety-net — unresolved grep
  │   ├── Review Impact deterministic trigger — grep UPDATED
  │   ├── Bug Pattern dedup — grep -cF decisions.md
  │   └── CLAUDE.md write verify — grep Step her transition'da
  ├── Commit-before-Review → Review-before-Commit (Sequential)
  │   ├── Step 4 = Review + Finding Resolution (hicbir commit yok)
  │   ├── Step 5 = SINGLE unified commit (story code + review edits +
  │   │   finding fixes hepsi bundle)
  │   └── Git history: her commit Review'dan gecmis
  ├── AUTOPILOT Phase-Scoped
  │   ├── Artik tum proje degil, mevcut faz calistirir
  │   ├── Faz bitince Phase Gate → PASS → DUR (summary banner)
  │   └── Yeni faz icin tekrar "otopilot" demek gerek
  └── Enterprise Defaults 14 → 17 item
      ├── #4 Onboarding Wizard → First-Time Setup (netlestirildi)
      ├── #7 Keyboard Shortcuts → Navigation Shell (breadcrumb
      │   + sidebar + shortcuts tek konsept)
      └── #15 Global Search, #16 Contextual Help, #17 Deep Linking

  2026-04-07:
  ├── Review Finding Resolution (Phase 3)
  │   Review bulgulari artik parse edilip cozulmek zorunda
  │   FIX now / DEFER (ROUTEMAP Tech Debt) / ESCALATE
  │   Sifir unresolved finding olmadan story kapanmaz
  ├── Phase Gate Evidence Enforcement
  │   Her adim step-log.txt + kanit dosyasi uretmek zorunda
  │   UI-conditional steps: SKIPPED_NO_UI (fazda UI yoksa)
  │   Ana Asel Bash ile kanit dogrular, kanit yoksa FAIL override
  ├── Review Blocking
  │   Review artik non-blocking degil
  │   3 deneme (sonnet → sonnet → opus), basarisizsa escalate
  └── Reviewer: Issues tablosu + findings count eklendi

  2026-03-30:
  ├── Hiz Optimizasyonu: ~5-7 dk/story tasarruf
  │   ├── PlanQG → Planner'a gomuldu (1 agent round-trip yok)
  │   ├── Reviewer: opus → sonnet (doc karsilastirma icin yeterli)
  │   ├── Gate: UI pass skip (backend story'lerde Pass 6 atlanir)
  │   └── Commit + Review: paralel calisir
  ├── Story Runner tamamen kaldirildi → Direct Execution
  │   Ana Asel tum adimlari dogrudan dispatch eder (2-level nesting)
  │   XL story patlama sorunu cozuldu, wave paralel tam destek
  ├── Deliverable dosyasi kaldirildi (Gate report yeterli)
  ├── asel-checkup skill: proje saglik kontrolu + fix + DevOps + verify
  ├── Rule 12: Init container yasagi (entrypoint script zorunlu)
  ├── Rule 13: BIGSERIAL PK, composite PK yasak
  ├── infra/ dizin standardi (DevOps agent + architecture template)
  └── quality-scan.sh: ui-kit/ path pattern fix

  2026-03-29:
  ├── Production Completeness Gate: Step 6 sonunda otomatik
  │   Rakip arastirma → GAP/WOW analiz → geriye donuk doc entegrasyonu
  ├── Frontend-First Mock Pattern: fullstack/web-app projelerde
  │   UI Shell + mock data once, backend integration sonra
  │   5 katmanli mock koruma: Planner→Gate→Reviewer→PhaseGate→ROUTEMAP
  ├── Tech Debt → ROUTEMAP: decisions.md'den ROUTEMAP tablosuna tasindi
  │   Gate yazar, Planner okur, Gate resolve eder, Reviewer dogrular
  ├── DevOps Agent: Infra tuning (PG, Redis, Nginx, Kafka, CH, EMQX, Mongo)
  │   Phase 1 STORY-001 sonrasi otomatik + mid-project on-demand
  ├── Gate: FIXABLE-by-default siniflandirma, "Observation" YASAK
  ├── Production-Grade rule: MVP yaklasimi tamamen yasaklandi
  ├── Strict Protocol rule: Step atlama/kisayol yasagi, context pressure protokolu
  ├── Statusline: Hesap adi + subscription tipi (multi-account + context fix)
  └── setup-guard.sh: infra-tuning.md raporu da kontrol ediliyor

  2026-03-23:
  ├── MAJOR: Step 9 Dev-Readiness Audit (27+ kontrol, 6 faz)
  ├── MAJOR: Plan Quality Gate — min lines, embedded
  │   spec, complexity cross-check, context/pattern refs
  ├── Pre-Gate Lint (Step 2.5) — hardcoded color/TODO/raw HTML
  ├── Inter-wave build — deterministik, Asel calistirir
  ├── Context refs validation — dispatch oncesi dogrulama
  ├── Deterministic Telegram — hook tabanli, LLM bagimli degil
  ├── Traceability gates — brainstorm→doc, doc→story, decision trace
  ├── USERTEST completeness enforcement
  ├── Bug Pattern Knowledge Base — auto-entry, planner warning, gate check
  ├── DEV-READINESS mid-project modu
  ├── Domain-specific tech depth (C6) — 12 alan, spec doc olusturma
  └── Autopilot "devam edeyim mi?" fix

  2026-03-20:
  └── Initial: Asel V2 Modular Architecture
      13 agent, 24 phase, 9 template, 9 rule, 6 hook

═══════════════════════════════════════════════════════════════════════════
```
