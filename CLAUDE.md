# YumiVibe

Customizable personal dashboard. Create multiple dashboards with draggable/resizable blocks — productivity, entertainment, and mood in one cozy app.

## Tech Stack

- **Framework:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Database:** PostgreSQL with raw SQL via `pg` (no ORM)
- **Validation:** Zod (all API route handlers)
- **AI:** Google Gemini API (free tier) for clothing suggestions
- **Uploads:** formidable (background image uploads)
- **Grid:** react-grid-layout (drag, resize, add, remove blocks)
- **Testing:** Vitest + React Testing Library + Playwright

## Architecture

Single Next.js app. Server Components by default, `'use client'` only for interactivity.

```
app/                    — Next.js App Router (pages + API routes)
app/api/dashboards/     — Dashboard CRUD route handlers
app/api/ai/             — AI suggestion route handlers
app/api/backgrounds/    — Unsplash search route handler
app/dashboard/[id]/     — Dashboard page (Server Component → Client Grid)
components/blocks/      — One file per block type (11 blocks)
components/dashboard/   — Grid, toolbar, voice control, background picker
components/welcome/     — Welcome page, dashboard cards, empty state
components/errors/      — ErrorToast, ErrorBanner, BlockError, ErrorBoundary
lib/services/           — Business logic (dashboard, block, AI, background)
lib/validators/         — Zod schemas (dashboard, AI, background)
lib/utils/              — AppError, rateLimiter, cache, apiResponse helpers
hooks/                  — Client-side hooks (dashboards, blocks, voice, AI)
context/                — ThemeContext, DashboardContext
types/                  — Shared TypeScript interfaces
utils/                  — Client utilities (blockRegistry, apiClient)
database/               — init.sql, seed.sql
e2e/                    — Playwright E2E tests
__tests__/              — Vitest unit + integration tests
```

## Commands

```bash
npm run dev                # Next.js dev server (localhost:3000)
npm run build              # Production build
npm run start              # Production server
npm run lint               # ESLint (next lint)
npm run format             # Prettier
npm test                   # Vitest (unit + integration)
npm run test:watch         # Vitest watch mode
npm run test:coverage      # Vitest with coverage
npm run test:e2e           # Playwright E2E tests
npm run test:all           # Vitest + Playwright
npm run db:init            # Run init.sql (create tables)
npm run db:seed            # Run seed.sql (sample data)
```

## Rules

Non-negotiable. Follow exactly.

- **TypeScript strict mode.** No `any`. No `@ts-ignore`. 2-space indent.
- **Files under 300 lines.** Small, modular, single-responsibility. Split early.
- **Never hardcode.** All API keys, URLs, secrets from `process.env`. Never expose server-side env vars to client.
- **Every API route has Zod validation.** Parse input with `.safeParse()`, return standard error shape on failure. No exceptions.
- **Every API route has error handling.** Use `AppError` class. Response envelope: `{ data }` or `{ error: { code, message, status, details? } }`.
- **Parameterized SQL only.** Never interpolate user input. Use `$1`, `$2`.
- **Server Components by default.** Only add `'use client'` when the component needs hooks, browser APIs, or event handlers.
- **Native `fetch()` for API calls.** No Axios. Use `utils/apiClient.ts` wrapper for error handling and retries.
- **Named exports only.** No default exports (except Next.js pages/layouts which require them).
- **Rate limit all external APIs.** In-memory tracking: Gemini (15 RPM), Unsplash (50/hr), OpenWeatherMap (1,000/day). Cache responses (weather 15 min, Unsplash 10 min).
- **Block types are validated.** Only: `greeting`, `clock`, `timer`, `pomodoro`, `weather`, `quotes`, `notes`, `todos`, `youtube`, `spotify`, `title`.
- **Tests for everything.** Route handlers, services, components, hooks, E2E flows. 80%+ coverage on services/hooks/utils.
- **No `console.log` in production code.** Use proper error responses.

## Workflow

- **Plan first.** Plan mode for any 3+ step task. Get approval before coding.
- **Stop and re-plan** if something breaks. Don't push through.
- **Use subagents** for research and parallel work. One task per subagent.
- **Verify before done.** Run builds, types, tests. Prove it works.
- **Autonomous bug fixing.** Given a bug, just fix it. Zero hand-holding.

## API

```
GET    /api/dashboards              — List all dashboards
POST   /api/dashboards              — Create dashboard (+ default blocks)
GET    /api/dashboards/[id]         — Get dashboard with all blocks
PATCH  /api/dashboards/[id]         — Update settings, add/remove/update blocks
DELETE /api/dashboards/[id]         — Delete dashboard (CASCADE blocks)
POST   /api/dashboards/[id]/background — Upload background image
GET    /api/backgrounds/search      — Search Unsplash images
GET    /api/ai/clothing             — AI clothing suggestion from weather
```

## Error Codes

```
VALIDATION_ERROR    400 — Zod validation failed
INVALID_BLOCK_TYPE  400 — Block type not in allowed list
INVALID_FILE_TYPE   400 — Upload not jpg/png/webp
FILE_TOO_LARGE      400 — Upload exceeds 5MB
DASHBOARD_NOT_FOUND 404 — Dashboard ID not in DB
BLOCK_NOT_FOUND     404 — Block ID not in dashboard
RATE_LIMIT_GEMINI   429 — Gemini 15 RPM exceeded
RATE_LIMIT_UNSPLASH 429 — Unsplash 50/hr exceeded
RATE_LIMIT_WEATHER  429 — OpenWeatherMap 1,000/day exceeded
EXTERNAL_API_ERROR  502 — External API 5xx or timeout
DATABASE_ERROR      500 — PostgreSQL failure (sanitized)
INTERNAL_ERROR      500 — Unhandled catch-all
```

## Data Model

Two tables: `dashboards` and `blocks`. Blocks reference dashboard via `dashboard_id` with `ON DELETE CASCADE`. Block content stored as JSONB (flexible per block type). Layout positions stored as `layout_x`, `layout_y`, `layout_w`, `layout_h` integers.

## Key Patterns

- **Server → Client data flow:** Server Component fetches via service → passes props to Client Component → Client handles interactivity, calls API routes for mutations.
- **Error boundaries:** `app/error.tsx` (root), `app/dashboard/[id]/error.tsx` (dashboard), `ErrorBoundary` component (per block).
- **Background types:** `color` (hex), `gradient` (CSS), `image` (uploaded path in `public/uploads/`), `unsplash` (URL).
- **Voice control:** Web Speech API, wake word "hey vibe", Chrome-only. YouTube full control via YT.Player API, Spotify best-effort via postMessage.
