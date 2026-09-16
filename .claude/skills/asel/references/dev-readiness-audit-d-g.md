# Dev-readiness audit Phase D-G (reference for step-9-dev-readiness.md)

## Phase D: Design System Completeness (UI projects ONLY)

### D1. Token Coverage

FRONTEND.md must have **class-name-level tokens** (not just color values). Planner needs class names for Design Token Map.

| Category | Required Tokens | FAIL |
|----------|----------------|------|
| Colors | primary, secondary, accent, success, warning, error, info + surface (card, page, elevated) + text (primary, secondary, muted, inverse) + border (default, strong) | Missing token or no class name |
| Typography | heading-lg/md/sm, body-lg/md/sm, caption, overline + weights | Only "heading: 24px" without class |
| Spacing | section, card, input, inline, stack + responsive variants | Only pixel values |
| Shadows | card, modal, dropdown, header, none | Not defined |
| Radii | card, button, input, modal, badge, full | Not defined |
| Z-index | modal, dropdown, tooltip, header, sidebar, overlay | Not defined |
| Transitions | duration (fast: 150ms, normal: 300ms) + easing | Not defined |

### D2. Screen Mockup Completeness

For EVERY screen in SCREENS.md:
- [ ] No `TBD`, `placeholder`, or empty regions
- [ ] ALL interactive elements annotated with component name
- [ ] ALL data fields labeled
- [ ] Responsive notes if applicable

### D3. Component Hierarchy

| Level | Must Define | Check |
|-------|------------|-------|
| Atoms | Button, Input, Select, Textarea, Icon, Badge, Avatar, Label | Each exists with variants listed |
| Molecules | SearchBar, StatCard, FormField, MenuItem, NavLink, DropdownMenu | Key molecules listed |
| Organisms | DataTable, FormPanel, Header, Sidebar, Modal, PageLayout | Core organisms listed |

Every screen element in SCREENS.md MUST map to an atom/molecule/organism. Unmapped element = GAP.

### D4. Form Specification

For EVERY form across ALL stories:

| Element | PASS | FAIL |
|---------|------|------|
| Field list | ALL fields with labels (TR) | Incomplete list |
| Field types | text/email/password/number/date/select/checkbox/radio/textarea | Missing type |
| Validation per field | Required? + min/max + pattern + custom rule | "validate" without rules |
| Error messages | Turkish, specific per rule: "E-posta formatı geçersiz" | Generic "Gerekli alan" for all |
| Placeholder text | Turkish hint: "ornek@email.com" | Missing |
| Submit: success | What happens: toast text + redirect/close + data refresh | "show success" |
| Submit: failure | What happens: error display + focus first error field | Not specified |
| Initial values | Defaults for create / populated values for edit | Not specified for edit forms |

---

## Phase E: Decision Completeness

### E1. No Open Decisions

Grep `docs/brainstorming/decisions.md` for: `PENDING`, `OPEN`, `TBD`, `UNDECIDED`, `?`
Each found → present to user for immediate resolution.

### E2. No TBD in Any Doc

Grep ALL files in `docs/` for: `TBD`, `TODO`, `FIXME`, `HACK`, `PLACEHOLDER`, `TEMP`, `XXX`
Each found → resolve or remove.

### E3. Every "OR" Resolved

Grep for unresolved alternatives: `X or Y`, `X veya Y`, `Option A / Option B`, `alternatively`
Each found → present to user → decide → update doc.

---

## Phase F: Phase 1 Bootstrap Readiness

### F1. Scaffold Story

STORY-001 (or first story) MUST create ALL project infrastructure:

| Element | Must be in first story or earlier | Check |
|---------|----------------------------------|-------|
| Package init | package.json, tsconfig, etc. | In STORY-001 scope |
| Docker setup | Dockerfile(s), docker-compose.yml | In STORY-001 scope |
| Makefile | All standard targets | In STORY-001 scope |
| Directory structure | All architectural directories | In STORY-001 scope |
| Database setup | Initial migration + connection config | In STORY-001 scope |
| Health check | `GET /api/health` endpoint | In STORY-001 scope |
| .env.example | All vars listed | In STORY-001 scope |
| Lint/format config | ESLint + Prettier (or equiv.) | In STORY-001 scope |
| Auth foundation | If auth used in ANY later story | In STORY-001 or STORY-002 |

If first story doesn't cover → expand its scope or create STORY-000 infrastructure story.

### F2. Pattern Establishment

Phase 1 stories have NO existing files to use as `Pattern ref`. Verify:
- Each Phase 1 story that creates a first-of-kind file acknowledges this
- ARCHITECTURE.md has enough structural guidance for each file type:
  - Route handler structure (3-5 line description)
  - Service structure
  - Component structure
  - Test structure
  - Migration structure

Without this, Developer (sonnet) has NO model to follow → guesses structure.

---

## Phase G: Holistic Functional Completeness

<EXTREMELY-IMPORTANT>
This is the FINAL and MOST CRITICAL check. Phases A-F verify that stories are well-written and consistent. Phase G asks a fundamentally different question:

> "Tüm story'ler kusursuz implement edilse bile, ortaya çıkan ürün gerçek dünyada kullanılabilir mi? Fonksiyonel olarak tamam mı?"

Phase G re-runs Step 2's functional completeness checklist — but this time against the WRITTEN STORIES, not brainstorming output. Story decomposition often loses implicit requirements that were obvious in the brainstorming but never made it into any story.
</EXTREMELY-IMPORTANT>

### G1. Entity Lifecycle Completeness

For EVERY entity/resource across ALL stories, verify the full lifecycle is covered:

| Check | How | GAP condition |
|-------|-----|---------------|
| **Create** | Story with POST endpoint or create form | Entity has read/update but no create |
| **Read (list)** | Story with GET list endpoint + list screen | Entity created but never listed |
| **Read (detail)** | Story with GET detail endpoint + detail screen | Entity listed but no detail view |
| **Update** | Story with PUT/PATCH endpoint + edit form | Entity created but never editable |
| **Delete/Archive** | Story with DELETE endpoint or soft-delete | Entity created but never removable |
| **Relationship cascade** | For each FK: what happens on parent delete? | Parent entity has delete story but child cascade undefined |
| **Ownership** | Who creates this entity? Who can see/edit/delete? | Entity exists but no authorization rules in any story |

**Process**: Build entity inventory from ARCHITECTURE.md (TBL-NN) → cross-reference with ALL stories → flag missing lifecycle operations.

### G2. User Flow Completeness

For EVERY user workflow in PRODUCT.md, trace the COMPLETE flow across stories:

| Check | How | GAP condition |
|-------|-----|---------------|
| **Happy path** | Every step has a story with matching AC | Step in workflow has no story |
| **Error recovery** | What if step N fails? Can user retry? Go back? | No error/retry path in any story |
| **Cancellation** | Can user abort mid-flow? What gets cleaned up? | Multi-step flow with no cancel/abort |
| **Reversal** | Can completed flow be undone? (cancel order, revoke approval) | Irreversible action with no undo story |
| **Timeout/Expiry** | What if user abandons mid-flow? (draft order, pending approval) | Stateful flow with no expiry handling |
| **Parallel access** | What if two users do the same flow simultaneously? | Concurrent edit with no conflict handling story |

**Process**: Extract workflows from PRODUCT.md → for each workflow, trace every step across stories → flag broken links.

### G3. Data Integrity & Consistency

For EVERY piece of data displayed on any screen:

| Check | How | GAP condition |
|-------|-----|---------------|
| **Source exists** | Dashboard shows "total revenue" → which story calculates it? | Aggregated/derived data shown on screen but no story computes it |
| **Update mechanism** | Screen shows "last login" → which story writes it? | Display field with no write source |
| **Stale data handling** | List shows cached data → what triggers refresh? | Screen shows data that can change but no refresh/polling/websocket story |
| **Drill-down target** | Table shows count "45 alerts" → can user click to see list? | Aggregated number displayed but detail view missing |
| **Cross-entity consistency** | Order total = sum of line items — who enforces this? | Derived value with no enforcement story |

**Process**: Read SCREENS.md → for each data element on each screen → trace to the story that writes/calculates it → flag orphan data.

### G4. Role & Permission Completeness

For EVERY role defined in PRODUCT.md or ARCHITECTURE.md:

| Check | How | GAP condition |
|-------|-----|---------------|
| **Role can do its job** | Admin role → can manage users, settings, reports | Role defined but not all capabilities in stories |
| **Role is restricted** | Viewer role → cannot edit, delete, or create | Restriction not enforced in any story's AC |
| **Role transitions** | Can a user's role change? Who changes it? | Roles exist but no role management story |
| **First user problem** | Who creates the first admin? Seed data? Registration? | No story handles initial admin creation |
| **Multi-role user** | Can a user have multiple roles? How resolved? | Multi-role mentioned but resolution undefined |

### G5. Edge Case & Boundary Completeness

For the PRODUCT as a whole (not per-story):

| Check | How | GAP condition |
|-------|-----|---------------|
| **Empty system** | Fresh install — every screen works with zero data? | Story assumes data exists, no empty state flow |
| **First-time user** | New user signs up — what's the onboarding path? | Auth story exists but no onboarding story |
| **Bulk operations** | User has 500 records — can they bulk edit/delete/export? | CRUD stories only handle single items |
| **Search & discovery** | User has 1000+ records — how do they find what they need? | List screens with no search/filter story |
| **Notification gaps** | Important state change (approval, rejection, assignment) — who gets notified? | State transitions exist but no notification story |
| **Audit trail usage** | Audit fields exist (created_by, updated_by) — but can admin VIEW the history? | Audit fields in schema but no audit log screen story |
| **Settings & config** | System has configurable behavior — where does admin configure it? | Business rules reference config values but no settings screen story |
| **Scheduled/recurring** | System has time-based behavior (expiry, reminders, reports) — what triggers it? | Time-dependent logic but no cron/scheduler story |

### G6. Integration & External Dependency Completeness

For EVERY external system or integration in PRODUCT.md/ARCHITECTURE.md:

| Check | How | GAP condition |
|-------|-----|---------------|
| **Connection failure** | External API down → what does our system do? | Integration story has no fallback/retry |
| **Data sync** | External data changes → how does our system know? | One-time import but no sync story |
| **Rate limiting** | External API has rate limits → how do we handle? | Integration story ignores rate limits |
| **Authentication** | External API needs credentials → how managed? | Integration story doesn't cover credential management |

### Phase G Resolution

For each GAP found:

1. **Check PRODUCT.md** — is this feature supposed to exist?
   - YES → missing story. Create new story or expand existing.
   - NOT MENTIONED → present to user: "Bu fonksiyonel eksiklik PRODUCT.md'de yok ama ürünün kullanılabilirliği için gerekli. Ekleyelim mi?"

2. **User approves** → determine action:
   - **Fits in existing PENDING story** → add to that story's AC + update Description
   - **New story needed** → create story file with full spec (A1-A7 compliant), add to ROUTEMAP
   - **PRODUCT.md update needed** → add feature/rule to PRODUCT.md, then create/update story

3. **User rejects** → note in decisions.md: `[DATE] [Phase G] Rejected: [item] — [user's reason]`

**After Phase G resolution**: Re-run Phase A (A1-A7) on any NEW or UPDATED stories to ensure they meet autonomy standards.

---

