import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { Loader2, RefreshCw } from 'lucide-react';
import AppLayout from '../layouts/AppLayout';
import AnalysisAccordionRow from '../components/home/AnalysisAccordionRow';
import UpcomingFixtureCard from '../components/home/UpcomingFixtureCard';
import { analysisService } from '../services/analysisService';
import type { SavedAnalysisSummary } from '../services/analysisService';
import { apiFootballService } from '../services/apiFootballService';
import { createAnalysisFromFixture } from '../services/fixtureAnalysisService';
import type { ApiFixture } from '../types/api-football';

const LATEST_LIMIT = 8;

/** Card de painel — a moldura padrao das secoes da Home. */
const Panel: React.FC<{
    title: string;
    action?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}> = ({ title, action, children, className = '' }) => (
    <section className={`rounded-card border border-line bg-surface-raised shadow-card ${className}`}>
        <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-5">
            <h2 className="text-xl font-bold tracking-tight text-content-primary">{title}</h2>
            {action}
        </div>
        <div className="px-5 pb-5">{children}</div>
    </section>
);

const Home: React.FC = () => {
    const navigate = useNavigate();

    const [search, setSearch] = useState('');
    const [analyses, setAnalyses] = useState<SavedAnalysisSummary[]>([]);
    const [loadingAnalyses, setLoadingAnalyses] = useState(true);
    const [analysesError, setAnalysesError] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const [fixtures, setFixtures] = useState<ApiFixture[]>([]);
    const [loadingFixtures, setLoadingFixtures] = useState(true);
    const [creatingFixtureId, setCreatingFixtureId] = useState<number | null>(null);

    const fetchAnalyses = useCallback(async () => {
        try {
            const list = await analysisService.getMyAnalyses({
                orderBy: 'created_at',
                orderDirection: 'desc',
            });
            setAnalyses(list);
            setAnalysesError(false);
        } catch {
            setAnalysesError(true);
        } finally {
            setLoadingAnalyses(false);
        }
    }, []);

    useEffect(() => { void fetchAnalyses(); }, [fetchAnalyses]);

    // Retry e um evento, entao aqui o setState sincrono e legitimo.
    const retryAnalyses = () => {
        setLoadingAnalyses(true);
        setAnalysesError(false);
        void fetchAnalyses();
    };

    useEffect(() => {
        let cancelled = false;

        apiFootballService.getUpcomingFixtures(10)
            .then(list => { if (!cancelled) setFixtures(list); })
            .catch(() => { if (!cancelled) setFixtures([]); })
            .finally(() => { if (!cancelled) setLoadingFixtures(false); });

        return () => { cancelled = true; };
    }, []);

    // A busca da topbar filtra as ultimas analises pelo time ou pelo campeonato.
    const visibleAnalyses = useMemo(() => {
        const q = search.trim().toLowerCase();
        const list = q
            ? analyses.filter(a =>
                a.home_team_name?.toLowerCase().includes(q) ||
                a.away_team_name?.toLowerCase().includes(q) ||
                a.titulo?.toLowerCase().includes(q) ||
                a.competition?.toLowerCase().includes(q))
            : analyses;

        return list.slice(0, LATEST_LIMIT);
    }, [analyses, search]);

    // "Abrir" leva para a visualizacao; a edicao fica atras do botao de lapis de la.
    const handleOpen = (id: string) => navigate(`/ver-analise/${id}`);

    const handleCreateFromFixture = async (fixture: ApiFixture) => {
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

    return (
        <AppLayout search={{ value: search, onChange: setSearch }}>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                {/* ── Ultimas analises ── */}
                <Panel
                    title="Últimas análises"
                    action={
                        <button
                            onClick={() => navigate('/biblioteca')}
                            className="shrink-0 text-sm font-medium text-content-secondary transition-colors hover:text-brand-primary"
                        >
                            Ver todas
                        </button>
                    }
                >
                    {loadingAnalyses && (
                        <div className="flex items-center gap-2 py-10 text-sm text-content-muted">
                            <Loader2 size={16} className="animate-spin" />
                            Carregando análises…
                        </div>
                    )}

                    {analysesError && !loadingAnalyses && (
                        <div className="py-10 text-center">
                            <p className="mb-3 text-sm text-red-400">Não foi possível carregar suas análises.</p>
                            <button
                                onClick={retryAnalyses}
                                className="inline-flex items-center gap-2 rounded-control border border-line px-3 py-2 text-sm text-content-secondary transition-colors hover:text-content-primary"
                            >
                                <RefreshCw size={14} />
                                Tentar de novo
                            </button>
                        </div>
                    )}

                    {!loadingAnalyses && !analysesError && visibleAnalyses.length === 0 && (
                        <div className="py-10 text-center">
                            <p className="text-sm text-content-muted">
                                {search.trim()
                                    ? 'Nenhuma análise encontrada para essa busca.'
                                    : 'Você ainda não criou nenhuma análise.'}
                            </p>
                            {!search.trim() && (
                                <button
                                    onClick={() => navigate('/nova-analise')}
                                    className="mt-3 rounded-control bg-brand-primary px-4 py-2 text-sm font-semibold text-nav-dark transition-opacity hover:opacity-90"
                                >
                                    Criar primeira análise
                                </button>
                            )}
                        </div>
                    )}

                    {!loadingAnalyses && !analysesError && visibleAnalyses.length > 0 && (
                        <div className="-mx-1">
                            {visibleAnalyses.map(a => (
                                <AnalysisAccordionRow
                                    key={a.id}
                                    analysis={a}
                                    expanded={expandedId === a.id}
                                    onToggle={() => setExpandedId(prev => (prev === a.id ? null : a.id))}
                                    onOpen={handleOpen}
                                />
                            ))}
                        </div>
                    )}
                </Panel>

                {/* ── Proximos jogos ── */}
                <Panel title="Próximos jogos" className="xl:self-start">
                    {loadingFixtures && (
                        <div className="flex items-center gap-2 py-10 text-sm text-content-muted">
                            <Loader2 size={16} className="animate-spin" />
                            Buscando jogos…
                        </div>
                    )}

                    {!loadingFixtures && fixtures.length === 0 && (
                        <p className="py-10 text-center text-sm text-content-muted">
                            Nenhum jogo próximo disponível no momento.
                        </p>
                    )}

                    {!loadingFixtures && fixtures.length > 0 && (
                        <>
                            <p className="mb-3 text-xs text-content-muted">
                                Clique em um jogo para criar uma análise já com as escalações.
                            </p>
                            <div className="flex flex-col gap-3">
                                {fixtures.map(f => (
                                    <UpcomingFixtureCard
                                        key={f.fixture.id}
                                        fixture={f}
                                        creating={creatingFixtureId === f.fixture.id}
                                        disabled={creatingFixtureId !== null}
                                        onCreate={handleCreateFromFixture}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </Panel>
            </div>

            <Toaster position="bottom-right" />
        </AppLayout>
    );
};

export default Home;
