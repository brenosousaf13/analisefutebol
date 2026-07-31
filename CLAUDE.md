# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server with HMR
npm run build     # TypeScript check + Vite production build
npm run lint      # ESLint across all files
npm run preview   # Serve production build locally
```

No test framework is configured.

`npm run lint` currently reports pre-existing errors (mostly `no-explicit-any` in
`src/services/`, `src/types/api-football.ts` and `src/utils/cpfValidation.ts`).
Don't treat a non-zero lint exit as a regression unless the error is in a file you touched.

## Architecture

**Zona 14** is a tactical football analysis tool. Coaches/analysts create analysis boards, draw formations and movement (arrows/rectangles) on an interactive soccer field, search players and teams via API-Football, and share analyses via public tokens.

### Stack

- React 19 + TypeScript 5 via Vite 7
- React Router DOM 7 for routing
- Tailwind CSS 3 for styling (custom dark theme)
- Supabase for auth (OAuth) and database (PostgreSQL)
- Axios + API-Football (`v3.football.api-sports.io`) for external data
- html2canvas + jsPDF for PDF export

### Environment Variables

All Supabase and API-Football credentials live in `.env` (not versioned — see `.env.example`)
as `VITE_*` vars. Vite proxies API-Football calls through `/api-football`, injecting the
API key header from `VITE_API_FOOTBALL_KEY` — this avoids CORS in dev and matches Vercel config.

**Any `VITE_*` variable is inlined into the client bundle at build time and is therefore
public.** Server-only secrets must be declared without the `VITE_` prefix and read from a
Vercel Function (see `api/proxy-logo.js`).

### Data Model

The central entity is `AnalysisData` in [src/services/analysisService.ts](src/services/analysisService.ts). An analysis has multiple `AnalysisBoard`s (offensive/defensive or custom), each containing:
- `players: Player[]` — positioned as percentages on the field, with color, number, note, starter status
- `arrows: Arrow[]` — movement indicators with start/end coordinates
- `rectangles: Rectangle[]` — zone highlights

The `events` field (`any[]`, stored as JSON in the DB) may contain a `{ type: '_meta', videoUrl: string }` entry storing a YouTube highlight URL without a schema change. `FullAnalysisPage` reads it into `videoUrl` and filters it out before displaying the match timeline.

> This `_meta` convention was introduced by the (now removed) Copa do Mundo 2026 feature,
> which injected a highlight URL when creating an analysis from a fixture. **Existing
> analyses still carry it**, so the read path in `FullAnalysisPage` and `HighlightsModal`
> must be preserved. Nothing writes `_meta` anymore.

Types are defined in [src/types/](src/types/).

### Page Structure

| Page | Route | Purpose |
|------|-------|---------|
| `Login` | `/login` | Supabase auth |
| `CreateAnalysis` | `/` | New analysis wizard |
| `Analysis` | `/analise`, `/analise/:id`, `/analysis/saved/:id` | Main editor (tactical field + sidebar) |
| `FullAnalysisPage` | `/analysis-complete/saved/:id` | Full analysis editor (main use) |
| `MyAnalyses` | `/minhas-analises` | User's analysis dashboard |
| `SharedAnalysis` | `/s/:token` | Public shared view |
| `AdminDashboard` | `/admin` | Admin tools |

Pages behind `ProtectedRoute`: all except `Login` and `SharedAnalysis`.
Unknown routes redirect to `/` via the catch-all in [src/App.tsx](src/App.tsx).

### Key Services

- **[src/services/analysisService.ts](src/services/analysisService.ts)** — All Supabase CRUD: create/read/update analyses, boards, sharing tokens, background colors
- **[src/services/apiFootballService.ts](src/services/apiFootballService.ts)** — Player search, squad lookup, fixture/lineup data from API-Football
- **[src/services/searchService.ts](src/services/searchService.ts)** — Multi-type search (players, teams, coaches, matches, tags) combining API-Football and Supabase

### State Management

Two React Contexts in [src/contexts/](src/contexts/):
- `AuthContext` — Supabase session/user, persisted across refreshes
- `ThemeContext` — Toggle between default and dark themes, stored in `localStorage` key `analysis_theme`

### Highlights Modal

`src/components/HighlightsModal.tsx` — draggable + resizable floating video player.

- Draggable by the title bar (mousedown/mousemove/mouseup on `window`)
- Resizable from right, bottom, bottom-right, bottom-left edges
- Min size 340×220, default 720×460, centered on mount
- YouTube embed via `https://www.youtube.com/embed/{id}?autoplay=1`
- `zIndex: 9999` — floats above all analysis UI

Triggered from `FullAnalysisPage` when `videoUrl` is set (extracted from `events._meta`).
The "Highlights" button appears in the Zona 14 header (right side, desktop only,
`hidden lg:flex`) only when `videoUrl` is non-null. Props flow:
`FullAnalysisPage` → `AnalysisLayout` → `Header`.

This is the playback path for analyses created during the Copa; keep it working.

### Header & Navigation

`src/components/Header.tsx` — global fixed header (`h-10 lg:h-16 = 40/64px`).

- `videoUrl?: string | null` + `onHighlightClick?: () => void` — shows ▶ Highlights button
- Menu items are declared in the `menuItems` array (Criar Análise, Minhas Análises)

`src/layouts/AnalysisLayout.tsx` — wraps analysis pages, passes `videoUrl`/`onHighlightClick` through to Header.

### Utilities

- **[src/utils/logoUrl.ts](src/utils/logoUrl.ts)** — `getProxiedLogoUrl()` routes `media.api-sports.io`
  logos through the `api/proxy-logo.js` Vercel Function (in dev, through the `/api-football-media`
  Vite proxy). Consumed by `TeamLogoImage`.
- **[src/utils/playerCoordinates.ts](src/utils/playerCoordinates.ts)** — player positioning helpers

### Tactical Field

The interactive field is implemented in [src/components/SoccerField.tsx](src/components/SoccerField.tsx) and [src/components/TacticalField.tsx](src/components/TacticalField.tsx). Player positions and drawing coordinates are stored as **percentages** (0–100) relative to field dimensions, calculated with the `useFieldDimensions` hook in [src/hooks/useFieldDimensions.ts](src/hooks/useFieldDimensions.ts).

### Styling

Tailwind is configured with a custom palette in [tailwind.config.js](tailwind.config.js). Key tokens:
- `app-bg: #0B1111` — main background
- `card-bg: #141A1A` — panels/cards
- `nav-dark: #030909` — header/nav
- `brand-primary: #27D888` — green accent
- `field-green: #2d5a3d` — soccer field color
- Font: Plus Jakarta Sans (Google Fonts)

### Deployment

Deployed to Vercel. Config in [vercel.json](vercel.json) rewrites all routes to `/index.html` for SPA routing. Build output is `dist/`.

### Removed: Copa do Mundo 2026

The Copa hub (`/copa`, team and player pages, TheSportsDB integration, YouTube highlight
auto-fetching) was removed after the tournament ended. Recover from git history if needed —
the last commit containing it is tagged `copa-2026`.

Deliberately kept, because existing analyses depend on them:
`HighlightsModal`, the `events._meta` → `videoUrl` read path, and the Header highlights button.

The `copa_highlights` Supabase table was **not** dropped and the `VITE_THESPORTSDB_KEY` /
`YOUTUBE_API_KEY` env vars were **not** deleted from Vercel — both are now unused.
