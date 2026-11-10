import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight } from 'lucide-react';
import DateNavigator from './DateNavigator';
import FixtureGrid from './FixtureGrid';
import SearchField from './SearchField';
import { AgendaNotice, AgendaSkeleton } from './AgendaNotice';
import { useDayFixtures } from '../../hooks/useDayFixtures';
import { apiFootballService } from '../../services/apiFootballService';
import type { ApiFixture } from '../../types/api-football';
import { addDays, addMonths, formatLongDate } from '../../utils/agendaDates';
import { matchesSearch } from '../../utils/leagueDisplay';

// No celular, focar o campo sozinho abriria o teclado por cima da lista.
const FINE_POINTER = typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;

/** Quantos dias à frente a busca de partidas alcança. */
const SEARCH_DAYS_AHEAD = 30;

interface Props {
    open: boolean;
    onClose: () => void;
    today: string;
    creatingFixtureId: number | null;
    onSelect: (fixture: ApiFixture) => void;
}

const ModalBody: React.FC<Omit<Props, 'open'>> = ({ onClose, today, creatingFixtureId, onSelect }) => {
    const navigate = useNavigate();
    const [date, setDate] = useState(today);
    const [query, setQuery] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);
    // scope "all": a mesma consulta do dia, sem o filtro das ligas acompanhadas.
    const { fixtures, loading, error } = useDayFixtures(date, 'all', { follow: date === today, refreshKey });

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            // O calendário trata o próprio Esc; aqui só fecha o modal quando ele não está aberto.
            if (e.key === 'Escape' && !document.querySelector('[role="dialog"][aria-label="Escolher data"]')) onClose();
        };
        document.addEventListener('keydown', onKey);
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = previous;
        };
    }, [onClose]);

    const matchCount = useMemo(
        () => fixtures.filter(f => matchesSearch(f, query, true)).length,
        [fixtures, query],
    );

    const retry = () => {
        apiFootballService.forgetPlanWindow();
        setRefreshKey(v => v + 1);
    };

    const calendarMin = addMonths(today, -6);

    return (
        <div role="dialog" aria-modal="true" aria-labelledby="create-match-title" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />

            <div className="relative flex h-[min(52rem,100%)] w-full max-w-5xl flex-col overflow-hidden rounded-card border border-line bg-surface-base shadow-pop">
                <div className="flex shrink-0 items-start justify-between gap-4 px-5 pb-3 pt-5 sm:px-6">
                    <div>
                        <h2 id="create-match-title" className="text-xl font-bold tracking-tight text-content-primary">Criar partida</h2>
                        <p className="mt-1 text-sm text-content-secondary">
                            Procure qualquer jogo, de qualquer campeonato, e clique nele para começar a análise.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fechar"
                        className="rounded-control p-2 text-content-secondary transition-colors hover:bg-surface-overlay hover:text-content-primary"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-3 px-5 pb-4 sm:px-6">
                    <DateNavigator
                        value={date}
                        today={today}
                        arrowMin={calendarMin}
                        calendarMin={calendarMin}
                        max={addDays(today, SEARCH_DAYS_AHEAD)}
                        onChange={setDate}
                    />
                    <SearchField value={query} onChange={setQuery} placeholder="Pesquisar equipe ou campeonato" autoFocus={FINE_POINTER} widthClass="sm:w-96" />
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-line-subtle px-5 py-5 sm:px-6">
                    {loading && <AgendaSkeleton count={6} />}

                    {!loading && error !== null && fixtures.length === 0 && (
                        <AgendaNotice error={error} onRetry={retry} onToday={date === today ? undefined : () => setDate(today)} />
                    )}

                    {!loading && error === null && fixtures.length === 0 && (
                        <p className="py-10 text-center text-sm text-content-muted">
                            Nenhuma partida encontrada em {formatLongDate(date)}.
                        </p>
                    )}

                    {!loading && fixtures.length > 0 && (
                        <>
                            {matchCount === 0 && (
                                <p className="py-10 text-center text-sm text-content-muted">
                                    Nenhuma partida encontrada para “{query.trim()}” neste dia.
                                </p>
                            )}
                            <FixtureGrid
                                fixtures={fixtures}
                                query={query}
                                searchLeagues
                                creatingFixtureId={creatingFixtureId}
                                onSelect={onSelect}
                            />
                        </>
                    )}
                </div>

                <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-line-subtle px-5 py-3 sm:px-6">
                    <p className="text-xs text-content-muted">Não achou o jogo? Escolha os dois times você mesmo.</p>
                    <button
                        type="button"
                        onClick={() => navigate('/nova-analise')}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-primary transition-opacity hover:opacity-80"
                    >
                        Montar partida manualmente
                        <ArrowRight size={15} />
                    </button>
                </div>
            </div>
        </div>
    );
};

/** "Criar partida": procura qualquer jogo do dia (todas as ligas) e abre a análise dele. */
const CreateMatchModal: React.FC<Props> = ({ open, ...rest }) => (open ? <ModalBody {...rest} /> : null);

export default CreateMatchModal;
