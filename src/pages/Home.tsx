import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { Loader2, RefreshCw } from 'lucide-react';
import AppLayout from '../layouts/AppLayout';
import AnalysisAccordionRow, { type FixtureEnrichment } from '../components/home/AnalysisAccordionRow';
import TodayFixturesPanel from '../components/home/TodayFixturesPanel';
import SearchDropdown from '../components/home/SearchDropdown';
import { analysisService } from '../services/analysisService';
import type { SavedAnalysisSummary } from '../services/analysisService';
import { apiFootballService } from '../services/apiFootballService';
import { createAnalysisFromFixture } from '../services/fixtureAnalysisService';
import { searchAnalyses } from '../services/searchService';
import { supabase } from '../lib/supabase';
import type { ApiFixture } from '../types/api-football';
import type { SearchResult } from '../types/search';

const LATEST_LIMIT = 8;
const SEARCH_DEBOUNCE_MS = 300;

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

    const [analyses, setAnalyses] = useState<SavedAnalysisSummary[]>([]);
    const [loadingAnalyses, setLoadingAnalyses] = useState(true);
    const [analysesError, setAnalysesError] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    // Placar e campeonato reais, por id de jogo da API-Football.
    const [enrichment, setEnrichment] = useState<Map<number, FixtureEnrichment>>(new Map());

    const [fixtures, setFixtures] = useState<ApiFixture[]>([]);
    const [loadingFixtures, setLoadingFixtures] = useState(true);
    const [creatingFixtureId, setCreatingFixtureId] = useState<number | null>(null);

    const [search, setSearch] = useState('');
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [results, setResults] = useState<SearchResult[]>([]);

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

        apiFootballService.getTodayFixtures()
            .then(list => { if (!cancelled) setFixtures(list); })
            .catch(() => { if (!cancelled) setFixtures([]); })
            .finally(() => { if (!cancelled) setLoadingFixtures(false); });

        return () => { cancelled = true; };
    }, []);

    // Placar e campeonato das analises que nasceram de um jogo real. Uma unica
    // chamada em lote para todas elas, em vez de uma por linha.
    const visibleIds = useMemo(
        () => analyses.slice(0, LATEST_LIMIT).map(a => a.fixtureId).filter((id): id is number => !!id),
        [analyses],
    );

    useEffect(() => {
        if (visibleIds.length === 0) return;
        let cancelled = false;

        apiFootballService.getFixturesByIds(visibleIds)
            .then(map => {
                if (cancelled) return;
                const next = new Map<number, FixtureEnrichment>();
                for (const [id, f] of map) {
                    next.set(id, {
                        homeScore: f.goals?.home ?? null,
                        awayScore: f.goals?.away ?? null,
                        competition: f.league?.name,
                    });
                }
                setEnrichment(next);
            })
            .catch(() => { /* a linha cai no placar salvo */ });

        return () => { cancelled = true; };
    }, [visibleIds]);

    // ── Busca AJAX com debounce ──────────────────────────────────────────────
    const searchSeq = useRef(0);

    useEffect(() => {
        const term = search.trim();
        if (term.length < 2) {
            setResults([]);
            setSearchLoading(false);
            return;
        }

        const seq = ++searchSeq.current;
        const timer = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const found = await searchAnalyses('all', term, user.id);
                // Descarta resposta de uma digitacao que ja foi superada.
                if (seq === searchSeq.current) setResults(found.slice(0, 12));
            } catch {
                if (seq === searchSeq.current) setResults([]);
            } finally {
                if (seq === searchSeq.current) setSearchLoading(false);
            }
        }, SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [search]);

    // Fecha o dropdown ao clicar fora ou apertar Esc.
    useEffect(() => {
        if (!searchOpen) return;
        const onDown = (e: MouseEvent) => {
            const el = e.target as HTMLElement;
            if (!el.closest('[data-search-box]')) setSearchOpen(false);
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSearchOpen(false); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [searchOpen]);

    const latest = useMemo(() => analyses.slice(0, LATEST_LIMIT), [analyses]);

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
        <AppLayout
            search={{
                value: search,
                onChange: v => { setSearch(v); setSearchOpen(true); },
                onFocus: () => setSearchOpen(true),
                dropdown: (
                    <SearchDropdown
                        open={searchOpen && search.trim().length > 0}
                        loading={searchLoading}
                        term={search}
                        results={results}
                        onPick={id => { setSearchOpen(false); handleOpen(id); }}
                    />
                ),
            }}
        >
            {/* Ultimas analises 60% / Jogos do dia 40% — o bloco da esquerda ficou
                20% mais estreito e a diferenca foi para o da direita. */}
            <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
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

                    {!loadingAnalyses && !analysesError && latest.length === 0 && (
                        <div className="py-10 text-center">
                            <p className="text-sm text-content-muted">Você ainda não criou nenhuma análise.</p>
                            <button
                                onClick={() => navigate('/nova-analise')}
                                className="mt-3 rounded-control bg-brand-primary px-4 py-2 text-sm font-semibold text-nav-dark transition-opacity hover:opacity-90"
                            >
                                Criar primeira análise
                            </button>
                        </div>
                    )}

                    {!loadingAnalyses && !analysesError && latest.length > 0 && (
                        <div className="-mx-1">
                            {latest.map(a => (
                                <AnalysisAccordionRow
                                    key={a.id}
                                    analysis={a}
                                    enrichment={a.fixtureId ? enrichment.get(a.fixtureId) : undefined}
                                    expanded={expandedId === a.id}
                                    onToggle={() => setExpandedId(prev => (prev === a.id ? null : a.id))}
                                    onOpen={handleOpen}
                                />
                            ))}
                        </div>
                    )}
                </Panel>

                <TodayFixturesPanel
                    fixtures={fixtures}
                    loading={loadingFixtures}
                    creatingFixtureId={creatingFixtureId}
                    onCreate={handleCreateFromFixture}
                />
            </div>

            <Toaster position="bottom-right" />
        </AppLayout>
    );
};

export default Home;
