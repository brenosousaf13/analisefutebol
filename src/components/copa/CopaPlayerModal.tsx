import { useState, useEffect, useRef, useCallback } from 'react';
import { theSportsDbService } from '../../services/theSportsDbService';
import type { TsdbPlayer, TsdbHonour, TsdbFormerTeam } from '../../types/thesportsdb';
import { teamPt } from '../../utils/teamNames';

const S   = '#0c1016';
const S2  = '#111820';
const BDR = 'rgba(255,255,255,0.06)';
const BDR2= 'rgba(255,255,255,0.1)';
const AC  = '#00e676';
const GD  = '#f59e0b';
const T   = '#dde5ef';
const T2  = '#566b82';
const T3  = '#243040';
const BC  = "'Barlow Condensed', sans-serif";

interface Props {
  onClose: () => void;
}

function PlayerPhoto({ src, name, size = 80 }: { src: string | null; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  return (
    <div style={{
      width: size, height: size, borderRadius: size > 50 ? 10 : 6, overflow: 'hidden', flexShrink: 0,
      background: S2, border: `1.5px solid ${BDR2}`,
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

// ── Player Profile ────────────────────────────────────────────
function PlayerProfile({ player }: { player: TsdbPlayer }) {
  const [honours, setHonours] = useState<TsdbHonour[] | null>(null);
  const [formerTeams, setFormerTeams] = useState<TsdbFormerTeam[] | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);

  useEffect(() => {
    setLoadingDetails(true);
    Promise.all([
      theSportsDbService.getPlayerHonours(player.idPlayer),
      theSportsDbService.getPlayerFormerTeams(player.idPlayer),
    ]).then(([h, ft]) => {
      setHonours(h);
      setFormerTeams(ft);
    }).finally(() => setLoadingDetails(false));
  }, [player.idPlayer]);

  // Group honours by honour name
  const groupedHonours = honours
    ? Object.entries(
        honours.reduce<Record<string, string[]>>((acc, h) => {
          if (!acc[h.strHonour]) acc[h.strHonour] = [];
          acc[h.strHonour].push(h.strSeason);
          return acc;
        }, {})
      ).sort(([a], [b]) => a.localeCompare(b))
    : [];

  return (
    <div>
      {/* Player header */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 20 }}>
        <PlayerPhoto src={player.strCutout ?? player.strThumb} name={player.strPlayer} size={88} />
        <div style={{ flex: 1 }}>
          <h2 style={{ fontFamily: BC, fontSize: 26, fontWeight: 900, color: T, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.01em' }}>
            {player.strPlayer}
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {player.strNationality && (
              <span style={{ fontSize: 11, fontWeight: 600, color: T2, background: S2, padding: '3px 8px', borderRadius: 4, border: `1px solid ${BDR}` }}>
                🌍 {teamPt(player.strNationality)}
              </span>
            )}
            {player.strPosition && (
              <span style={{ fontSize: 11, fontWeight: 600, color: AC, background: `${AC}12`, padding: '3px 8px', borderRadius: 4, border: `1px solid ${AC}28` }}>
                {player.strPosition}
              </span>
            )}
            {player.strTeam && (
              <span style={{ fontSize: 11, fontWeight: 600, color: T3, background: S2, padding: '3px 8px', borderRadius: 4, border: `1px solid ${BDR}` }}>
                {player.strTeam}
              </span>
            )}
          </div>
          {player.dateBorn && player.dateBorn !== '0000-00-00' && (
            <div style={{ fontSize: 11, color: T3 }}>
              Nascimento: {new Date(player.dateBorn).toLocaleDateString('pt-BR')}
              {calcAge(player.dateBorn) && ` · ${calcAge(player.dateBorn)}`}
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {player.strDescriptionEN && (
        <div style={{ marginBottom: 16, padding: '10px 12px', background: S2, borderRadius: 6, border: `1px solid ${BDR}` }}>
          <p style={{ fontSize: 12, color: T2, lineHeight: 1.7 }}>
            {player.strDescriptionEN.slice(0, 300)}{player.strDescriptionEN.length > 300 ? '...' : ''}
          </p>
        </div>
      )}

      {loadingDetails ? (
        <div style={{ padding: '16px 0', textAlign: 'center', color: T3, fontSize: 12 }}>
          Carregando carreira...
        </div>
      ) : (
        <>
          {/* Honours */}
          {groupedHonours.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontFamily: BC, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.08em', color: GD }}>
                  🏆 Títulos
                </span>
                <div style={{ flex: 1, height: 1, background: BDR }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {groupedHonours.map(([honour, seasons]) => (
                  <div key={honour} style={{
                    display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                    padding: '7px 10px', background: S2, borderRadius: 5,
                    border: `1px solid ${BDR}`, borderLeft: `2px solid ${GD}40`,
                  }}>
                    <span style={{ fontSize: 12, color: T }}>{honour}</span>
                    <span style={{ fontSize: 11, color: T3, marginLeft: 8, textAlign: 'right', flexShrink: 0 }}>
                      {seasons.length > 3
                        ? `${seasons.slice(0,3).join(', ')} +${seasons.length - 3}`
                        : seasons.join(', ')
                      }
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Former teams */}
          {formerTeams && formerTeams.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontFamily: BC, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.08em', color: T2 }}>
                  ⚽ Histórico de Clubes
                </span>
                <div style={{ flex: 1, height: 1, background: BDR }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {formerTeams.map((ft, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 10px', background: S2, borderRadius: 5, border: `1px solid ${BDR}`,
                  }}>
                    {ft.strLogo ? (
                      <img src={ft.strLogo} alt={ft.strFormer} style={{ width: 22, height: 22, objectFit: 'contain' }} />
                    ) : (
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: T3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 7, color: S, fontWeight: 700 }}>{ft.strFormer.slice(0,2)}</span>
                      </div>
                    )}
                    <span style={{ flex: 1, fontSize: 12, color: T }}>{ft.strFormer}</span>
                    {(ft.intJoined || ft.intDeparted) && (
                      <span style={{ fontSize: 10, color: T3 }}>
                        {ft.intJoined ?? '?'} – {ft.intDeparted ?? 'atual'}
                      </span>
                    )}
                    {ft.strMoveType && (
                      <span style={{ fontSize: 9, color: T3, background: BDR, padding: '2px 5px', borderRadius: 3 }}>
                        {ft.strMoveType}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {groupedHonours.length === 0 && (!formerTeams || formerTeams.length === 0) && (
            <p style={{ fontSize: 12, color: T3, textAlign: 'center', padding: '16px 0' }}>
              Dados de carreira não disponíveis.
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────
export default function CopaPlayerModal({ onClose }: Props) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<TsdbPlayer[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<TsdbPlayer | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = useCallback((value: string) => {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 3) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const res = await theSportsDbService.searchPlayers(value);
      setResults(res.slice(0, 10));
      setSearching(false);
    }, 400);
  }, []);

  // Close on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '60px 16px 24px', overflowY: 'auto',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 560,
        background: S, borderRadius: 10,
        border: `1px solid ${BDR2}`,
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        overflow: 'hidden',
      }}>
        {/* Search bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
          borderBottom: `1px solid ${BDR}`,
          background: 'rgba(255,255,255,0.025)',
        }}>
          {selectedPlayer ? (
            <button
              onClick={() => { setSelectedPlayer(null); setTimeout(() => inputRef.current?.focus(), 50); }}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: T2, padding: 0, display: 'flex', alignItems: 'center' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T3} strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          )}
          <input
            ref={inputRef}
            value={q}
            onChange={e => { setSelectedPlayer(null); handleSearch(e.target.value); }}
            placeholder="Buscar jogador... (ex: Vinícius, Mbappe, Messi)"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontSize: 14, color: T,
            }}
          />
          {searching && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T3} strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          )}
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: T3, display: 'flex', alignItems: 'center', padding: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '14px 16px', maxHeight: 'calc(80vh - 60px)', overflowY: 'auto' }}>
          {selectedPlayer ? (
            <PlayerProfile player={selectedPlayer} />
          ) : q.length < 3 ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontFamily: BC, fontSize: 28, fontWeight: 900, color: T3, marginBottom: 6 }}>
                🔍 JOGADORES
              </div>
              <p style={{ fontSize: 13, color: T3, lineHeight: 1.6 }}>
                Digite o nome de um jogador para ver o perfil completo com títulos e histórico de clubes.
              </p>
              <p style={{ fontSize: 11, color: T3, marginTop: 8 }}>
                Mínimo 3 caracteres
              </p>
            </div>
          ) : results.length === 0 && !searching ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <p style={{ fontSize: 13, color: T3 }}>Nenhum jogador encontrado para "{q}"</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {results.map(player => (
                <button
                  key={player.idPlayer}
                  onClick={() => setSelectedPlayer(player)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
                    background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 6,
                    cursor: 'pointer', textAlign: 'left', transition: 'background .1s, border-color .1s',
                    width: '100%',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = S2; (e.currentTarget as HTMLButtonElement).style.borderColor = BDR2; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.borderColor = BDR; }}
                >
                  <PlayerPhoto src={player.strCutout ?? player.strThumb} name={player.strPlayer} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T }}>{player.strPlayer}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                      {player.strNationality && (
                        <span style={{ fontSize: 10, color: T3 }}>{teamPt(player.strNationality)}</span>
                      )}
                      {player.strPosition && (
                        <span style={{ fontSize: 10, color: AC }}>· {player.strPosition}</span>
                      )}
                      {player.strTeam && (
                        <span style={{ fontSize: 10, color: T3 }}>· {player.strTeam}</span>
                      )}
                    </div>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T3} strokeWidth="2">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
