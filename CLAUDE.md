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

**Zona 14** is a tactical football analysis tool. Coaches/analysts create analysis boards, draw formations and movement (arrows/rectangles) on an interactive soccer field, search players and teams via API-Football, and share analyses via public tokens.

### Stack

- React 19 + TypeScript 5 via Vite 7
- React Router DOM 7 for routing
- Tailwind CSS 3 for styling (custom dark theme)
- Supabase for auth (OAuth) and database (PostgreSQL)
- Axios + API-Football (`v3.football.api-sports.io`) for external data
- html2canvas + jsPDF for PDF export

### Environment Variables

All Supabase and API-Football credentials are in `.env` as `VITE_*` vars. Vite proxies API-Football calls through `/api-football` (injecting the API key header automatically) — this avoids CORS in dev and matches Vercel config.

### Data Model

The central entity is `AnalysisData` in [src/services/analysisService.ts](src/services/analysisService.ts). An analysis has multiple `AnalysisBoard`s (offensive/defensive or custom), each containing:
- `players: Player[]` — positioned as percentages on the field, with color, number, note, starter status
- `arrows: Arrow[]` — movement indicators with start/end coordinates
- `rectangles: Rectangle[]` — zone highlights

Types are defined in [src/types/](src/types/).

### Page Structure

Seven pages in [src/pages/](src/pages/):

| Page | Route | Purpose |
|------|-------|---------|
| `Login` | `/login` | Supabase auth |
| `MyAnalyses` | `/` | User's analysis dashboard |
| `CreateAnalysis` | `/create` | New analysis wizard |
| `Analysis` | `/analysis/:id` | Main editor (tactical field + sidebar) |
| `FullAnalysisPage` | `/analysis/:id/full` | Read-only full view |
| `SharedAnalysis` | `/s/:token` | Public shared view |
| `AdminDashboard` | `/admin` | Admin tools |

All pages except Login and SharedAnalysis are wrapped in `ProtectedRoute`.

### Key Services

- **[src/services/analysisService.ts](src/services/analysisService.ts)** — All Supabase CRUD: create/read/update analyses, boards, sharing tokens, background colors
- **[src/services/apiFootballService.ts](src/services/apiFootballService.ts)** — Player search, squad lookup, fixture/lineup data from API-Football
- **[src/services/searchService.ts](src/services/searchService.ts)** — Multi-type search (players, teams, coaches, matches, tags) combining API-Football and Supabase

### State Management

Two React Contexts in [src/contexts/](src/contexts/):
- `AuthContext` — Supabase session/user, persisted across refreshes
- `ThemeContext` — Toggle between default and dark themes, stored in `localStorage` key `analysis_theme`

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
