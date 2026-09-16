```
═══════════════════════════════════════════════════════════════════════════
                        ASEL — PROJE YASAM DONGUSU
═══════════════════════════════════════════════════════════════════════════

  Asel, yazilim projelerini fikirden uretime kadar yonetir.
  5 faz, 21 mod, 19 ajan, otomatik kalite kontrolleri ve enforcements.
  asel.config.json ile yapilandirilir; hook'lar Node.js ile calisir (jq gerekmez).

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

```
