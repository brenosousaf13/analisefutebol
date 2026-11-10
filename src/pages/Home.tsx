import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { Plus } from 'lucide-react';
import AppLayout from '../layouts/AppLayout';
import DateNavigator from '../components/home/DateNavigator';
import SearchField from '../components/home/SearchField';
import FixtureGrid from '../components/home/FixtureGrid';
import CreateMatchModal from '../components/home/CreateMatchModal';
import { AgendaNotice, AgendaSkeleton } from '../components/home/AgendaNotice';
import { useDayFixtures } from '../hooks/useDayFixtures';
import { useFixtureLineups } from '../hooks/useFixtureLineups';
import { apiFootballService } from '../services/apiFootballService';
import { createAnalysisFromFixture } from '../services/fixtureAnalysisService';
import type { ApiFixture } from '../types/api-football';
import { AGENDA_DATE_NAVIGATION_ENABLED, agendaBounds, clampDate, formatLongDate, todayInBrasilia } from '../utils/agendaDates';
import { matchesSearch } from '../utils/leagueDisplay';

const Home: React.FC = () => {
    const navigate = useNavigate();

    // Hoje no calendário de Brasília; confere de novo ao voltar para a aba, para virar à meia-noite.
    const [today, setToday] = useState(() => todayInBrasilia());
    useEffect(() => {
        const sync = () => setToday(todayInBrasilia());
        const interval = window.setInterval(sync, 60000);
        document.addEventListener('visibilitychange', sync);
        window.addEventListener('focus', sync);
        return () => {
            window.clearInterval(interval);
            document.removeEventListener('visibilitychange', sync);
            window.removeEventListener('focus', sync);
        };
    }, []);

    // null = acompanhando "hoje". Assim a tela vira o dia sozinha se ficar aberta de madrugada.
    const [picked, setPicked] = useState<string | null>(null);
    const bounds = useMemo(() => agendaBounds(today), [today]);
    // Sem navegação de datas (plano gratuito da API), a tela mostra sempre hoje.
    const date = AGENDA_DATE_NAVIGATION_ENABLED && picked !== null
        ? clampDate(picked, bounds.calendarMin, bounds.max)
        : today;

    const [query, setQuery] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);
    const [modalOpen, setModalOpen] = useState(false);
    const [creatingFixtureId, setCreatingFixtureId] = useState<number | null>(null);

    const { fixtures, loading, error } = useDayFixtures(date, 'tracked', { follow: date === today, refreshKey });

    // Escalações confirmadas: só jogos que começam em até 1h e só cards visíveis (ver useFixtureLineups).
    const gridRef = useRef<HTMLDivElement>(null);
    const { statuses, now } = useFixtureLineups(fixtures, gridRef);
    const confirmedIds = useMemo(() => {
        const ids = new Set<number>();
        for (const [id, status] of statuses) if (status === 'confirmed') ids.add(id);
        return ids;
    }, [statuses]);

    const matchCount = useMemo(
        () => fixtures.filter(f => matchesSearch(f, query)).length,
        [fixtures, query],
    );

    const changeDate = (next: string) => setPicked(next === today ? null : next);

    const retry = () => {
        apiFootballService.forgetPlanWindow();
        setRefreshKey(value => value + 1);
    };

    const handleSelect = async (fixture: ApiFixture) => {
        if (creatingFixtureId !== null) return;

        setCreatingFixtureId(fixture.fixture.id);
        try {
            const { analysisId, usedRealLineups } = await createAnalysisFromFixture(fixture);

            if (!usedRealLineups) {
                toast('Escalação ainda não publicada — análise criada com time padrão.', {
                    icon: '⚠️',
                    duration: 5000,
                });
            }
            navigate(`/analysis-complete/saved/${analysisId}`);
        } catch {
            toast.error('Não foi possível criar a análise deste jogo.');
            setCreatingFixtureId(null);
        }
    };

    const filtering = query.trim().length > 0;

    return (
        <AppLayout bare>
            <div className="mx-auto w-full max-w-[1400px] px-4 py-6 lg:px-8 lg:py-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-2xl font-bold tracking-tight text-content-primary">Análise de partida</h1>
                    <button
                        type="button"
                        onClick={() => setModalOpen(true)}
                        className="inline-flex items-center gap-2 rounded-control bg-brand-primary px-4 py-2.5 text-sm font-bold text-nav-dark transition-opacity hover:opacity-90"
                    >
                        <Plus size={16} strokeWidth={3} />
                        Criar partida
                    </button>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                    {AGENDA_DATE_NAVIGATION_ENABLED && (
                        <DateNavigator
                            value={date}
                            today={today}
                            arrowMin={bounds.arrowMin}
                            calendarMin={bounds.calendarMin}
                            max={bounds.max}
                            onChange={changeDate}
                        />
                    )}
                    <SearchField value={query} onChange={setQuery} placeholder="Pesquisar equipe" />
                </div>

                <p className="mb-6 mt-6 text-sm text-content-secondary" aria-live="polite">
                    {formatLongDate(date)}
                    {!loading && fixtures.length > 0 && (
                        <span className="text-content-muted">
                            {' · '}
                            {filtering ? `${matchCount} de ${fixtures.length}` : fixtures.length}{' '}
                            {fixtures.length === 1 ? 'partida' : 'partidas'}
                        </span>
                    )}
                </p>

                {error !== null && fixtures.length > 0 && (
                    <div role="alert" className="mb-5 flex flex-wrap items-center gap-2 text-xs text-amber-300">
                        <span>Não foi possível atualizar a agenda.</span>
                        <button type="button" onClick={retry} className="font-semibold underline">Tentar novamente</button>
                    </div>
                )}

                {loading && <AgendaSkeleton count={6} />}

                {!loading && error !== null && fixtures.length === 0 && (
                    <AgendaNotice error={error} onRetry={retry} onToday={date === today ? undefined : () => changeDate(today)} />
                )}

                {!loading && error === null && fixtures.length === 0 && (
                    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
                        <p className="text-base font-semibold text-content-primary">
                            {date === today ? 'Não há nenhum jogo hoje.' : 'Não há nenhum jogo neste dia.'}
                        </p>
                        <p className="text-sm text-content-secondary">
                            Nenhuma das competições acompanhadas tem partida marcada. Que tal criar uma partida e começar uma análise?
                        </p>
                        <button
                            type="button"
                            onClick={() => setModalOpen(true)}
                            className="mt-1 inline-flex items-center gap-2 rounded-control bg-brand-primary px-4 py-2.5 text-sm font-bold text-nav-dark transition-opacity hover:opacity-90"
                        >
                            <Plus size={16} strokeWidth={3} />
                            Criar partida
                        </button>
                    </div>
                )}

                {!loading && fixtures.length > 0 && matchCount === 0 && (
                    <p className="py-16 text-center text-sm text-content-muted">
                        Nenhuma equipe encontrada para “{query.trim()}” {date === today ? 'hoje' : 'neste dia'}.
                        {' '}
                        <button type="button" onClick={() => setModalOpen(true)} className="font-semibold text-brand-primary hover:underline">
                            Criar partida
                        </button>
                    </p>
                )}

                {!loading && fixtures.length > 0 && (
                    <FixtureGrid
                        fixtures={fixtures}
                        query={query}
                        confirmedIds={confirmedIds}
                        now={now}
                        creatingFixtureId={creatingFixtureId}
                        onSelect={handleSelect}
                        containerRef={gridRef}
                    />
                )}
            </div>

            <CreateMatchModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                today={today}
            />

            <Toaster position="bottom-right" />
        </AppLayout>
    );
};

export default Home;
