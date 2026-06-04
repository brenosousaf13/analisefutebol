import { useState } from 'react';
import { ChevronDown, ChevronUp, Users, ArrowRight, Loader2 } from 'lucide-react';
import { apiFootballService } from '../../services/apiFootballService';
import type { ApiFixture, ApiLineup } from '../../types/api-football';
import CopaLineupField from './CopaLineupField';

interface Props {
    fixture: ApiFixture;
    onCreateAnalysis: (fixture: ApiFixture) => void;
    isCreating: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; pulse?: boolean }> = {
    NS:  { label: 'Agendado',       color: '#6b7280' },
    TBD: { label: 'A definir',      color: '#6b7280' },
    '1H':{ label: '1º Tempo',       color: '#22c55e', pulse: true },
    HT:  { label: 'Intervalo',      color: '#f59e0b', pulse: true },
    '2H':{ label: '2º Tempo',       color: '#22c55e', pulse: true },
    ET:  { label: 'Prorrogação',    color: '#f59e0b', pulse: true },
    P:   { label: 'Pênaltis',       color: '#f59e0b', pulse: true },
    FT:  { label: 'Encerrado',      color: '#4b5563' },
    AET: { label: 'Após prorrog.',  color: '#4b5563' },
    PEN: { label: 'Nos pênaltis',   color: '#4b5563' },
    PST: { label: 'Adiado',         color: '#6b7280' },
    CANC:{ label: 'Cancelado',      color: '#ef4444' },
};

const FINISHED = new Set(['FT', 'AET', 'PEN']);
const LIVE     = new Set(['1H', 'HT', '2H', 'ET', 'P']);

function teamColor(lineup: ApiLineup, fallback: string): string {
    const raw = lineup.team.colors?.player?.primary;
    if (raw && /^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw}`;
    return fallback;
}

export default function CopaFixtureCard({ fixture, onCreateAnalysis, isCreating }: Props) {
    const [showLineup, setShowLineup] = useState(false);
    const [lineups, setLineups] = useState<ApiLineup[] | null>(null);
    const [loadingLineups, setLoadingLineups] = useState(false);

    const { fixture: f, teams, goals, score, league } = fixture;
    const shortStatus = f.status.short as string;
    const cfg = STATUS_CONFIG[shortStatus] ?? { label: shortStatus, color: '#6b7280' };
    const isFinished = FINISHED.has(shortStatus);
    const isLive     = LIVE.has(shortStatus);
    const hasScore   = isFinished || isLive;
    const canViewLineup = isFinished || isLive;

    const matchDate = new Date(f.date);
    const dateStr = matchDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
    const timeStr = matchDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

    const handleToggleLineup = async () => {
        if (!showLineup && !lineups && canViewLineup) {
            setLoadingLineups(true);
            try {
                const data = await apiFootballService.getLineups(f.id);
                setLineups(data.length >= 2 ? data : null);
            } catch {
                setLineups(null);
            } finally {
                setLoadingLineups(false);
            }
        }
        setShowLineup(v => !v);
    };

    return (
        <div className="bg-[#141a1a] border border-gray-800/60 rounded-2xl overflow-hidden transition-all">
            {/* Header: round + status */}
            <div className="px-4 pt-3 pb-1 flex items-center justify-between gap-2">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium truncate">{league.round}</span>
                <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1"
                    style={{ background: `${cfg.color}18`, color: cfg.color }}
                >
                    {cfg.pulse && (
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    )}
                    {cfg.label}
                    {isLive && f.status.elapsed ? ` ${f.status.elapsed}'` : ''}
                </span>
            </div>

            {/* Teams + score */}
            <div className="px-4 py-3 flex items-center gap-3">
                {/* Home */}
                <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                    <img
                        src={teams.home.logo}
                        alt={teams.home.name}
                        className="w-10 h-10 object-contain"
                        onError={e => { (e.target as HTMLImageElement).style.opacity = '0'; }}
                    />
                    <span className="text-xs font-bold text-white text-center leading-tight line-clamp-2">
                        {teams.home.name}
                    </span>
                </div>

                {/* Score / Time */}
                <div className="flex flex-col items-center gap-0.5 min-w-[72px]">
                    {hasScore ? (
                        <>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-black text-white tabular-nums">{goals.home ?? 0}</span>
                                <span className="text-gray-600 text-base">–</span>
                                <span className="text-2xl font-black text-white tabular-nums">{goals.away ?? 0}</span>
                            </div>
                            {isFinished && score.penalty.home !== null && (
                                <span className="text-[10px] text-gray-400">
                                    ({score.penalty.home} – {score.penalty.away}) pên.
                                </span>
                            )}
                            {isFinished && (
                                <span className="text-[10px] text-gray-500 mt-0.5">{dateStr}</span>
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
                    <img
                        src={teams.away.logo}
                        alt={teams.away.name}
                        className="w-10 h-10 object-contain"
                        onError={e => { (e.target as HTMLImageElement).style.opacity = '0'; }}
                    />
                    <span className="text-xs font-bold text-white text-center leading-tight line-clamp-2">
                        {teams.away.name}
                    </span>
                </div>
            </div>

            {/* Actions */}
            <div className="px-4 pb-3 flex items-center gap-2">
                {canViewLineup && (
                    <button
                        onClick={handleToggleLineup}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-gray-700/60 hover:border-gray-500 rounded-xl px-3 py-1.5 transition-colors"
                    >
                        <Users size={12} />
                        {loadingLineups ? 'Carregando...' : showLineup ? 'Ocultar' : 'Escalação'}
                        {!loadingLineups && (showLineup ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
                    </button>
                )}

                <button
                    onClick={() => onCreateAnalysis(fixture)}
                    disabled={isCreating}
                    className="ml-auto flex items-center gap-1.5 text-xs font-bold text-black bg-[#27D888] hover:bg-green-400 disabled:opacity-50 rounded-xl px-3 py-1.5 transition-colors"
                >
                    {isCreating ? (
                        <Loader2 size={12} className="animate-spin" />
                    ) : (
                        <ArrowRight size={12} />
                    )}
                    Criar análise
                </button>
            </div>

            {/* Expandable lineup */}
            {showLineup && (
                <div className="border-t border-gray-800/40 px-4 pb-4 pt-3">
                    {loadingLineups ? (
                        <div className="h-32 flex items-center justify-center gap-2 text-gray-500 text-sm">
                            <Loader2 size={16} className="animate-spin" />
                            Carregando escalação...
                        </div>
                    ) : lineups && lineups.length >= 2 ? (
                        <>
                            {/* Formation badges */}
                            <div className="flex justify-between text-xs text-gray-400 mb-3 px-1">
                                <div className="flex items-center gap-1.5">
                                    <span
                                        className="w-2.5 h-2.5 rounded-full"
                                        style={{ backgroundColor: teamColor(lineups[0], '#dc2626') }}
                                    />
                                    <span className="font-bold">{lineups[0].formation}</span>
                                    <span className="text-gray-600">{lineups[0].team.name}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-gray-600">{lineups[1].team.name}</span>
                                    <span className="font-bold">{lineups[1].formation}</span>
                                    <span
                                        className="w-2.5 h-2.5 rounded-full"
                                        style={{ backgroundColor: teamColor(lineups[1], '#2563eb') }}
                                    />
                                </div>
                            </div>
                            <CopaLineupField homeLineup={lineups[0]} awayLineup={lineups[1]} />
                        </>
                    ) : (
                        <div className="h-12 flex items-center justify-center text-gray-500 text-sm">
                            Escalação não disponível para este jogo.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
