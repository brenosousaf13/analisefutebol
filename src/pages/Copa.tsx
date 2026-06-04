import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, LogIn, Zap, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFootballService } from '../services/apiFootballService';
import { analysisService } from '../services/analysisService';
import { useAuth } from '../contexts/AuthContext';
import type { ApiFixture } from '../types/api-football';
import CopaFixtureCard from '../components/copa/CopaFixtureCard';

// FIFA World Cup 2026 — June 11 to July 19, 2026 (BRT)
const WC_START = new Date('2026-06-11T12:00:00-03:00');

type Tab = 'hoje' | 'proximos' | 'resultados';

function CountdownUnit({ value, label }: { value: number; label: string }) {
    return (
        <div className="flex flex-col items-center gap-1">
            <div className="bg-gray-900 border border-gray-700/60 rounded-xl px-3 py-2 min-w-[58px] text-center">
                <span className="text-2xl sm:text-3xl font-black text-white tabular-nums">
                    {String(value).padStart(2, '0')}
                </span>
            </div>
            <span className="text-[11px] text-gray-500">{label}</span>
        </div>
    );
}

function useCountdown() {
    const [ms, setMs] = useState(() => Math.max(0, WC_START.getTime() - Date.now()));
    useEffect(() => {
        if (ms === 0) return;
        const id = setInterval(() => setMs(Math.max(0, WC_START.getTime() - Date.now())), 1000);
        return () => clearInterval(id);
    }, [ms]);
    return {
        done: ms === 0,
        days:    Math.floor(ms / 864e5),
        hours:   Math.floor((ms % 864e5) / 36e5),
        minutes: Math.floor((ms % 36e5) / 6e4),
        seconds: Math.floor((ms % 6e4) / 1e3),
    };
}

export default function Copa() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const countdown = useCountdown();

    const [fixtures, setFixtures] = useState<ApiFixture[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [tab, setTab] = useState<Tab>('proximos');
    const [creatingId, setCreatingId] = useState<number | null>(null);

    useEffect(() => {
        apiFootballService.getWorldCupFixtures()
            .then(data => {
                setFixtures(data);
                const todayStr = new Date().toDateString();
                const hasToday = data.some(f => new Date(f.fixture.date).toDateString() === todayStr);
                if (hasToday) setTab('hoje');
                else if (countdown.done) setTab('resultados');
                else setTab('proximos');
            })
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, []);

    const todayStr = useMemo(() => new Date().toDateString(), []);

    const todayFixtures = useMemo(() =>
        fixtures.filter(f => new Date(f.fixture.date).toDateString() === todayStr),
        [fixtures, todayStr]
    );

    const upcomingFixtures = useMemo(() => {
        const now = Date.now();
        return fixtures
            .filter(f => new Date(f.fixture.date).getTime() > now && f.fixture.status.short === 'NS')
            .sort((a, b) => a.fixture.timestamp - b.fixture.timestamp)
            .slice(0, 24);
    }, [fixtures]);

    const pastFixtures = useMemo(() =>
        fixtures
            .filter(f => ['FT', 'AET', 'PEN'].includes(f.fixture.status.short))
            .sort((a, b) => b.fixture.timestamp - a.fixture.timestamp)
            .slice(0, 24),
        [fixtures]
    );

    const visibleFixtures =
        tab === 'hoje'      ? todayFixtures :
        tab === 'proximos'  ? upcomingFixtures :
        pastFixtures;

    const handleCreateAnalysis = async (fixture: ApiFixture) => {
        if (!user) {
            navigate('/login');
            return;
        }
        setCreatingId(fixture.fixture.id);
        try {
            const id = await analysisService.createBlankAnalysis('analise_completa', {
                titulo: `${fixture.teams.home.name} × ${fixture.teams.away.name}`,
                homeTeam: fixture.teams.home.name,
                awayTeam: fixture.teams.away.name,
                homeTeamLogo: fixture.teams.home.logo,
                awayTeamLogo: fixture.teams.away.logo,
                matchDate: fixture.fixture.date.split('T')[0],
                tags: ['Copa 2026'],
            });
            navigate(`/analysis-complete/saved/${id}`);
        } catch {
            toast.error('Erro ao criar análise. Tente novamente.');
        } finally {
            setCreatingId(null);
        }
    };

    const tabs: { key: Tab; label: string }[] = [
        { key: 'hoje',       label: todayFixtures.length ? `Hoje (${todayFixtures.length})` : 'Hoje' },
        { key: 'proximos',   label: 'Próximos' },
        { key: 'resultados', label: 'Resultados' },
    ];

    return (
        <div className="min-h-screen bg-[#0b1111] text-white">
            {/* ── Sticky nav ── */}
            <nav className="sticky top-0 z-50 bg-[#0b1111]/90 backdrop-blur-sm border-b border-gray-800/50">
                <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                    >
                        <span className="text-[#27D888] font-black text-lg leading-none">Z14</span>
                        <span className="text-gray-700 text-xs">×</span>
                        <Trophy size={14} className="text-yellow-400" />
                        <span>Copa 2026</span>
                    </button>

                    {user ? (
                        <button
                            onClick={() => navigate('/')}
                            className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg px-3 py-1.5 transition-colors"
                        >
                            Minhas análises
                        </button>
                    ) : (
                        <button
                            onClick={() => navigate('/login')}
                            className="flex items-center gap-1.5 text-xs font-bold text-black bg-[#27D888] hover:bg-green-400 rounded-lg px-3 py-1.5 transition-colors"
                        >
                            <LogIn size={13} />
                            Entrar no Zona 14
                        </button>
                    )}
                </div>
            </nav>

            {/* ── Hero ── */}
            <div className="max-w-2xl mx-auto px-4 pt-10 pb-8 text-center">
                <div className="inline-flex items-center gap-1.5 bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-[11px] font-bold px-3 py-1 rounded-full mb-5">
                    <Trophy size={11} />
                    FIFA WORLD CUP 2026
                </div>

                <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-2">
                    Copa do Mundo<br />
                    <span className="text-[#27D888]">no Zona 14</span>
                </h1>

                <p className="text-sm text-gray-400 mb-8 max-w-sm mx-auto">
                    Visualize escalações reais, analise formações e crie suas análises táticas dos jogos da Copa.
                </p>

                {!countdown.done && (
                    <div className="mb-8">
                        <p className="text-[11px] text-gray-600 uppercase tracking-widest mb-3">Começa em</p>
                        <div className="flex gap-2 sm:gap-3 justify-center">
                            <CountdownUnit value={countdown.days}    label="Dias" />
                            <CountdownUnit value={countdown.hours}   label="Horas" />
                            <CountdownUnit value={countdown.minutes} label="Min" />
                            <CountdownUnit value={countdown.seconds} label="Seg" />
                        </div>
                    </div>
                )}

                {!user && (
                    <button
                        onClick={() => navigate('/login')}
                        className="inline-flex items-center gap-2 bg-[#27D888] hover:bg-green-400 text-black font-bold text-sm px-6 py-3 rounded-xl transition-colors"
                    >
                        <Zap size={15} />
                        Criar conta grátis e analisar jogos
                    </button>
                )}
            </div>

            {/* ── Fixture section ── */}
            <div className="max-w-2xl mx-auto px-4 pb-12">
                {/* Tabs */}
                <div className="flex gap-1 bg-gray-900/70 rounded-xl p-1 mb-5 border border-gray-800/40">
                    {tabs.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                                tab === key
                                    ? 'bg-[#141a1a] text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-300'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col gap-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-32 bg-gray-900/60 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center gap-3 py-16 text-gray-500">
                        <AlertCircle size={32} className="text-gray-600" />
                        <p className="text-sm">Não foi possível carregar os jogos.</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="text-xs text-[#27D888] hover:underline"
                        >
                            Tentar novamente
                        </button>
                    </div>
                ) : visibleFixtures.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                        <Trophy size={36} className="mx-auto mb-3 text-gray-700" />
                        <p className="text-sm">
                            {tab === 'hoje'       && 'Nenhum jogo hoje.'}
                            {tab === 'proximos'   && 'Nenhum jogo agendado.'}
                            {tab === 'resultados' && 'Nenhum resultado disponível ainda.'}
                        </p>
                        {!countdown.done && tab !== 'resultados' && (
                            <p className="text-xs mt-1 text-gray-600">
                                A Copa começa em {WC_START.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}.
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {visibleFixtures.map(fixture => (
                            <CopaFixtureCard
                                key={fixture.fixture.id}
                                fixture={fixture}
                                onCreateAnalysis={handleCreateAnalysis}
                                isCreating={creatingId === fixture.fixture.id}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ── Footer CTA ── */}
            {!user && !loading && visibleFixtures.length > 0 && (
                <div className="border-t border-gray-800/40 bg-[#0d1414]">
                    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                            <p className="font-bold text-white text-sm">Analise como um profissional</p>
                            <p className="text-xs text-gray-500 mt-0.5">Crie sua conta grátis e comece a analisar os jogos da Copa.</p>
                        </div>
                        <button
                            onClick={() => navigate('/login')}
                            className="shrink-0 flex items-center gap-2 bg-[#27D888] hover:bg-green-400 text-black font-bold text-sm px-5 py-2.5 rounded-xl transition-colors"
                        >
                            <Zap size={14} />
                            Criar conta grátis
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
