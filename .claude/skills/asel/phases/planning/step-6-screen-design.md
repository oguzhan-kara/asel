# Step 6: Screen Design

> Create enterprise-grade screen mockups, UI pattern library, and navigation flows.
> Before starting: Update ROUTEMAP — mark Step 6 as `[~] IN PROGRESS`
> After completion: Update ROUTEMAP — mark Step 6 as `[x] DONE` with date

## Screen Designer

You are the Screen Designer for Asel project orchestrator. You create enterprise-grade screen mockups and UI specifications with strict cross-screen consistency.

## Context Required

Before starting, read:
- `docs/brainstorming/decisions.md`
- `docs/SCOPE.md`
- `docs/PRODUCT.md`
- `docs/ARCHITECTURE.md` (+ split files if applicable)
- `docs/FUTURE.md` (note future screens for extensibility)
- `docs/FRONTEND.md` (if exists from previous iteration)

## Rules

- ASCII art for ALL mockups
- **Enterprise-grade design** — think Salesforce, Jira, Linear quality
- **UI Pattern Library FIRST** — define patterns before any mockup
- **Cross-screen consistency is MANDATORY** — same grid, same edit pattern, same icons, same spacing everywhere
- `frontend-design` skill MUST be used during implementation for professional, distinctive UI
- Every screen must be referenced by at least one story
- Every story with UI should reference screens
- Update `docs/brainstorming/decisions.md`
- Speak in user's language, write docs in English

## Process

### 0. UI Pattern Library (MUST DO FIRST)

<EXTREMELY-IMPORTANT>
Before creating ANY mockup, define the UI Pattern Library. All mockups MUST follow these patterns.
</EXTREMELY-IMPORTANT>

Define standard patterns for the project:

```markdown
## UI Pattern Library

### Grid System
- Page layout: [sidebar + content | full-width | etc.]
- Content grid: [12-column | flex-based]
- Card grid: [2-col | 3-col | responsive]
- Spacing between elements: [standard values]

### Data Display Patterns
- **Data Table**: Column headers, row actions, selection, sort indicators, pagination
- **Card Grid**: Card layout, info hierarchy, action placement
- **Detail View**: Header, sections, related data sidebar
- **Dashboard**: Metric cards, charts, activity feed layout

### Form Patterns
- **Create Form**: Field layout, validation placement, submit/cancel buttons
- **Edit Form**: Same as create + pre-populated fields, delete action
- **Filter Bar**: Filter chips, search input, clear all, applied count
- **Inline Edit**: Click-to-edit, save/cancel, optimistic update indicator

### Navigation Patterns
- **Sidebar**: Logo, nav groups, active indicator, collapse behavior
- **Breadcrumb**: Path format, clickable segments, current page
- **Tabs**: Tab bar, active indicator, content area
- **Global Search**: Search trigger, overlay/modal, result categories

### Action Patterns
- **Primary Action**: Top-right placement, prominent button
- **Row Actions**: Icon buttons or overflow menu
- **Bulk Actions**: Toolbar appears on multi-select
- **Destructive Action**: Red color, confirmation dialog

### Feedback Patterns
- **Toast**: Position, duration, action button
- **Empty State**: Icon, message, primary action CTA
- **Loading**: Skeleton screens for tables/cards, spinner for actions
- **Error State**: Error message, retry button, help link

### Icon Conventions
- Edit: pencil
- Delete: trash
- View: eye
- Add: +
- Filter: funnel
- Search: magnifier
- Consistent across ALL screens — never use different icons for same action
```

Present pattern library to user → approval → then proceed to mockups.

<EXTREMELY-IMPORTANT>
### Screen Approval Protocol

After pattern library is approved, present screen mockups in GROUPS for approval. Do NOT write all screens to files without user seeing them first.

1. Group screens by module/domain (e.g., "Auth screens", "Dashboard", "User Management")
2. Present each group: show ASCII mockups + drill-down maps + states
3. User reviews the group → approves or gives feedback
4. After approval → write that group's files
5. Proceed to next group

Do NOT background-dispatch all screens at once. Do NOT write files before approval.
Typical grouping: 3-5 screens per group, 2-4 groups total.

### Tabbed Screens Rule
If a screen has tabs, EVERY tab MUST have its own ASCII mockup. Each tab is a distinct content area with its own layout, components, and data. Drawing only the "active" tab and skipping others is INCOMPLETE design. Example: If a screen has [Overview] [Repos] [Tasks] [Graph] [Chat] tabs → 5 separate mockups required under that screen.
</EXTREMELY-IMPORTANT>

### 1. Screen Inventory

List all screens needed based on user journeys and stories:
- Screen ID and name
- Which stories reference it
- Screen type (page, modal, drawer, toast, etc.)

### 2. Navigation Flow

```
ASCII navigation map:

[Landing] ──login──▶ [Dashboard]
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
         [Feature A] [Feature B] [Settings]
              │                      │
              ▼                      ▼
         [Detail]              [Profile]
```

### 3. Screen Mockups

For each screen, create ASCII wireframe:

```
┌─────────────────────────────────────────────┐
│  Logo            [Search...]    [Avatar ▼]  │
├─────────────────────────────────────────────┤
│ ┌──────┐                                    │
│ │ Nav  │  Welcome back, User                │
│ │      │                                    │
│ │ Home │  ┌─────────┐ ┌─────────┐          │
│ │ Tasks│  │ Card 1  │ │ Card 2  │          │
│ │ Team │  │ metric  │ │ metric  │          │
│ │ ...  │  └─────────┘ └─────────┘          │
│ │      │                                    │
│ │      │  Recent Activity                   │
│ │      │  ├─ Item 1          [Action]       │
│ │      │  ├─ Item 2          [Action]       │
│ │      │  └─ Item 3          [Action]       │
│ └──────┘                                    │
├─────────────────────────────────────────────┤
│  Footer links                    v1.0.0     │
└─────────────────────────────────────────────┘
```

Include for each screen:
- Screen ID and title
- Layout structure
- Key UI elements (buttons, forms, lists, cards)
- Data displayed
- User actions available
- Responsive behavior notes (mobile vs desktop)
- Story references

### 4. Component Library

List reusable UI components:
- Navigation (header, sidebar, breadcrumbs)
- Forms (inputs, selects, date pickers)
- Data display (tables, cards, lists)
- Feedback (toasts, modals, alerts)
- Layout (grid, container, section)

### 5. Data Drill-Down Map (REQUIRED)

This is a UI design bible. ALL related data on screen MUST be navigable to its detail.

For each screen, create a drill-down map:

```markdown
### SCR-03: Dashboard — Drill-Down Map
| Data Element | Interaction | Target | Pattern |
|-------------|-------------|--------|---------|
| User name in header | Click | SCR-06: Profile | Navigation |
| Order count card | Click | SCR-07: Orders list | Navigation |
| Recent order row | Click | SCR-08: Order detail | Navigation |
| Customer name in order | Hover/Click | Customer info | Popover |
| Product name in order | Click | SCR-09: Product detail | Drawer |
| Status badge | Hover | Status history | Tooltip |
```

Patterns to use:
- **Navigation** → Go to detail page (breadcrumbs back)
- **Popover** → Quick summary on hover/click (lightweight, no context loss)
- **Drawer** → Side panel with full details (keeps current page visible)
- **Modal** → Focused detail view (blocks background)
- **Expandable Row** → Inline detail in tables
- **Tooltip** → Minimal info on hover (status, dates, counts)

Rules:
- NO dead-end data. Every entity reference is clickable.
- If data appears on multiple screens, drill-down target is consistent everywhere.
- Drill-down pattern choice depends on: data complexity (simple→tooltip, complex→drawer/page) and user task (browsing→popover, acting→navigation).

### 6. Interaction Notes

For each screen, note:
- Loading states
- Empty states
- Error states
- Transitions/animations

## Adaptation by Project Type

- **web-app**: Full mockups with responsive notes
- **mobile-app**: Mobile screen flows with gesture notes
- **api-backend**: API documentation screens (Swagger-like), admin panel if any
- **cli-tool**: Terminal output examples, command help screens
- **fullstack**: Both frontend mockups and API docs

## Scale-Adaptive Output

Detect screen count and split accordingly:

| Scale | Threshold | Approach |
|-------|-----------|----------|
| **Small** | < 10 screens | Single `docs/SCREENS.md` |
| **Medium/Large** | 10+ screens | Index + module-based split |

### Split Structure (10+ screens)

```
docs/
├── SCREENS.md                   ← index only (SCR-NNN | name | module)
├── screens/
│   ├── _index.md                ← full screen list with one-line descriptions
│   ├── SCR-001-main-dashboard.md
│   ├── SCR-002-analytics.md
│   ├── SCR-010-user-list.md
│   ├── SCR-011-user-detail.md
│   └── ...
```

<EXTREMELY-IMPORTANT>
All screen MD files MUST be placed flat inside `docs/screens/` — NO subdirectories. Use descriptive filenames with module prefix (e.g., `SCR-010-user-list.md` not `user-management/SCR-010-list.md`).
</EXTREMELY-IMPORTANT>

## Output Files

- `docs/SCREENS.md` (single file or index, depending on scale)
- `docs/screens/SCR-NNN-*.md` (if split — flat, no subdirectories)
- UI Pattern Library included in SCREENS.md header (or `docs/screens/_patterns.md` if split)
- Update `docs/brainstorming/decisions.md`

## Enterprise-Grade & frontend-design Integration

<EXTREMELY-IMPORTANT>
All screens MUST be designed to enterprise-grade standards:
- Data-heavy dashboards, complex tables, advanced filtering, bulk actions
- Professional business application feel (Salesforce, Jira, Linear quality)
- Data grids: sort, filter, group, export, column resize
- Role-based UI variants (admin vs user views)
- Notification center, breadcrumb, global search patterns
- Empty state, loading skeleton, error boundary — all designed

When this project enters development phase, the `frontend-design` skill MUST be used by the Developer agent for actual implementation. The mockups here define WHAT and WHERE, frontend-design defines HOW it looks with distinctive, professional aesthetics. Generic AI aesthetics are NOT acceptable.
</EXTREMELY-IMPORTANT>

## Production Completeness Gate (Mandatory — before marking Step 6 DONE)

After ALL screens are designed and approved, run this deep product critique before proceeding to theme. This is automatic — do NOT skip, do NOT ask user whether to run it.

<EXTREMELY-IMPORTANT>
This is NOT a quick checklist. You must THINK DEEPLY as if you are the CTO evaluating whether this product can compete in the market. Spend real time on research. Be ambitious. The goal is to make the user say "voov" when they see what we're building.
</EXTREMELY-IMPORTANT>

### Phase 1: Deep Product Research

Use WebSearch extensively. Research at minimum:

**a) Direct competitors (3-5 products)**
- Find real production products in the EXACT same domain
- Study their public feature lists, demo videos, marketing pages, documentation
- Note every feature/screen they offer

**b) Best-in-class UX patterns**
- How do top SaaS products in this domain handle dashboards?
- What data visualizations do they use? (heatmaps, real-time maps, trend charts, anomaly detection)
- What operational workflows exist? (bulk operations, scheduling, automation rules)
- How do they handle notifications, alerts, escalation?

**c) Enterprise expectations**
- What do enterprise buyers expect that individual users don't?
- Multi-tenant isolation, audit trails, SSO, RBAC, API key management
- White-label, custom branding, tenant-level configuration
- SLA monitoring, uptime dashboard, incident history

**d) "Wow factor" differentiators**
- What would make a demo UNFORGETTABLE?
- Real-time animated dashboards, live maps with device pins, AI-powered anomaly alerts
- Drag-and-drop workflow builders, natural language search
- Mobile companion views, executive summary emails
- Dark/light theme with professional transitions

### Phase 2: Critical Self-Review

For EACH competitor feature and best-practice pattern found, evaluate:
- "Our product has this?" → mark as COVERED
- "Our product lacks this and it's essential?" → mark as GAP
- "Our product lacks this but it would be a wow factor?" → mark as WOW

### Phase 3: Present Findings

```
═══ PRODUCTION COMPLETENESS REVIEW ═════════════════════════════════════
Urun: [Product name]
Tip: [e.g., Enterprise HES Platform]
Mevcut ekran: N
Rakipler: [competitor 1], [competitor 2], [competitor 3]

GAP — Rakiplerin hepsinde var, bizde yok (eklenmeli):
  1. [Feature/Screen] — [Detayli aciklama, neden onemli]
     Kaynak: [hangi rakiplerde goruldu]
  2. ...

WOW — Differentiator, demo'da etkileyici (onerilir):
  3. [Feature/Screen] — [Detayli aciklama, nasil etki yaratir]
     Ilham: [hangi urun/trend]
  4. ...

COVERED — Zaten var, teyit:
  - [Feature] ✓ [Hangi ekranda]
  - ...

Hangilerini ekleyelim? (numara veya "hepsi")
═══════════════════════════════════════════════════════════════════════
```

### Phase 4: User Approval

- User approves specific items → proceed to Phase 5
- User says "hepsi" → all GAP + WOW items approved
- User rejects specific items → skip those, log to decisions.md

### Phase 5: Backward Integration (approved items)

For EACH approved item, update ALL affected documents in order:

**a) SCOPE.md** — Add new features to In Scope

**b) PRODUCT.md** — Add new features with business rules, workflows

**c) ARCHITECTURE.md** (and split files if scale-adaptive):
- New API endpoints (full spec: request, response, errors, notes)
- New DB tables/columns (with types, constraints, indexes)
- New Redis keys/patterns (if caching needed)
- New Kafka topics (if event-driven)
- New Docker services (if new infra needed)
- New components (CMP-NN IDs)
- Updated data flows

**d) SCREENS.md** (and split files) — Design full mockups for new screens:
- Same quality and detail as existing screens
- ASCII mockups with all states (empty, loading, error, populated)
- Tab mockups, modal mockups, responsive variants
- Cross-reference to new API endpoints and components

**e) FUTURE.md** — Move any items that are now in scope out of FUTURE

**f) GLOSSARY.md** — Add any new domain terms

**g) decisions.md** — Log: "Production Completeness Gate: N items approved, M rejected"

**h) ROUTEMAP.md** — Log in Change Log: "Production Completeness: added N screens, M endpoints, K tables"

<EXTREMELY-IMPORTANT>
Backward integration is NOT optional. If you add a new screen that needs an API endpoint, that endpoint MUST be added to ARCHITECTURE.md with full spec BEFORE marking Step 6 DONE. If it needs a DB table, that table MUST be defined. If it needs Redis caching, that key pattern MUST be documented. Half-integrated additions are WORSE than no additions — they create phantom references that break story writing.
</EXTREMELY-IMPORTANT>

## When Complete

- UI Pattern Library defined and approved
- **Production Completeness Gate passed** — competitor research done, findings presented, user decided
- **Backward integration complete** — all approved additions reflected in SCOPE, PRODUCT, ARCHITECTURE, SCREENS, GLOSSARY
- Total screens: N (including additions from completeness gate)
- File structure: single file or split (N modules)
- Cross-screen consistency verified
- Screen-to-architecture mapping complete
- Navigation flow documented
- Update ROUTEMAP → Step 6 `[x] DONE`
- Next: Read `phases/planning/step-6.5-theme-design.md`
