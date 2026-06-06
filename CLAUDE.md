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

## Architecture

**Zona 14** is a tactical football analysis tool. Coaches/analysts create analysis boards, draw formations and movement (arrows/rectangles) on an interactive soccer field, search players and teams via API-Football, and share analyses via public tokens. It also includes a full Copa do Mundo 2026 hub with live fixtures, standings, team pages, and player profiles.

### Stack

- React 19 + TypeScript 5 via Vite 7
- React Router DOM 7 for routing
- Tailwind CSS 3 for styling (custom dark theme)
- Supabase for auth (OAuth) and database (PostgreSQL)
- Axios + API-Football (`v3.football.api-sports.io`) for external data
- TheSportsDB (`thesportsdb.com/api/v1/json/`) for Copa 2026 data (league ID `4429`)
- html2canvas + jsPDF for PDF export

### Environment Variables

All Supabase and API-Football credentials are in `.env` as `VITE_*` vars. Vite proxies API-Football calls through `/api-football` (injecting the API key header automatically) — this avoids CORS in dev and matches Vercel config.

`VITE_THESPORTSDB_KEY` — TheSportsDB API key (fallback hardcoded: `'6452773356'`).

### Data Model

The central entity is `AnalysisData` in [src/services/analysisService.ts](src/services/analysisService.ts). An analysis has multiple `AnalysisBoard`s (offensive/defensive or custom), each containing:
- `players: Player[]` — positioned as percentages on the field, with color, number, note, starter status
- `arrows: Arrow[]` — movement indicators with start/end coordinates
- `rectangles: Rectangle[]` — zone highlights

The `events` field (`any[]`, stored as JSON in the DB) may contain a `{ type: '_meta', videoUrl: string }` entry to store a YouTube highlight URL without a schema change. This is injected when creating an analysis from Copa fixtures that have a video. `FullAnalysisPage` filters it out before displaying the match timeline.

Types are defined in [src/types/](src/types/).

### Page Structure

| Page | Route | Purpose |
|------|-------|---------|
| `Login` | `/login` | Supabase auth |
| `MyAnalyses` | `/` | User's analysis dashboard |
| `CreateAnalysis` | `/create` | New analysis wizard |
| `Analysis` | `/analysis/:id` | Main editor (tactical field + sidebar) |
| `FullAnalysisPage` | `/analysis/:id/full` | Full analysis editor (main use) |
| `SharedAnalysis` | `/s/:token` | Public shared view |
| `AdminDashboard` | `/admin` | Admin tools |
| `Copa` | `/copa` | Copa do Mundo 2026 hub |
| `CopaDemo` | `/copa/demo` | Premier League demo of Copa UI |
| `CopaSelecaoPage` | `/copa/selecao/:teamId` | Team profile (squad, kits, fixtures) |
| `CopaJogadorPage` | `/copa/jogador/:playerId` | Player profile (honours, former teams) |

Pages behind `ProtectedRoute`: all except Login, SharedAnalysis, Copa routes (`/copa*`).

All Copa pages render `<Header />` (Zona 14 header) at the top, then their own sub-header below (`top: 64px` sticky). The Copa tab bar sticks at `top: 64px`, the calendar DateHeader sticks at `top: 116px`.

### Key Services

- **[src/services/analysisService.ts](src/services/analysisService.ts)** — All Supabase CRUD: create/read/update analyses, boards, sharing tokens, background colors
- **[src/services/apiFootballService.ts](src/services/apiFootballService.ts)** — Player search, squad lookup, fixture/lineup data from API-Football
- **[src/services/searchService.ts](src/services/searchService.ts)** — Multi-type search (players, teams, coaches, matches, tags) combining API-Football and Supabase
- **[src/services/theSportsDbService.ts](src/services/theSportsDbService.ts)** — All TheSportsDB calls for Copa 2026. In-memory TTL cache per endpoint. Key methods:
  - `getAllFixtures()` — Copa 2026 schedule (league 4429)
  - `getLiveFixtures()` — live scores (may 404 on free tier)
  - `getLineup(eventId)` — match lineup (starters only; substitutes rarely included)
  - `getTimeline(eventId)` — match events (goals, cards, subs)
  - `getEventStats(eventId)` — possession, shots, etc.
  - `getStandings()` — group standings
  - `getTeam(teamId)` — team details including `strColour1`/`strColour2`
  - `getTeamSquad(teamId)` — full squad list
  - `getTeamEquipment(teamId)` — kit images
  - `getTeamNextEvents/LastEvents(teamId)` — team schedule
  - `getPlayerDetails/Honours/FormerTeams(playerId)` — player profile data
  - `getTvListings(eventId)` — broadcast info
  - `searchPlayers(name)` — global player search
  - `clearCopaCache()` — bust all Copa cache entries

### State Management

Two React Contexts in [src/contexts/](src/contexts/):
- `AuthContext` — Supabase session/user, persisted across refreshes
- `ThemeContext` — Toggle between default and dark themes, stored in `localStorage` key `analysis_theme`

Copa-specific localStorage keys (persisted across refreshes):
- `copa_saved_teams` — Set of team names starred in Tabela/Seleções tabs
- `copa_saved_fixtures` — Set of fixture IDs starred in calendar/results
- `copa_notif_fixtures` — Set of fixture IDs with bell notification enabled

### Copa 2026 Feature

The Copa hub (`/copa`) is a multi-tab page:

**Tabs:** Calendário · Resultados · Tabela · Seleções · Jogadores

- **Calendário**: fixture list grouped by date, search + group filter chips, right sidebar with favorites/live/upcoming. Sticky date headers at `top: 116px`.
- **Resultados**: completed matches with YouTube highlights gallery.
- **Tabela**: groups A–L using `CopaGroupsDisplay`. Uses `normalizeGroup()` to handle API variations (`"A"`, `"Group A"`, `"1"`, etc.). Fallback flat grid when groups can't be determined.
- **Seleções**: team grid via `CopaSelecoes`. Clicking navigates to `/copa/selecao/:teamId`.
- **Jogadores**: player search (min 3 chars, 400ms debounce). Clicking navigates to `/copa/jogador/:playerId`.

`useCountdown()` lives inside `Hero` component (not Copa root) to avoid re-rendering the whole page every second. `JogadoresTab` is defined at module level (not inside Copa function) so React doesn't remount it on Copa re-renders.

**Creating analysis from Copa:** `handleCreateAnalysis(fixture)` in Copa.tsx:
1. Fetches lineup via `getLineup()`
2. Maps starters to field positions with `tsdbLineupToPlayers()`
3. Fetches bench: tries `tsdbBenchToPlayers()` (lineup subs, often empty), falls back to `getTeamSquad()` filtered by starter IDs
4. Stores `{ type: '_meta', videoUrl }` in `events` if fixture has a YouTube video
5. Creates analysis via `analysisService.createBlankAnalysis('analise_completa', ...)`

### CopaSelecaoPage

Team profile page at `/copa/selecao/:teamId?group=X&name=Y`.

Uses `team.strColour1` (from `getTeam()`) to theme the page: hero gradient, badge border, team name color, group badge, active sub-tab underline. `colorForDarkBg(hex, fallback)` prevents invisible colors on dark bg (luminance < 0.15 → fallback). `hexToRgba(hex, alpha)` converts hex to `rgba()` for backgrounds.

Sub-tabs: Elenco (squad grid, 120px player photos, position-grouped, click → player profile) · Uniformes · Jogos (next/last 5 fixtures).

### CopaJogadorPage

Player profile page at `/copa/jogador/:playerId`. Fetches details, honours, and former teams in `Promise.all`. Honours grouped by competition with season list. All nullable API fields guarded (TheSportsDB returns `null` for fields typed as `string`).

### Copa Components (`src/components/copa/`)

| Component | Purpose |
|-----------|---------|
| `CopaFixtureCard` | Full fixture card with expandable panels (Escalação, Eventos, Stats, Highlights, Onde Assistir), star/bell buttons (state controlled from Copa.tsx via props) |
| `CopaGroupsDisplay` | Groups A–L table with standings, star favorites, fallback flat grid |
| `CopaSelecoes` | Team grid with search + group filter |
| `CopaLineupList` | Two-column lineup display (starters + subs) |
| `CopaLineupField` | Visual field with player positions |
| `CopaTimeline` | Match events (goals, cards, subs) |
| `CopaMatchStats` | Bar charts for possession, shots, etc. |
| `CopaPlayerModal` | (Legacy) player search modal |
| `CopaStandings` | (Legacy) standings using Tailwind classes |

`CopaFixtureCard` props: `isSaved`, `onToggleSave`, `isNotif`, `onToggleNotif` — passed from Copa.tsx which persists state to localStorage. Without these props, the card falls back to local component state.

### Highlights Modal

`src/components/HighlightsModal.tsx` — draggable + resizable floating video player.

- Draggable by the title bar (mousedown/mousemove/mouseup on `window`)
- Resizable from right, bottom, bottom-right, bottom-left edges
- Min size 340×220, default 720×460, centered on mount
- YouTube embed via `https://www.youtube.com/embed/{id}?autoplay=1`
- `zIndex: 9999` — floats above all analysis UI

Triggered from `FullAnalysisPage` when `videoUrl` is set (extracted from `events._meta`). The "Highlights" button appears in the Zona 14 header (right side, desktop only, `hidden lg:flex`) only when `videoUrl` is non-null. Props flow: `FullAnalysisPage` → `AnalysisLayout` → `Header`.

### Header & Navigation

`src/components/Header.tsx` — global fixed header (`h-10 lg:h-16 = 40/64px`).

Props added for Copa/Analysis integration:
- `videoUrl?: string | null` + `onHighlightClick?: () => void` — shows ▶ Highlights button
- Menu item "Copa do Mundo 2026" (icon: `Trophy`) navigates to `/copa`, active when path starts with `/copa`

`src/layouts/AnalysisLayout.tsx` — wraps analysis pages, passes `videoUrl`/`onHighlightClick` through to Header.

### Utilities

- **[src/utils/teamNames.ts](src/utils/teamNames.ts)** — `teamPt(name)` translates English team/country names to Portuguese BR (e.g. `"Brazil"` → `"Brasil"`, `"Germany"` → `"Alemanha"`)
- **[src/utils/playerCoordinates.ts](src/utils/playerCoordinates.ts)** — player positioning helpers

### Design Tokens (Copa pages)

Copa pages use inline styles with a consistent dark palette:

```typescript
const BG  = '#07090c';  // page background
const S   = '#0c1016';  // card/surface
const S2  = '#111820';  // elevated surface
const BDR = 'rgba(255,255,255,0.06)';  // border
const AC  = '#00e676';  // green accent
const GD  = '#f59e0b';  // gold (Brazil highlight)
const T   = '#dde5ef';  // primary text
const T2  = '#566b82';  // secondary text
const T3  = '#4a6077';  // muted text (raised from #243040 for contrast)
const BC  = "'Barlow Condensed', sans-serif";  // display font
```

`T3` was raised from `#243040` to `#4a6077` (contrast ratio ~4.8:1 on dark bg) — do not lower it back.

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
