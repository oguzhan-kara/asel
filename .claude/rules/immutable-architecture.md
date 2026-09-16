# Immutable Architecture Rules

<EXTREMELY-IMPORTANT>
These rules apply to ALL agents at ALL times. No exceptions. No temporary workarounds.

1. **React Component-Based**: All frontends MUST use React with a strict component-based architecture. Atomic design: atoms → molecules → organisms → templates → pages. Every UI element is a reusable component.

2. **Performance-First Design**: Every architectural and implementation decision prioritizes performance. Lazy loading, code splitting, memoization, virtualization for large lists, optimized re-renders, efficient queries, proper indexing. Measure first, then optimize.

3. **Production-Only Solutions**: NEVER use temporary hacks, workarounds, or "we'll fix it later" approaches. Every line of code must be production-grade. No TODO comments for deferred work. No hardcoded values. No shortcuts.

4. **Database Migrations via Scripts**: EVERY database change MUST have a migration script. No manual DB changes. Migrations must be versioned, reversible (up/down), and tracked. Scripts live in a dedicated `migrations/` or `db/migrations/` directory. Migration order is enforced by timestamps or sequence numbers.

13. **Database ID Standard**: Every table MUST have its own independent `id` column as primary key. PostgreSQL projects use `BIGSERIAL` (auto-increment integer), NOT UUID. No composite primary keys — use unique constraints/indexes for multi-column uniqueness instead. Junction tables also get their own `id` column plus a unique constraint on the FK pair.

5. **Enterprise-Grade Quality**: Professional UI design (via frontend-design skill), comprehensive error handling, proper logging, security best practices, accessibility standards, internationalization readiness.

6. **Always Buildable**: After every story completion, the project MUST build without errors. Type checks, compilation, and build commands must pass. Build failures are blocking — they must be fixed before story closure. Docker deployment is on-demand (user request or phase boundary), not per-story.

7. **Standard API Response Format**: ALL API responses MUST use the standard envelope: `{ status: "success"|"error", data: {...}, meta?: {...} }` for success, `{ status: "error", error: { code, message, details? } }` for errors. No exceptions. This is the API bible.

8. **Nginx Reverse Proxy (Web Apps)**: ALL web applications use Nginx as reverse proxy. Frontend (`/`) and Backend (`/api/*`) served through the SAME Nginx instance. No direct backend port exposure. No CORS workarounds.

9. **Docker Port Safety**: Before assigning ports, check existing running containers (`docker ps`). Assign ONLY free/unused ports. Document the port check.

12. **No Init Containers**: NEVER create one-time init containers (e.g., `minio-init`, `emqx-init`, `redis-init`, `kafka-init`). They leave orphan "exited" containers and create dependency ordering problems. Instead:
    - Use **entrypoint scripts**: `infra/<service>/docker-entrypoint.sh` mounted into the main container, runs on every start (must be idempotent)
    - Use **built-in init mechanisms**: PostgreSQL's `/docker-entrypoint-initdb.d/`, MongoDB's `/docker-entrypoint-initdb.d/`, ClickHouse's `/docker-entrypoint-initdb.d/`
    - Use **service config**: EMQX's `emqx.conf`, Kafka's environment variables for topic auto-creation
    - Scripts MUST be idempotent — running twice produces the same result (use `CREATE IF NOT EXISTS`, `mc mb --ignore-existing`, etc.)

14. **Infrastructure Directory (`infra/`)**: ALL Docker-related config files, Dockerfiles, and entrypoint scripts MUST live under `infra/<service>/`. Standard structure:
    - `infra/docker/` — Dockerfiles (Dockerfile.api, Dockerfile.web)
    - `infra/postgres/` — postgresql.conf, init.sql
    - `infra/redis/` — redis.conf
    - `infra/nginx/` — nginx.conf, conf.d/
    - `infra/<service>/` — Per-service config and entrypoint scripts
    - NEVER create root-level directories (`nginx/`, `redis/`, `postgres/`, `scripts/`) for infrastructure config
    - NEVER put tuning parameters inline in docker-compose.yml `command` or `environment` — use config files mounted as read-only volumes
    - docker-compose.yml stays at project root, references `./infra/<service>/` paths

10. **Data Drill-Down (UI Bible)**: ALL related/linked data displayed on screen MUST be navigable. If a screen shows a piece of data that has details elsewhere, the user MUST be able to reach those details. Implementation patterns:
    - **Navigation**: Click to go to detail page (e.g., order row → order detail page)
    - **Popover/Tooltip**: Hover or click to show summary in-place (e.g., user avatar → user info popover)
    - **Modal/Drawer**: Click to show full details without leaving context (e.g., transaction → transaction detail drawer)
    - **Expandable Row**: Inline expansion for tabular data (e.g., table row → expanded details)
    - NO dead-end data. NO display-only references. Every entity mention is an interaction point.

11. **shadcn/ui Component Library (Frontend)**: ALL React frontends MUST use shadcn/ui as the UI component library. This is non-negotiable.
    - **FORBIDDEN libraries**: MUI (`@mui/*`), Ant Design (`antd`), Chakra UI (`@chakra-ui/*`), Mantine (`@mantine/*`), React Bootstrap (`react-bootstrap`), Headless UI (`@headlessui/react`) — installing or importing any of these is a BLOCKING violation.
    - **FORBIDDEN raw HTML**: `<input>`, `<button>`, `<select>`, `<textarea>`, `<dialog>`, `<table>` — use shadcn/ui equivalents (`Input`, `Button`, `Select`, `Textarea`, `Dialog`, `Table`). The ONLY exception is inside `src/components/ui/` where shadcn/ui primitives are defined.
    - **FORBIDDEN native browser dialogs**: `alert()`, `confirm()`, `prompt()`, `window.alert()`, `window.confirm()`, `window.prompt()` — use a project wrapper component from `@/components/atoms|molecules` (e.g. `<ConfirmDialog>`, `<AlertDialog>`) composing shadcn `<AlertDialog>`, or toast for notifications. Never call native dialogs directly.
    - **FORBIDDEN raw HTML injection**: `dangerouslySetInnerHTML`, `.innerHTML =`, `.outerHTML =`, `insertAdjacentHTML()`, `document.write()` — use a project wrapper component from `@/components/atoms|molecules` (e.g. `<SafeHtml>`, `<Markdown>`) that applies a sanitizer. The ONLY exception is inside `src/components/ui/` or `src/components/atoms/` where the wrapper itself is defined.
    - **Installation**: Components installed via `npx shadcn@latest add [component]` into `src/components/ui/`.
    - **Import pattern**: `import { Button } from "@/components/ui/button"`.
    - **Custom atoms**: Project-specific atoms (in `src/components/atoms/`) MUST extend/compose shadcn/ui primitives, never bypass them. Example: a custom `<SubmitButton>` wraps shadcn `<Button>`, it does NOT create a new `<button>`.
    - **Styling**: shadcn/ui components are styled via Tailwind CSS + CSS variables from FRONTEND.md design tokens. No component-level CSS overrides that bypass the design system.
    - **Enforcement**: The `quality-scan.sh` hook BLOCKS commits containing non-shadcn imports, raw HTML elements, native browser dialogs (`alert/confirm/prompt`), or raw HTML injection (`dangerouslySetInnerHTML`, `innerHTML`, etc.).
</EXTREMELY-IMPORTANT>
