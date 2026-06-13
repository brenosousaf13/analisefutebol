import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

function useBreakpoint() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return { lg: w >= 960 };
}
import { theSportsDbService } from '../../services/theSportsDbService';
import type { TsdbEvent, TsdbLineupPlayer, TsdbTimeline, TsdbEventStats, TsdbTv } from '../../types/thesportsdb';
import type { HighlightData } from '../../services/highlightsService';
import { teamPt } from '../../utils/teamNames';
import CopaLineupList from './CopaLineupList';
import CopaTimeline from './CopaTimeline';
import CopaMatchStats from './CopaMatchStats';

// ── Design tokens (v2) ────────────────────────────────────────
const S    = '#0c1016';
const S2   = '#111820';
const BDR  = 'rgba(255,255,255,0.06)';
const AC   = '#00e676';
const AC0  = 'rgba(0,230,118,0.08)';
const AC1  = 'rgba(0,230,118,0.16)';
const GD   = '#f59e0b';
const GD0  = 'rgba(245,158,11,0.08)';
const GD1  = 'rgba(245,158,11,0.18)';
const T    = '#dde5ef';
const T2   = '#566b82';
const T3   = '#4a6077';
const BC   = "'Barlow Condensed', sans-serif";

interface Props {
  fixture: TsdbEvent;
  onCreateAnalysis: (fixture: TsdbEvent) => void;
  isCreating: boolean;
  isSaved?: boolean;
  onToggleSave?: (id: string) => void;
  isNotif?: boolean;
  onToggleNotif?: (id: string) => void;
  youtubeHighlight?: HighlightData | null;
}

type Panel = 'lineup' | 'timeline' | 'stats' | 'highlight' | 'tv';

const STATUS_LABEL: Record<string, string> = {
  NS:   'Agendado',  TBD: 'A definir',
  '1H': '1º Tempo',  HT:  'Intervalo',
  '2H': '2º Tempo',  ET:  'Prorrogação',
  P:    'Pênaltis',  FT:  'Encerrado',
  AET:  'Após prorr.', PEN: 'Pênaltis',
  PST:  'Adiado',    CANC: 'Cancelado',
};

const FINISHED = new Set(['FT','AET','PEN']);
const LIVE     = new Set(['1H','HT','2H','ET','P']);

function extractYoutubeId(url: string): string | null {
  const m = url.match(/[?&]v=([^&#]+)/) || url.match(/youtu\.be\/([^?&#]+)/) || url.match(/embed\/([^?&#]+)/);
  return m ? m[1] : null;
}

function isBrazil(f: TsdbEvent) {
  return f.strHomeTeam === 'Brazil' || f.strAwayTeam === 'Brazil';
}

// ── Small icon buttons ────────────────────────────────────────
function SmallBtn({ active, bra, onClick, children }: {
  active: boolean; bra: boolean; onClick: () => void; children: React.ReactNode;
}) {
  const [hov, setHov] = useState(false);
  const col = bra ? GD : AC;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '3px 8px', borderRadius: 5, fontSize: 11, fontWeight: 600,
        border: `1px solid ${active || hov ? col : BDR}`,
        background: active || hov ? `${col}18` : 'transparent',
        color: active || hov ? col : T3,
        transition: 'all .12s', cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function IconBtn28({ active, col, onClick, title, children }: {
  active: boolean; col: string; onClick: (e: React.MouseEvent) => void; title: string; children: React.ReactNode;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button title={title} onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        width: 28, height: 28, borderRadius: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all .12s',
        background: active || hov ? `${col}1a` : 'transparent',
        color: active || hov ? col : T3,
        border: 'none', cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

// ── Flag circle ───────────────────────────────────────────────
function TeamBadge({ src, name, size = 42 }: { src: string | null; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', overflow: 'hidden',
      background: S2, border: `1.5px solid rgba(255,255,255,0.11)`,
      flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {src && !err
        ? <img src={src} alt={name} onError={() => setErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontSize: size * 0.3, color: T3, fontWeight: 700 }}>
            {name.slice(0, 2).toUpperCase()}
          </span>
      }
    </div>
  );
}

export default function CopaFixtureCard({ fixture, onCreateAnalysis, isCreating, isSaved, onToggleSave, isNotif, onToggleNotif, youtubeHighlight }: Props) {
  const { lg } = useBreakpoint();
  const [activePanel, setActivePanel] = useState<Panel | null>(null);
  const [lineup, setLineup] = useState<TsdbLineupPlayer[] | null>(null);
  const [timeline, setTimeline] = useState<TsdbTimeline[] | null>(null);
  const [matchStats, setMatchStats] = useState<TsdbEventStats | null | undefined>(undefined);
  const [tvListings, setTvListings] = useState<TsdbTv[] | null>(null);
  const [loadingPanel, setLoadingPanel] = useState<Panel | null>(null);
  const [localSaved, setLocalSaved] = useState(false);
  const [localNotif, setLocalNotif] = useState(false);
  const [hov, setHov] = useState(false);

  const saved = isSaved !== undefined ? isSaved : localSaved;
  const notif = isNotif !== undefined ? isNotif : localNotif;

  const handleToggleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleSave) onToggleSave(fixture.idEvent);
    else setLocalSaved(p => !p);
  };
  const handleToggleNotif = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleNotif) onToggleNotif(fixture.idEvent);
    else setLocalNotif(p => !p);
  };

  const bra     = isBrazil(fixture);
  const a       = bra ? GD : AC;
  const a0      = bra ? GD0 : AC0;
  const a1      = bra ? GD1 : AC1;
  const status  = fixture.strStatus;
  const isFinished = FINISHED.has(status);
  const isLive  = LIVE.has(status);
  const hasScore = isFinished || isLive;
  // CazéTV highlight takes precedence; fall back to strVideo from TheSportsDB
  const videoId = youtubeHighlight?.videoId
    ?? (fixture.strVideo ? extractYoutubeId(fixture.strVideo) : null);

  const matchDate = new Date(`${fixture.dateEvent}T${fixture.strTime ?? '00:00:00'}Z`);
  const timeStr = matchDate.toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo'
  });
  const dateShort = matchDate.toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo'
  });

  async function openPanel(panel: Panel) {
    if (activePanel === panel) { setActivePanel(null); return; }
    setActivePanel(panel);
    if (panel === 'lineup' && lineup === null) {
      setLoadingPanel('lineup');
      setLineup(await theSportsDbService.getLineup(fixture.idEvent));
      setLoadingPanel(null);
    }
    if (panel === 'timeline' && timeline === null) {
      setLoadingPanel('timeline');
      setTimeline(await theSportsDbService.getTimeline(fixture.idEvent, isLive));
      setLoadingPanel(null);
    }
    if (panel === 'stats' && matchStats === undefined) {
      setLoadingPanel('stats');
      setMatchStats(await theSportsDbService.getEventStats(fixture.idEvent, isLive));
      setLoadingPanel(null);
    }
    if (panel === 'tv' && tvListings === null) {
      setLoadingPanel('tv');
      setTvListings(await theSportsDbService.getTvListings(fixture.idEvent));
      setLoadingPanel(null);
    }
  }

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: bra
          ? `linear-gradient(to right, rgba(245,158,11,0.06) 0%, ${hov ? S2 : S} 55%)`
          : hov ? S2 : S,
        borderRadius: 6,
        border: `1px solid ${bra ? 'rgba(245,158,11,0.2)' : BDR}`,
        borderLeft: bra ? `3px solid ${GD}` : undefined,
        overflow: 'hidden',
        transition: 'background .12s',
      }}
    >
      {/* ── Meta row ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 13px', borderBottom: `1px solid ${BDR}`, gap: 8,
      }}>
        <span style={{
          fontSize: 10.5, fontWeight: 600, color: T3, letterSpacing: '.04em',
          display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, overflow: 'hidden',
        }}>
          {fixture.intRound && `R${fixture.intRound}`}
          {fixture.strGroup && ` · Grupo ${fixture.strGroup}`}
          {(fixture.strVenue || fixture.strCity) && <>
            <span style={{ width: 2, height: 2, borderRadius: '50%', background: T3, flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {fixture.strVenue ?? fixture.strCity}
            </span>
          </>}
        </span>
        <span style={{ fontSize: 10, fontWeight: 600, color: T3, whiteSpace: 'nowrap', letterSpacing: '.03em' }}>
          {isLive && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: AC, marginRight: 4, animation: 'pulse 1.5s infinite' }} />}
          {STATUS_LABEL[status] ?? status}
        </span>
      </div>

      {/* ── Teams row ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center', padding: '13px 16px', gap: 8,
      }}>
        {/* Home */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <TeamBadge src={fixture.strHomeTeamBadge} name={fixture.strHomeTeam} />
          <span style={{ fontSize: 12.5, fontWeight: 600, textAlign: 'center', lineHeight: 1.2, color: T }}>
            {teamPt(fixture.strHomeTeam)}
          </span>
        </div>

        {/* Score / Time */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 78 }}>
          {hasScore ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: BC, fontSize: 30, fontWeight: 900, color: isLive ? AC : T, letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {fixture.intHomeScore ?? 0}
                </span>
                <span style={{ color: T3, fontSize: 18, lineHeight: 1 }}>–</span>
                <span style={{ fontFamily: BC, fontSize: 30, fontWeight: 900, color: isLive ? AC : T, letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {fixture.intAwayScore ?? 0}
                </span>
              </div>
              {fixture.intHomeScorePenalty != null && (
                <span style={{ fontSize: 10, color: T2 }}>
                  ({fixture.intHomeScorePenalty} – {fixture.intAwayScorePenalty}) pên.
                </span>
              )}
              <span style={{ fontSize: 10.5, color: T2, textAlign: 'center', textTransform: 'capitalize' }}>{dateShort}</span>
            </>
          ) : (
            <>
              <span style={{ fontFamily: BC, fontSize: 26, fontWeight: 900, color: a, letterSpacing: '-0.02em', lineHeight: 1 }}>
                {timeStr}
              </span>
              <span style={{ fontSize: 10.5, color: T2, textAlign: 'center', textTransform: 'capitalize' }}>{dateShort}</span>
            </>
          )}
        </div>

        {/* Away */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <TeamBadge src={fixture.strAwayTeamBadge} name={fixture.strAwayTeam} />
          <span style={{ fontSize: 12.5, fontWeight: 600, textAlign: 'center', lineHeight: 1.2, color: T }}>
            {teamPt(fixture.strAwayTeam)}
          </span>
        </div>
      </div>

      {/* ── Actions row ── */}
      <div style={{
        display: 'flex', flexDirection: lg ? 'row' : 'column',
        alignItems: lg ? 'center' : 'stretch',
        justifyContent: lg ? 'space-between' : 'flex-start',
        padding: '8px 13px', borderTop: `1px solid ${BDR}`, gap: lg ? 8 : 6,
      }}>
        {/* Panel toggles — scrollable on mobile */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 2,
          overflowX: 'auto', scrollbarWidth: 'none', flexShrink: 0,
          WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}>
          <IconBtn28 active={notif} col={AC} title="Notificar" onClick={handleToggleNotif}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill={notif ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </IconBtn28>
          <IconBtn28 active={saved} col={GD} title="Favoritar" onClick={handleToggleSave}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </IconBtn28>

          <div style={{ width: 1, height: 14, background: BDR, margin: '0 4px', flexShrink: 0 }} />

          <SmallBtn active={activePanel === 'lineup'} bra={bra} onClick={() => openPanel('lineup')}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Escalação
          </SmallBtn>
          <SmallBtn active={activePanel === 'timeline'} bra={bra} onClick={() => openPanel('timeline')}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            Eventos
          </SmallBtn>
          <SmallBtn active={activePanel === 'stats'} bra={bra} onClick={() => openPanel('stats')}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            Stats
          </SmallBtn>
          {videoId && (
            <SmallBtn active={activePanel === 'highlight'} bra={bra} onClick={() => openPanel('highlight')}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
              Highlights
            </SmallBtn>
          )}
          <SmallBtn active={activePanel === 'tv'} bra={bra} onClick={() => openPanel('tv')}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/></svg>
            {lg ? 'Onde Assistir' : 'TV'}
          </SmallBtn>
        </div>

        {/* Criar análise — full width on mobile */}
        <button
          onClick={() => onCreateAnalysis(fixture)}
          disabled={isCreating}
          onMouseEnter={e => { if (!isCreating) (e.currentTarget as HTMLButtonElement).style.background = a1; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = a0; }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            padding: lg ? '5px 12px' : '8px 12px', borderRadius: 6,
            background: a0, color: a, fontSize: 11.5, fontWeight: 600,
            border: `1px solid ${a1}`, transition: 'background .12s',
            opacity: isCreating ? 0.6 : 1, cursor: isCreating ? 'not-allowed' : 'pointer',
            ...(lg ? {} : { width: '100%' }),
          }}
        >
          {isCreating
            ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />
            : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          }
          Criar análise
        </button>
      </div>

      {/* ── Expandable panel ── */}
      {activePanel && (
        <div style={{ borderTop: `1px solid ${BDR}`, padding: '12px 14px 14px' }}>
          {loadingPanel === activePanel ? (
            <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: T2, fontSize: 13 }}>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              Carregando...
            </div>
          ) : activePanel === 'highlight' ? (
            videoId ? (() => {
              const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
              const thumb = youtubeHighlight?.thumbnail ?? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
              return (
                <a href={ytUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textDecoration: 'none' }}>
                  <div style={{ position: 'relative', borderRadius: 6, overflow: 'hidden', aspectRatio: '16/9', background: '#000', cursor: 'pointer' }}>
                    <img src={thumb} alt="Melhores Momentos" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(0,0,0,0.3)' }}>
                      <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                      </div>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: '#fff', letterSpacing: '.04em', textTransform: 'uppercase' }}>
                        Assistir no YouTube
                      </span>
                    </div>
                    {youtubeHighlight && (
                      <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,230,118,0.9)', borderRadius: 4, padding: '3px 7px', fontSize: 9, fontWeight: 800, color: '#000', letterSpacing: '.05em' }}>
                        CAZÉTV
                      </div>
                    )}
                  </div>
                  {youtubeHighlight?.title && (
                    <p style={{ margin: '6px 0 0', fontSize: 11, color: T2, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                      {youtubeHighlight.title}
                    </p>
                  )}
                </a>
              );
            })() : (
              <p style={{ textAlign: 'center', fontSize: 12, color: T2, padding: '12px 0' }}>Highlight não disponível.</p>
            )
          ) : activePanel === 'lineup' ? (
            lineup && lineup.length > 0
              ? <CopaLineupList lineup={lineup} />
              : <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{isFinished || isLive ? '📋' : '⏳'}</div>
                  <p style={{ fontSize: 12, color: T2, lineHeight: 1.6 }}>
                    {isFinished || isLive
                      ? 'Escalação não disponível neste jogo.'
                      : 'A escalação é publicada algumas horas antes do jogo.'}
                  </p>
                </div>
          ) : activePanel === 'timeline' ? (
            (timeline ?? []).length > 0
              ? <CopaTimeline events={timeline!} homeTeamId={fixture.idHomeTeam} />
              : <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{isFinished || isLive ? '📋' : '⏱️'}</div>
                  <p style={{ fontSize: 12, color: T2, lineHeight: 1.6 }}>
                    {isFinished || isLive
                      ? 'Nenhum evento registrado.'
                      : 'Lance a lance disponível durante o jogo.'}
                  </p>
                </div>
          ) : activePanel === 'stats' ? (
            matchStats && (matchStats as unknown[]).length > 0
              ? <CopaMatchStats stats={matchStats} homeTeam={fixture.strHomeTeam} awayTeam={fixture.strAwayTeam} />
              : <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{isFinished || isLive ? '📊' : '⏳'}</div>
                  <p style={{ fontSize: 12, color: T2, lineHeight: 1.6 }}>
                    {isFinished || isLive
                      ? 'Estatísticas não disponíveis para este jogo.'
                      : 'Estatísticas disponíveis durante e após o jogo.'}
                  </p>
                </div>
          ) : activePanel === 'tv' ? (
            tvListings && tvListings.length > 0 ? (
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: T3, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 8 }}>
                  📺 Transmissão · Brasil
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {tvListings.map((ch, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px',
                      background: S2, borderRadius: 5, border: `1px solid ${BDR}`,
                    }}>
                      {ch.strLogo ? (
                        <img src={ch.strLogo} alt={ch.strChannel} style={{ width: 28, height: 20, objectFit: 'contain', borderRadius: 3 }} />
                      ) : (
                        <div style={{ width: 28, height: 20, background: T3, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={S} strokeWidth="2.5"><rect x="2" y="7" width="20" height="15" rx="2"/></svg>
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: T }}>{ch.strChannel}</span>
                        {ch.strLanguage && <span style={{ fontSize: 10, color: T3, marginLeft: 6 }}>{ch.strLanguage}</span>}
                      </div>
                      {ch.strTime && <span style={{ fontSize: 11, color: T2 }}>{ch.strTime}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p style={{ textAlign: 'center', fontSize: 12, color: T2, padding: '12px 0' }}>
                {tvListings === null ? 'Carregando...' : 'Transmissão não encontrada para este jogo.'}
              </p>
            )
          ) : null}
        </div>
      )}
    </div>
  );
}
