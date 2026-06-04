import { useState } from 'react';
import { ChevronDown, ChevronUp, Users, BarChart2, List, Youtube, ArrowRight, Loader2, MapPin } from 'lucide-react';
import { theSportsDbService } from '../../services/theSportsDbService';
import type { TsdbEvent, TsdbLineupPlayer, TsdbTimeline, TsdbEventStats } from '../../types/thesportsdb';
import CopaLineupField from './CopaLineupField';
import CopaTimeline from './CopaTimeline';
import CopaMatchStats from './CopaMatchStats';

interface Props {
  fixture: TsdbEvent;
  onCreateAnalysis: (fixture: TsdbEvent) => void;
  isCreating: boolean;
}

type Panel = 'lineup' | 'timeline' | 'stats';

const STATUS_CFG: Record<string, { label: string; color: string; pulse?: boolean }> = {
  NS:   { label: 'Agendado',      color: '#6b7280' },
  TBD:  { label: 'A definir',     color: '#6b7280' },
  '1H': { label: '1º Tempo',      color: '#22c55e', pulse: true },
  HT:   { label: 'Intervalo',     color: '#f59e0b', pulse: true },
  '2H': { label: '2º Tempo',      color: '#22c55e', pulse: true },
  ET:   { label: 'Prorrogação',   color: '#f59e0b', pulse: true },
  P:    { label: 'Pênaltis',      color: '#f59e0b', pulse: true },
  FT:   { label: 'Encerrado',     color: '#4b5563' },
  AET:  { label: 'Após prorrog.', color: '#4b5563' },
  PEN:  { label: 'Nos pênaltis',  color: '#4b5563' },
  PST:  { label: 'Adiado',        color: '#6b7280' },
  CANC: { label: 'Cancelado',     color: '#ef4444' },
};

const FINISHED = new Set(['FT', 'AET', 'PEN']);
const LIVE     = new Set(['1H', 'HT', '2H', 'ET', 'P']);

export default function CopaFixtureCard({ fixture, onCreateAnalysis, isCreating }: Props) {
  const [activePanel, setActivePanel] = useState<Panel | null>(null);
  const [lineup, setLineup] = useState<TsdbLineupPlayer[] | null>(null);
  const [timeline, setTimeline] = useState<TsdbTimeline[] | null>(null);
  const [matchStats, setMatchStats] = useState<TsdbEventStats | null | undefined>(undefined);
  const [loadingPanel, setLoadingPanel] = useState<Panel | null>(null);

  const status = fixture.strStatus;
  const cfg = STATUS_CFG[status] ?? { label: status, color: '#6b7280' };
  const isFinished = FINISHED.has(status);
  const isLive     = LIVE.has(status);
  const hasScore   = isFinished || isLive;
  const hasPostMatch = isFinished || isLive;

  // Time in BRT
  const matchDate = new Date(`${fixture.dateEvent}T${fixture.strTime ?? '00:00:00'}Z`);
  const dateStr = matchDate.toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo'
  });
  const timeStr = matchDate.toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo'
  });

  async function openPanel(panel: Panel) {
    if (activePanel === panel) { setActivePanel(null); return; }
    setActivePanel(panel);

    if (panel === 'lineup' && lineup === null) {
      setLoadingPanel('lineup');
      const data = await theSportsDbService.getLineup(fixture.idEvent);
      setLineup(data);
      setLoadingPanel(null);
    }
    if (panel === 'timeline' && timeline === null) {
      setLoadingPanel('timeline');
      const data = await theSportsDbService.getTimeline(fixture.idEvent, isLive);
      setTimeline(data);
      setLoadingPanel(null);
    }
    if (panel === 'stats' && matchStats === undefined) {
      setLoadingPanel('stats');
      const data = await theSportsDbService.getEventStats(fixture.idEvent, isLive);
      setMatchStats(data);
      setLoadingPanel(null);
    }
  }

  function PanelToggle({ panel, icon, label }: { panel: Panel; icon: React.ReactNode; label: string }) {
    const active = activePanel === panel;
    return (
      <button
        onClick={() => openPanel(panel)}
        className={`flex items-center gap-1.5 text-xs border rounded-xl px-2.5 py-1.5 transition-colors ${
          active
            ? 'border-[#27D888]/50 text-[#27D888] bg-[#27D888]/10'
            : 'border-gray-700/60 text-gray-400 hover:text-white hover:border-gray-500'
        }`}
      >
        {icon}
        {label}
        {active ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      </button>
    );
  }

  function PanelContent() {
    if (!activePanel) return null;
    const loading = loadingPanel === activePanel;

    return (
      <div className="border-t border-gray-800/40 px-4 pb-4 pt-3">
        {loading ? (
          <div className="h-24 flex items-center justify-center gap-2 text-gray-500 text-sm">
            <Loader2 size={16} className="animate-spin" />
            Carregando...
          </div>
        ) : activePanel === 'lineup' ? (
          lineup && lineup.length > 0 ? (
            <CopaLineupField
              lineup={lineup}
              homeTeamId={fixture.idHomeTeam}
              awayTeamId={fixture.idAwayTeam}
            />
          ) : (
            <p className="text-center text-xs text-gray-500 py-4">Escalação não disponível.</p>
          )
        ) : activePanel === 'timeline' ? (
          <CopaTimeline
            events={timeline ?? []}
            homeTeamId={fixture.idHomeTeam}
          />
        ) : activePanel === 'stats' ? (
          matchStats ? (
            <CopaMatchStats
              stats={matchStats}
              homeTeam={fixture.strHomeTeam}
              awayTeam={fixture.strAwayTeam}
            />
          ) : (
            <p className="text-center text-xs text-gray-500 py-4">Estatísticas não disponíveis.</p>
          )
        ) : null}
      </div>
    );
  }

  return (
    <div className="bg-[#141a1a] border border-gray-800/60 rounded-2xl overflow-hidden">
      {/* Header: group + status */}
      <div className="px-4 pt-3 pb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {fixture.strGroup && (
            <span className="text-[10px] font-bold text-[#27D888]/80 uppercase tracking-widest shrink-0">
              Grupo {fixture.strGroup}
            </span>
          )}
          {fixture.intRound && !fixture.strGroup && (
            <span className="text-[10px] text-gray-500 truncate">Rodada {fixture.intRound}</span>
          )}
          {(fixture.strVenue || fixture.strCity) && (
            <span className="hidden sm:flex items-center gap-0.5 text-[10px] text-gray-600 truncate">
              <MapPin size={9} />
              {fixture.strVenue ?? fixture.strCity}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isLive && (
            <span className="text-[10px] text-[#22c55e] tabular-nums font-mono">
              {/* Live minute comes from livescore, not fixtures */}
            </span>
          )}
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
            style={{ background: `${cfg.color}18`, color: cfg.color }}
          >
            {cfg.pulse && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Teams + score */}
      <div className="px-4 py-3 flex items-center gap-3">
        {/* Home */}
        <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
          {fixture.strHomeTeamBadge ? (
            <img
              src={fixture.strHomeTeamBadge}
              alt={fixture.strHomeTeam}
              className="w-10 h-10 object-contain"
              onError={e => { (e.target as HTMLImageElement).style.opacity = '0'; }}
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-600 text-xs font-bold">
              {fixture.strHomeTeam.slice(0, 2).toUpperCase()}
            </div>
          )}
          <span className="text-xs font-bold text-white text-center leading-tight line-clamp-2">
            {fixture.strHomeTeam}
          </span>
        </div>

        {/* Score / Time */}
        <div className="flex flex-col items-center gap-0.5 min-w-[80px]">
          {hasScore ? (
            <>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-black tabular-nums ${isLive ? 'text-[#27D888]' : 'text-white'}`}>
                  {fixture.intHomeScore ?? 0}
                </span>
                <span className="text-gray-600 text-base">–</span>
                <span className={`text-2xl font-black tabular-nums ${isLive ? 'text-[#27D888]' : 'text-white'}`}>
                  {fixture.intAwayScore ?? 0}
                </span>
              </div>
              {(fixture.intHomeScorePenalty !== null && fixture.intHomeScorePenalty !== undefined) && (
                <span className="text-[10px] text-gray-400">
                  ({fixture.intHomeScorePenalty} – {fixture.intAwayScorePenalty}) pên.
                </span>
              )}
              {isFinished && (
                <span className="text-[10px] text-gray-500 mt-0.5 capitalize">{dateStr}</span>
              )}
            </>
          ) : (
            <>
              <span className="text-base font-black text-[#27D888]">{timeStr}</span>
              <span className="text-[11px] text-gray-500 capitalize">{dateStr}</span>
            </>
          )}
        </div>

        {/* Away */}
        <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
          {fixture.strAwayTeamBadge ? (
            <img
              src={fixture.strAwayTeamBadge}
              alt={fixture.strAwayTeam}
              className="w-10 h-10 object-contain"
              onError={e => { (e.target as HTMLImageElement).style.opacity = '0'; }}
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-600 text-xs font-bold">
              {fixture.strAwayTeam.slice(0, 2).toUpperCase()}
            </div>
          )}
          <span className="text-xs font-bold text-white text-center leading-tight line-clamp-2">
            {fixture.strAwayTeam}
          </span>
        </div>
      </div>

      {/* Venue on mobile (hidden on header row) */}
      {(fixture.strVenue || fixture.strCity) && (
        <div className="sm:hidden px-4 pb-2 flex items-center gap-1 text-[10px] text-gray-600">
          <MapPin size={9} />
          <span className="truncate">{fixture.strVenue ?? fixture.strCity}</span>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 pb-3 flex items-center gap-1.5 flex-wrap">
        {hasPostMatch && (
          <>
            <PanelToggle panel="lineup"   icon={<Users size={11} />}    label="Escalação" />
            <PanelToggle panel="timeline" icon={<List size={11} />}     label="Eventos" />
            <PanelToggle panel="stats"    icon={<BarChart2 size={11} />} label="Stats" />
          </>
        )}

        {fixture.strVideo && (
          <a
            href={fixture.strVideo}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400/50 rounded-xl px-2.5 py-1.5 transition-colors"
          >
            <Youtube size={11} />
            Highlights
          </a>
        )}

        <button
          onClick={() => onCreateAnalysis(fixture)}
          disabled={isCreating}
          className="ml-auto flex items-center gap-1.5 text-xs font-bold text-black bg-[#27D888] hover:bg-green-400 disabled:opacity-50 rounded-xl px-3 py-1.5 transition-colors shrink-0"
        >
          {isCreating ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}
          Criar análise
        </button>
      </div>

      {/* Expandable panel */}
      <PanelContent />
    </div>
  );
}
