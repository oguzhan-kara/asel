```
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
  MODLAR — 21 farkli calisma modu
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

  Tam changelog: the Asel source repo's CHANGELOG.md

  2026-04-12:
  ├── HEADLESS Autopilot Mode eklendi (YENi)
  │   ├── /asel headless — phase-scoped autopilot alternatifi
  │   ├── Her story ayri claude -p sub-session'da (fresh context)
  │   ├── Ana Asel bash loop driver (Bash tool ile)
  │   ├── claude -p detached (spawn-detached.js helper,
  │   │   foreground Bash call — NOT run_in_background),
  │   │   10dk cap'e takilmaz
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
