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

const GROUP_ORDER = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P'];
const FINISHED    = new Set(['FT','AET','PEN']);

function normalizeGroup(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (/^[A-Pa-p]$/.test(s)) return s.toUpperCase();
  const m = s.match(/\b([A-Pa-p])\b/i);
  if (m) return m[1].toUpperCase();
  const n = parseInt(s, 10);
  if (!isNaN(n) && n >= 1 && n <= 16) return String.fromCharCode(64 + n);
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

// Calculate group standings entirely from fixture results
function buildStandings(fixtures: TsdbEvent[]): Map<string, Map<string, TeamStat>> {
  // group → teamName → stat
  const groups = new Map<string, Map<string, TeamStat>>();
  const badges  = new Map<string, string>();

  // Pass 1: register all teams per group (even teams with 0 played)
  fixtures.forEach(f => {
    const g = normalizeGroup(f.strGroup);
    if (!g) return;
    if (f.strHomeTeamBadge) badges.set(f.strHomeTeam, f.strHomeTeamBadge);
    if (f.strAwayTeamBadge) badges.set(f.strAwayTeam, f.strAwayTeamBadge);
    if (!groups.has(g)) groups.set(g, new Map());
    const gMap = groups.get(g)!;
    if (!gMap.has(f.strHomeTeam)) gMap.set(f.strHomeTeam, zeroed(f.strHomeTeam));
    if (!gMap.has(f.strAwayTeam)) gMap.set(f.strAwayTeam, zeroed(f.strAwayTeam));
  });

  // Pass 2: compute stats from completed matches
  fixtures.forEach(f => {
    const g = normalizeGroup(f.strGroup);
    if (!g || !FINISHED.has(f.strStatus)) return;

    const hs = parseInt(f.intHomeScore ?? '', 10);
    const as_ = parseInt(f.intAwayScore ?? '', 10);
    if (isNaN(hs) || isNaN(as_)) return;

    const gMap = groups.get(g)!;
    const home = gMap.get(f.strHomeTeam)!;
    const away = gMap.get(f.strAwayTeam)!;

    home.played++; away.played++;
    home.gf += hs; home.ga += as_;
    away.gf += as_; away.ga += hs;
    home.gd = home.gf - home.ga;
    away.gd = away.gf - away.ga;

    if (hs > as_) {
      home.wins++; home.pts += 3; away.losses++;
    } else if (hs < as_) {
      away.wins++; away.pts += 3; home.losses++;
    } else {
      home.draws++; home.pts++;
      away.draws++; away.pts++;
    }
  });

  // Attach badges
  groups.forEach(gMap => {
    gMap.forEach((stat, name) => { stat.badge = badges.get(name) ?? null; });
  });

  return groups;
}

function zeroed(name: string): TeamStat {
  return { name, badge: null, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
}

interface Props {
  fixtures: TsdbEvent[];
  savedTeams: Set<string>;
  onToggleTeam: (name: string) => void;
}

function TeamBadge({ src, name, size = 22 }: { src: string | null; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
      background: S2, border: `1px solid ${BDR2}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {src && !err
        ? <img src={src} alt={name} onError={() => setErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontSize: size * 0.35, color: T3, fontWeight: 700 }}>{name.slice(0,2).toUpperCase()}</span>
      }
    </div>
  );
}

function StarBtn({ on, onClick }: { on: boolean; onClick: (e: React.MouseEvent) => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={on ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      style={{
        width: 24, height: 24, border: 'none', background: 'transparent', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: on || hov ? GD : T3, transition: 'color .12s', flexShrink: 0,
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    </button>
  );
}

function GroupCard({ group, teams, savedTeams, onToggleTeam }: {
  group: string;
  teams: TeamStat[];
  savedTeams: Set<string>;
  onToggleTeam: (name: string) => void;
}) {
  const isBrazilGroup = teams.some(t => t.name === 'Brazil');

  return (
    <div style={{
      background: S, borderRadius: 6, overflow: 'hidden',
      border: `1px solid ${isBrazilGroup ? 'rgba(245,158,11,0.2)' : BDR}`,
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px', borderBottom: `1px solid ${BDR}`,
        display: 'flex', alignItems: 'center', gap: 7,
      }}>
        {isBrazilGroup && <div style={{ width: 5, height: 5, borderRadius: '50%', background: GD, flexShrink: 0 }} />}
        <span style={{
          fontFamily: BC, fontSize: 12.5, fontWeight: 900,
          textTransform: 'uppercase', letterSpacing: '.05em',
          color: isBrazilGroup ? GD : T,
        }}>
          Grupo {group}
        </span>
      </div>

      {/* Column headers */}
      <div style={{
        display: 'grid', gridTemplateColumns: '24px 1fr 26px 22px 22px 22px 26px 26px 32px',
        padding: '5px 10px 5px 6px',
        fontSize: 9, fontWeight: 700, color: T3, textTransform: 'uppercase', letterSpacing: '.05em',
      }}>
        <span />
        <span style={{ paddingLeft: 28 }}>Seleção</span>
        <span style={{ textAlign: 'center' }}>J</span>
        <span style={{ textAlign: 'center' }}>V</span>
        <span style={{ textAlign: 'center' }}>E</span>
        <span style={{ textAlign: 'center' }}>D</span>
        <span style={{ textAlign: 'center' }}>GP</span>
        <span style={{ textAlign: 'center' }}>SG</span>
        <span style={{ textAlign: 'center' }}>PTS</span>
      </div>

      {/* Team rows */}
      {teams.map((tm, i) => {
        const isBra = tm.name === 'Brazil';
        const starred = savedTeams.has(tm.name);
        const qualify = i < 2; // top 2 qualify
        return (
          <div key={tm.name} style={{
            display: 'grid', gridTemplateColumns: '24px 1fr 26px 22px 22px 22px 26px 26px 32px',
            padding: '7px 10px 7px 6px', alignItems: 'center',
            borderTop: `1px solid ${BDR}`,
            background: isBra ? 'rgba(245,158,11,0.05)' : qualify ? 'rgba(0,230,118,0.03)' : 'transparent',
            borderLeft: starred ? `2px solid ${GD}` : qualify ? `2px solid rgba(0,230,118,0.35)` : '2px solid transparent',
          }}>
            <StarBtn on={starred} onClick={e => { e.stopPropagation(); onToggleTeam(tm.name); }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: qualify ? AC : T3, width: 10, textAlign: 'center' }}>{i + 1}</span>
              <TeamBadge src={tm.badge} name={tm.name} />
              <span style={{
                fontSize: 12.5, fontWeight: isBra ? 600 : 400,
                color: isBra ? GD : T, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {teamPt(tm.name)}
              </span>
            </div>
            <span style={{ textAlign: 'center', fontSize: 12, color: T3 }}>{tm.played}</span>
            <span style={{ textAlign: 'center', fontSize: 12, color: T3 }}>{tm.wins}</span>
            <span style={{ textAlign: 'center', fontSize: 12, color: T3 }}>{tm.draws}</span>
            <span style={{ textAlign: 'center', fontSize: 12, color: T3 }}>{tm.losses}</span>
            <span style={{ textAlign: 'center', fontSize: 12, color: T3 }}>{tm.gf}</span>
            <span style={{
              textAlign: 'center', fontSize: 12,
              color: tm.gd > 0 ? AC : tm.gd < 0 ? '#ef4444' : T3,
            }}>
              {tm.gd > 0 ? `+${tm.gd}` : tm.gd}
            </span>
            <span style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: T }}>{tm.pts}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function CopaGroupsDisplay({ fixtures, savedTeams, onToggleTeam }: Props) {
  const groupStats = buildStandings(fixtures);

  const groups = GROUP_ORDER
    .filter(g => groupStats.has(g))
    .map(g => {
      const teams = [...groupStats.get(g)!.values()];
      // Sort: pts desc → gd desc → gf desc → name
      teams.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || teamPt(a.name).localeCompare(teamPt(b.name), 'pt-BR'));
      return { group: g, teams };
    });

  if (groups.length === 0) {
    const allTeams = new Map<string, string | null>();
    fixtures.forEach(f => {
      if (f.strHomeTeam) allTeams.set(f.strHomeTeam, f.strHomeTeamBadge ?? null);
      if (f.strAwayTeam) allTeams.set(f.strAwayTeam, f.strAwayTeamBadge ?? null);
    });
    if (allTeams.size === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '60px 0', color: T2 }}>
          <p style={{ fontSize: 14 }}>Grupos disponíveis após o início da Copa.</p>
        </div>
      );
    }
    const sorted = [...allTeams.entries()].sort(([a], [b]) => teamPt(a).localeCompare(teamPt(b), 'pt-BR'));
    return (
      <div>
        <p style={{ fontSize: 11, color: T3, marginBottom: 16, lineHeight: 1.5 }}>
          Divisão por grupos indisponível · {allTeams.size} seleções classificadas
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 7 }}>
          {sorted.map(([name, badge]) => {
            const starred = savedTeams.has(name);
            const isBra = name === 'Brazil';
            return (
              <div key={name} style={{
                background: S, borderRadius: 6, padding: '9px 12px',
                border: `1px solid ${isBra ? 'rgba(245,158,11,0.25)' : BDR}`,
                display: 'flex', alignItems: 'center', gap: 9,
                borderLeft: starred ? `2px solid ${GD}` : '2px solid transparent',
              }}>
                <TeamBadge src={badge} name={name} size={26} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: isBra ? 600 : 400, color: isBra ? GD : T }}>
                  {teamPt(name)}
                </span>
                <StarBtn on={starred} onClick={e => { e.stopPropagation(); onToggleTeam(name); }} />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 11, color: T3, marginBottom: 16, lineHeight: 1.5 }}>
        ⭐ Favorite uma seleção para acompanhar os jogos na coluna da direita. &nbsp;
        <span style={{ color: AC }}>■</span> <span style={{ color: T3 }}>= classificado</span>
      </p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
        gap: 12,
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
