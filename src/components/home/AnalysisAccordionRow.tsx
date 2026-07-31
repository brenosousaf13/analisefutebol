import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import TeamLogoImage from '../TeamLogoImage';
import { analysisService } from '../../services/analysisService';
import type { AnalysisData, SavedAnalysisSummary } from '../../services/analysisService';

type TeamSide = 'home' | 'away';

interface Props {
    analysis: SavedAnalysisSummary;
    expanded: boolean;
    onToggle: () => void;
    onOpen: (id: string) => void;
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

/** Bloco de anotacao com titulo; mostra um vazio explicito em vez de sumir. */
const NoteBlock: React.FC<{ title: string; text?: string }> = ({ title, text }) => (
    <div>
        <h4 className="mb-1 text-sm font-bold text-content-primary">{title}</h4>
        {text?.trim()
            ? <p className="whitespace-pre-wrap text-sm leading-relaxed text-content-secondary">{text}</p>
            : <p className="text-sm italic text-content-muted">Sem anotações nesta fase.</p>
        }
    </div>
);

/**
 * Linha da lista de "Ultimas analises".
 *
 * Colapsada mostra o confronto, campeonato e data. Expandida carrega a analise
 * completa sob demanda para exibir as anotacoes, com um switcher entre os times.
 */
const AnalysisAccordionRow: React.FC<Props> = ({ analysis, expanded, onToggle, onOpen }) => {
    const [detail, setDetail] = useState<AnalysisData | null>(null);
    const [failed, setFailed] = useState(false);
    const [side, setSide] = useState<TeamSide>('home');

    // Guarda em ref (e nao em state) para nao disparar render nem re-executar o efeito.
    const requested = useRef(false);

    // Carrega as anotacoes so quando a linha abre, e apenas uma vez.
    useEffect(() => {
        if (!expanded || requested.current) return;
        requested.current = true;

        let cancelled = false;

        analysisService.getAnalysis(analysis.id)
            .then(data => {
                if (cancelled) return;
                if (data) setDetail(data);
                else setFailed(true);
            })
            .catch(() => { if (!cancelled) setFailed(true); });

        return () => { cancelled = true; };
    }, [expanded, analysis.id]);

    // Derivado — enquanto a linha esta aberta e nada chegou, esta carregando.
    const loading = expanded && !detail && !failed;

    const homeName = analysis.home_team_name || 'Casa';
    const awayName = analysis.away_team_name || 'Visitante';
    const hasScore = analysis.home_score != null && analysis.away_score != null;

    return (
        <div className="border-b border-line-subtle last:border-b-0">
            <button
                onClick={onToggle}
                aria-expanded={expanded}
                className="flex w-full items-center gap-3 px-1 py-4 text-left transition-colors hover:bg-surface-overlay/50 sm:gap-4"
            >
                {/* Confronto */}
                <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                    <span className="hidden min-w-0 flex-1 truncate text-right text-sm font-medium text-content-primary sm:block">
                        {homeName}
                    </span>
                    <TeamLogoImage logoUrl={analysis.home_team_logo} teamName={homeName} className="h-6 w-6 shrink-0" />

                    <span className="shrink-0 rounded-md bg-surface-overlay px-2 py-1 text-xs font-bold tabular-nums text-content-primary">
                        {hasScore ? `${analysis.home_score}-${analysis.away_score}` : 'vs'}
                    </span>

                    <TeamLogoImage logoUrl={analysis.away_team_logo} teamName={awayName} className="h-6 w-6 shrink-0" />
                    <span className="hidden min-w-0 flex-1 truncate text-sm font-medium text-content-primary sm:block">
                        {awayName}
                    </span>

                    {/* No mobile o confronto vira uma linha unica */}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-content-primary sm:hidden">
                        {homeName} <span className="text-content-muted">x</span> {awayName}
                    </span>
                </div>

                <span className="hidden w-40 shrink-0 truncate text-sm text-content-secondary md:block">
                    {analysis.competition || '—'}
                </span>

                <span className="hidden w-20 shrink-0 text-sm tabular-nums text-content-secondary sm:block">
                    {formatDate(analysis.created_at)}
                </span>

                <span className="shrink-0 text-content-muted">
                    {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </span>
            </button>

            {expanded && (
                <div className="pb-5 pl-1 pr-1 sm:pl-2">
                    {loading && (
                        <div className="flex items-center gap-2 py-4 text-sm text-content-muted">
                            <Loader2 size={16} className="animate-spin" />
                            Carregando anotações…
                        </div>
                    )}

                    {failed && (
                        <p className="py-4 text-sm text-red-400">
                            Não foi possível carregar as anotações desta análise.
                        </p>
                    )}

                    {detail && (
                        <>
                            {/* Switcher de time */}
                            <div className="mb-4 inline-flex rounded-full border border-line bg-surface-overlay p-0.5">
                                {(['home', 'away'] as TeamSide[]).map(s => {
                                    const label = s === 'home' ? homeName : awayName;
                                    const active = side === s;
                                    return (
                                        <button
                                            key={s}
                                            onClick={() => setSide(s)}
                                            aria-pressed={active}
                                            className={`
                                                max-w-[140px] truncate rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors
                                                ${active
                                                    ? 'bg-brand-primary text-nav-dark'
                                                    : 'text-content-secondary hover:text-content-primary'
                                                }
                                            `}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="space-y-4">
                                <NoteBlock
                                    title="Fase ofensiva"
                                    text={side === 'home' ? detail.homeOffensiveNotes : detail.awayOffensiveNotes}
                                />
                                <NoteBlock
                                    title="Fase defensiva"
                                    text={side === 'home' ? detail.homeDefensiveNotes : detail.awayDefensiveNotes}
                                />
                            </div>

                            <button
                                onClick={() => onOpen(analysis.id)}
                                className="mt-5 rounded-control bg-surface-hover px-4 py-2 text-sm font-semibold text-content-primary transition-colors hover:bg-brand-primary hover:text-nav-dark"
                            >
                                Abrir
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default AnalysisAccordionRow;
