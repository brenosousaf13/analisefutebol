import React from 'react';
import { RefreshCw } from 'lucide-react';
import { FootballApiError, FootballPlanError } from '../../services/footballRequestQueue';

/** Placeholder de cards enquanto o dia carrega. */
export const AgendaSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
    <div role="status" aria-label="Carregando partidas" className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
            <span className="h-10 w-10 animate-pulse rounded-full bg-surface-overlay" />
            <span className="h-4 w-40 animate-pulse rounded bg-surface-overlay" />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: count }, (_, i) => (
                <span key={i} className="h-[108px] animate-pulse rounded-control border border-line bg-surface-raised" />
            ))}
        </div>
    </div>
);

function agendaErrorMessage(error: unknown): string {
    return error instanceof FootballApiError ? error.message : 'Não foi possível carregar as partidas.';
}

interface Props {
    error: unknown;
    onRetry: () => void;
    /** Quando informado, aparece "Voltar para hoje" nos erros de plano. */
    onToday?: () => void;
}

/** Erro que ocupa o lugar do grid (quando não há nenhuma partida para mostrar). */
export const AgendaNotice: React.FC<Props> = ({ error, onRetry, onToday }) => {
    const planLimited = error instanceof FootballPlanError;
    return (
        <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-card border border-line bg-surface-raised px-6 py-10 text-center">
            <p className="text-sm font-semibold text-content-primary">{agendaErrorMessage(error)}</p>
            {planLimited && (
                <p className="text-xs text-content-secondary">
                    Datas fora desse intervalo só ficam disponíveis em um plano pago da API-Football.
                </p>
            )}
            <div className="mt-1 flex flex-wrap justify-center gap-2">
                {planLimited && onToday && (
                    <button
                        type="button"
                        onClick={onToday}
                        className="rounded-control bg-brand-primary px-4 py-2 text-sm font-semibold text-nav-dark transition-opacity hover:opacity-90"
                    >
                        Voltar para hoje
                    </button>
                )}
                <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex items-center gap-2 rounded-control border border-line px-4 py-2 text-sm text-content-secondary transition-colors hover:border-line-strong hover:text-content-primary"
                >
                    <RefreshCw size={14} />
                    Tentar novamente
                </button>
            </div>
        </div>
    );
};
