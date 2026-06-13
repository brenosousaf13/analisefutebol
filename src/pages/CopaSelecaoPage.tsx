import { useState, useEffect, useMemo } from 'react';

function useBreakpoint() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return { lg: w >= 960 };
}
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { theSportsDbService } from '../services/theSportsDbService';
import type { TsdbTeam, TsdbPlayer, TsdbEquipment, TsdbEvent } from '../types/thesportsdb';
import { teamPt } from '../utils/teamNames';
import Header from '../components/Header';

const BG  = '#07090c';
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

function hexToRgba(hex: string | null, alpha: number): string {
  if (!hex) return `rgba(0,0,0,${alpha})`;
  const h = hex.replace('#', '');
  if (h.length !== 6) return `rgba(0,0,0,${alpha})`;
  return `rgba(${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)},${alpha})`;
}

function colorForDarkBg(hex: string | null, fallback: string): string {
  if (!hex) return fallback;
  const h = hex.replace('#', '');
  if (h.length !== 6) return fallback;
  const r = parseInt(h.slice(0,2), 16);
  const g = parseInt(h.slice(2,4), 16);
  const b = parseInt(h.slice(4,6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum < 0.15 ? fallback : hex;
}

type SubTab = 'elenco' | 'uniformes' | 'jogos';

const POS_ORDER: Record<string, number> = { GK: 0, DEF: 1, MID: 2, FWD: 3, OTHER: 4 };
const POS_LABEL: Record<string, string> = {
  GK: 'Goleiros', DEF: 'Defensores', MID: 'Meio-campistas', FWD: 'Atacantes', OTHER: 'Outros'
};
const POS_COLOR: Record<string, string> = {
  GK: '#f59e0b', DEF: '#3b82f6', MID: '#8b5cf6', FWD: '#ef4444', OTHER: T3
};

function positionPt(pos: string | null): string {
  if (!pos) return '';
  const p = pos.toLowerCase().trim();
  if (p === 'goalkeeper' || p === 'gk') return 'Goleiro';
  if (p === 'centre-back' || p === 'center back' || p === 'cb' || p === 'central defender') return 'Zagueiro';
  if (p === 'right back' || p === 'rb' || p === 'right-back') return 'Lateral Direito';
  if (p === 'left back' || p === 'lb' || p === 'left-back') return 'Lateral Esquerdo';
  if (p === 'right wing back' || p === 'rwb') return 'Ala Direito';
  if (p === 'left wing back' || p === 'lwb') return 'Ala Esquerdo';
  if (p.includes('defensive midfield') || p === 'dm' || p === 'defensive midfielder') return 'Volante';
  if (p === 'central midfield' || p === 'cm' || p.includes('centre midfield') || p === 'central midfielder') return 'Meia Central';
  if (p.includes('attacking midfield') || p === 'am' || p === 'attacking midfielder') return 'Meia Atacante';
  if (p.includes('midfielder') || p.includes('midfield')) return 'Meia';
  if (p === 'right winger' || p === 'rw' || p === 'right wing') return 'Ponta Direita';
  if (p === 'left winger' || p === 'lw' || p === 'left wing') return 'Ponta Esquerda';
  if (p === 'centre-forward' || p === 'center-forward' || p === 'cf' || p === 'center forward') return 'Centroavante';
  if (p === 'striker' || p === 'st') return 'Centroavante';
  if (p.includes('forward') || p.includes('winger')) return 'Atacante';
  if (p.includes('defender') || p.includes('back')) return 'Defensor';
  return pos;
}

function posGroup(pos: string | null): string {
  if (!pos) return 'OTHER';
  const p = pos.toUpperCase();
  if (p.includes('GOAL') || p === 'GK' || p === 'GOALKEEPER') return 'GK';
  if (p.includes('DEFEND') || p.includes('BACK') || ['CB','RB','LB','RWB','LWB'].includes(p)) return 'DEF';
  if (p.includes('FORWARD') || p.includes('STRIKER') || p.includes('WINGER') || ['CF','ST','RW','LW'].includes(p)) return 'FWD';
  if (p.includes('MID') || p.includes('MIDFIELD') || ['DM','CM','AM'].includes(p)) return 'MID';
  return 'OTHER';
}

function kitTypePt(type: string | null): string {
  if (!type) return 'Kit';
  const t = type.toLowerCase();
  if (t.includes('home') || t.includes('principal')) return 'Titular';
  if (t.includes('away') || t.includes('alternativo') || t.includes('second')) return 'Alternativo';
  if (t.includes('goal')) return 'Goleiro';
  if (t.includes('third')) return 'Terceiro';
  return type;
}

function calcAge(dateBorn: string | null): string {
  if (!dateBorn || dateBorn === '0000-00-00') return '';
  try {
    const born = new Date(dateBorn);
    const now = new Date();
    let age = now.getFullYear() - born.getFullYear();
    if (now.getMonth() < born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())) age--;
    return `${age} anos`;
  } catch {
    return '';
  }
}

function TeamBadge({ src, name, size = 80, borderColor }: { src: string | null; name: string; size?: number; borderColor?: string }) {
  const [err, setErr] = useState(false);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', overflow: 'hidden',
      background: S2, border: `2px solid ${borderColor ?? BDR2}`, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {src && !err
        ? <img src={src} alt={name} onError={() => setErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontSize: size * 0.3, color: T3, fontWeight: 700 }}>{name.slice(0,2).toUpperCase()}</span>
      }
    </div>
  );
}

function PlayerPhoto({ src, name, size = 120 }: { src: string | null; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  return (
    <div style={{
      width: size, height: size, borderRadius: 10, overflow: 'hidden', flexShrink: 0,
      background: S2, border: `1px solid ${BDR}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {src && !err
        ? <img src={src} alt={name} onError={() => setErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <svg width={size * 0.45} height={size * 0.45} viewBox="0 0 24 24" fill="none" stroke={T3} strokeWidth="1.5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
      }
    </div>
  );
}

function GameRow({ event, isBra, accentColor }: { event: TsdbEvent; isBra: boolean; accentColor: string }) {
  const [errH, setErrH] = useState(false);
  const [errA, setErrA] = useState(false);
  const hasScore = ['FT','AET','PEN','1H','HT','2H','ET','P'].includes(event.strStatus);
  const matchDate = new Date(`${event.dateEvent}T${event.strTime ?? '00:00:00'}Z`);
  const timeStr = matchDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  const dateStr = matchDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' });
  const col = accentColor;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px',
      borderBottom: `1px solid ${BDR}`,
      borderLeft: isBra ? `2px solid ${GD}` : '2px solid transparent',
      background: isBra ? 'rgba(245,158,11,0.04)' : 'transparent',
    }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', background: S2, border: `1px solid ${BDR}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {event.strHomeTeamBadge && !errH
          ? <img src={event.strHomeTeamBadge} alt={event.strHomeTeam} onError={() => setErrH(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 7, color: T3 }}>{event.strHomeTeam.slice(0,2)}</span>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: T }}>{teamPt(event.strHomeTeam)}</span>
        <span style={{ fontSize: 11, color: T3, margin: '0 6px' }}>vs</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: T }}>{teamPt(event.strAwayTeam)}</span>
      </div>
      <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', background: S2, border: `1px solid ${BDR}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {event.strAwayTeamBadge && !errA
          ? <img src={event.strAwayTeamBadge} alt={event.strAwayTeam} onError={() => setErrA(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 7, color: T3 }}>{event.strAwayTeam.slice(0,2)}</span>
        }
      </div>
      <div style={{ textAlign: 'right', minWidth: 48, flexShrink: 0 }}>
        {hasScore ? (
          <span style={{ fontFamily: BC, fontSize: 16, fontWeight: 900, color: T }}>
            {event.intHomeScore ?? 0}–{event.intAwayScore ?? 0}
          </span>
        ) : (
          <>
            <div style={{ fontFamily: BC, fontSize: 14, fontWeight: 900, color: col, lineHeight: 1 }}>{timeStr}</div>
            <div style={{ fontSize: 9, color: T3 }}>{dateStr}</div>
          </>
        )}
      </div>
    </div>
  );
}

export default function CopaSelecaoPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { lg } = useBreakpoint();

  const initName = searchParams.get('name') ?? '';
  const initGroup = searchParams.get('group') ?? '';

  const [team, setTeam] = useState<TsdbTeam | null>(null);
  const [squad, setSquad] = useState<TsdbPlayer[]>([]);
  const [equipment, setEquipment] = useState<TsdbEquipment[]>([]);
  const [nextEvents, setNextEvents] = useState<TsdbEvent[]>([]);
  const [lastEvents, setLastEvents] = useState<TsdbEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<SubTab>('elenco');

  const displayName = team ? teamPt(team.strTeam) : teamPt(initName);

  // Team colors from API (strColour1/strColour2 from lookupteam)
  const teamColor = colorForDarkBg(team?.strColour1 ?? null, AC);

  useEffect(() => {
    if (!teamId) return;
    setLoading(true);
    Promise.all([
      theSportsDbService.getTeam(teamId),
      theSportsDbService.getTeamSquad(teamId),
      theSportsDbService.getTeamEquipment(teamId),
      theSportsDbService.getTeamNextEvents(teamId),
      theSportsDbService.getTeamLastEvents(teamId),
    ]).then(([t, s, eq, next, last]) => {
      setTeam(t);
      setSquad(s);
      setEquipment(eq);
      setNextEvents(next.slice(0, 5));
      setLastEvents(last.slice(0, 5));
    }).finally(() => setLoading(false));
  }, [teamId]);

  // Group squad by position
  const groupedSquad = useMemo(() => {
    const groups: Record<string, TsdbPlayer[]> = {};
    squad.forEach(p => {
      const g = posGroup(p.strPosition);
      if (!groups[g]) groups[g] = [];
      groups[g].push(p);
    });
    return Object.entries(groups).sort(([a], [b]) => (POS_ORDER[a] ?? 99) - (POS_ORDER[b] ?? 99));
  }, [squad]);

  // Filter equipment — show most recent season first
  const sortedEquipment = useMemo(() =>
    [...equipment].sort((a, b) => (b.strSeason ?? '').localeCompare(a.strSeason ?? '')),
    [equipment]
  );

  const SUB_TABS: { id: SubTab; label: string }[] = [
    { id: 'elenco', label: 'Elenco' },
    { id: 'uniformes', label: 'Uniformes' },
    { id: 'jogos', label: 'Jogos' },
  ];

  return (
    <div style={{ background: BG, color: T, minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14, WebkitFontSmoothing: 'antialiased', paddingTop: lg ? 64 : 40 } as React.CSSProperties}>
      <Header />

      {/* Sub-header */}
      <header style={{
        position: 'sticky', top: lg ? 64 : 40, zIndex: 20, height: 52,
        background: 'rgba(7,9,12,0.95)', backdropFilter: 'blur(14px)',
        borderBottom: `1px solid ${BDR}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: lg ? '0 24px' : '0 12px',
      }}>
        <button onClick={() => navigate('/copa')} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          border: 'none', background: 'none', cursor: 'pointer', color: T2, fontSize: 13,
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Copa 2026
        </button>
        <span style={{ fontFamily: BC, fontSize: 13, fontWeight: 700, color: T3, letterSpacing: '.04em', textTransform: 'uppercase' }}>
          Seleções
        </span>
      </header>

      {/* Hero */}
      <div style={{
        padding: lg ? '32px 24px 24px' : '16px 12px 14px',
        borderBottom: `1px solid ${BDR}`,
        background: `linear-gradient(180deg, ${hexToRgba(team?.strColour1 ?? null, 0.09)} 0%, transparent 100%)`,
        borderLeft: `4px solid ${hexToRgba(team?.strColour1 ?? null, 0.4)}`,
        display: 'flex', alignItems: 'center', gap: lg ? 20 : 14, flexWrap: 'wrap',
      }}>
        <TeamBadge src={team?.strBadge ?? null} name={initName} size={lg ? 80 : 60}
          borderColor={team ? hexToRgba(team.strColour1, 0.6) : BDR2} />
        <div style={{ flex: 1 }}>
          <h1 style={{
            fontFamily: BC, fontSize: 'clamp(28px,5vw,52px)', fontWeight: 900,
            color: teamColor, lineHeight: 0.92, letterSpacing: '-.01em', marginBottom: 8,
            textTransform: 'uppercase',
          }}>
            {loading && !initName ? '...' : displayName}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {initGroup && (
              <span style={{
                fontFamily: BC, fontSize: 12, fontWeight: 800, textTransform: 'uppercase',
                letterSpacing: '.06em', padding: '3px 10px', borderRadius: 5,
                background: hexToRgba(team?.strColour1 ?? null, 0.15),
                color: teamColor,
                border: `1px solid ${hexToRgba(team?.strColour1 ?? null, 0.3)}`,
              }}>
                Grupo {initGroup}
              </span>
            )}
            {team?.strCountry && (
              <span style={{ fontSize: 12, color: T2 }}>{team.strCountry}</span>
            )}
            {team?.strColour2 && colorForDarkBg(team.strColour2, '') && (
              <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <span style={{ width: 12, height: 12, borderRadius: 2, background: colorForDarkBg(team.strColour1, teamColor), border: `1px solid ${BDR}` }} />
                <span style={{ width: 12, height: 12, borderRadius: 2, background: colorForDarkBg(team.strColour2, T3), border: `1px solid ${BDR}` }} />
              </span>
            )}
          </div>
          {team?.strDescriptionEN && (
            <p style={{ fontSize: 12, color: T2, lineHeight: 1.6, marginTop: 10, maxWidth: 560 }}>
              {team.strDescriptionEN.slice(0, 200)}{team.strDescriptionEN.length > 200 ? '...' : ''}
            </p>
          )}
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{
        position: 'sticky', top: lg ? 116 : 92, zIndex: 15,
        background: 'rgba(7,9,12,0.97)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${BDR}`,
        display: 'flex', padding: lg ? '0 24px' : '0 8px',
        overflowX: 'auto', scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
      } as React.CSSProperties}>
        {SUB_TABS.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} style={{
            padding: lg ? '13px 16px' : '12px 14px', fontSize: lg ? 14 : 13, fontWeight: 600,
            flexShrink: 0, whiteSpace: 'nowrap',
            color: subTab === t.id ? teamColor : T2,
            borderBottom: `2px solid ${subTab === t.id ? teamColor : 'transparent'}`,
            marginBottom: -1, transition: 'color .12s, border-color .12s',
            border: 'none', background: 'none', cursor: 'pointer',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: lg ? '24px' : '16px 12px', paddingBottom: 64 }}>

        {/* ── Elenco ── */}
        {subTab === 'elenco' && (
          loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3].map(i => <div key={i} style={{ height: 120, background: S, borderRadius: 6, opacity: 0.5 }} />)}
            </div>
          ) : squad.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: T2 }}>
              <p style={{ fontSize: 14 }}>Elenco não disponível no momento.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {groupedSquad.map(([group, players]) => (
                <div key={group}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <span style={{
                      fontFamily: BC, fontSize: 11, fontWeight: 900, textTransform: 'uppercase',
                      letterSpacing: '.08em', padding: '3px 8px', borderRadius: 4,
                      background: `${POS_COLOR[group] ?? T3}18`,
                      color: POS_COLOR[group] ?? T3,
                      border: `1px solid ${POS_COLOR[group] ?? T3}33`,
                    }}>
                      {POS_LABEL[group] ?? group}
                    </span>
                    <span style={{ fontSize: 11, color: T3 }}>{players.length} jogadores</span>
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
                    gap: 10,
                  }}>
                    {players.map(p => (
                      <button
                        key={p.idPlayer}
                        onClick={() => navigate(`/copa/jogador/${p.idPlayer}`)}
                        style={{
                          background: S, borderRadius: 10, padding: '16px 12px',
                          border: `1px solid ${BDR}`,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                          borderTop: `3px solid ${POS_COLOR[group] ?? T3}`,
                          cursor: 'pointer', textAlign: 'center', width: '100%',
                          transition: 'background .1s, border-color .1s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = S2; }}
                        onMouseLeave={e => { e.currentTarget.style.background = S; }}
                      >
                        <PlayerPhoto src={p.strCutout ?? p.strThumb} name={p.strPlayer} size={120} />
                        <div style={{ width: '100%' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: T, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>
                            {p.strPlayer}
                          </div>
                          {p.strPosition && (
                            <div style={{ fontSize: 11, color: POS_COLOR[group] ?? T3, fontWeight: 600, marginBottom: 3 }}>
                              {positionPt(p.strPosition)}
                            </div>
                          )}
                          <div style={{ fontSize: 10.5, color: T3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {[p.strTeam, calcAge(p.dateBorn)].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── Uniformes ── */}
        {subTab === 'uniformes' && (
          loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
              {[1,2,3,4].map(i => <div key={i} style={{ height: 200, background: S, borderRadius: 6, opacity: 0.5 }} />)}
            </div>
          ) : sortedEquipment.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: T2 }}>
              <p style={{ fontSize: 14 }}>Uniformes não disponíveis no momento.</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 10,
            }}>
              {sortedEquipment.map(eq => {
                const img = eq.strThumb ?? eq.strEquipment;
                return (
                  <div key={eq.idEquipment} style={{
                    background: S, borderRadius: 6, overflow: 'hidden',
                    border: `1px solid ${BDR}`,
                  }}>
                    <div style={{
                      height: 180, background: S2,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12,
                    }}>
                      {img ? (
                        <img src={img} alt={eq.strType ?? 'Kit'} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      ) : (
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={T3} strokeWidth="1.5">
                          <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/>
                        </svg>
                      )}
                    </div>
                    <div style={{ padding: '8px 10px' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: T }}>{kitTypePt(eq.strType)}</div>
                      {eq.strSeason && <div style={{ fontSize: 10, color: T3, marginTop: 2 }}>{eq.strSeason}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ── Jogos ── */}
        {subTab === 'jogos' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))', gap: 24 }}>
            {/* Próximos jogos */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontFamily: BC, fontSize: 11.5, fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase', color: teamColor }}>
                  📅 Próximos Jogos
                </span>
                <div style={{ flex: 1, height: 1, background: BDR }} />
              </div>
              <div style={{ background: S, borderRadius: 6, overflow: 'hidden', border: `1px solid ${BDR}` }}>
                {loading ? (
                  <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T2 }}>Carregando...</div>
                ) : nextEvents.length === 0 ? (
                  <p style={{ padding: '16px 14px', fontSize: 12, color: T3 }}>Nenhum jogo agendado.</p>
                ) : (
                  nextEvents.map(ev => (
                    <GameRow key={ev.idEvent} event={ev} isBra={ev.strHomeTeam === 'Brazil' || ev.strAwayTeam === 'Brazil'} accentColor={teamColor} />
                  ))
                )}
              </div>
            </div>

            {/* Últimos jogos */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontFamily: BC, fontSize: 11.5, fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase', color: T2 }}>
                  🏁 Últimos Jogos
                </span>
                <div style={{ flex: 1, height: 1, background: BDR }} />
              </div>
              <div style={{ background: S, borderRadius: 6, overflow: 'hidden', border: `1px solid ${BDR}` }}>
                {loading ? (
                  <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T2 }}>Carregando...</div>
                ) : lastEvents.length === 0 ? (
                  <p style={{ padding: '16px 14px', fontSize: 12, color: T3 }}>Nenhum resultado encontrado.</p>
                ) : (
                  lastEvents.map(ev => (
                    <GameRow key={ev.idEvent} event={ev} isBra={ev.strHomeTeam === 'Brazil' || ev.strAwayTeam === 'Brazil'} accentColor={teamColor} />
                  ))
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Footer */}
      <div style={{ padding: lg ? '14px 24px' : '14px 12px', borderTop: `1px solid ${BDR}`, fontSize: 11, color: T3 }}>
        Dados via TheSportsDB · Copa do Mundo 2026
      </div>
    </div>
  );
}
