import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { theSportsDbService } from '../services/theSportsDbService';
import { analysisService } from '../services/analysisService';
import { useAuth } from '../contexts/AuthContext';
import type { TsdbEvent, TsdbPlayer } from '../types/thesportsdb';
import type { Player } from '../types/Player';
import CopaFixtureCard from '../components/copa/CopaFixtureCard';
import CopaGroupsDisplay from '../components/copa/CopaGroupsDisplay';
import CopaSelecoes from '../components/copa/CopaSelecoes';
import { teamPt } from '../utils/teamNames';
import Header from '../components/Header';
import {
  type HighlightData,
  getHighlightsBatch,
  autoFetchHighlights,
} from '../services/highlightsService';

// ── Design tokens (v2) ────────────────────────────────────────
const BG  = '#07090c';
const S   = '#0c1016';
const S2  = '#111820';
const BDR = 'rgba(255,255,255,0.06)';
const AC  = '#00e676';
const GD  = '#f59e0b';
const T   = '#dde5ef';
const T2  = '#566b82';
const T3  = '#4a6077';
const BC  = "'Barlow Condensed', sans-serif";


const ALL_GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P'];

const DAYS_FULL  = ['Domingo','Segunda-Feira','Terça-Feira','Quarta-Feira','Quinta-Feira','Sexta-Feira','Sábado'];
const MONTHS_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS_SHORT  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const MONTHS_SHORT= ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

type Tab = 'calendario' | 'resultados' | 'tabela' | 'selecoes' | 'jogadores';

// ── Position translation ──────────────────────────────────────
function positionPt(pos: string | null): string {
  if (!pos) return '';
  const p = pos.toLowerCase().trim();
  if (p === 'goalkeeper' || p === 'gk') return 'Goleiro';
  if (p === 'centre-back' || p === 'center back' || p === 'cb' || p === 'central defender') return 'Zagueiro';
  if (p === 'right back' || p === 'rb' || p === 'right-back') return 'Lateral Direito';
  if (p === 'left back' || p === 'lb' || p === 'left-back') return 'Lateral Esquerdo';
  if (p === 'right wing back' || p === 'rwb') return 'Ala Direito';
  if (p === 'left wing back' || p === 'lwb') return 'Ala Esquerdo';
  if (p.includes('defensive midfield') || p === 'dm') return 'Volante';
  if (p === 'central midfield' || p === 'cm' || p.includes('centre midfield')) return 'Meia Central';
  if (p.includes('attacking midfield') || p === 'am') return 'Meia Atacante';
  if (p.includes('midfielder') || p.includes('midfield')) return 'Meia';
  if (p === 'right winger' || p === 'rw' || p === 'right wing') return 'Ponta Direita';
  if (p === 'left winger' || p === 'lw' || p === 'left wing') return 'Ponta Esquerda';
  if (p === 'centre-forward' || p === 'center-forward' || p === 'cf') return 'Centroavante';
  if (p === 'striker' || p === 'st') return 'Centroavante';
  if (p.includes('forward') || p.includes('winger')) return 'Atacante';
  if (p.includes('defender') || p.includes('back')) return 'Defensor';
  return pos;
}

// ── Helpers ───────────────────────────────────────────────────
function isBrazilGame(f: TsdbEvent) {
  return f.strHomeTeam === 'Brazil' || f.strAwayTeam === 'Brazil';
}

function fmtFull(dateStr: string): string {
  const [y,m,d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m-1, d);
  return `${DAYS_FULL[dt.getDay()]}, ${d} de ${MONTHS_FULL[m-1]}`;
}

function groupByDate(fixtures: TsdbEvent[]): [string, TsdbEvent[]][] {
  const map = new Map<string, TsdbEvent[]>();
  fixtures.forEach(f => {
    if (!map.has(f.dateEvent)) map.set(f.dateEvent, []);
    map.get(f.dateEvent)!.push(f);
  });
  return [...map.entries()].sort(([a],[b]) => a < b ? -1 : 1);
}

// ── Squad → bench Player[] ────────────────────────────────────
function squadToBench(squad: TsdbPlayer[], baseId: number): Player[] {
  return squad.map((p, i) => {
    const numId = parseInt(p.idPlayer.replace(/\D/g,'').slice(-7), 10);
    return { id: isNaN(numId) ? baseId + i : numId, name: p.strPlayer, number: 0, position: { x: 0, y: 0 } };
  });
}


// ── Breakpoint hook ───────────────────────────────────────────
function useBreakpoint() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return { lg: w >= 960 };
}

// ── Date header ───────────────────────────────────────────────
function DateHeader({ dateStr }: { dateStr: string }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:12,
      padding:'20px 0 10px',
      position:'sticky', top:116, zIndex:3, background:BG,
    }}>
      <span style={{ fontFamily:BC, fontSize:11.5, fontWeight:800, letterSpacing:'.09em', textTransform:'uppercase', color:T2, whiteSpace:'nowrap' }}>
        {fmtFull(dateStr)}
      </span>
      <div style={{ flex:1, height:1, background:BDR }} />
    </div>
  );
}

// ── Search + chips ────────────────────────────────────────────
function SearchFilter({ q, setQ, grp, setGrp }: {
  q: string; setQ: (v:string)=>void; grp: string; setGrp: (v:string)=>void;
}) {
  const [foc, setFoc] = useState(false);
  return (
    <div style={{ paddingTop:16 }}>
      <div style={{
        display:'flex', alignItems:'center', gap:10,
        background:S, borderRadius:8, padding:'9px 13px', marginBottom:10,
        border:`1px solid ${foc ? 'rgba(0,230,118,0.5)' : BDR}`, transition:'border-color .15s',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T3} strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => setFoc(true)}
          onBlur={() => setFoc(false)}
          placeholder="Buscar seleção ou grupo..."
          style={{ flex:1, background:'transparent', border:'none', outline:'none', fontSize:13.5, color:T }}
        />
        {q && (
          <button onClick={() => setQ('')} style={{ color:T3, lineHeight:0, border:'none', background:'none', cursor:'pointer' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        )}
      </div>
      <div style={{ display:'flex', gap:5, overflowX:'auto', paddingBottom:3, scrollbarWidth:'none' }}>
        {['TODOS','BRASIL',...ALL_GROUPS].map(g => {
          const on = grp === g;
          const col = g === 'BRASIL' ? GD : AC;
          return (
            <button key={g} onClick={() => setGrp(g)} style={{
              padding:'4px 11px', borderRadius:5, flexShrink:0, fontSize:11,
              fontWeight:700, letterSpacing:'.04em',
              background: on ? col : S, color: on ? '#000' : T2,
              border:`1px solid ${on ? col : BDR}`, transition:'all .12s', cursor:'pointer',
            }}>
              {g}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Mini game row (sidebar) ───────────────────────────────────
function SidebarGameRow({ f, onCreateAnalysis, creatingId, col }: {
  f: TsdbEvent; onCreateAnalysis: (f: TsdbEvent) => void; creatingId: string | null; col: string;
}) {
  const [errH, setErrH] = useState(false);
  const [errA, setErrA] = useState(false);
  const matchDate = new Date(`${f.dateEvent}T${f.strTime ?? '00:00:00'}Z`);
  const timeStr = matchDate.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit', timeZone:'America/Sao_Paulo' });
  const [y,m,d] = f.dateEvent.split('-').map(Number);
  const dt = new Date(y,m-1,d);
  const dateShort = `${DAYS_SHORT[dt.getDay()]}. ${d} ${MONTHS_SHORT[m-1]}.`;
  const hasScore = ['FT','AET','PEN','1H','HT','2H','ET','P'].includes(f.strStatus);
  const isLive = ['1H','HT','2H','ET','P'].includes(f.strStatus);

  return (
    <div style={{
      padding:'9px 12px', borderBottom:`1px solid ${BDR}`,
      borderLeft: f.strHomeTeam === 'Brazil' || f.strAwayTeam === 'Brazil' ? `2px solid ${GD}` : '2px solid transparent',
      background: isLive ? 'rgba(0,230,118,0.04)' : 'transparent',
    }}>
      {f.strGroup && (
        <div style={{ fontSize:9, fontWeight:700, color:T3, letterSpacing:'.05em', textTransform:'uppercase', marginBottom:4 }}>
          Grupo {f.strGroup}
        </div>
      )}
      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:6 }}>
        <div style={{ width:22, height:22, borderRadius:'50%', overflow:'hidden', background:S2, border:`1px solid ${BDR}`, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
          {f.strHomeTeamBadge && !errH ? <img src={f.strHomeTeamBadge} alt={f.strHomeTeam} onError={()=>setErrH(true)} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <span style={{ fontSize:6, color:T3 }}>{f.strHomeTeam.slice(0,2)}</span>}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <span style={{ fontSize:11, fontWeight:600, color:T }}>{teamPt(f.strHomeTeam)}</span>
          <span style={{ fontSize:10, color:T3, margin:'0 4px' }}>vs</span>
          <span style={{ fontSize:11, fontWeight:600, color:T }}>{teamPt(f.strAwayTeam)}</span>
        </div>
        <div style={{ width:22, height:22, borderRadius:'50%', overflow:'hidden', background:S2, border:`1px solid ${BDR}`, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
          {f.strAwayTeamBadge && !errA ? <img src={f.strAwayTeamBadge} alt={f.strAwayTeam} onError={()=>setErrA(true)} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <span style={{ fontSize:6, color:T3 }}>{f.strAwayTeam.slice(0,2)}</span>}
        </div>
        <div style={{ textAlign:'right', minWidth:40, flexShrink:0 }}>
          {hasScore ? (
            <span style={{ fontFamily:BC, fontSize:15, fontWeight:900, color: isLive ? AC : T }}>{f.intHomeScore ?? 0}–{f.intAwayScore ?? 0}</span>
          ) : (
            <>
              <div style={{ fontFamily:BC, fontSize:13, fontWeight:900, color:col, lineHeight:1 }}>{timeStr}</div>
              <div style={{ fontSize:9, color:T3 }}>{dateShort}</div>
            </>
          )}
        </div>
      </div>
      <button onClick={() => onCreateAnalysis(f)} disabled={creatingId === f.idEvent} style={{
        width:'100%', padding:'4px 0', borderRadius:4,
        background:`${col}12`, color:col, fontSize:10.5, fontWeight:600,
        border:`1px solid ${col}28`, cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center', gap:3,
        opacity: creatingId === f.idEvent ? 0.6 : 1,
      }}>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
        Criar análise
      </button>
    </div>
  );
}

// ── Right sidebar: Hoje + Favoritos ───────────────────────────
function RightSidebar({ todayFixtures, starredFixtureIds, allFixtures, onCreateAnalysis, creatingId }: {
  todayFixtures: TsdbEvent[];
  starredFixtureIds: Set<string>;
  allFixtures: TsdbEvent[];
  onCreateAnalysis: (f: TsdbEvent) => void;
  creatingId: string | null;
}) {
  const todayLabel = new Date().toLocaleDateString('pt-BR', { weekday:'short', day:'2-digit', month:'short' });
  const liveCount = todayFixtures.filter(f => ['1H','HT','2H','ET','P'].includes(f.strStatus)).length;
  const favoriteFixtures = allFixtures.filter(f => starredFixtureIds.has(f.idEvent));

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

      {/* 📅 Hoje */}
      <div style={{ background:S, borderRadius:6, overflow:'hidden', border:`1px solid ${liveCount > 0 ? 'rgba(0,230,118,0.2)' : BDR}` }}>
        <div style={{ padding:'9px 12px', borderBottom:`1px solid ${BDR}`, display:'flex', alignItems:'center', gap:7 }}>
          {liveCount > 0 ? (
            <span style={{ width:7, height:7, borderRadius:'50%', background:AC, display:'inline-block', flexShrink:0, animation:'pulse 1.5s infinite' }} />
          ) : (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={T2} strokeWidth="2" style={{ flexShrink:0 }}>
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          )}
          <span style={{ fontFamily:BC, fontSize:11.5, fontWeight:900, textTransform:'uppercase', letterSpacing:'.06em', color: liveCount > 0 ? AC : T }}>
            Hoje
          </span>
          <span style={{ fontSize:10, color:T3, marginLeft:2 }}>{todayLabel}</span>
          {todayFixtures.length > 0 && (
            <span style={{ marginLeft:'auto', fontFamily:BC, fontSize:11, fontWeight:700, color: liveCount > 0 ? AC : T2, background: liveCount > 0 ? 'rgba(0,230,118,0.12)' : S2, padding:'2px 7px', borderRadius:3 }}>
              {todayFixtures.length}
            </span>
          )}
        </div>
        {todayFixtures.length === 0 ? (
          <p style={{ padding:'12px', fontSize:11.5, color:T3, lineHeight:1.6 }}>Sem jogos hoje.</p>
        ) : (
          todayFixtures.map(f => {
            const isLive = ['1H','HT','2H','ET','P'].includes(f.strStatus);
            const isBrazil = f.strHomeTeam === 'Brazil' || f.strAwayTeam === 'Brazil';
            return (
              <SidebarGameRow key={f.idEvent} f={f} onCreateAnalysis={onCreateAnalysis} creatingId={creatingId}
                col={isLive ? AC : isBrazil ? GD : AC} />
            );
          })
        )}
      </div>

      {/* ⭐ Favoritos */}
      <div style={{ background:S, borderRadius:6, overflow:'hidden', border:`1px solid ${starredFixtureIds.size > 0 ? 'rgba(245,158,11,0.2)' : BDR}` }}>
        <div style={{ padding:'9px 12px', borderBottom:`1px solid ${BDR}`, display:'flex', alignItems:'center', gap:7 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill={starredFixtureIds.size > 0 ? GD : 'none'} stroke={starredFixtureIds.size > 0 ? GD : T3} strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <span style={{ fontFamily:BC, fontSize:11.5, fontWeight:900, textTransform:'uppercase', letterSpacing:'.06em', color: starredFixtureIds.size > 0 ? T : T3 }}>
            Favoritos
          </span>
          {starredFixtureIds.size > 0 && (
            <span style={{ marginLeft:'auto', fontFamily:BC, fontSize:11, fontWeight:700, color:GD, background:'rgba(245,158,11,0.12)', padding:'2px 7px', borderRadius:3 }}>
              {starredFixtureIds.size}
            </span>
          )}
        </div>
        {starredFixtureIds.size === 0 ? (
          <p style={{ padding:'12px', fontSize:11.5, color:T3, lineHeight:1.6 }}>
            Clique em ⭐ em qualquer jogo para acompanhar aqui.
          </p>
        ) : favoriteFixtures.length === 0 ? (
          <p style={{ padding:'12px', fontSize:11.5, color:T3, lineHeight:1.6 }}>Nenhum jogo encontrado.</p>
        ) : (
          favoriteFixtures.map(f => (
            <SidebarGameRow key={f.idEvent} f={f} onCreateAnalysis={onCreateAnalysis} creatingId={creatingId}
              col={f.strHomeTeam === 'Brazil' || f.strAwayTeam === 'Brazil' ? GD : AC} />
          ))
        )}
      </div>

    </div>
  );
}


// ── Hero ──────────────────────────────────────────────────────
function Hero() {
  return (
    <div style={{ borderBottom:`1px solid ${BDR}` }}>
      {/* Info strip */}
      <div style={{
        padding:'7px 24px', borderBottom:`1px solid ${BDR}`,
        display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap',
      }}>
        <span style={{ fontSize:10.5, fontWeight:600, letterSpacing:'.07em', color:T2, textTransform:'uppercase' }}>
          ⚽ FIFA Copa do Mundo 2026™ · USA · Canadá · México
        </span>
        <span style={{ fontSize:10.5, fontWeight:600, color:T3, letterSpacing:'.04em' }}>
          11 Jun – 19 Jul 2026
        </span>
      </div>
      {/* Title */}
      <div style={{ padding:'28px 24px 24px' }}>
        <h1 style={{ fontFamily:BC, fontSize:'clamp(44px,6.5vw,80px)', fontWeight:900, color:'#fff', lineHeight:.92, letterSpacing:'-.01em', marginBottom:10 }}>
          COPA DO<br/>MUNDO
        </h1>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:28, height:2.5, background:AC, borderRadius:2 }}/>
          <span style={{ fontFamily:BC, fontSize:22, fontWeight:700, color:AC, letterSpacing:'.01em' }}>no Zona 14</span>
        </div>
      </div>
    </div>
  );
}

// ── Jogadores tab (module-level = stable reference, state survives parent re-renders) ──
function JogadoresTab() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<TsdbPlayer[]>([]);
  const [searching, setSearching] = useState(false);
  const [foc, setFoc] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (q.length < 3) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const timer = setTimeout(() => {
      theSportsDbService.searchPlayers(q)
        .then(res => { setResults(res.slice(0, 20)); setSearching(false); })
        .catch(() => setSearching(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [q]);

  return (
    <div style={{ paddingTop: 20 }}>
      <div style={{ maxWidth: 720 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: S, borderRadius: 8, padding: '11px 14px',
          border: `1px solid ${foc ? 'rgba(0,230,118,0.5)' : BDR}`,
          transition: 'border-color .15s', marginBottom: 20,
        }}>
          {searching ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T3} strokeWidth="2" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T3} strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          )}
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            onFocus={() => setFoc(true)}
            onBlur={() => setFoc(false)}
            placeholder="Buscar jogador... (ex: Vinícius, Mbappe, Messi)"
            autoFocus
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: T }}
          />
          {q && (
            <button onClick={() => { setQ(''); setResults([]); }} style={{ color: T3, border: 'none', background: 'none', cursor: 'pointer', lineHeight: 0, padding: 0 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>

        {q.length < 3 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontFamily: BC, fontSize: 40, fontWeight: 900, color: T3, marginBottom: 10, letterSpacing: '.02em' }}>
              JOGADORES
            </div>
            <p style={{ fontSize: 14, color: T2, lineHeight: 1.8, maxWidth: 320, margin: '0 auto' }}>
              Pesquise qualquer jogador do mundo para ver perfil completo com títulos e histórico de clubes.
            </p>
            <p style={{ fontSize: 11, color: T3, opacity: 0.6, marginTop: 10 }}>Mínimo 3 caracteres</p>
          </div>
        )}

        {q.length >= 3 && results.length === 0 && !searching && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ fontSize: 13, color: T3 }}>Nenhum jogador encontrado para "{q}"</p>
          </div>
        )}

        {results.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 6 }}>
            {results.map(player => (
              <button
                key={player.idPlayer}
                onClick={() => navigate(`/copa/jogador/${player.idPlayer}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                  background: S, border: `1px solid ${BDR}`, borderRadius: 7,
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                  transition: 'background .1s, border-color .1s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = S2; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = S; e.currentTarget.style.borderColor = BDR; }}
              >
                <div style={{ width: 52, height: 52, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: S2, border: `1px solid ${BDR}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {(player.strCutout ?? player.strThumb) && !imgErrors[player.idPlayer] ? (
                    <img src={player.strCutout ?? player.strThumb!} alt={player.strPlayer}
                      onError={() => setImgErrors(prev => ({ ...prev, [player.idPlayer]: true }))}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T3} strokeWidth="1.5">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: T, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {player.strPlayer}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {player.strNationality && <span style={{ fontSize: 10.5, color: T3 }}>{teamPt(player.strNationality)}</span>}
                    {player.strPosition && <span style={{ fontSize: 10.5, color: AC }}>· {positionPt(player.strPosition)}</span>}
                    {player.strTeam && <span style={{ fontSize: 10.5, color: T3 }}>· {player.strTeam}</span>}
                  </div>
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T3} strokeWidth="2" style={{ flexShrink: 0 }}>
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function Copa() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lg } = useBreakpoint();

  const [fixtures, setFixtures] = useState<TsdbEvent[]>([]);
  const [liveFixtures, setLiveFixtures] = useState<TsdbEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<Tab>('calendario');
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // ── Highlights state ──────────────────────────────────────
  const [highlights, setHighlights] = useState<Map<string, HighlightData>>(new Map());
  // Tracks event IDs already queued for YouTube fetch (avoids duplicate requests)
  const highlightsFetchedRef = useRef<Set<string>>(new Set());

  // ── Persistent state (localStorage) ──────────────────────
  const [savedTeams, setSavedTeams] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('copa_saved_teams') ?? '[]')); }
    catch { return new Set(); }
  });
  const [savedFixtures, setSavedFixtures] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('copa_saved_fixtures') ?? '[]')); }
    catch { return new Set(); }
  });
  const [notifFixtures, setNotifFixtures] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('copa_notif_fixtures') ?? '[]')); }
    catch { return new Set(); }
  });

  useEffect(() => { localStorage.setItem('copa_saved_teams',    JSON.stringify([...savedTeams])); }, [savedTeams]);
  useEffect(() => { localStorage.setItem('copa_saved_fixtures', JSON.stringify([...savedFixtures])); }, [savedFixtures]);
  useEffect(() => { localStorage.setItem('copa_notif_fixtures', JSON.stringify([...notifFixtures])); }, [notifFixtures]);

  const onToggleTeam = useCallback((name: string) => {
    setSavedTeams(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n; });
  }, []);
  const onToggleFixtureSave = useCallback((id: string) => {
    setSavedFixtures(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);
  const onToggleFixtureNotif = useCallback((id: string) => {
    setNotifFixtures(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  }, []);

  const FINISHED_STATUSES = new Set(['FT','AET','PEN']);

  // ── Fetch fixtures ────────────────────────────────────────
  useEffect(() => {
    theSportsDbService.getAllFixtures()
      .then(async data => {
        setFixtures(data);
        setLastRefresh(new Date());

        // Load cached highlights from Supabase for all finished fixtures
        const ftIds = data.filter(f => FINISHED_STATUSES.has(f.strStatus)).map(f => f.idEvent);
        if (ftIds.length > 0) {
          const cached = await getHighlightsBatch(ftIds);
          if (cached.size > 0) {
            setHighlights(cached);
            cached.forEach((_, id) => highlightsFetchedRef.current.add(id));
          }

          // Queue YouTube fetch for FT fixtures not in Supabase cache
          const notCached = data
            .filter(f => FINISHED_STATUSES.has(f.strStatus) && !cached.has(f.idEvent));
          if (notCached.length > 0) {
            notCached.forEach(f => highlightsFetchedRef.current.add(f.idEvent));
            const ctrl = new AbortController();
            autoFetchHighlights(notCached, (eventId, hlData) => {
              setHighlights(prev => new Map(prev).set(eventId, hlData));
            }, ctrl.signal);
          }
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const fetchLive = useCallback(async () => {
    const live = await theSportsDbService.getLiveFixtures();

    // Detect newly finished fixtures (FT in live feed) not yet fetched
    const newlyFinished = live.filter(
      f => FINISHED_STATUSES.has(f.strStatus) && !highlightsFetchedRef.current.has(f.idEvent)
    );
    if (newlyFinished.length > 0) {
      newlyFinished.forEach(f => highlightsFetchedRef.current.add(f.idEvent));
      autoFetchHighlights(newlyFinished, (eventId, hlData) => {
        setHighlights(prev => new Map(prev).set(eventId, hlData));
      });
    }

    setLiveFixtures(prev => {
      if (prev.length === 0 && live.length === 0) return prev;
      return live;
    });
  }, []);

  useEffect(() => {
    fetchLive();
    const id = setInterval(fetchLive, 2*60*1000);
    return () => clearInterval(id);
  }, [fetchLive]);


  // ── Derived ───────────────────────────────────────────────
  const upcomingFixtures = useMemo(() =>
    fixtures
      .filter(f => (f.dateEvent > todayStr || (f.dateEvent === todayStr && f.strStatus === 'NS')) && ['NS','TBD'].includes(f.strStatus))
      .sort((a,b) => a.strTimestamp.localeCompare(b.strTimestamp)),
    [fixtures, todayStr]
  );

  const pastFixtures = useMemo(() =>
    fixtures
      .filter(f => ['FT','AET','PEN'].includes(f.strStatus))
      .sort((a,b) => b.strTimestamp.localeCompare(a.strTimestamp)),
    [fixtures]
  );

  const liveAndToday = useMemo(() => {
    const live = liveFixtures;
    const today = fixtures.filter(f => f.dateEvent === todayStr && !['FT','AET','PEN'].includes(f.strStatus) && !liveFixtures.find(l => l.idEvent === f.idEvent));
    return [...live, ...today].sort((a,b) => a.strTimestamp.localeCompare(b.strTimestamp));
  }, [fixtures, liveFixtures, todayStr]);

  // ── Create analysis with Copa API players in bench ───────────
  const handleCreateAnalysis = useCallback(async (fixture: TsdbEvent) => {
    if (!user) { navigate('/login'); return; }
    setCreatingId(fixture.idEvent);
    try {
      let homeSubs: Player[] = [];
      let awaySubs: Player[] = [];

      // Always fetch full squad so all players are available for substitutions
      try {
        const [homeSquad, awaySquad] = await Promise.all([
          theSportsDbService.getTeamSquad(fixture.idHomeTeam),
          theSportsDbService.getTeamSquad(fixture.idAwayTeam),
        ]);
        homeSubs = squadToBench(homeSquad, 1100);
        awaySubs = squadToBench(awaySquad, 2100);
      } catch { /* keep empty */ }

      const id = await analysisService.createBlankAnalysis('analise_completa', {
        titulo: `${fixture.strHomeTeam} × ${fixture.strAwayTeam}`,
        homeTeam: fixture.strHomeTeam,
        awayTeam: fixture.strAwayTeam,
        homeTeamLogo: fixture.strHomeTeamBadge ?? '',
        awayTeamLogo: fixture.strAwayTeamBadge ?? '',
        matchDate: fixture.dateEvent,
        tags: ['Copa 2026'],
        // Campo vazio — jogadores vão para o banco, não para o campo
        homePlayersDef: [],
        homePlayersOff: [],
        awayPlayersDef: [],
        awayPlayersOff: [],
        ...(fixture.strVideo && { events: [{ type: '_meta', videoUrl: fixture.strVideo }] }),
        ...(homeSubs.length > 0 && { homeSubstitutes: homeSubs }),
        ...(awaySubs.length > 0 && { awaySubstitutes: awaySubs }),
      });
      navigate(`/analysis-complete/saved/${id}`);
    } catch {
      toast.error('Erro ao criar análise.');
    } finally {
      setCreatingId(null);
    }
  }, [user, navigate]);

  // ── Tab: Calendário ───────────────────────────────────────
  function CalendarioTab() {
    const [q, setQ] = useState('');
    const [grp, setGrp] = useState('TODOS');

    const todayFixtures = fixtures.filter(f => f.dateEvent === todayStr);
    const allCalFixtures = [...liveAndToday, ...upcomingFixtures].filter((f, i, arr) => arr.findIndex(x => x.idEvent === f.idEvent) === i);

    const filtered = useMemo(() => {
      let ms = allCalFixtures;
      if (grp === 'BRASIL') ms = ms.filter(f => isBrazilGame(f));
      else if (grp !== 'TODOS') ms = ms.filter(f =>
        teamPt(f.strHomeTeam).toUpperCase().startsWith(grp) ||
        teamPt(f.strAwayTeam).toUpperCase().startsWith(grp)
      );
      if (q) {
        const ql = q.toLowerCase();
        ms = ms.filter(f =>
          f.strHomeTeam.toLowerCase().includes(ql) ||
          f.strAwayTeam.toLowerCase().includes(ql) ||
          teamPt(f.strHomeTeam).toLowerCase().includes(ql) ||
          teamPt(f.strAwayTeam).toLowerCase().includes(ql)
        );
      }
      return ms;
    }, [q, grp, allCalFixtures]);

    const byDate = groupByDate(filtered);

    return (
      <div style={{ display:'grid', gridTemplateColumns: lg ? '1fr 300px' : '1fr', gap:24, alignItems:'start' }}>
        {/* Main column */}
        <div>
          <SearchFilter q={q} setQ={setQ} grp={grp} setGrp={setGrp} />
          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:16 }}>
              {[1,2,3].map(i => <div key={i} style={{ height:130, background:S, borderRadius:6, opacity:.5 }} />)}
            </div>
          ) : byDate.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px 0', color:T2 }}>
              <p>Nenhum jogo encontrado</p>
            </div>
          ) : (
            byDate.map(([date, ms]) => (
              <div key={date}>
                <DateHeader dateStr={date} />
                <div style={{ display:'flex', flexDirection:'column', gap:7, paddingBottom:8 }}>
                  {ms.map(f => (
                    <CopaFixtureCard
                      key={f.idEvent}
                      fixture={f}
                      onCreateAnalysis={handleCreateAnalysis}
                      isCreating={creatingId === f.idEvent}
                      isSaved={savedFixtures.has(f.idEvent)}
                      onToggleSave={onToggleFixtureSave}
                      isNotif={notifFixtures.has(f.idEvent)}
                      onToggleNotif={onToggleFixtureNotif}
                      youtubeHighlight={highlights.get(f.idEvent) ?? null}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right sidebar (desktop only) */}
        {lg && (
          <div style={{ position:'sticky', top:116, paddingTop:16 }}>
            <RightSidebar
              todayFixtures={todayFixtures}
              starredFixtureIds={savedFixtures}
              allFixtures={fixtures}
              onCreateAnalysis={handleCreateAnalysis}
              creatingId={creatingId}
            />
          </div>
        )}
      </div>
    );
  }

  // ── Tab: Resultados ───────────────────────────────────────
  function ResultadosTab() {
    if (pastFixtures.length === 0) {
      return (
        <div style={{ textAlign:'center', padding:'80px 0' }}>
          <div style={{ width:56, height:56, margin:'0 auto 16px', background:S, borderRadius:10, border:`1px solid ${BDR}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={T3} strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
          </div>
          <p style={{ fontSize:16, fontWeight:600, marginBottom:8, color:T }}>Sem resultados ainda</p>
          <p style={{ fontSize:13, color:T2, maxWidth:300, margin:'0 auto', lineHeight:1.7 }}>
            O torneio começa em 11 de junho. Os placares aparecem aqui automaticamente.
          </p>
        </div>
      );
    }

    // Highlights gallery — somente vídeos do CazéTV (não mistura com strVideo de outros canais)
    const withVideo = pastFixtures.filter(f => highlights.has(f.idEvent));

    const byDate = groupByDate(pastFixtures);
    return (
      <div style={{ paddingTop:16 }}>
        {/* Highlights strip */}
        {withVideo.length > 0 && (
          <div style={{ marginBottom:20 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
              <span style={{ fontFamily:BC, fontSize:11.5, fontWeight:800, letterSpacing:'.09em', textTransform:'uppercase', color:T2, whiteSpace:'nowrap' }}>
                🎬 Melhores Momentos
              </span>
              <div style={{ flex:1, height:1, background:BDR }} />
            </div>
            <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4, scrollbarWidth:'none' }}>
              {withVideo.slice(0,10).map(f => {
                const hl = highlights.get(f.idEvent)!; // only CazéTV items reach here
                const videoUrl = `https://www.youtube.com/watch?v=${hl.videoId}`;
                const thumbnail = hl.thumbnail ?? `https://img.youtube.com/vi/${hl.videoId}/hqdefault.jpg`;
                return (
                  <a key={f.idEvent} href={videoUrl} target="_blank" rel="noopener noreferrer" style={{
                    flexShrink:0, width:180, borderRadius:6, overflow:'hidden',
                    border:'1px solid rgba(0,230,118,0.25)', textDecoration:'none',
                  }}>
                    <div style={{ height:100, background:S2, position:'relative', overflow:'hidden' }}>
                      <img src={thumbnail} alt={f.strEvent}
                        style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      <div style={{
                        position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
                        background:'rgba(0,0,0,0.3)',
                      }}>
                        <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        </div>
                      </div>
                      <div style={{ position:'absolute', top:5, right:5, background:'rgba(0,230,118,0.9)', borderRadius:3, padding:'2px 5px', fontSize:8, fontWeight:700, color:'#000', letterSpacing:'.04em' }}>
                        CAZÉTV
                      </div>
                    </div>
                    <div style={{ padding:'7px 8px', background:S }}>
                      <div style={{ fontSize:11, fontWeight:600, color:T, lineHeight:1.3 }}>
                        {teamPt(f.strHomeTeam)} vs {teamPt(f.strAwayTeam)}
                      </div>
                      {f.intHomeScore != null && (
                        <div style={{ fontFamily:BC, fontSize:13, fontWeight:900, color:T2, marginTop:2 }}>
                          {f.intHomeScore}–{f.intAwayScore}
                        </div>
                      )}
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {byDate.map(([date, ms]) => (
          <div key={date}>
            <DateHeader dateStr={date} />
            <div style={{ display:'flex', flexDirection:'column', gap:7, paddingBottom:8 }}>
              {ms.map(f => (
                <CopaFixtureCard
                  key={f.idEvent}
                  fixture={f}
                  onCreateAnalysis={handleCreateAnalysis}
                  isCreating={creatingId === f.idEvent}
                  isSaved={savedFixtures.has(f.idEvent)}
                  onToggleSave={onToggleFixtureSave}
                  isNotif={notifFixtures.has(f.idEvent)}
                  onToggleNotif={onToggleFixtureNotif}
                  youtubeHighlight={highlights.get(f.idEvent) ?? null}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Tab: Seleções ─────────────────────────────────────────
  function SelecoesTab() {
    return (
      <div style={{ paddingTop:16 }}>
        {loading ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:8 }}>
            {[1,2,3,4,5,6].map(i => <div key={i} style={{ height:72, background:S, borderRadius:6, opacity:.5 }} />)}
          </div>
        ) : (
          <CopaSelecoes
            fixtures={fixtures}
            savedTeams={savedTeams}
            onToggleTeam={onToggleTeam}
          />
        )}
      </div>
    );
  }

  // ── Tab: Tabela ───────────────────────────────────────────
  function TabelaTab() {
    return (
      <div style={{ paddingTop:16 }}>
        <CopaGroupsDisplay
          fixtures={fixtures}
          savedTeams={savedTeams}
          onToggleTeam={onToggleTeam}
        />
      </div>
    );
  }

  // ── Live indicator ────────────────────────────────────────
  const hasLive = liveFixtures.length > 0;

  const TABS: { id: Tab; label: string }[] = [
    { id:'calendario', label: hasLive ? `Calendário · ${liveFixtures.length} ao vivo` : 'Calendário' },
    { id:'resultados', label:'Resultados' },
    { id:'tabela',     label:'Tabela' },
    { id:'selecoes',   label:'Seleções' },
    { id:'jogadores',  label:'Jogadores' },
  ];

  return (
    <div style={{ background:BG, color:T, minHeight:'100vh', fontFamily:"'Inter', system-ui, sans-serif", fontSize:14, WebkitFontSmoothing:'antialiased', paddingTop:64 } as React.CSSProperties}>
      <Header />

      {/* ── Hero ── */}
      {!loading && <Hero />}

      {/* ── Tab bar ── */}
      <div style={{
        position:'sticky', top:64, zIndex:15,
        background:'rgba(7,9,12,0.97)', backdropFilter:'blur(12px)',
        borderBottom:`1px solid ${BDR}`,
        display:'flex', padding:'0 24px',
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:'13px 16px', fontSize:14, fontWeight:600, letterSpacing:'.01em',
            color: tab === t.id ? AC : T2,
            borderBottom: `2px solid ${tab===t.id ? AC : 'transparent'}`,
            marginBottom:-1, transition:'color .12s,border-color .12s',
            border:'none', background:'none', cursor:'pointer',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {error ? (
        <div style={{ textAlign:'center', padding:'80px 24px', color:T2 }}>
          <p style={{ fontSize:14, marginBottom:8 }}>Não foi possível carregar os jogos.</p>
          <button onClick={() => window.location.reload()} style={{ color:AC, background:'none', border:'none', cursor:'pointer', fontSize:13 }}>
            Tentar novamente
          </button>
        </div>
      ) : (
        <div style={{ padding:'0 24px', paddingBottom:64 }}>
          {tab === 'calendario' && <CalendarioTab />}
          {tab === 'resultados' && <ResultadosTab />}
          {tab === 'tabela'     && <TabelaTab />}
          {tab === 'selecoes'   && <SelecoesTab />}
          {tab === 'jogadores'  && <JogadoresTab />}
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{ padding:'14px 24px', borderTop:`1px solid ${BDR}`, fontSize:11, color:T3, display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
        <span>Atualizado automaticamente a cada 2 min.</span>
        {lastRefresh && <span>Última sync: {lastRefresh.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span>}
      </div>
    </div>
  );
}
