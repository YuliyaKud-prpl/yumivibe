# YumiVibe — Customizable Personal Dashboard (v3)

## Context
**YumiVibe** — a fully customizable personal dashboard where the user can create multiple dashboards, each with draggable/resizable blocks. Productivity + entertainment + mood, all in one cozy app.

Full-stack **Next.js** application with App Router, server-side API routes, and PostgreSQL database.

---

## Stack

### Framework
- **Next.js 14** (App Router) — full-stack React framework, replaces Vite + Express + React Router
- **TypeScript** (strict mode)
- **Tailwind CSS** — utility-first styling
- **react-grid-layout** — drag, resize, add, remove blocks
- **Web Speech API** — voice control for YouTube/Spotify (browser-native, Chrome)

### Validation & Security
- **Zod** — schema validation for all API route handlers (replaces express-validator)
- **Next.js built-in security** — CSRF protection, secure headers via `next.config.ts`

### File Uploads
- **Next.js Route Handler** + `formidable` — multipart file upload handling (custom background images)

### Testing
- **Vitest** — unit + integration tests (components, hooks, route handlers, services)
- **React Testing Library** — component tests
- **Playwright** — end-to-end browser tests
- **Coverage target**: 80%+ for services/hooks/utils, E2E covers critical paths

### Database
- **PostgreSQL** — persistent storage for dashboards and blocks
- **pg** (node-postgres) — PostgreSQL client

### AI
- **Google Gemini API** (free tier — 15 RPM, 1M TPM, no credit card required)
  - Used for: clothing suggestions in weather block, smart quotes, etc.
  - Model: `gemini-2.0-flash` (fast, free)
  - Fallback: if user prefers, can swap to Claude Haiku (`claude-haiku-4-5-20251001`)

### External APIs (all free tier)
| Service | Purpose | Free tier |
|---|---|---|
| OpenWeatherMap | Weather data | 1,000 calls/day |
| Google Gemini | AI suggestions | 15 req/min, no key cost |
| YouTube iframe API | Video embed | Unlimited, browser-native |
| Spotify Embed | Music embed | No auth needed for embed |
| quotable.io | Random quotes | No key needed |
| Unsplash API | Background images (free source) | 50 req/hr, no key for demo |
| Web Speech API | Voice control | Browser-native, Chrome best |

---

## Screens

### Screen 1 — Welcome Page (`/`)
- Server Component fetches dashboards on the server (fast initial load)
- If no dashboards: centered hero with app name + "Create Your First Dashboard" button
- If dashboards exist: grid/list of dashboard cards showing:
  - Dashboard name
  - Block count
  - Last updated timestamp
  - Click → navigates to `/dashboard/[id]`
- "Create New Dashboard" button (always visible)
- Theme toggle (light/dark) in header

### Screen 2 — Dashboard Page (`/dashboard/[id]`)
- Server Component fetches dashboard + blocks on the server
- Client Components for interactive parts (grid, toolbar, blocks)
- **Top toolbar** with:
  - Dashboard name (editable inline)
  - "Add Block" dropdown (block type selector)
  - "Remove Block" mode toggle
  - Background picker (color / gradient / custom image upload / Unsplash search)
  - Theme toggle (light/dark + color palette)
  - Voice control toggle (mic button — green=on, red=off)
  - Back to home button
- **Grid area** with `react-grid-layout`:
  - Starts with 1-2 example blocks (greeting + clock)
  - Each block: draggable, resizable, has delete button on hover
  - Blocks auto-save position/size on layout change
- **Block types available**:
  - `greeting` — personalized hello message
  - `clock` — live time display
  - `timer` — countdown with start/pause/reset
  - `pomodoro` — 25/5 work cycle with sound alert
  - `weather` — current weather + AI "what to wear?" button
  - `quotes` — random quote from quotable.io or manual input
  - `notes` — simple editable textarea
  - `todos` — checklist with add/remove/check
  - `youtube` — URL input + iframe embed (voice controllable: play/pause)
  - `spotify` — Spotify embed player (voice controllable: play/pause/next)
  - `title` — editable heading text

---

## Data Model (PostgreSQL)

### Table: `dashboards`
| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `name` | VARCHAR(100) | NOT NULL, DEFAULT 'My Dashboard' |
| `theme` | VARCHAR(20) | DEFAULT 'light' |
| `background` | VARCHAR(500) | DEFAULT '#ffffff' |
| `background_type` | VARCHAR(20) | DEFAULT 'color' |
| `created_at` | TIMESTAMP | DEFAULT NOW() |
| `updated_at` | TIMESTAMP | DEFAULT NOW() |

### Table: `blocks`
| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `dashboard_id` | UUID | NOT NULL, REFERENCES dashboards(id) ON DELETE CASCADE |
| `type` | VARCHAR(30) | NOT NULL |
| `title` | VARCHAR(100) | DEFAULT '' |
| `content` | JSONB | DEFAULT '{}' |
| `layout_x` | INTEGER | DEFAULT 0 |
| `layout_y` | INTEGER | DEFAULT 0 |
| `layout_w` | INTEGER | DEFAULT 4 |
| `layout_h` | INTEGER | DEFAULT 4 |
| `sort_order` | INTEGER | DEFAULT 0 |
| `created_at` | TIMESTAMP | DEFAULT NOW() |
| `updated_at` | TIMESTAMP | DEFAULT NOW() |

**`content` JSONB examples by block type:**
- `weather`: `{ "city": "Tokyo", "units": "metric" }`
- `youtube`: `{ "videoUrl": "https://youtube.com/watch?v=..." }`
- `spotify`: `{ "embedUrl": "https://open.spotify.com/embed/..." }`
- `notes`: `{ "text": "My notes here..." }`
- `todos`: `{ "items": [{ "id": "uuid", "text": "Buy milk", "done": false }] }`
- `timer`: `{ "duration": 300, "remaining": 120 }`
- `pomodoro`: `{ "workMinutes": 25, "breakMinutes": 5 }`
- `quotes`: `{ "currentQuote": "...", "author": "..." }`

### Valid block types (enforced by Zod schema):
`greeting`, `clock`, `timer`, `pomodoro`, `weather`, `quotes`, `notes`, `todos`, `youtube`, `spotify`, `title`

---

## API Route Handlers (Next.js App Router)

All API routes live in `app/api/` as Next.js Route Handlers. Each uses Zod for input validation.

### `GET /api/dashboards` — `app/api/dashboards/route.ts`
Returns all dashboards (summary list for welcome page).
- **Response**: `{ dashboards: [{ id, name, blockCount, theme, background, updatedAt }] }`

### `POST /api/dashboards` — `app/api/dashboards/route.ts`
Creates a new dashboard (optionally with starter blocks).
- **Body**: `{ name?: string }`
- **Zod schema**: `z.object({ name: z.string().max(100).optional() })`
- **Response**: `201 { dashboard: { id, name, theme, background, blocks: [...] } }`
- **Behavior**: Creates dashboard + 2 default blocks (greeting + clock)

### `GET /api/dashboards/[id]` — `app/api/dashboards/[id]/route.ts`
Returns full dashboard with all its blocks.
- **Params validation**: `id` must be valid UUID (Zod `z.string().uuid()`)
- **Response**: `{ dashboard: { id, name, theme, background, blocks: [...], createdAt, updatedAt } }`
- **Error**: `404` if not found

### `PATCH /api/dashboards/[id]` — `app/api/dashboards/[id]/route.ts`
Updates dashboard settings and/or blocks.
- **Params validation**: `id` must be valid UUID
- **Body** (all optional):
  ```json
  {
    "name": "New Name",
    "theme": "dark",
    "background": "#1a1a2e",
    "addBlocks": [{ "type": "weather", "title": "Weather" }],
    "removeBlocks": ["block-uuid-1", "block-uuid-2"],
    "updateBlocks": [{ "id": "block-uuid", "content": {...}, "layout_x": 0, ... }]
  }
  ```
- **Zod schema**:
  ```ts
  z.object({
    name: z.string().max(100).optional(),
    theme: z.enum(['light', 'dark']).optional(),
    background: z.string().max(500).optional(),
    addBlocks: z.array(z.object({
      type: z.enum([...BLOCK_TYPES]),
      title: z.string().max(100).optional(),
    })).optional(),
    removeBlocks: z.array(z.string().uuid()).optional(),
    updateBlocks: z.array(z.object({
      id: z.string().uuid(),
      content: z.record(z.unknown()).optional(),
      layout_x: z.number().int().optional(),
      layout_y: z.number().int().optional(),
      layout_w: z.number().int().optional(),
      layout_h: z.number().int().optional(),
    })).optional(),
  })
  ```
- **Response**: `200 { dashboard: { ...updatedDashboard } }`
- **Error**: `404` if dashboard not found

### `DELETE /api/dashboards/[id]` — `app/api/dashboards/[id]/route.ts`
Deletes a dashboard and all its blocks (CASCADE).
- **Params validation**: `id` must be valid UUID
- **Response**: `204 No Content`

### `POST /api/dashboards/[id]/background` — `app/api/dashboards/[id]/background/route.ts`
Upload a custom background image for a dashboard.
- **Params validation**: `id` must be valid UUID
- **Body**: `multipart/form-data` with `image` field (parsed via `formidable`)
- **Validation**: file must be image (jpg/png/webp), max 5MB
- **Behavior**: Saves to `public/uploads/backgrounds/`, stores path in `dashboards.background`
- **Response**: `200 { background: "/uploads/backgrounds/uuid-filename.jpg", backgroundType: "image" }`

### `GET /api/backgrounds/search` — `app/api/backgrounds/search/route.ts`
Search Unsplash for background images.
- **Query**: `?query=mountains&page=1`
- **Zod schema**: `z.object({ query: z.string().min(1), page: z.coerce.number().optional() })`
- **Response**: `{ images: [{ id, url, thumbUrl, author }] }`
- **Implementation**: Proxies to Unsplash API (free, 50 req/hr)

### `GET /api/ai/clothing` — `app/api/ai/clothing/route.ts`
AI clothing suggestion based on weather.
- **Query**: `?city=Tokyo&temp=22&condition=sunny`
- **Zod schema**: `z.object({ city: z.string(), temp: z.coerce.number(), condition: z.string() })`
- **Response**: `{ suggestion: "Light jacket and sunglasses..." }`
- **Implementation**: Calls Gemini API (free) with weather context

---

## Project Structure

```
yumivibe/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # Root layout (ThemeProvider, ErrorBoundary)
│   ├── page.tsx                      # Welcome page (Server Component)
│   ├── not-found.tsx                 # Custom 404 page
│   ├── error.tsx                     # Root error boundary
│   ├── loading.tsx                   # Root loading state
│   ├── dashboard/
│   │   └── [id]/
│   │       ├── page.tsx              # Dashboard page (Server Component — fetches data)
│   │       ├── loading.tsx           # Dashboard loading skeleton
│   │       ├── not-found.tsx         # Dashboard not found page
│   │       └── error.tsx             # Dashboard error boundary
│   └── api/
│       ├── dashboards/
│       │   ├── route.ts              # GET (list all), POST (create)
│       │   └── [id]/
│       │       ├── route.ts          # GET (one), PATCH (update), DELETE
│       │       └── background/
│       │           └── route.ts      # POST (upload image)
│       ├── backgrounds/
│       │   └── search/
│       │       └── route.ts          # GET (Unsplash search)
│       └── ai/
│           └── clothing/
│               └── route.ts          # GET (AI suggestion)
│
├── components/                       # React components
│   ├── layout/
│   │   ├── Header.tsx                # App header + theme toggle
│   │   └── Toolbar.tsx               # Dashboard toolbar (add/remove/bg/theme)
│   ├── welcome/
│   │   ├── WelcomePage.tsx            # Client wrapper for welcome interactions
│   │   ├── DashboardCard.tsx          # Dashboard preview card
│   │   └── EmptyState.tsx             # No dashboards yet CTA
│   ├── dashboard/
│   │   ├── DashboardGrid.tsx          # react-grid-layout wrapper (Client Component)
│   │   ├── BlockWrapper.tsx           # Common block shell (drag, delete)
│   │   ├── AddBlockMenu.tsx           # Block type selector dropdown
│   │   ├── VoiceControl.tsx           # Mic button + status indicator
│   │   └── BackgroundPicker.tsx       # Color/gradient/image/Unsplash picker
│   ├── blocks/
│   │   ├── GreetingBlock.tsx
│   │   ├── ClockBlock.tsx
│   │   ├── TimerBlock.tsx
│   │   ├── PomodoroBlock.tsx
│   │   ├── WeatherBlock.tsx
│   │   ├── QuotesBlock.tsx
│   │   ├── NotesBlock.tsx
│   │   ├── TodosBlock.tsx
│   │   ├── YouTubeBlock.tsx
│   │   ├── SpotifyBlock.tsx
│   │   └── TitleBlock.tsx
│   └── errors/
│       ├── ErrorToast.tsx             # Transient error notifications
│       ├── ErrorBanner.tsx            # Persistent page-level errors
│       ├── BlockError.tsx             # Block-specific error display
│       └── ErrorBoundary.tsx          # React crash recovery wrapper
│
├── lib/                              # Server-side logic (used by API routes)
│   ├── db.ts                         # PostgreSQL connection pool (pg)
│   ├── services/
│   │   ├── dashboardService.ts       # Business logic for dashboards
│   │   ├── blockService.ts           # Business logic for blocks
│   │   ├── aiService.ts              # Gemini/Claude API calls
│   │   └── backgroundService.ts      # File handling + Unsplash proxy
│   ├── validators/
│   │   ├── dashboardSchemas.ts       # Zod schemas for dashboard endpoints
│   │   ├── aiSchemas.ts              # Zod schemas for AI endpoints
│   │   └── backgroundSchemas.ts      # Zod schemas for background endpoints
│   ├── utils/
│   │   ├── rateLimiter.ts            # In-memory rate limit tracker
│   │   ├── cache.ts                  # Simple TTL cache for API responses
│   │   ├── AppError.ts               # Custom error class + error codes
│   │   └── apiResponse.ts            # Standard JSON response helpers
│   └── types/
│       └── index.ts                  # Shared TS types
│
├── hooks/                            # Client-side React hooks
│   ├── useDashboards.ts              # Fetch/create/delete dashboards
│   ├── useBlocks.ts                  # Block CRUD operations
│   ├── useWeatherAI.ts               # AI clothing suggestion
│   └── useVoiceControl.ts            # Web Speech API hook
│
├── context/                          # React context providers
│   ├── ThemeContext.tsx               # Light/dark theme state
│   └── DashboardContext.tsx           # Current dashboard state
│
├── types/                            # Shared TypeScript types
│   ├── dashboard.ts                  # Dashboard & Block interfaces
│   └── api.ts                        # API request/response types
│
├── utils/                            # Client-side utilities
│   ├── blockRegistry.ts              # Maps block type → component
│   ├── defaultLayouts.ts             # Default size per block type
│   └── apiClient.ts                  # Fetch wrapper with error handling
│
├── public/
│   └── uploads/
│       └── backgrounds/              # Uploaded background images
│
├── database/
│   ├── init.sql                      # CREATE TABLE statements
│   └── seed.sql                      # Optional seed data
│
├── e2e/                              # Playwright E2E tests
│   ├── welcome-page.spec.ts
│   ├── dashboard-crud.spec.ts
│   ├── block-management.spec.ts
│   ├── background-picker.spec.ts
│   ├── voice-control.spec.ts
│   ├── error-scenarios.spec.ts
│   └── playwright.config.ts
│
├── .env.example                      # Template for environment variables
├── .eslintrc.json                    # ESLint config
├── .prettierrc                       # Prettier config (2-space indent)
├── next.config.ts                    # Next.js config (security headers, image domains)
├── tailwind.config.ts                # Tailwind config
├── tsconfig.json                     # TypeScript config (strict)
├── vitest.config.ts                  # Vitest config
├── docker-compose.yml                # PostgreSQL (optional)
└── package.json
```

---

## Code Rules (Enforced)

1. **TypeScript strict mode** — `"strict": true` in tsconfig.json
2. **Max 300 lines per file** — split if exceeding
3. **Every API route has input validation** — Zod schemas on all route handlers
4. **All API keys from environment variables** — never hardcoded, use `process.env` server-side
5. **Modular architecture** — one file per route handler / service / component
6. **2-space indentation** everywhere
7. **ESLint + Prettier** configured and enforced
8. **No `any` types** — use proper interfaces from `types/`
9. **Server vs Client Components** — default to Server Components, add `'use client'` only when needed (interactivity, hooks, browser APIs)

### ESLint Config Highlights
```json
{
  "extends": ["next/core-web-vitals", "next/typescript"],
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/strict-boolean-expressions": "warn",
    "max-lines": ["warn", { "max": 300 }]
  }
}
```

### Prettier Config
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 80
}
```

---

## Environment Variables (.env.local)

```
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/yumivibe

# AI (pick one or both)
GEMINI_API_KEY=your_gemini_key_here
# ANTHROPIC_API_KEY=your_claude_key_here  # optional fallback

# External APIs
OPENWEATHERMAP_API_KEY=your_key_here
UNSPLASH_ACCESS_KEY=your_key_here

# Next.js
NODE_ENV=development
```

Note: No `VITE_` prefix needed. No separate `PORT` or `API_URL` — Next.js serves both frontend and API on the same port (default 3000). Server-side env vars are accessed directly via `process.env`. Client-side env vars (if needed) use `NEXT_PUBLIC_` prefix.

---

## Server vs Client Component Strategy

### Server Components (default — no `'use client'`)
- `app/page.tsx` — Welcome page (fetches dashboards via direct service call)
- `app/dashboard/[id]/page.tsx` — Dashboard page (fetches dashboard + blocks)
- `app/layout.tsx` — Root layout
- `app/not-found.tsx`, `app/error.tsx` — Error pages
- All `app/api/` route handlers — server-only by definition

### Client Components (`'use client'`)
- `components/dashboard/DashboardGrid.tsx` — react-grid-layout requires DOM
- `components/dashboard/VoiceControl.tsx` — Web Speech API (browser-only)
- `components/dashboard/BackgroundPicker.tsx` — file input, color picker
- `components/dashboard/AddBlockMenu.tsx` — dropdown interactions
- `components/blocks/*` — all blocks (timers, interactive inputs, iframes)
- `components/welcome/WelcomePage.tsx` — create dashboard button + navigation
- `components/layout/Header.tsx` — theme toggle (uses context)
- `components/layout/Toolbar.tsx` — interactive toolbar
- `components/errors/ErrorToast.tsx` — uses state for toasts
- `hooks/*` — all hooks are client-side
- `context/*` — all context providers

### Data flow pattern
1. Server Component (`app/dashboard/[id]/page.tsx`) fetches data directly from service
2. Passes data as props to Client Component (`DashboardGrid`)
3. Client Component handles interactivity, calls API routes via `fetch()` for mutations
4. No need for `useEffect` data fetching on initial load — server provides it

---

## Voice Control (Web Speech API)

### How it works
- Uses browser-native `webkitSpeechRecognition` (best in Chrome)
- Toggle on/off via mic button in toolbar (green = listening, red = off)
- Wake word **"hey vibe"** prevents false triggers from background audio
- Shows toast notification when command is recognized

### Supported commands
| Command | Action |
|---|---|
| "hey vibe, play youtube" | Plays the YouTube block via iframe API `playVideo()` |
| "hey vibe, pause youtube" | Pauses YouTube via `pauseVideo()` |
| "hey vibe, play spotify" | Clicks play on Spotify embed (limited — see note) |
| "hey vibe, pause spotify" | Clicks pause on Spotify embed |
| "hey vibe, next song" | Clicks next on Spotify embed |

### YouTube voice control — full support
- YouTube iframe API provides `playVideo()`, `pauseVideo()`, `seekTo()`, `setVolume()`
- The `YouTubeBlock` loads via `YT.Player` (not raw iframe) to get API access
- Voice commands map directly to API methods — reliable

### Spotify voice control — limited (embed restrictions)
- Spotify **embeds** don't expose a JavaScript API for play/pause/next
- **Workaround**: Use `postMessage` to communicate with the embed iframe, or simulate click events on the embed's play/pause button via DOM injection
- **Realistic limitation**: Spotify embed play/pause may only work if the user has interacted with the embed first (browser autoplay policy). Next track is not guaranteed
- **If Spotify Premium + Spotify Web Playback SDK**: Full control is possible (play, pause, skip, volume, seek) — but requires OAuth + Premium account. This can be added as an optional upgrade later
- For MVP: basic embed with best-effort voice control via postMessage

### Implementation (`hooks/useVoiceControl.ts`)
```ts
// Continuous listening with auto-restart
// Wake word filtering: ignore anything without "hey vibe"
// Command parser: maps transcript → action callbacks
// Provides: { isListening, startListening, stopListening, lastCommand }
```

---

## Custom Background

### Options in BackgroundPicker
1. **Solid color** — color picker input (hex)
2. **Gradient** — preset gradients or custom two-color picker
3. **Upload image** — from local files (jpg/png/webp, max 5MB)
4. **Unsplash search** — search free photos by keyword, select to apply

### Upload flow
1. User clicks "Upload Image" in BackgroundPicker
2. File input opens → selects image
3. Frontend sends `POST /api/dashboards/[id]/background` (multipart/form-data via `fetch()`)
4. Route handler validates (image type, max 5MB), saves to `public/uploads/backgrounds/`
5. Returns URL path → stored in `dashboards.background`, `background_type = 'image'`
6. Dashboard renders with `background-image: url(...)` + `background-size: cover`

### Unsplash flow
1. User types keyword in search box within BackgroundPicker
2. Frontend calls `GET /api/backgrounds/search?query=mountains` via `fetch()`
3. Route handler proxies to Unsplash API, returns thumbnail grid
4. User clicks image → `background` set to Unsplash URL, `background_type = 'unsplash'`
5. Attribution shown per Unsplash guidelines (photographer name + link)

### Database `background_type` values
- `color` — `background` is hex color like `#1a1a2e`
- `gradient` — `background` is CSS gradient like `linear-gradient(135deg, #667eea, #764ba2)`
- `image` — `background` is local upload path like `/uploads/backgrounds/uuid.jpg`
- `unsplash` — `background` is Unsplash URL

---

## Error Handling Strategy

### API Routes — Centralized Error Pattern
Each route handler wraps logic in a try/catch and uses a shared `apiResponse` helper. Every error response follows a consistent shape:
```json
{
  "error": {
    "code": "DASHBOARD_NOT_FOUND",
    "message": "Dashboard with id abc-123 not found",
    "status": 404
  }
}
```

### Error Code Catalog

| Code | HTTP | When |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Zod schema validation fails (bad UUID, missing fields, wrong types) |
| `INVALID_BLOCK_TYPE` | 400 | Block type not in allowed list |
| `INVALID_FILE_TYPE` | 400 | Uploaded file is not jpg/png/webp |
| `FILE_TOO_LARGE` | 400 | Upload exceeds 5MB limit |
| `DASHBOARD_NOT_FOUND` | 404 | Dashboard ID doesn't exist in DB |
| `BLOCK_NOT_FOUND` | 404 | Block ID doesn't exist or doesn't belong to dashboard |
| `RATE_LIMIT_GEMINI` | 429 | Gemini API returns 429 (15 RPM exceeded) |
| `RATE_LIMIT_UNSPLASH` | 429 | Unsplash API returns 429 (50 req/hr exceeded) |
| `RATE_LIMIT_WEATHER` | 429 | OpenWeatherMap returns 429 (1,000/day exceeded) |
| `EXTERNAL_API_ERROR` | 502 | Any external API (Gemini, Unsplash, OpenWeatherMap) returns 5xx or times out |
| `DATABASE_ERROR` | 500 | PostgreSQL connection/query failure |
| `INTERNAL_ERROR` | 500 | Unhandled exception catch-all |

### API Routes — Input Validation Errors (Zod)
Every route handler validates input with Zod. When validation fails, the response includes field-level details:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "status": 400,
    "details": [
      { "field": "name", "message": "Must be at most 100 characters" },
      { "field": "addBlocks[0].type", "message": "Must be a valid block type" }
    ]
  }
}
```

Implementation pattern in route handlers:
```ts
// app/api/dashboards/route.ts
import { NextResponse } from 'next/server';
import { createDashboardSchema } from '@/lib/validators/dashboardSchemas';
import { formatZodError, errorResponse } from '@/lib/utils/apiResponse';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createDashboardSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 400, formatZodError(parsed.error));
    }
    // ... business logic
  } catch (error) {
    return errorResponse('INTERNAL_ERROR', 500);
  }
}
```

### API Routes — Rate Limit Handling (External APIs)
Each external API service has a rate limit wrapper:

**Gemini (15 RPM)**
- Track request timestamps in memory (simple array, no Redis needed for single-user app)
- Before calling: check if 15 requests were made in the last 60 seconds
- If limit approaching: return cached last response + warning header `X-RateLimit-Warning: gemini`
- If limit hit: return `429` with `retryAfter` field (seconds until next available slot)
- Response:
  ```json
  {
    "error": {
      "code": "RATE_LIMIT_GEMINI",
      "message": "AI suggestion limit reached. Try again in 45 seconds.",
      "status": 429,
      "retryAfter": 45
    }
  }
  ```

**Unsplash (50 req/hr)**
- Same in-memory tracking pattern
- Cache search results for 10 minutes (same query → cached response)
- If limit hit: return `429` with `retryAfter`

**OpenWeatherMap (1,000 req/day)**
- Cache weather data per city for 15 minutes (weather doesn't change that fast)
- Track daily count in memory, reset at midnight
- If limit hit: return `429` with message "Weather API daily limit reached"

### API Routes — Database Error Handling
- Connection pool: retry connection 3 times on startup, then exit with clear error
- Query errors: catch, log full error server-side, return sanitized `DATABASE_ERROR` to client (never leak SQL details)
- Transaction rollback: `PATCH /api/dashboards/[id]` uses a transaction — if any block update fails, all changes roll back

### API Routes — File Upload Errors
- `formidable` config: reject non-image MIME types → `INVALID_FILE_TYPE`
- `formidable` `maxFileSize`: 5MB cap → `FILE_TOO_LARGE`
- Disk write failure: catch, return `INTERNAL_ERROR`, clean up partial file

### Next.js Error Boundaries (Server-Side)
- `app/error.tsx` — root-level error boundary (catches unhandled page errors)
- `app/dashboard/[id]/error.tsx` — dashboard-specific error boundary
- `app/not-found.tsx` — custom 404 page
- `app/dashboard/[id]/not-found.tsx` — "Dashboard not found" with "Back to Home" button
- These are Client Components (Next.js requirement) that show user-friendly error UI

### Frontend — Error Handling Architecture

**API Client (`utils/apiClient.ts`)**
- Thin wrapper around `fetch()` with:
  - Automatic JSON parsing
  - Standard error shape parsing
  - Dispatch to appropriate handler based on error code
- No Axios needed — Next.js works best with native `fetch()`

**Error Display Components**
| Component | Location | Purpose |
|---|---|---|
| `ErrorToast.tsx` | Global (top-right) | Transient errors: rate limits, network blips, validation |
| `ErrorBanner.tsx` | Page-level | Persistent errors: dashboard not found, DB down |
| `BlockError.tsx` | Inside BlockWrapper | Block-specific: weather API fail, YouTube load fail |
| `ErrorBoundary.tsx` | Wraps each block | React crash recovery — shows fallback UI, not white screen |

**Error UX by Scenario**

| Scenario | What user sees | Recovery |
|---|---|---|
| Network offline | Toast: "You're offline. Changes will save when reconnected." | Auto-retry on reconnect (navigator.onLine listener) |
| Dashboard not found (404) | Full page: "Dashboard not found" + "Back to Home" button (`app/dashboard/[id]/not-found.tsx`) | Navigate home |
| Gemini rate limit (429) | Toast: "AI suggestion limit reached. Try again in X seconds." + disabled button with countdown | Button re-enables after `retryAfter` seconds |
| Unsplash rate limit (429) | Toast in BackgroundPicker: "Image search limit reached. Try again in X minutes." | Show cached results if available, countdown timer |
| Weather API rate limit (429) | Inside WeatherBlock: "Weather updates paused — daily limit reached" | Show last cached weather data |
| Weather API key missing/invalid | Inside WeatherBlock: "Weather unavailable — check API key configuration" | Settings hint |
| YouTube invalid URL | Inside YouTubeBlock: "Invalid YouTube URL" with input highlighted red | User corrects URL |
| Spotify embed fails to load | Inside SpotifyBlock: "Couldn't load Spotify player. Check the URL." | User re-enters URL |
| File upload too large | Toast: "Image must be under 5MB" | User picks smaller file |
| File upload wrong type | Toast: "Only JPG, PNG, and WebP images are supported" | User picks valid image |
| Database connection lost | Banner: "Connection lost. Retrying..." + spinner | Auto-retry with exponential backoff (1s, 2s, 4s, max 30s) |
| Block component crashes | Inside block area: "This block encountered an error" + "Reset Block" button | ErrorBoundary catches, offers reset |
| Voice control unsupported | Toast (once): "Voice control requires Chrome browser" | Mic button disabled/hidden |
| Voice control permission denied | Toast: "Microphone access denied. Check browser permissions." | Link to permission settings |
| Create dashboard fails | Toast: "Couldn't create dashboard. Please try again." | Retry button |
| Delete dashboard fails | Toast: "Couldn't delete dashboard. Please try again." | Retry button |

**Retry Strategy (Frontend)**
- Network errors: auto-retry up to 3 times with exponential backoff (1s, 2s, 4s)
- Rate limit (429): no auto-retry — show countdown from `retryAfter`, re-enable action after
- 4xx errors (validation, not found): no retry — show clear message about what went wrong
- 5xx errors: auto-retry once after 2 seconds, then show "Something went wrong" with manual retry button

**Frontend — Offline Support**
- Listen to `navigator.onLine` + `window.addEventListener('online'/'offline')`
- When offline: show persistent top banner "You're offline"
- Queue failed save operations (layout changes, block updates) in memory
- On reconnect: flush queue in order, show "Changes saved" toast
- Note: this is best-effort, not full offline-first — no service worker for MVP

---

## Testing Strategy

### Stack
- **Route handler tests**: Vitest (call route handler functions directly — no Supertest needed in Next.js)
- **Component tests**: Vitest + React Testing Library
- **Service tests**: Vitest (unit tests for business logic)
- **E2E tests**: Playwright (full user flow tests)
- **Coverage target**: 80%+ for services/hooks/utils, E2E covers critical paths

### Project Structure — Test Files
```
__tests__/                            # All tests in root __tests__ directory
├── api/                              # Route handler tests
│   ├── dashboards.test.ts
│   ├── dashboards-id.test.ts
│   ├── background-upload.test.ts
│   ├── background-search.test.ts
│   └── ai-clothing.test.ts
├── services/                         # Service unit tests
│   ├── dashboardService.test.ts
│   ├── blockService.test.ts
│   ├── aiService.test.ts
│   └── backgroundService.test.ts
├── lib/                              # Utility tests
│   ├── rateLimiter.test.ts
│   ├── cache.test.ts
│   ├── apiResponse.test.ts
│   └── validators/
│       ├── dashboardSchemas.test.ts
│       ├── aiSchemas.test.ts
│       └── backgroundSchemas.test.ts
├── components/
│   ├── welcome/
│   │   ├── WelcomePage.test.tsx
│   │   ├── DashboardCard.test.tsx
│   │   └── EmptyState.test.tsx
│   ├── dashboard/
│   │   ├── DashboardGrid.test.tsx
│   │   ├── BlockWrapper.test.tsx
│   │   ├── AddBlockMenu.test.tsx
│   │   ├── VoiceControl.test.tsx
│   │   └── BackgroundPicker.test.tsx
│   ├── blocks/
│   │   ├── GreetingBlock.test.tsx
│   │   ├── ClockBlock.test.tsx
│   │   ├── TimerBlock.test.tsx
│   │   ├── PomodoroBlock.test.tsx
│   │   ├── WeatherBlock.test.tsx
│   │   ├── QuotesBlock.test.tsx
│   │   ├── NotesBlock.test.tsx
│   │   ├── TodosBlock.test.tsx
│   │   ├── YouTubeBlock.test.tsx
│   │   ├── SpotifyBlock.test.tsx
│   │   └── TitleBlock.test.tsx
│   ├── layout/
│   │   ├── Header.test.tsx
│   │   └── Toolbar.test.tsx
│   └── errors/
│       ├── ErrorToast.test.tsx
│       ├── ErrorBanner.test.tsx
│       ├── BlockError.test.tsx
│       └── ErrorBoundary.test.tsx
├── hooks/
│   ├── useDashboards.test.ts
│   ├── useBlocks.test.ts
│   ├── useWeatherAI.test.ts
│   └── useVoiceControl.test.ts
└── utils/
    ├── blockRegistry.test.ts
    ├── defaultLayouts.test.ts
    └── apiClient.test.ts

e2e/
├── welcome-page.spec.ts
├── dashboard-crud.spec.ts
├── block-management.spec.ts
├── background-picker.spec.ts
├── voice-control.spec.ts
└── error-scenarios.spec.ts
```

### Route Handler Tests (Vitest — direct function calls)

Next.js route handlers are regular async functions. Test them directly — no Supertest or HTTP server needed:

```ts
// __tests__/api/dashboards.test.ts
import { GET, POST } from '@/app/api/dashboards/route';

it('returns empty array when no dashboards exist', async () => {
  const response = await GET();
  const data = await response.json();
  expect(response.status).toBe(200);
  expect(data.dashboards).toEqual([]);
});
```

#### Dashboard API Tests (`dashboards.test.ts`, `dashboards-id.test.ts`)
```
GET /api/dashboards
  ✓ returns empty array when no dashboards exist
  ✓ returns list of dashboards with block counts
  ✓ includes updatedAt sorted most recent first

GET /api/dashboards/[id]
  ✓ returns dashboard with all blocks
  ✓ returns 404 for non-existent dashboard
  ✓ returns 400 for invalid UUID format

POST /api/dashboards
  ✓ creates dashboard with default name and starter blocks (greeting + clock)
  ✓ creates dashboard with custom name
  ✓ returns 400 when name exceeds 100 characters (Zod validation)
  ✓ returns 201 with full dashboard object including blocks

PATCH /api/dashboards/[id]
  ✓ updates dashboard name
  ✓ updates dashboard theme (light → dark)
  ✓ updates dashboard background color
  ✓ adds new blocks to dashboard
  ✓ removes blocks from dashboard
  ✓ updates block content (notes text, todo items, etc.)
  ✓ updates block layout positions (x, y, w, h)
  ✓ handles multiple operations in single request (add + remove + update)
  ✓ returns 404 for non-existent dashboard
  ✓ returns 400 for invalid block type in addBlocks (Zod validation)
  ✓ returns 400 for invalid UUID in removeBlocks (Zod validation)
  ✓ rolls back all changes on partial failure (transaction)

DELETE /api/dashboards/[id]
  ✓ deletes dashboard and all blocks (CASCADE)
  ✓ returns 204 on success
  ✓ returns 404 for non-existent dashboard
  ✓ returns 400 for invalid UUID
```

#### Background API Tests (`background-upload.test.ts`, `background-search.test.ts`)
```
POST /api/dashboards/[id]/background
  ✓ uploads jpg image and returns path
  ✓ uploads png image and returns path
  ✓ uploads webp image and returns path
  ✓ returns 400 for non-image file (pdf, txt, etc.)
  ✓ returns 400 for file exceeding 5MB
  ✓ returns 404 for non-existent dashboard
  ✓ updates dashboard background and background_type to 'image'
  ✓ deletes previous uploaded image when new one is uploaded

GET /api/backgrounds/search
  ✓ returns image results from Unsplash for valid query
  ✓ returns 400 when query parameter is missing (Zod validation)
  ✓ returns paginated results
  ✓ returns 429 when Unsplash rate limit is hit (with retryAfter)
  ✓ returns 502 when Unsplash API is down
  ✓ returns cached results for repeated queries within 10 minutes
```

#### AI API Tests (`ai-clothing.test.ts`)
```
GET /api/ai/clothing
  ✓ returns clothing suggestion for valid weather data
  ✓ returns 400 when city is missing (Zod validation)
  ✓ returns 400 when temp is not a number (Zod validation)
  ✓ returns 400 when condition is missing (Zod validation)
  ✓ returns 429 when Gemini rate limit is hit (with retryAfter seconds)
  ✓ returns 502 when Gemini API is unreachable
  ✓ returns cached response when called again within rate limit window
```

#### Service Unit Tests
```
DashboardService
  ✓ getAll — returns dashboards with block counts
  ✓ getById — returns dashboard with blocks joined
  ✓ getById — throws NotFoundError for missing ID
  ✓ create — inserts dashboard + default blocks in transaction
  ✓ update — updates only provided fields
  ✓ delete — removes dashboard (blocks cascade)

BlockService
  ✓ addBlocks — inserts multiple blocks with correct dashboard_id
  ✓ removeBlocks — deletes blocks by IDs, verifies they belong to dashboard
  ✓ updateBlocks — updates content and layout fields
  ✓ updateBlocks — throws NotFoundError for block not in dashboard
```

#### Rate Limit & Cache Tests
```
RateLimitTracker
  ✓ allows requests under limit
  ✓ rejects requests over limit and returns retryAfter
  ✓ resets count after time window passes
  ✓ calculates correct retryAfter seconds

CacheService
  ✓ returns cached value within TTL
  ✓ returns null after TTL expires
  ✓ stores and retrieves search results
  ✓ stores and retrieves weather data
```

#### Zod Schema Tests (`dashboardSchemas.test.ts`)
```
Dashboard Zod schemas
  ✓ accepts valid UUID for id param
  ✓ rejects malformed UUID
  ✓ accepts name with 1-100 characters
  ✓ rejects name over 100 characters
  ✓ accepts valid theme values (light, dark)
  ✓ rejects invalid theme value
  ✓ accepts valid block types in addBlocks
  ✓ rejects invalid block types
  ✓ accepts valid UUIDs in removeBlocks array
  ✓ rejects invalid UUIDs in removeBlocks array
  ✓ makes all update fields optional
  ✓ coerces string numbers in query params
```

#### API Response Helper Tests (`apiResponse.test.ts`)
```
apiResponse helpers
  ✓ formatZodError converts Zod errors to field-level details
  ✓ errorResponse returns standard error shape
  ✓ successResponse returns standard success shape
  ✓ does not leak stack traces in production mode
```

### Frontend Tests (Vitest + React Testing Library)

#### Component Tests

**WelcomePage.test.tsx**
```
WelcomePage
  ✓ shows empty state when no dashboards
  ✓ renders dashboard cards when dashboards exist
  ✓ navigates to dashboard on card click
  ✓ creates new dashboard and navigates to it
  ✓ shows loading spinner while fetching
  ✓ shows error banner when API fails
  ✓ shows retry button on network error
```

**DashboardGrid.test.tsx**
```
DashboardGrid
  ✓ renders grid with blocks from props
  ✓ renders correct block component for each type
  ✓ applies background style based on background_type
  ✓ calls onLayoutChange when blocks are rearranged
```

**BlockWrapper.test.tsx**
```
BlockWrapper
  ✓ renders child block component
  ✓ shows delete button on hover
  ✓ calls remove handler on delete click
  ✓ renders drag handle
  ✓ shows block title
```

**AddBlockMenu.test.tsx**
```
AddBlockMenu
  ✓ renders all available block types
  ✓ calls addBlock with correct type on selection
  ✓ closes menu after selection
```

**BackgroundPicker.test.tsx**
```
BackgroundPicker
  ✓ renders color/gradient/upload/unsplash tabs
  ✓ color tab: updates background on color select
  ✓ gradient tab: shows preset gradients
  ✓ upload tab: opens file picker and uploads image
  ✓ upload tab: shows error toast for oversized file
  ✓ upload tab: shows error toast for invalid file type
  ✓ unsplash tab: searches and shows image results
  ✓ unsplash tab: shows rate limit message when 429
  ✓ unsplash tab: shows Unsplash attribution
  ✓ applies selected background to dashboard
```

**VoiceControl.test.tsx**
```
VoiceControl
  ✓ renders mic button
  ✓ toggles listening state on click
  ✓ shows green indicator when listening
  ✓ shows red indicator when not listening
  ✓ shows warning toast on non-Chrome browser
  ✓ shows permission denied toast when mic blocked
  ✓ disables button when browser doesn't support Web Speech API
```

**Error Component Tests**
```
ErrorToast
  ✓ renders toast with message
  ✓ auto-dismisses after timeout
  ✓ shows countdown for rate limit errors

ErrorBanner
  ✓ renders persistent error with message
  ✓ shows retry button
  ✓ calls onRetry when button clicked

BlockError
  ✓ renders error message inside block area
  ✓ shows "Reset Block" button

ErrorBoundary
  ✓ renders children when no error
  ✓ catches thrown error and shows fallback UI
  ✓ shows reset button that clears error state
```

**Block Component Tests (each block)**
```
WeatherBlock
  ✓ renders city input and fetch button
  ✓ displays weather data after fetch
  ✓ shows "What to wear?" button
  ✓ shows AI suggestion on button click
  ✓ shows rate limit countdown when AI limit hit
  ✓ shows error when weather API fails
  ✓ shows cached weather when API limit reached
  ✓ shows "check API key" message when key invalid

TimerBlock
  ✓ renders with default duration
  ✓ starts countdown on play
  ✓ pauses countdown on pause
  ✓ resets countdown on reset
  ✓ shows alert when countdown reaches zero

PomodoroBlock
  ✓ starts 25-minute work session
  ✓ switches to 5-minute break after work session
  ✓ shows notification at session end
  ✓ displays current session type (work/break)

TodosBlock
  ✓ renders existing todo items
  ✓ adds new todo on input + enter
  ✓ toggles todo completion
  ✓ removes todo on delete click
  ✓ persists changes via API

NotesBlock
  ✓ renders textarea with saved content
  ✓ auto-saves on typing (debounced)
  ✓ shows save indicator

YouTubeBlock
  ✓ renders URL input
  ✓ loads YouTube player for valid URL
  ✓ shows error for invalid YouTube URL
  ✓ exposes play/pause methods for voice control

SpotifyBlock
  ✓ renders embed URL input
  ✓ loads Spotify embed iframe
  ✓ shows error for invalid Spotify URL

QuotesBlock
  ✓ fetches and displays random quote
  ✓ shows new quote on refresh button click
  ✓ shows error when quote API fails
  ✓ allows manual quote input toggle

ClockBlock
  ✓ displays current time
  ✓ updates every second

GreetingBlock
  ✓ shows "Good morning" between 5-12
  ✓ shows "Good afternoon" between 12-17
  ✓ shows "Good evening" between 17-22
  ✓ shows "Good night" between 22-5

TitleBlock
  ✓ renders editable heading
  ✓ saves on blur
  ✓ saves on enter key
```

#### Hook Tests

**useDashboards.test.ts**
```
useDashboards
  ✓ fetches dashboards on mount
  ✓ returns loading state while fetching
  ✓ returns error state on API failure
  ✓ createDashboard calls API and updates list
  ✓ deleteDashboard calls API and removes from list
  ✓ retries on network error (up to 3 times)
```

**useBlocks.test.ts**
```
useBlocks
  ✓ addBlock sends PATCH with addBlocks payload
  ✓ removeBlock sends PATCH with removeBlocks payload
  ✓ updateBlock sends PATCH with updateBlocks payload
  ✓ updateLayout sends batch position update
  ✓ handles API errors gracefully
```

**useVoiceControl.test.ts**
```
useVoiceControl
  ✓ returns isListening=false initially
  ✓ startListening creates SpeechRecognition instance
  ✓ stopListening stops recognition
  ✓ filters commands by wake word "hey vibe"
  ✓ ignores commands without wake word
  ✓ parses "play youtube" command
  ✓ parses "pause youtube" command
  ✓ parses "pause spotify" command
  ✓ parses "next song" command
  ✓ auto-restarts on recognition end
  ✓ returns error when browser doesn't support Speech API
  ✓ returns error on microphone permission denied
```

**useWeatherAI.test.ts**
```
useWeatherAI
  ✓ fetches AI clothing suggestion
  ✓ returns loading state during fetch
  ✓ returns rate limit info when 429 received
  ✓ disables fetch until retryAfter expires
  ✓ returns error message on API failure
```

#### Utility Tests

**apiClient.test.ts**
```
apiClient
  ✓ parses successful JSON response
  ✓ parses error response into standard shape
  ✓ retries on network error (up to 3 times)
  ✓ does not retry on 4xx errors
  ✓ retries once on 5xx errors
  ✓ handles rate limit with retryAfter
```

### E2E Tests (Playwright)

**welcome-page.spec.ts**
```
Welcome Page
  ✓ shows empty state on first visit
  ✓ creates a new dashboard and redirects to it
  ✓ shows created dashboard in the list
  ✓ navigates to dashboard on card click
  ✓ shows correct block count on each card
  ✓ deletes dashboard from welcome page
```

**dashboard-crud.spec.ts**
```
Dashboard CRUD
  ✓ new dashboard has greeting + clock default blocks
  ✓ edits dashboard name inline
  ✓ changes theme from light to dark
  ✓ navigates back to welcome page
  ✓ dashboard persists after page reload
```

**block-management.spec.ts**
```
Block Management
  ✓ adds a new block from toolbar menu
  ✓ removes a block via delete button
  ✓ drags a block to new position
  ✓ resizes a block
  ✓ layout persists after page reload
  ✓ notes block saves text and restores it
  ✓ todos block: add, check, and remove items
  ✓ timer block: start, pause, reset
  ✓ YouTube block: enter URL and player loads
  ✓ Spotify block: enter URL and embed loads
```

**background-picker.spec.ts**
```
Background Picker
  ✓ opens background picker from toolbar
  ✓ sets solid color background
  ✓ sets gradient background
  ✓ uploads image file as background
  ✓ rejects file over 5MB with error toast
  ✓ searches Unsplash and selects image
  ✓ background persists after page reload
```

**voice-control.spec.ts**
```
Voice Control (Chrome only)
  ✓ mic button visible in toolbar
  ✓ toggles listening indicator on click
  ✓ shows non-Chrome warning in Firefox/Safari
```

**error-scenarios.spec.ts**
```
Error Handling
  ✓ shows 404 page for non-existent dashboard URL
  ✓ shows error toast when API is unreachable
  ✓ shows rate limit toast with countdown for AI endpoint
  ✓ shows error banner when dashboard fails to load
  ✓ block error boundary catches crash and shows fallback
  ✓ shows offline banner when network disconnects
  ✓ recovers and saves when network reconnects
  ✓ shows validation error for invalid block type
  ✓ upload error shows correct toast message
```

### Test Configuration

**`vitest.config.ts` (root):**
- Test database: separate `yumivibe_test` PostgreSQL database
- Before each suite: run `init.sql` to reset tables
- After each test: truncate all tables
- Mock external APIs (Gemini, Unsplash, OpenWeatherMap) with `vi.mock`
- jsdom environment for component tests
- Node environment for route handler and service tests
- Mock Web Speech API for voice control tests
- Setup file: configure React Testing Library, mock `window.matchMedia`
- Path aliases: `@/` maps to project root (matches `tsconfig.json`)

**`playwright.config.ts` (e2e/):**
- Base URL: `http://localhost:3000` (Next.js dev server)
- `webServer` config: auto-start `npm run dev` before tests
- Before all: seed test data via API
- After all: clean up test data
- Screenshots on failure
- Browsers: Chromium (primary), Firefox (secondary — no voice control)

### NPM Scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "format": "prettier --write .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test --config=e2e/playwright.config.ts",
    "test:all": "vitest run && playwright test --config=e2e/playwright.config.ts",
    "db:init": "psql $DATABASE_URL -f database/init.sql",
    "db:seed": "psql $DATABASE_URL -f database/seed.sql"
  }
}
```

---

## Implementation Plan

### Phase 1 — Project Setup & Database
1. Create Next.js project: `npx create-next-app@latest yumivibe --typescript --tailwind --app --eslint`
2. Install dependencies: `react-grid-layout`, `pg`, `zod`, `formidable`, `uuid`
3. Configure TypeScript strict mode, ESLint rules, Prettier
4. Set up `next.config.ts` (security headers, image domains for Unsplash)
5. Create shared types in `types/` (`Dashboard`, `Block`, `BlockType`)
6. Write `database/init.sql` — create tables
7. Set up PostgreSQL connection pool in `lib/db.ts`
8. Configure `docker-compose.yml` for PostgreSQL
9. Create `.env.local` with all required environment variables

### Phase 2 — API Route Handlers
10. Build Zod schemas in `lib/validators/` (dashboard, AI, background)
11. Build `lib/utils/apiResponse.ts` — standard response helpers + Zod error formatter
12. Build `lib/utils/AppError.ts` — custom error class + error codes
13. Build dashboard services (`lib/services/dashboardService.ts`, `blockService.ts`)
14. Build dashboard route handlers:
    - `app/api/dashboards/route.ts` — GET (list), POST (create)
    - `app/api/dashboards/[id]/route.ts` — GET (one), PATCH (update), DELETE
15. Build AI service + route handler:
    - `lib/services/aiService.ts` — Gemini API call
    - `app/api/ai/clothing/route.ts` — GET
16. Build background service + route handlers:
    - `lib/services/backgroundService.ts` — file handling + Unsplash proxy
    - `app/api/dashboards/[id]/background/route.ts` — POST (upload)
    - `app/api/backgrounds/search/route.ts` — GET (Unsplash search)

### Phase 3 — Frontend: Welcome Page
17. Build `app/layout.tsx` — root layout with ThemeProvider
18. Build `app/page.tsx` — Server Component, fetches dashboards
19. Build `components/layout/Header.tsx` — app name + theme toggle
20. Build `components/welcome/WelcomePage.tsx` — Client Component wrapper
21. Build `components/welcome/DashboardCard.tsx` — clickable card
22. Build `components/welcome/EmptyState.tsx` — "Create Your First Dashboard" CTA
23. Build `utils/apiClient.ts` — fetch wrapper with error handling
24. Implement create dashboard → `router.push('/dashboard/[id]')`

### Phase 4 — Frontend: Dashboard Page
25. Build `app/dashboard/[id]/page.tsx` — Server Component, fetches dashboard
26. Build `app/dashboard/[id]/loading.tsx` — loading skeleton
27. Build `app/dashboard/[id]/not-found.tsx` — "Dashboard not found"
28. Build `components/dashboard/DashboardGrid.tsx` — react-grid-layout wrapper
29. Build `components/layout/Toolbar.tsx` — add block, background, theme, voice
30. Build `components/dashboard/BlockWrapper.tsx` — drag handle, delete button
31. Build `components/dashboard/AddBlockMenu.tsx` — block type selector
32. Build `hooks/useBlocks.ts` — block CRUD via API
33. Auto-save layout changes on drag/resize

### Phase 5 — Block Components
34. `GreetingBlock` — time-based greeting ("Good morning!")
35. `ClockBlock` — live clock with format options
36. `TimerBlock` — countdown with start/pause/reset
37. `PomodoroBlock` — 25/5 cycle with audio notification
38. `WeatherBlock` — OpenWeatherMap data + "What to wear?" AI button
39. `QuotesBlock` — random quote from API or manual input
40. `NotesBlock` — auto-saving textarea
41. `TodosBlock` — checklist with add/remove/toggle
42. `YouTubeBlock` — URL input + YT.Player API (voice-controllable)
43. `SpotifyBlock` — embed URL + postMessage for basic voice control
44. `TitleBlock` — editable heading

### Phase 6 — Voice Control
45. Build `hooks/useVoiceControl.ts` (Web Speech API, wake word, command parser)
46. Build `components/dashboard/VoiceControl.tsx` — mic toggle + indicator + toast
47. Wire YouTube commands: play/pause via `YT.Player` API
48. Wire Spotify commands: play/pause via postMessage to embed iframe
49. Add Chrome-only warning for non-Chrome browsers

### Phase 7 — Custom Backgrounds
50. Build `components/dashboard/BackgroundPicker.tsx` — tabs for color/gradient/upload/unsplash
51. Wire `POST /api/dashboards/[id]/background` — upload flow via `fetch()` + `FormData`
52. Wire `GET /api/backgrounds/search` — Unsplash search flow
53. Render background per type (color/gradient/image CSS)
54. Add Unsplash attribution display

### Phase 8 — Error Handling
55. Build `lib/utils/rateLimiter.ts` — in-memory rate limit tracker
56. Build `lib/utils/cache.ts` — simple TTL cache for API responses
57. Wire rate limiting + caching into AI, Unsplash, and Weather services
58. Build `app/error.tsx` — root error boundary
59. Build `app/dashboard/[id]/error.tsx` — dashboard error boundary
60. Build `components/errors/ErrorToast.tsx` — transient notifications
61. Build `components/errors/ErrorBanner.tsx` — persistent page errors
62. Build `components/errors/BlockError.tsx` — block-specific errors
63. Build `components/errors/ErrorBoundary.tsx` — React crash recovery
64. Add offline detection (navigator.onLine) + reconnect queue in `apiClient.ts`
65. Add retry logic: auto-retry network errors (3x backoff), manual retry for 5xx
66. Add rate limit UX: countdown timers, disabled buttons, cached fallbacks
67. Wire all error scenarios through each block and page

### Phase 9 — Testing: Route Handlers & Services
68. Set up Vitest config (dual environments: node for API, jsdom for components)
69. Configure test database (`yumivibe_test`), setup/teardown scripts
70. Write dashboard route handler tests (CRUD + validation + edge cases)
71. Write background route handler tests (upload + Unsplash + rate limits)
72. Write AI route handler tests (clothing suggestion + rate limits + fallbacks)
73. Write service unit tests (dashboardService, blockService)
74. Write rate limit tracker + cache service tests
75. Write Zod schema tests (validation rules, coercion, edge cases)
76. Write apiResponse helper tests

### Phase 10 — Testing: Frontend
77. Set up React Testing Library + jsdom environment
78. Write WelcomePage + DashboardCard + EmptyState component tests
79. Write DashboardGrid + BlockWrapper + AddBlockMenu component tests
80. Write BackgroundPicker tests (all tabs + errors)
81. Write VoiceControl component tests
82. Write all block component tests (11 blocks)
83. Write error component tests (ErrorToast, ErrorBanner, BlockError, ErrorBoundary)
84. Write hook tests (useDashboards, useBlocks, useVoiceControl, useWeatherAI)
85. Write utility tests (blockRegistry, defaultLayouts, apiClient)

### Phase 11 — Testing: E2E
86. Set up Playwright + config (Chromium + Firefox, webServer auto-start)
87. Write welcome page E2E flow
88. Write dashboard CRUD E2E flow
89. Write block management E2E flow (add, remove, drag, resize, persist)
90. Write background picker E2E flow
91. Write voice control E2E flow (Chrome only)
92. Write error scenario E2E flow (404, offline, rate limits)

### Phase 12 — Theming & Polish
93. Implement light/dark theme with Tailwind + context
94. Responsive layout adjustments
95. Loading states across all pages (Suspense boundaries + loading.tsx)
96. Empty dashboard state (prompt to add first block)
97. Final lint + coverage check (target 80%+)

---

## Verification Checklist
- [ ] Welcome page shows list of dashboards
- [ ] Can create a new dashboard from welcome page
- [ ] Dashboard page loads with grid layout
- [ ] Can add any block type from toolbar
- [ ] Can remove blocks (delete button)
- [ ] Blocks are draggable and resizable
- [ ] Layout changes persist (saved to DB)
- [ ] Clock shows live time
- [ ] Timer counts down and alerts
- [ ] Pomodoro cycles 25/5 with notification
- [ ] Weather loads for entered city
- [ ] "What to wear?" returns AI response (Gemini)
- [ ] Quotes load from API
- [ ] Notes auto-save on typing
- [ ] Todos can be added/checked/removed
- [ ] YouTube embed plays video
- [ ] Spotify embed plays music
- [ ] Voice control: mic toggles on/off
- [ ] Voice "hey vibe, pause youtube" pauses YouTube
- [ ] Voice "hey vibe, play youtube" plays YouTube
- [ ] Voice "hey vibe, pause spotify" pauses Spotify (best-effort)
- [ ] Non-Chrome browser shows voice control warning
- [ ] Light/dark theme toggle works
- [ ] Background: solid color picker works
- [ ] Background: gradient picker works
- [ ] Background: can upload custom image from files
- [ ] Background: can search and select Unsplash image
- [ ] Unsplash attribution displayed correctly
- [ ] Uploaded images saved to server and persist
- [ ] Dashboard name is editable
- [ ] Can navigate back to welcome page
- [ ] Can delete a dashboard
- [ ] All API routes validate input with Zod
- [ ] No TypeScript `any` types
- [ ] All files under 300 lines
- [ ] ESLint + Prettier pass with no errors
- [ ] Server Components used by default, `'use client'` only where needed
**Error Handling**
- [ ] API routes return standard error shape for all errors
- [ ] Zod validation errors include field-level details
- [ ] Gemini 429 shows countdown + disables button
- [ ] Unsplash 429 shows message + cached results
- [ ] Weather 429 shows cached data + limit message
- [ ] File upload rejects wrong type with toast
- [ ] File upload rejects >5MB with toast
- [ ] 404 dashboard shows Next.js not-found page
- [ ] Offline banner appears when network lost
- [ ] Queued changes save on reconnect
- [ ] Block crash shows ErrorBoundary fallback, not white screen
- [ ] Auto-retry on network errors (3x with backoff)
- [ ] No SQL or stack traces leak to frontend
- [ ] `app/error.tsx` catches unhandled page errors
**Testing**
- [ ] Route handler tests pass (`npm test`)
- [ ] Component tests pass (`npm test`)
- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] Coverage 80%+ on services, hooks, and utils
- [ ] Test database resets cleanly between runs
