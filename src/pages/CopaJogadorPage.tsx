import { useState, useEffect, useCallback } from 'react';

function useBreakpoint() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const fn = useCallback(() => setW(window.innerWidth), []);
  useEffect(() => {
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, [fn]);
  return { lg: w >= 960 };
}
import { useParams, useNavigate } from 'react-router-dom';
import { theSportsDbService } from '../services/theSportsDbService';
import type { TsdbPlayer, TsdbHonour, TsdbFormerTeam } from '../types/thesportsdb';
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

function calcAge(dateBorn: string | null): string {
  if (!dateBorn || dateBorn === '0000-00-00') return '';
  try {
    const born = new Date(dateBorn);
    const now = new Date();
    let age = now.getFullYear() - born.getFullYear();
    if (now.getMonth() < born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())) age--;
    return `${age} anos`;
  } catch { return ''; }
}

export default function CopaJogadorPage() {
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();
  const { lg } = useBreakpoint();

  const [player, setPlayer] = useState<TsdbPlayer | null>(null);
  const [honours, setHonours] = useState<TsdbHonour[]>([]);
  const [formerTeams, setFormerTeams] = useState<TsdbFormerTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [imgErr, setImgErr] = useState(false);

  useEffect(() => {
    if (!playerId) return;
    setLoading(true);
    setImgErr(false);
    Promise.all([
      theSportsDbService.getPlayerDetails(playerId),
      theSportsDbService.getPlayerHonours(playerId),
      theSportsDbService.getPlayerFormerTeams(playerId),
    ]).then(([p, h, ft]) => {
      setPlayer(p);
      setHonours(h);
      setFormerTeams(ft);
    }).finally(() => setLoading(false));
  }, [playerId]);

  const groupedHonours: [string, string[]][] = honours.length > 0
    ? Object.entries(
        honours
          .filter(h => h.strHonour && h.strSeason)
          .reduce<Record<string, string[]>>((acc, h) => {
            if (!acc[h.strHonour]) acc[h.strHonour] = [];
            acc[h.strHonour].push(h.strSeason);
            return acc;
          }, {})
      ).sort(([a], [b]) => a.localeCompare(b))
    : [];

  const photo = player?.strCutout ?? player?.strThumb;

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
        <button onClick={() => navigate(-1)} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          border: 'none', background: 'none', cursor: 'pointer', color: T2, fontSize: 13,
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Voltar
        </button>
        <span style={{ fontSize: 11, fontWeight: 600, color: T3, letterSpacing: '.05em', textTransform: 'uppercase' }}>
          Perfil do Jogador
        </span>
      </header>

      {loading ? (
        <div style={{ padding: lg ? '80px 24px' : '60px 12px', textAlign: 'center', color: T3, fontSize: 14 }}>
          Carregando perfil...
        </div>
      ) : !player ? (
        <div style={{ padding: lg ? '80px 24px' : '60px 12px', textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: T2, marginBottom: 12 }}>Jogador não encontrado.</p>
          <button onClick={() => navigate(-1)} style={{ color: AC, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>Voltar</button>
        </div>
      ) : (
        <>
          {/* Hero */}
          <div style={{
            padding: lg ? '32px 24px' : '16px 12px',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
            borderBottom: `1px solid ${BDR}`,
          }}>
            <div style={{ maxWidth: 800, display: 'flex', gap: lg ? 24 : 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {/* Large photo */}
              <div style={{
                width: lg ? 144 : 96, height: lg ? 144 : 96, borderRadius: 12, overflow: 'hidden', flexShrink: 0,
                background: S2, border: `2px solid ${BDR2}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {photo && !imgErr ? (
                  <img src={photo} alt={player.strPlayer} onError={() => setImgErr(true)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke={T3} strokeWidth="1">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{
                  fontFamily: BC, fontSize: 'clamp(28px,5vw,52px)', fontWeight: 900,
                  color: '#fff', lineHeight: 0.92, letterSpacing: '-.01em', marginBottom: 14,
                  textTransform: 'uppercase',
                }}>
                  {player.strPlayer}
                </h1>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 10 }}>
                  {player.strNationality && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: T2, background: S2, padding: '4px 10px', borderRadius: 5, border: `1px solid ${BDR}` }}>
                      🌍 {teamPt(player.strNationality)}
                    </span>
                  )}
                  {player.strPosition && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: AC, background: `${AC}12`, padding: '4px 10px', borderRadius: 5, border: `1px solid ${AC}28` }}>
                      {positionPt(player.strPosition)}
                    </span>
                  )}
                  {player.strTeam && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: T3, background: S2, padding: '4px 10px', borderRadius: 5, border: `1px solid ${BDR}` }}>
                      {player.strTeam}
                    </span>
                  )}
                  {player.dateBorn && player.dateBorn !== '0000-00-00' && calcAge(player.dateBorn) && (
                    <span style={{ fontSize: 12, color: T3, background: S2, padding: '4px 10px', borderRadius: 5, border: `1px solid ${BDR}` }}>
                      {calcAge(player.dateBorn)}
                    </span>
                  )}
                </div>
                {player.dateBorn && player.dateBorn !== '0000-00-00' && (
                  <div style={{ fontSize: 11.5, color: T3 }}>
                    Nascimento: {new Date(player.dateBorn).toLocaleDateString('pt-BR')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: lg ? '24px' : '16px 12px', paddingBottom: 64, maxWidth: 800 }}>

            {/* Description */}
            {player.strDescriptionEN && (
              <div style={{ marginBottom: 24, padding: '14px 16px', background: S, borderRadius: 8, border: `1px solid ${BDR}` }}>
                <p style={{ fontSize: 13, color: T2, lineHeight: 1.75 }}>
                  {player.strDescriptionEN.slice(0, 500)}{player.strDescriptionEN.length > 500 ? '...' : ''}
                </p>
              </div>
            )}

            {/* Honours */}
            {groupedHonours.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ fontFamily: BC, fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.08em', color: GD }}>
                    🏆 Títulos
                  </span>
                  <div style={{ flex: 1, height: 1, background: BDR }} />
                  <span style={{ fontSize: 11, color: T3 }}>{honours.length} no total</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {groupedHonours.map(([honour, seasons]) => (
                    <div key={honour} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '9px 12px', background: S, borderRadius: 6,
                      border: `1px solid ${BDR}`, borderLeft: `3px solid ${GD}50`,
                    }}>
                      <span style={{ fontSize: 13, color: T }}>{honour}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 12 }}>
                        <span style={{ fontSize: 11, color: T3 }}>
                          {seasons.length > 3 ? `${seasons.slice(0,3).join(', ')} +${seasons.length - 3}` : seasons.join(', ')}
                        </span>
                        {seasons.length > 1 && (
                          <span style={{ padding: '1px 7px', background: `${GD}18`, borderRadius: 3, color: GD, fontWeight: 800, fontSize: 10, fontFamily: BC }}>
                            {seasons.length}×
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Former teams */}
            {formerTeams.filter(ft => ft.strFormer).length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ fontFamily: BC, fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.08em', color: T2 }}>
                    ⚽ Histórico de Clubes
                  </span>
                  <div style={{ flex: 1, height: 1, background: BDR }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {formerTeams.filter(ft => ft.strFormer).map((ft, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px', background: S, borderRadius: 6, border: `1px solid ${BDR}`,
                    }}>
                      {ft.strLogo ? (
                        <img src={ft.strLogo} alt={ft.strFormer ?? ''} style={{ width: 26, height: 26, objectFit: 'contain', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: T3, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 8, color: S, fontWeight: 700 }}>{(ft.strFormer ?? '').slice(0,2)}</span>
                        </div>
                      )}
                      <span style={{ flex: 1, fontSize: 13, color: T, fontWeight: 500 }}>{ft.strFormer ?? ''}</span>
                      {(ft.intJoined || ft.intDeparted) && (
                        <span style={{ fontSize: 11, color: T3, flexShrink: 0 }}>
                          {ft.intJoined ?? '?'} – {ft.intDeparted ?? 'atual'}
                        </span>
                      )}
                      {ft.strMoveType && (
                        <span style={{ fontSize: 10, color: T3, background: BDR, padding: '2px 6px', borderRadius: 3, flexShrink: 0 }}>
                          {ft.strMoveType}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {groupedHonours.length === 0 && formerTeams.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: T3 }}>
                <p style={{ fontSize: 13 }}>Dados de carreira não disponíveis para este jogador.</p>
              </div>
            )}
          </div>
        </>
      )}

      <div style={{ padding: lg ? '14px 24px' : '14px 12px', borderTop: `1px solid ${BDR}`, fontSize: 11, color: T3 }}>
        Dados via TheSportsDB · Copa do Mundo 2026
      </div>
    </div>
  );
}
