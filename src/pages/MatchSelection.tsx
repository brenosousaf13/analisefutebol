import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLiveFixtures, getFixturesByDate, type Fixture } from '../services/apiFootball';
import { Calendar, Trophy, Layers, Edit3, PlusCircle } from 'lucide-react';
import MatchDetailsModal from '../components/MatchDetailsModal';

const MatchesPage: React.FC = () => {
    const navigate = useNavigate();

    // Tabs state
    const [activeTab, setActiveTab] = useState<'api' | 'custom'>('api');

    // API Matches State
    const [matches, setMatches] = useState<Fixture[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<'live' | 'today'>('live');
    const [selectedMatch, setSelectedMatch] = useState<Fixture | null>(null);

    // Custom Match State
    const [customHome, setCustomHome] = useState('');
    const [customAway, setCustomAway] = useState('');
    const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);

    // Get today's date in YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        if (activeTab === 'api') {
            fetchMatches();
        }
    }, [activeFilter, activeTab]);

    const fetchMatches = async () => {
        setLoading(true);
        try {
            let data: Fixture[] = [];
            if (activeFilter === 'live') {
                data = await getLiveFixtures();
            } else {
                data = await getFixturesByDate(today);
            }
            // Sort by date/time
            data.sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime());
            setMatches(data);
        } catch (error) {
            console.error('Error fetching matches:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    const handleStartCustomAnalysis = (e: React.FormEvent) => {
        e.preventDefault();

        if (!customHome.trim() || !customAway.trim()) {
            alert('Por favor, preencha os nomes dos times.');
            return;
        }

        navigate('/analise', {
            state: {
                matchId: null, // Custom match
                homeTeam: { name: customHome, logo: null },
                awayTeam: { name: customAway, logo: null },
                competition: { name: 'Partida Personalizada' },
                date: customDate,
                score: { home: 0, away: 0 }
            }
        });
    };

    return (
        <div className="p-8 h-screen overflow-y-auto bg-gray-900 text-white">
            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Trophy className="text-accent-green w-8 h-8" />
                        Partidas
                    </h1>
                    <p className="text-gray-400 mt-1">Selecione uma partida ou crie uma personalizada</p>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-gray-800 p-1 rounded-lg self-start">
                    <button
                        onClick={() => setActiveTab('api')}
                        className={`px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition ${activeTab === 'api'
                            ? 'bg-panel-dark text-white shadow shadow-black/50'
                            : 'text-gray-400 hover:text-white hover:bg-gray-700'
                            }`}
                    >
                        <Trophy className="w-4 h-4" />
                        Partidas Reais
                    </button>
                    <button
                        onClick={() => setActiveTab('custom')}
                        className={`px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition ${activeTab === 'custom'
                            ? 'bg-panel-dark text-white shadow shadow-black/50'
                            : 'text-gray-400 hover:text-white hover:bg-gray-700'
                            }`}
                    >
                        <Edit3 className="w-4 h-4" />
                        Partida Personalizada
                    </button>
                </div>
            </header>

            {/* Content Area */}
            {activeTab === 'api' ? (
                <>
                    {/* Filter (Live vs Today) */}
                    <div className="mb-6 flex gap-2">
                        <button
                            onClick={() => setActiveFilter('live')}
                            className={`px-4 py-2 rounded-full font-medium text-sm border flex items-center gap-2 transition ${activeFilter === 'live'
                                ? 'bg-accent-green border-accent-green text-white shadow-lg shadow-green-900/20'
                                : 'bg-transparent border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white'
                                }`}
                        >
                            <span className={`w-2 h-2 rounded-full ${activeFilter === 'live' ? 'bg-white animate-pulse' : 'bg-gray-500'}`}></span>
                            Ao Vivo
                        </button>
                        <button
                            onClick={() => setActiveFilter('today')}
                            className={`px-4 py-2 rounded-full font-medium text-sm border flex items-center gap-2 transition ${activeFilter === 'today'
                                ? 'bg-accent-green border-accent-green text-white shadow-lg shadow-green-900/20'
                                : 'bg-transparent border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white'
                                }`}
                        >
                            <Calendar className="w-4 h-4" />
                            Hoje
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                            <div className="w-10 h-10 border-4 border-accent-green border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p>Carregando partidas...</p>
                        </div>
                    ) : matches.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 bg-gray-800/30 rounded-2xl border border-gray-700 border-dashed">
                            <Layers className="w-12 h-12 text-gray-600 mb-4" />
                            <p className="text-gray-400 text-lg">Nenhuma partida encontrada</p>
                            <p className="text-gray-500 text-sm">Tente mudar o filtro ou volte mais tarde</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {matches.map(match => (
                                <div
                                    key={match.fixture.id}
                                    onClick={() => setSelectedMatch(match)}
                                    className="bg-panel-dark border border-gray-700 rounded-xl p-6 hover:border-accent-green hover:shadow-lg hover:shadow-green-900/10 cursor-pointer transition group relative overflow-hidden"
                                >
                                    {/* Live Badge */}
                                    {match.fixture.status.short !== 'NS' && match.fixture.status.short !== 'FT' && (
                                        <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg animate-pulse">
                                            LIVE • {match.fixture.status.elapsed}'
                                        </div>
                                    )}

                                    {/* League */}
                                    <div className="flex items-center gap-2 mb-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        <span className="truncate">{match.league.name}</span>
                                    </div>

                                    {/* Teams */}
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="flex flex-col items-center gap-2 w-1/3">
                                            <img src={match.teams.home.logo} alt={match.teams.home.name} className="w-12 h-12 object-contain group-hover:scale-110 transition" />
                                            <span className="text-sm font-bold text-center leading-tight line-clamp-2">{match.teams.home.name}</span>
                                        </div>

                                        <div className="flex flex-col items-center justify-center w-1/3">
                                            {match.fixture.status.short === 'NS' ? (
                                                <span className="text-2xl font-bold text-gray-500">{formatTime(match.fixture.date)}</span>
                                            ) : (
                                                <div className="text-3xl font-bold text-white tracking-widest bg-gray-800 px-3 py-1 rounded-lg">
                                                    {match.goals.home} - {match.goals.away}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col items-center gap-2 w-1/3">
                                            <img src={match.teams.away.logo} alt={match.teams.away.name} className="w-12 h-12 object-contain group-hover:scale-110 transition" />
                                            <span className="text-sm font-bold text-center leading-tight line-clamp-2">{match.teams.away.name}</span>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="text-center pt-4 border-t border-gray-700">
                                        <span className="text-accent-green text-sm font-medium group-hover:underline">
                                            Ver Detalhes & Analisar
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                /* Custom Match Form */
                <div className="max-w-2xl mx-auto">
                    <form onSubmit={handleStartCustomAnalysis} className="bg-panel-dark border border-gray-700 rounded-xl p-8 shadow-2xl">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-white mb-2">Configurar Partida Personalizada</h2>
                            <p className="text-gray-400">Insira os detalhes do jogo para começar a análise</p>
                        </div>

                        <div className="grid grid-cols-2 gap-6 mb-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Time da Casa</label>
                                <input
                                    type="text"
                                    value={customHome}
                                    onChange={(e) => setCustomHome(e.target.value)}
                                    placeholder="Ex: Flamengo"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent-green focus:ring-1 focus:ring-accent-green transition"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Time Visitante</label>
                                <input
                                    type="text"
                                    value={customAway}
                                    onChange={(e) => setCustomAway(e.target.value)}
                                    placeholder="Ex: Vasco"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent-green focus:ring-1 focus:ring-accent-green transition"
                                    required
                                />
                            </div>
                        </div>

                        <div className="mb-8 space-y-2">
                            <label className="text-sm font-medium text-gray-300">Data da Partida</label>
                            <input
                                type="date"
                                value={customDate}
                                onChange={(e) => setCustomDate(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent-green focus:ring-1 focus:ring-accent-green transition"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-accent-green hover:bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-green-900/20 transition flex items-center justify-center gap-3 transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <PlusCircle className="w-6 h-6" />
                            Iniciar Análise
                        </button>
                    </form>
                </div>
            )}

            {/* Modal */}
            {selectedMatch && (
                <MatchDetailsModal
                    match={selectedMatch}
                    onClose={() => setSelectedMatch(null)}
                />
            )}
        </div>
    );
};

export default MatchesPage;
