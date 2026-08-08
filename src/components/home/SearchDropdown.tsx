import React from 'react';
import { Loader2, User, Shield, ClipboardList, Swords } from 'lucide-react';
import type { SearchResult } from '../../types/search';

interface Props {
    open: boolean;
    loading: boolean;
    term: string;
    results: SearchResult[];
    onPick: (analysisId: string) => void;
}

const ICON = {
    player: User,
    team: Shield,
    coach: ClipboardList,
    match: Swords,
} as const;

const LABEL = {
    player: 'Jogador',
    team: 'Time',
    coach: 'Técnico',
    match: 'Partida',
} as const;

/** Titulo e subtitulo de cada tipo de resultado, achatados para a lista. */
function describe(r: SearchResult): { title: string; subtitle: string; analysisId?: string } {
    switch (r.type) {
        case 'player':
            return {
                title: r.player_name,
                subtitle: `${r.total_appearances} ${r.total_appearances === 1 ? 'análise' : 'análises'}`,
                analysisId: r.entries[0]?.analysis_id,
            };
        case 'team':
            return {
                title: r.team_name,
                subtitle: `${r.total_analyses} ${r.total_analyses === 1 ? 'análise' : 'análises'}`,
                analysisId: r.entries[0]?.analysis_id,
            };
        case 'coach':
            return {
                title: r.coach_name,
                subtitle: `${r.total_matches} ${r.total_matches === 1 ? 'partida' : 'partidas'}`,
                analysisId: r.entries[0]?.analysis_id,
            };
        case 'match':
            return {
                title: r.analysis.titulo,
                subtitle: r.analysis.competition || 'Partida',
                analysisId: r.analysis.id,
            };
    }
}

/**
 * Resultados da busca da topbar, em dropdown.
 *
 * Recebe tudo pronto: o debounce e a chamada ficam na Home, para o dropdown
 * nao disparar requisicao por conta propria.
 */
const SearchDropdown: React.FC<Props> = ({ open, loading, term, results, onPick }) => {
    if (!open) return null;

    return (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 max-h-96 overflow-y-auto rounded-control border border-line bg-surface-raised p-1 shadow-pop">
            {loading && (
                <div className="flex items-center gap-2 px-3 py-3 text-sm text-content-muted">
                    <Loader2 size={14} className="animate-spin" />
                    Buscando…
                </div>
            )}

            {!loading && term.trim().length < 2 && (
                <p className="px-3 py-3 text-sm text-content-muted">Digite ao menos 2 caracteres.</p>
            )}

            {!loading && term.trim().length >= 2 && results.length === 0 && (
                <p className="px-3 py-3 text-sm text-content-muted">
                    Nada encontrado para “{term.trim()}”.
                </p>
            )}

            {!loading && results.map((r, i) => {
                const { title, subtitle, analysisId } = describe(r);
                const Icon = ICON[r.type];

                return (
                    <button
                        key={`${r.type}-${title}-${i}`}
                        onClick={() => analysisId && onPick(analysisId)}
                        disabled={!analysisId}
                        className="flex w-full items-center gap-3 rounded px-3 py-2 text-left transition-colors hover:bg-surface-hover disabled:cursor-default disabled:opacity-60"
                    >
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-overlay text-content-secondary">
                            <Icon size={14} />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-content-primary">{title}</span>
                            <span className="block truncate text-xs text-content-muted">{subtitle}</span>
                        </span>
                        <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-content-muted">
                            {LABEL[r.type]}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};

export default SearchDropdown;
