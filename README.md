# YumiVibe

Customizable personal dashboard. Create multiple dashboards with draggable, resizable blocks — productivity, entertainment, and mood in one cozy app.

## Features

- **Drag & Drop Grid** — Rearrange and resize blocks freely with react-grid-layout
- **11 Block Types** — Greeting, Clock, Timer, Pomodoro, Weather, Quotes, Notes, Todos, YouTube, Spotify, Title
- **Real Weather** — Live data from Open-Meteo (no API key needed) with geolocation
- **AI Clothing Suggestions** — Google Gemini-powered outfit tips based on current weather
- **YouTube Playlist** — Add multiple videos, navigate with previous/next controls
- **Spotify Player** — Embed any playlist, album, or track
- **Voice Control** — Hands-free media control (play, pause, next, skip) via Web Speech API
- **Theme Palettes** — 6 color themes with background gradients and accent colors
- **Dark Mode** — Full light/dark theme support
- **Dashboard Templates** — Morning Vibes, Work Focus, Chill & Music presets
- **User Accounts** — Email/password authentication with JWT
- **Per-User Dashboards** — Each user gets their own dashboards stored in PostgreSQL

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS |
| Database | PostgreSQL with raw SQL via `pg` |
| Validation | Zod |
| AI | Google Gemini API (free tier) |
| Grid | react-grid-layout |
| Auth | JWT (jose) with scrypt password hashing |
| Testing | Vitest + React Testing Library |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Setup

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL and JWT_SECRET

# Create database and run schema
psql -U postgres -c "CREATE DATABASE yumivibe;"
psql -U postgres -d yumivibe -f database/init.sql

# Optional: seed with sample data
psql -U postgres -d yumivibe -f database/seed.sql

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to get started.

### Environment Variables

```
DATABASE_URL=postgresql://postgres:password@localhost:5432/yumivibe
JWT_SECRET=your-secret-key
GEMINI_API_KEY=           # Optional — falls back to local suggestions
UNSPLASH_ACCESS_KEY=      # Optional — for background image search
```

## Scripts

```bash
npm run dev           # Development server
npm run build         # Production build
npm run start         # Production server
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## Project Structure

```
app/                    — Next.js App Router (pages + API routes)
components/blocks/      — 11 block type components
components/dashboard/   — Grid, toolbar, pickers, voice control
components/welcome/     — Welcome page, dashboard cards, empty state
lib/services/           — Business logic (dashboard, auth, weather, AI)
lib/validators/         — Zod schemas
lib/utils/              — AppError, rateLimiter, cache, apiResponse
hooks/                  — Custom React hooks
context/                — Auth, Theme, Dashboard contexts
database/               — SQL schema and seed data
__tests__/              — 246 tests across 16 files
```

## API

```
POST   /api/auth/register        — Create account
POST   /api/auth/login           — Sign in
GET    /api/dashboards           — List user's dashboards
POST   /api/dashboards           — Create dashboard (with template support)
GET    /api/dashboards/[id]      — Get dashboard with blocks
PATCH  /api/dashboards/[id]      — Update dashboard, add/remove/update blocks
DELETE /api/dashboards/[id]      — Delete dashboard
GET    /api/weather              — Real-time weather (Open-Meteo)
GET    /api/ai/clothing          — AI clothing suggestion
```

## Voice Commands

Click the microphone icon in the toolbar, then say:

| Command | Action |
|---------|--------|
| "play" / "resume" | Play YouTube video |
| "pause" / "stop" | Pause YouTube video |
| "next video" / "skip" | Next video in playlist |
| "previous video" | Previous video in playlist |
| "play music" | Play Spotify |
| "pause music" | Pause Spotify |
| "stop everything" | Pause all media |

## License

MIT
