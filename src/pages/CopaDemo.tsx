import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { theSportsDbService } from '../services/theSportsDbService';
import { analysisService } from '../services/analysisService';
import { useAuth } from '../contexts/AuthContext';
import type { TsdbEvent, TsdbLineupPlayer } from '../types/thesportsdb';
import type { Player } from '../types/Player';
import CopaFixtureCard from '../components/copa/CopaFixtureCard';

// ── Design tokens (v2) ────────────────────────────────────────
const BG  = '#07090c';
const S   = '#0c1016';
const BDR = 'rgba(255,255,255,0.06)';
const AC  = '#00e676';
const GD  = '#f59e0b';
const T   = '#dde5ef';
const T2  = '#566b82';
const T3  = '#243040';
const BC  = "'Barlow Condensed', sans-serif";

// Premier League 2025/26 — real finished matches to demo Copa UI
const DEMO_LEAGUE = '4328';

// ── Lineup → Player[] ─────────────────────────────────────────
function posToRow(pos: string): number {
  const p = pos.toUpperCase().trim();
  if (p === 'GK' || p.includes('GOALKEEPER')) return 0;
  if (['CB','RB','LB','RWB','LWB'].includes(p) ||
      ['DEFENDER','CENTRE-BACK','RIGHT BACK','LEFT BACK','WING BACK','FULLBACK','CENTRE BACK'].some(x => p.includes(x))) return 1;
  if (['CF','ST','RW','LW'].includes(p) ||
      ['STRIKER','FORWARD','WINGER','WING','CENTRE-FORWARD'].some(x => p.includes(x))) return 3;
  return 2;
}

function tsdbLineupToPlayers(lineup: TsdbLineupPlayer[], isHome: boolean): Player[] {
  const starters = lineup.filter(p => p.strSubstitute === 'No' && (isHome ? p.strHome === 'Yes' : p.strHome === 'No'));
  if (starters.length === 0) return [];
  const rowMap: Record<number, TsdbLineupPlayer[]> = { 0:[], 1:[], 2:[], 3:[] };
  starters.forEach(p => rowMap[posToRow(p.strPosition)].push(p));
  const usedRows = ([0,1,2,3] as const).filter(r => rowMap[r].length > 0);
  const totalRows = usedRows.length;
  const result: Player[] = [];
  usedRows.forEach((row, ri) => {
    const xPct = totalRows > 1 ? ri / (totalRows - 1) : 0;
    const x = isHome ? 5 + xPct * 40 : 95 - xPct * 40;
    const rowPlayers = rowMap[row];
    rowPlayers.forEach((p, i) => {
      const numId = parseInt(p.idPlayer.replace(/\D/g,'').slice(-7), 10);
      result.push({
        id: isNaN(numId) ? (isHome ? 1000 : 2000) + ri*100 + i : numId,
        name: p.strPlayer,
        number: parseInt(p.intSquadNumber ?? '0', 10) || 0,
        position: { x, y: (100 / (rowPlayers.length + 1)) * (i + 1) },
        isStarter: true,
      });
    });
  });
  return result;
}

export default function CopaDemo() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [fixtures, setFixtures] = useState<TsdbEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingId, setCreatingId] = useState<string | null>(null);

  useEffect(() => {
    theSportsDbService.getLeaguePastFixtures(DEMO_LEAGUE)
      .then(data => setFixtures(data.slice(0, 5)))
      .finally(() => setLoading(false));
  }, []);

  const handleCreateAnalysis = async (fixture: TsdbEvent) => {
    if (!user) { navigate('/login'); return; }
    setCreatingId(fixture.idEvent);
    try {
      const lineupData = await theSportsDbService.getLineup(fixture.idEvent);
      let extraPlayers: Partial<{ homePlayersDef:Player[]; homePlayersOff:Player[]; awayPlayersDef:Player[]; awayPlayersOff:Player[] }> = {};
      if (lineupData.length > 0) {
        const home = tsdbLineupToPlayers(lineupData, true);
        const away = tsdbLineupToPlayers(lineupData, false);
        if (home.length > 0 && away.length > 0) {
          extraPlayers = { homePlayersDef:home, homePlayersOff:home.map(p=>({...p})), awayPlayersDef:away, awayPlayersOff:away.map(p=>({...p})) };
        }
      }
      const id = await analysisService.createBlankAnalysis('analise_completa', {
        titulo: `${fixture.strHomeTeam} × ${fixture.strAwayTeam}`,
        homeTeam: fixture.strHomeTeam,
        awayTeam: fixture.strAwayTeam,
        homeTeamLogo: fixture.strHomeTeamBadge ?? '',
        awayTeamLogo: fixture.strAwayTeamBadge ?? '',
        matchDate: fixture.dateEvent,
        tags: ['Demo', 'Premier League'],
        ...extraPlayers,
      });
      navigate(`/analysis-complete/saved/${id}`);
    } catch {
      toast.error('Erro ao criar análise.');
    } finally {
      setCreatingId(null);
    }
  };

  return (
    <div style={{ background:BG, color:T, minHeight:'100vh', fontFamily:"'Inter', system-ui, sans-serif", fontSize:14, WebkitFontSmoothing:'antialiased' } as React.CSSProperties}>
      {/* ── Header ── */}
      <header style={{
        position:'sticky', top:0, zIndex:20, height:52,
        background:'rgba(7,9,12,0.95)', backdropFilter:'blur(14px)',
        borderBottom:`1px solid ${BDR}`,
        display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 24px',
      }}>
        <button onClick={() => navigate('/copa')} style={{ display:'flex', alignItems:'center', gap:8, border:'none', background:'none', cursor:'pointer', color:T2, fontSize:13 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Voltar para Copa
        </button>
        <span style={{ fontFamily:BC, fontSize:13, fontWeight:700, color:T3, letterSpacing:'.04em', textTransform:'uppercase' }}>
          Demonstração
        </span>
      </header>

      {/* ── Info strip (matches hero style) ── */}
      <div style={{ borderBottom:`1px solid ${BDR}` }}>
        <div style={{
          padding:'7px 24px', borderBottom:`1px solid ${BDR}`,
          display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap',
        }}>
          <span style={{ fontSize:10.5, fontWeight:600, letterSpacing:'.07em', color:T2, textTransform:'uppercase' }}>
            ⚽ Prévia · Como ficará a Copa 2026
          </span>
          <span style={{ fontSize:10.5, fontWeight:600, color:T3, letterSpacing:'.04em' }}>
            Premier League 2025/26
          </span>
        </div>
        <div style={{ padding:'24px 24px 20px', display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:24, flexWrap:'wrap' }}>
          <div>
            <h1 style={{ fontFamily:BC, fontSize:'clamp(32px,4vw,56px)', fontWeight:900, color:'#fff', lineHeight:.92, letterSpacing:'-.01em', marginBottom:10 }}>
              DEMO<br/>PREMIER
            </h1>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:28, height:2.5, background:AC, borderRadius:2 }} />
              <span style={{ fontFamily:BC, fontSize:18, fontWeight:700, color:AC, letterSpacing:'.01em' }}>no Zona 14</span>
            </div>
          </div>
          <div style={{ background:S, borderRadius:8, padding:'12px 16px', border:`1px solid rgba(0,230,118,0.2)`, borderLeft:`3px solid ${AC}`, maxWidth:320 }}>
            <p style={{ fontSize:12, fontWeight:700, color:AC, marginBottom:4 }}>Como funciona</p>
            <p style={{ fontSize:12, color:T2, lineHeight:1.6 }}>
              Jogos reais com dados completos — clique em <strong style={{color:T}}>Escalação</strong>,{' '}
              <strong style={{color:T}}>Eventos</strong> e <strong style={{color:T}}>Stats</strong>.
              Assim ficará a Copa 2026 a partir de 11 de junho.
            </p>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ padding:'0 24px', paddingBottom:64 }}>
        <div style={{ paddingTop:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
            <span style={{ fontFamily:BC, fontSize:11.5, fontWeight:800, letterSpacing:'.09em', textTransform:'uppercase', color:T2, whiteSpace:'nowrap' }}>
              Rodada recente
            </span>
            <div style={{ flex:1, height:1, background:BDR }} />
          </div>

          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {[1,2,3].map(i => <div key={i} style={{ height:130, background:S, borderRadius:6, opacity:.5 }} />)}
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {fixtures.map(f => (
                <CopaFixtureCard
                  key={f.idEvent}
                  fixture={f}
                  onCreateAnalysis={handleCreateAnalysis}
                  isCreating={creatingId === f.idEvent}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding:'14px 24px', borderTop:`1px solid ${BDR}`, fontSize:11, color:T3 }}>
        Dados reais via TheSportsDB · Prévia da Copa do Mundo 2026
      </div>
    </div>
  );
}
