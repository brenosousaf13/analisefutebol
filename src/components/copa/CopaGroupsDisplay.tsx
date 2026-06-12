import { useState } from 'react';
import type { TsdbEvent } from '../../types/thesportsdb';
import { teamPt } from '../../utils/teamNames';

// ── Design tokens ──────────────────────────────────────────────
const S   = '#0c1016';
const S2  = '#111820';
const BDR = 'rgba(255,255,255,0.06)';
const BDR2= 'rgba(255,255,255,0.11)';
const AC  = '#00e676';
const GD  = '#f59e0b';
const T   = '#dde5ef';
const T2  = '#566b82';
const T3  = '#4a6077';
const BC  = "'Barlow Condensed', sans-serif";

// Grupo A..L para Copa 2026 (48 seleções, 12 grupos)
const GROUP_ORDER = ['A','B','C','D','E','F','G','H','I','J','K','L'];
const FINISHED    = new Set(['FT','AET','PEN']);

// Grid columns: pos | team | Pts | PJ | VIT | E | DER | GM | GC | SG
const GRID = '28px 1fr 38px 26px 26px 22px 28px 26px 26px 30px';

function normalizeGroup(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (/^[A-La-l]$/.test(s)) return s.toUpperCase();
  const m = s.match(/\b([A-La-l])\b/i);
  if (m) return m[1].toUpperCase();
  const n = parseInt(s, 10);
  if (!isNaN(n) && n >= 1 && n <= 12) return String.fromCharCode(64 + n);
  return null;
}

interface TeamStat {
  name: string;
  badge: string | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
}

function zeroed(name: string): TeamStat {
  return { name, badge: null, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
}

// Copa 2026 group stage = rounds 1-3 (each team plays 3 group matches)
const GROUP_ROUNDS = new Set(['1', '2', '3']);

function applyResults(
  groups: Map<string, Map<string, TeamStat>>,
  fixtures: TsdbEvent[],
): void {
  fixtures.forEach(f => {
    if (!FINISHED.has(f.strStatus)) return;
    const hs  = parseInt(f.intHomeScore ?? '', 10);
    const as_ = parseInt(f.intAwayScore ?? '', 10);
    if (isNaN(hs) || isNaN(as_)) return;

    // Find the group that contains both teams
    for (const gm of groups.values()) {
      if (!gm.has(f.strHomeTeam) || !gm.has(f.strAwayTeam)) continue;
      const home = gm.get(f.strHomeTeam)!;
      const away = gm.get(f.strAwayTeam)!;
      home.played++; away.played++;
      home.gf += hs; home.ga += as_;
      away.gf += as_; away.ga += hs;
      home.gd = home.gf - home.ga;
      away.gd = away.gf - away.ga;
      if (hs > as_) { home.wins++; home.pts += 3; away.losses++; }
      else if (hs < as_) { away.wins++; away.pts += 3; home.losses++; }
      else { home.draws++; home.pts++; away.draws++; away.pts++; }
      break;
    }
  });
}

// ── Strategy 1: use strGroup field ────────────────────────────
function buildFromStrGroup(fixtures: TsdbEvent[]): Map<string, Map<string, TeamStat>> {
  const groups = new Map<string, Map<string, TeamStat>>();
  const badges = new Map<string, string>();

  fixtures.forEach(f => {
    const g = normalizeGroup(f.strGroup);
    if (!g) return;
    if (f.strHomeTeamBadge) badges.set(f.strHomeTeam, f.strHomeTeamBadge);
    if (f.strAwayTeamBadge) badges.set(f.strAwayTeam, f.strAwayTeamBadge);
    if (!groups.has(g)) groups.set(g, new Map());
    const gm = groups.get(g)!;
    if (!gm.has(f.strHomeTeam)) gm.set(f.strHomeTeam, zeroed(f.strHomeTeam));
    if (!gm.has(f.strAwayTeam)) gm.set(f.strAwayTeam, zeroed(f.strAwayTeam));
  });

  if (groups.size === 0) return groups;

  applyResults(groups, fixtures);
  groups.forEach(gm => gm.forEach((stat, name) => { stat.badge = badges.get(name) ?? null; }));
  return groups;
}

// ── Strategy 2: infer groups from fixture graph (rounds 1-3) ─
// Teams that all play each other form a connected component = one group.
function buildFromGraph(fixtures: TsdbEvent[]): Map<string, Map<string, TeamStat>> {
  const groups = new Map<string, Map<string, TeamStat>>();
  const badges = new Map<string, string>();

  // Use only group-stage rounds to avoid knockout matches merging groups
  const gsFixtures = fixtures.filter(f => GROUP_ROUNDS.has(f.intRound ?? ''));
  if (gsFixtures.length === 0) return groups;

  const adj = new Map<string, Set<string>>();
  gsFixtures.forEach(f => {
    if (f.strHomeTeamBadge) badges.set(f.strHomeTeam, f.strHomeTeamBadge);
    if (f.strAwayTeamBadge) badges.set(f.strAwayTeam, f.strAwayTeamBadge);
    if (!adj.has(f.strHomeTeam)) adj.set(f.strHomeTeam, new Set());
    if (!adj.has(f.strAwayTeam)) adj.set(f.strAwayTeam, new Set());
    adj.get(f.strHomeTeam)!.add(f.strAwayTeam);
    adj.get(f.strAwayTeam)!.add(f.strHomeTeam);
  });

  // Connected components (BFS)
  const visited = new Set<string>();
  const components: string[][] = [];
  adj.forEach((_, team) => {
    if (visited.has(team)) return;
    const comp: string[] = [];
    const queue = [team];
    while (queue.length) {
      const t = queue.shift()!;
      if (visited.has(t)) continue;
      visited.add(t); comp.push(t);
      adj.get(t)!.forEach(n => { if (!visited.has(n)) queue.push(n); });
    }
    components.push(comp);
  });

  // Only groups of exactly 4 teams
  const validGroups = components.filter(c => c.length === 4);

  // Sort groups alphabetically by smallest pt-BR team name → assigns A, B, C...
  validGroups.sort((a, b) => {
    const minA = a.map(teamPt).sort((x, y) => x.localeCompare(y, 'pt-BR'))[0];
    const minB = b.map(teamPt).sort((x, y) => x.localeCompare(y, 'pt-BR'))[0];
    return minA.localeCompare(minB, 'pt-BR');
  });

  validGroups.forEach((comp, i) => {
    const letter = String.fromCharCode(65 + i); // A, B, C...
    const gm = new Map<string, TeamStat>();
    comp.forEach(name => gm.set(name, zeroed(name)));
    groups.set(letter, gm);
  });

  applyResults(groups, gsFixtures);
  groups.forEach(gm => gm.forEach((stat, name) => { stat.badge = badges.get(name) ?? null; }));
  return groups;
}

function buildStandings(fixtures: TsdbEvent[]): Map<string, Map<string, TeamStat>> {
  // Try strGroup first (TheSportsDB may or may not populate this)
  const byGroup = buildFromStrGroup(fixtures);
  if (byGroup.size > 0) return byGroup;

  // Fallback: infer from fixture matchups (group stage = rounds 1-3)
  return buildFromGraph(fixtures);
}

// ── Sub-components ─────────────────────────────────────────────

function TeamBadge({ src, name, size = 20 }: { src: string | null; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
      background: S2, border: `1px solid ${BDR2}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {src && !err
        ? <img src={src} alt={name} onError={() => setErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontSize: size * 0.38, color: T3, fontWeight: 700 }}>{name.slice(0,2).toUpperCase()}</span>
      }
    </div>
  );
}

function StarBtn({ on, onClick }: { on: boolean; onClick: (e: React.MouseEvent) => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      title={on ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      style={{
        width: 20, height: 20, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: on || hov ? GD : T3, transition: 'color .12s', flexShrink: 0,
      }}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    </button>
  );
}

function Cell({ val, bold, color }: { val: string | number; bold?: boolean; color?: string }) {
  return (
    <span style={{
      textAlign: 'center', fontSize: 12.5, fontWeight: bold ? 700 : 400,
      color: color ?? T2, display: 'block',
    }}>
      {val}
    </span>
  );
}

function GroupCard({ group, teams, savedTeams, onToggleTeam }: {
  group: string;
  teams: TeamStat[];
  savedTeams: Set<string>;
  onToggleTeam: (name: string) => void;
}) {
  const hasBrazil = teams.some(t => t.name === 'Brazil');

  return (
    <div style={{ background: S, borderRadius: 6, overflow: 'hidden', border: `1px solid ${hasBrazil ? 'rgba(245,158,11,0.18)' : BDR}` }}>
      {/* Group header */}
      <div style={{ padding: '9px 14px', borderBottom: `1px solid ${BDR}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        {hasBrazil && <span style={{ width: 6, height: 6, borderRadius: '50%', background: GD, display: 'inline-block', flexShrink: 0 }} />}
        <span style={{ fontFamily: BC, fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.06em', color: hasBrazil ? GD : T }}>
          Grupo {group}
        </span>
      </div>

      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: GRID, padding: '5px 12px 5px 10px', alignItems: 'center', borderBottom: `1px solid ${BDR}` }}>
        <span />
        <span style={{ fontSize: 9, fontWeight: 700, color: T3, textTransform: 'uppercase', letterSpacing: '.05em', paddingLeft: 30 }}>Equipe</span>
        <span style={{ fontSize: 9, fontWeight: 700, color: T, textTransform: 'uppercase', letterSpacing: '.05em', textAlign: 'center' }}>Pts</span>
        <span style={{ fontSize: 9, fontWeight: 700, color: T3, textTransform: 'uppercase', letterSpacing: '.05em', textAlign: 'center' }}>PJ</span>
        <span style={{ fontSize: 9, fontWeight: 700, color: T3, textTransform: 'uppercase', letterSpacing: '.05em', textAlign: 'center' }}>VIT</span>
        <span style={{ fontSize: 9, fontWeight: 700, color: T3, textTransform: 'uppercase', letterSpacing: '.05em', textAlign: 'center' }}>E</span>
        <span style={{ fontSize: 9, fontWeight: 700, color: T3, textTransform: 'uppercase', letterSpacing: '.05em', textAlign: 'center' }}>DER</span>
        <span style={{ fontSize: 9, fontWeight: 700, color: T3, textTransform: 'uppercase', letterSpacing: '.05em', textAlign: 'center' }}>GM</span>
        <span style={{ fontSize: 9, fontWeight: 700, color: T3, textTransform: 'uppercase', letterSpacing: '.05em', textAlign: 'center' }}>GC</span>
        <span style={{ fontSize: 9, fontWeight: 700, color: T3, textTransform: 'uppercase', letterSpacing: '.05em', textAlign: 'center' }}>SG</span>
      </div>

      {/* Team rows */}
      {teams.map((tm, i) => {
        const isBra    = tm.name === 'Brazil';
        const starred  = savedTeams.has(tm.name);
        const qualify  = i < 2; // top 2 advance
        const gdColor  = tm.gd > 0 ? AC : tm.gd < 0 ? '#ef4444' : T2;

        return (
          <div key={tm.name} style={{
            display: 'grid', gridTemplateColumns: GRID,
            padding: '6px 12px 6px 10px', alignItems: 'center',
            borderTop: `1px solid ${BDR}`,
            background: isBra ? 'rgba(245,158,11,0.04)' : 'transparent',
            borderLeft: starred ? `2px solid ${GD}` : qualify ? `2px solid rgba(0,230,118,0.4)` : `2px solid transparent`,
          }}>
            {/* Position */}
            <span style={{ fontSize: 11, fontWeight: 600, color: qualify ? AC : T3, textAlign: 'center' }}>{i + 1}</span>

            {/* Team: badge + name + star */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
              <TeamBadge src={tm.badge} name={tm.name} size={20} />
              <span style={{
                fontSize: 13, fontWeight: isBra ? 600 : 400,
                color: isBra ? GD : T,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
              }}>
                {teamPt(tm.name)}
              </span>
              <StarBtn on={starred} onClick={e => { e.stopPropagation(); onToggleTeam(tm.name); }} />
            </div>

            {/* Pts — bold, white */}
            <span style={{ textAlign: 'center', fontSize: 13.5, fontWeight: 700, color: T }}>{tm.pts}</span>

            {/* PJ */}
            <Cell val={tm.played} />
            {/* VIT */}
            <Cell val={tm.wins} />
            {/* E */}
            <Cell val={tm.draws} />
            {/* DER */}
            <Cell val={tm.losses} />
            {/* GM */}
            <Cell val={tm.gf} />
            {/* GC */}
            <Cell val={tm.ga} />
            {/* SG */}
            <span style={{ textAlign: 'center', fontSize: 12.5, fontWeight: tm.gd !== 0 ? 600 : 400, color: gdColor, display: 'block' }}>
              {tm.gd > 0 ? `+${tm.gd}` : tm.gd}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────

interface Props {
  fixtures: TsdbEvent[];
  savedTeams: Set<string>;
  onToggleTeam: (name: string) => void;
}

export default function CopaGroupsDisplay({ fixtures, savedTeams, onToggleTeam }: Props) {
  const groupStats = buildStandings(fixtures);

  const groups = GROUP_ORDER
    .filter(g => groupStats.has(g))
    .map(g => {
      const teams = [...groupStats.get(g)!.values()];
      // Sort: pts ↓ → gd ↓ → gf ↓ → name pt-BR
      teams.sort((a, b) =>
        b.pts - a.pts || b.gd - a.gd || b.gf - a.gf ||
        teamPt(a.name).localeCompare(teamPt(b.name), 'pt-BR')
      );
      return { group: g, teams };
    });

  if (groups.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: T2 }}>
        <p style={{ fontSize: 14 }}>Aguardando dados da Copa.</p>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 10.5, color: T3, marginBottom: 16, lineHeight: 1.6 }}>
        <span style={{ color: AC }}>■</span>{' '}
        <span>Top 2 de cada grupo se classificam &nbsp;·&nbsp; ⭐ Favorite uma seleção para acompanhar</span>
      </p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
        gap: 14,
      }}>
        {groups.map(({ group, teams }) => (
          <GroupCard
            key={group}
            group={group}
            teams={teams}
            savedTeams={savedTeams}
            onToggleTeam={onToggleTeam}
          />
        ))}
      </div>
    </div>
  );
}
