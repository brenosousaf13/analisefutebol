import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TsdbEvent } from '../../types/thesportsdb';
import { teamPt } from '../../utils/teamNames';

const S   = '#0c1016';
const S2  = '#111820';
const BDR = 'rgba(255,255,255,0.06)';
const BDR2= 'rgba(255,255,255,0.11)';
const AC  = '#00e676';
const GD  = '#f59e0b';
const T   = '#dde5ef';
const T2  = '#566b82';
const T3  = '#243040';
const BC  = "'Barlow Condensed', sans-serif";

const GROUP_ORDER = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P'];

interface TeamInfo {
  idTeam: string;
  name: string;
  badge: string | null;
  groups: string[];
}

function TeamBadge({ src, name, size = 52 }: { src: string | null; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
      background: S2, border: `1.5px solid ${BDR2}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {src && !err
        ? <img src={src} alt={name} onError={() => setErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontSize: size * 0.32, color: T3, fontWeight: 700 }}>{name.slice(0,2).toUpperCase()}</span>
      }
    </div>
  );
}

interface Props {
  fixtures: TsdbEvent[];
  savedTeams?: Set<string>;
  onToggleTeam?: (name: string) => void;
}

export default function CopaSelecoes({ fixtures, savedTeams, onToggleTeam }: Props) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [grpFilter, setGrpFilter] = useState('TODOS');
  const [foc, setFoc] = useState(false);

  const teams = useMemo<TeamInfo[]>(() => {
    const map = new Map<string, TeamInfo>();
    fixtures.forEach(f => {
      if (!map.has(f.strHomeTeam)) {
        map.set(f.strHomeTeam, { idTeam: f.idHomeTeam, name: f.strHomeTeam, badge: f.strHomeTeamBadge, groups: [] });
      }
      if (f.strGroup && !map.get(f.strHomeTeam)!.groups.includes(f.strGroup)) {
        map.get(f.strHomeTeam)!.groups.push(f.strGroup);
      }
      if (!map.has(f.strAwayTeam)) {
        map.set(f.strAwayTeam, { idTeam: f.idAwayTeam, name: f.strAwayTeam, badge: f.strAwayTeamBadge, groups: [] });
      }
      if (f.strGroup && !map.get(f.strAwayTeam)!.groups.includes(f.strGroup)) {
        map.get(f.strAwayTeam)!.groups.push(f.strGroup);
      }
    });
    return [...map.values()].sort((a, b) => {
      const ga = a.groups[0] ?? 'Z';
      const gb = b.groups[0] ?? 'Z';
      return ga !== gb
        ? GROUP_ORDER.indexOf(ga) - GROUP_ORDER.indexOf(gb)
        : teamPt(a.name).localeCompare(teamPt(b.name));
    });
  }, [fixtures]);

  const filtered = useMemo(() => {
    let result = teams;
    if (grpFilter !== 'TODOS') result = result.filter(t => t.groups.includes(grpFilter));
    if (q) {
      const ql = q.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(ql) || teamPt(t.name).toLowerCase().includes(ql)
      );
    }
    return result;
  }, [teams, q, grpFilter]);

  const groups = useMemo(() => GROUP_ORDER.filter(g => teams.some(t => t.groups.includes(g))), [teams]);

  if (fixtures.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: T2 }}>
        <p style={{ fontSize: 14 }}>Seleções disponíveis após o início da Copa.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Search + group chips */}
      <div style={{ paddingTop: 4, marginBottom: 16 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: S, borderRadius: 8, padding: '9px 13px', marginBottom: 10,
          border: `1px solid ${foc ? 'rgba(0,230,118,0.5)' : BDR}`, transition: 'border-color .15s',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T3} strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            onFocus={() => setFoc(true)}
            onBlur={() => setFoc(false)}
            placeholder="Buscar seleção..."
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13.5, color: T }}
          />
          {q && (
            <button onClick={() => setQ('')} style={{ color: T3, lineHeight: 0, border: 'none', background: 'none', cursor: 'pointer' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 3, scrollbarWidth: 'none' }}>
          {['TODOS', ...groups].map(g => {
            const on = grpFilter === g;
            return (
              <button key={g} onClick={() => setGrpFilter(g)} style={{
                padding: '4px 11px', borderRadius: 5, flexShrink: 0, fontSize: 11,
                fontWeight: 700, letterSpacing: '.04em',
                background: on ? AC : S, color: on ? '#000' : T2,
                border: `1px solid ${on ? AC : BDR}`, transition: 'all .12s', cursor: 'pointer',
              }}>
                {g === 'TODOS' ? 'TODOS' : `GRUPO ${g}`}
              </button>
            );
          })}
        </div>
      </div>

      <p style={{ fontSize: 11, color: T3, marginBottom: 16 }}>
        {filtered.length} seleções · Clique para ver elenco, uniformes e jogos
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 8,
      }}>
        {filtered.map(team => {
          const isBra = team.name === 'Brazil';
          const isStarred = savedTeams?.has(team.name) ?? false;
          const group = team.groups[0];
          return (
            <div
              key={team.idTeam}
              onClick={() => navigate(`/copa/selecao/${team.idTeam}?group=${group ?? ''}&name=${encodeURIComponent(team.name)}`)}
              style={{
                background: S,
                border: `1px solid ${isBra ? 'rgba(245,158,11,0.25)' : isStarred ? 'rgba(245,158,11,0.15)' : BDR}`,
                borderLeft: isBra ? `3px solid ${GD}` : isStarred ? `3px solid ${GD}40` : undefined,
                borderRadius: 6, padding: '12px 14px',
                display: 'flex', alignItems: 'center', gap: 12,
                cursor: 'pointer', transition: 'background .12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = S2)}
              onMouseLeave={e => (e.currentTarget.style.background = S)}
            >
              <TeamBadge src={team.badge} name={team.name} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: BC, fontSize: 15, fontWeight: 800,
                  color: isBra ? GD : T,
                  textTransform: 'uppercase', letterSpacing: '.02em',
                  lineHeight: 1.2,
                }}>
                  {teamPt(team.name)}
                </div>
                {group && (
                  <div style={{ fontSize: 10, fontWeight: 700, color: T3, letterSpacing: '.05em', marginTop: 3 }}>
                    GRUPO {group}
                  </div>
                )}
              </div>
              {onToggleTeam && (
                <button
                  onClick={e => { e.stopPropagation(); onToggleTeam(team.name); }}
                  title={isStarred ? 'Remover favorito' : 'Favoritar'}
                  style={{
                    width: 22, height: 22, border: 'none', background: 'transparent',
                    cursor: 'pointer', color: isStarred ? GD : T3, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill={isStarred ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </button>
              )}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T3} strokeWidth="2" style={{ flexShrink: 0 }}>
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </div>
          );
        })}
      </div>
    </div>
  );
}
