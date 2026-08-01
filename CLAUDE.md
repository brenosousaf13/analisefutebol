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

`competition` (nome do campeonato) é opcional no banco: a migration
[20260731_add_competition.sql](supabase/migrations/20260731_add_competition.sql)
adiciona a coluna. **Enquanto ela não rodar, o app continua funcionando** —
`getMyAnalyses` detecta o erro de coluna inexistente, marca `competitionColumn`
como `'absent'` e refaz a consulta sem o campo. A escrita só envia `competition`
depois de confirmar que a coluna existe, para não derrubar o insert inteiro.

Types are defined in [src/types/](src/types/).

### Page Structure

| Page | Route | Purpose |
|------|-------|---------|
| `Login` | `/login` | Supabase auth |
| `Home` | `/` | Home do analista — landing pós-login |
| `CreateAnalysis` | `/nova-analise` | New analysis wizard |
| `Campinho` | `/campinho` | Placeholder — a definir |
| `MyAnalyses` | `/biblioteca` | User's analysis dashboard |
| `ViewAnalysis` | `/ver-analise/:id` | Visualização somente leitura de uma análise |
| `Analysis` | `/analise`, `/analise/:id`, `/analysis/saved/:id` | Main editor (tactical field + sidebar) |
| `FullAnalysisPage` | `/analysis-complete/saved/:id` | Full analysis editor (main use) |
| `SharedAnalysis` | `/s/:token` | Public shared view |
| `AdminDashboard` | `/admin` | Admin tools |

Pages behind `ProtectedRoute`: all except `Login` and `SharedAnalysis`.
`/minhas-analises` redireciona para `/biblioteca` (links antigos).
Unknown routes redirect to `/` via the catch-all in [src/App.tsx](src/App.tsx).

### Casca das telas internas

[src/layouts/AppLayout.tsx](src/layouts/AppLayout.tsx) é a moldura das telas novas:
sidebar fixa + topbar com busca opcional (`⌘K` foca o campo). Ele é dono do estado
de colapso — a largura do conteúdo precisa acompanhar a da sidebar, então o estado
**não** pode viver dentro de `Sidebar`. Persistido em `localStorage`
(`zona14_sidebar_collapsed`). Abaixo de `lg` a sidebar vira drawer.

[src/components/layout/Sidebar.tsx](src/components/layout/Sidebar.tsx) segue a
estrutura da referência ElevenLabs. Itens marcados `soon: true` renderizam como
`<button disabled>` em vez de `<Link>` — navegar para uma rota inexistente cairia
no catch-all e voltaria para a home, o que confunde.

`AnalysisLayout` + `Header` (antigos) continuam servindo as telas de análise.

### Tela de visualização (`ViewAnalysis`)

Somente leitura. Aberta pelo "Abrir" da Home; a edição fica atrás do botão de
lápis do próprio cabeçalho, que leva para `FullAnalysisPage`.

- **Posse de bola** usa a mesma semântica do editor (`FullAnalysisMode`): quem tem
  a posse aparece na fase ofensiva e o adversário na defensiva.
- **Indicadores de anotação, gol e assistência vivem só na lista lateral.** A
  bolinha azul no marcador em campo é desligada via `showNoteIndicators={false}`
  em `TacticalField` — a prop existe justamente para isso e continua `true` por
  padrão, então o editor segue mostrando a bolinha.
- Gols e assistências vêm de `events` com `type: 'goal'`, associados ao elenco
  **por nome** (`nameKey` em [src/utils/playerTally.ts](src/utils/playerTally.ts)) —
  `MatchEvent` guarda `player_name`/`secondary_player_name`, não ids. Jogador
  renomeado depois do evento deixa de casar.
- O download usa `html2canvas` em import dinâmico (chunk próprio de ~200 kB) e
  captura **a fase visível no momento**, não as duas.

### Key Services

- **[src/services/analysisService.ts](src/services/analysisService.ts)** — All Supabase CRUD: create/read/update analyses, boards, sharing tokens, background colors
- **[src/services/apiFootballService.ts](src/services/apiFootballService.ts)** — Player search, squad lookup, fixture/lineup data from API-Football
- **[src/services/searchService.ts](src/services/searchService.ts)** — Multi-type search (players, teams, coaches, matches, tags) combining API-Football and Supabase
- **[src/services/fixtureAnalysisService.ts](src/services/fixtureAnalysisService.ts)** —
  `createAnalysisFromFixture()` cria uma análise a partir de um jogo da API-Football,
  já com a escalação real. Devolve `usedRealLineups: false` quando a API ainda não
  publicou a escalação (o caso normal para jogos distantes) — a análise é criada
  mesmo assim, com o time padrão, e a Home avisa o usuário.
- **[src/utils/lineupToPlayers.ts](src/utils/lineupToPlayers.ts)** — converte o
  `grid` ("linha:coluna") da API-Football em posições percentuais no campo.
  ⚠️ A mesma lógica está duplicada inline em
  [src/pages/Analysis.tsx](src/pages/Analysis.tsx) (`convertLineupToPlayers`);
  unificar quando essa página for mexida.

`apiFootballService.getUpcomingFixtures()` alimenta o painel "Próximos jogos".
Faz **uma** chamada e filtra no cliente por `PRIORITY_LEAGUES`, porque a API não
aceita várias ligas por requisição e a cota do plano gratuito é baixa. Cache de
30 min em `localStorage`.

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

Tailwind is configured with a custom palette in [tailwind.config.js](tailwind.config.js).

**Sistema novo** (usar em telas novas) — estrutura da referência Fynix traduzida
para dark. Escala de elevação, não cores soltas:

| Token | Valor | Uso |
|---|---|---|
| `surface-base` | `#0B1111` | fundo da página |
| `surface-sunken` | `#080D0D` | sidebar |
| `surface-raised` | `#141A1A` | cards |
| `surface-overlay` | `#1B2222` | linhas dentro do card, hover |
| `surface-hover` | `#222A2A` | item interativo em hover/ativo |
| `line` / `line-subtle` / `line-strong` | brancos com alpha | bordas e divisores |
| `content-primary` / `-secondary` / `-muted` | `#E8EFEC` / `#9AA8A4` / `#61706C` | hierarquia de texto |
| `rounded-card` (20px) / `rounded-control` (12px) | | raios |
| `shadow-card` / `shadow-pop` | | elevação |

**Tokens legados** (telas antigas ainda usam): `app-bg`, `card-bg`, `nav-dark`,
`brand-primary: #27D888`, `field-green`. Não remover antes de migrar as telas.

Font: Plus Jakarta Sans (Google Fonts) — a mesma da referência Fynix.

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
