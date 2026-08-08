import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import TeamLogoImage from '../TeamLogoImage';
import { analysisService } from '../../services/analysisService';
import type { AnalysisData, SavedAnalysisSummary } from '../../services/analysisService';
import { sanitizeNoteHtml, isEmptyHtml } from '../../utils/sanitizeHtml';
import { formatShortDate } from '../../utils/formatDate';

type TeamSide = 'home' | 'away';

/** Placar e campeonato vindos da API-Football, quando a analise tem fixture_id. */
export interface FixtureEnrichment {
    homeScore?: number | null;
    awayScore?: number | null;
    competition?: string;
}

interface Props {
    analysis: SavedAnalysisSummary;
    enrichment?: FixtureEnrichment;
    expanded: boolean;
    onToggle: () => void;
    onOpen: (id: string) => void;
}

/**
 * Linha da lista de "Ultimas analises".
 *
 * Colapsada mostra o confronto alinhado a esquerda, com placar e campeonato.
 * Expandida carrega a analise sob demanda para exibir a anotacao do time, com
 * um switcher entre os dois.
 */
const AnalysisAccordionRow: React.FC<Props> = ({ analysis, enrichment, expanded, onToggle, onOpen }) => {
    const [detail, setDetail] = useState<AnalysisData | null>(null);
    const [failed, setFailed] = useState(false);
    const [side, setSide] = useState<TeamSide>('home');

    // Guarda em ref (e nao em state) para nao disparar render nem re-executar o efeito.
    const requested = useRef(false);

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

    const loading = expanded && !detail && !failed;

    const homeName = analysis.home_team_name || 'Casa';
    const awayName = analysis.away_team_name || 'Visitante';

    // O placar da API vence o salvo: a analise costuma ser criada antes do jogo.
    const homeScore = enrichment?.homeScore ?? analysis.home_score;
    const awayScore = enrichment?.awayScore ?? analysis.away_score;
    const hasScore = homeScore != null && awayScore != null;

    const competition = enrichment?.competition || analysis.competition;

    // Analises novas tem a anotacao unica em HTML; as antigas ainda tem os dois
    // campos de fase. Enquanto os dados nao sao migrados, os dois caminhos valem.
    const noteHtml = detail ? (side === 'home' ? detail.homeNoteHtml : detail.awayNoteHtml) : undefined;
    const legacyOff = detail ? (side === 'home' ? detail.homeOffensiveNotes : detail.awayOffensiveNotes) : '';
    const legacyDef = detail ? (side === 'home' ? detail.homeDefensiveNotes : detail.awayDefensiveNotes) : '';
    const hasRich = !isEmptyHtml(noteHtml);
    const hasLegacy = !!legacyOff?.trim() || !!legacyDef?.trim();

    return (
        <div className="border-b border-line-subtle last:border-b-0">
            <button
                onClick={onToggle}
                aria-expanded={expanded}
                className="flex w-full items-center gap-3 px-1 py-3.5 text-left transition-colors hover:bg-surface-overlay/50 sm:gap-4"
            >
                {/* Confronto — encostado a esquerda do bloco */}
                <span className="flex min-w-0 shrink items-center gap-2 sm:w-[360px] sm:shrink-0">
                    <TeamLogoImage logoUrl={analysis.home_team_logo} teamName={homeName} className="h-6 w-6 shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-content-primary">{homeName}</span>

                    <span className="shrink-0 rounded-md bg-surface-overlay px-2 py-1 text-xs font-bold tabular-nums text-content-primary">
                        {hasScore ? `${homeScore}-${awayScore}` : 'vs'}
                    </span>

                    <TeamLogoImage logoUrl={analysis.away_team_logo} teamName={awayName} className="h-6 w-6 shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-content-primary">{awayName}</span>
                </span>

                <span className="hidden min-w-0 flex-1 truncate text-sm text-content-secondary md:block">
                    {competition || '—'}
                </span>

                <span className="ml-auto hidden shrink-0 text-sm tabular-nums text-content-secondary sm:block">
                    {formatShortDate(analysis.created_at)}
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
                            <div className="mb-4 inline-flex rounded-full border border-line bg-surface-overlay p-0.5">
                                {(['home', 'away'] as TeamSide[]).map(s => {
                                    const label = s === 'home' ? homeName : awayName;
                                    const active = side === s;
                                    return (
                                        <button
                                            key={s}
                                            onClick={() => setSide(s)}
                                            aria-pressed={active}
                                            className={`max-w-[150px] truncate rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${active ? 'bg-brand-primary text-nav-dark' : 'text-content-secondary hover:text-content-primary'}`}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>

                            {hasRich ? (
                                // Sanitizado: a mesma anotacao aparece na pagina publica
                                // de analise compartilhada.
                                <div
                                    className="note-content text-sm leading-relaxed text-content-secondary"
                                    dangerouslySetInnerHTML={{ __html: sanitizeNoteHtml(noteHtml) }}
                                />
                            ) : hasLegacy ? (
                                <div className="space-y-3">
                                    {legacyOff?.trim() && (
                                        <div>
                                            <h4 className="mb-1 text-sm font-bold text-content-primary">Fase ofensiva</h4>
                                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-content-secondary">{legacyOff}</p>
                                        </div>
                                    )}
                                    {legacyDef?.trim() && (
                                        <div>
                                            <h4 className="mb-1 text-sm font-bold text-content-primary">Fase defensiva</h4>
                                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-content-secondary">{legacyDef}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm italic text-content-muted">Sem anotações para este time.</p>
                            )}

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
