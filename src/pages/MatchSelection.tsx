import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getLiveFixtures,
    getFixturesByDate,
    getCountries,
    getLeagues,
    type Fixture,
    type Country,
    type League
} from '../services/apiFootball';
import { Calendar, Search, Globe, Trophy } from 'lucide-react';

type Tab = 'live' | 'finished' | 'scheduled';

function MatchSelection() {
    const navigate = useNavigate();
    const [fixtures, setFixtures] = useState<Fixture[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<Tab>('live');

    // Date State
    const getYesterday = () => {
        const date = new Date();
        date.setDate(date.getDate() - 1);
        return date.toISOString().split('T')[0];
    };
    const getToday = () => new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState<string>(getToday());

    // Filters State
    const [countries, setCountries] = useState<Country[]>([]);
    const [leagues, setLeagues] = useState<League[]>([]);
    const [selectedCountry, setSelectedCountry] = useState<string>(''); // Country Name using simple string
    const [selectedLeague, setSelectedLeague] = useState<string>(''); // League ID as string
    const [searchTerm, setSearchTerm] = useState('');

    // Pagination
    const PAGE_SIZE = 50;
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

    // Initial Data Fetch (Countries)
    useEffect(() => {
        getCountries().then(setCountries).catch(console.error);
    }, []);

    // Fetch Leagues when Country changes
    useEffect(() => {
        if (selectedCountry) {
            getLeagues(selectedCountry).then(setLeagues).catch(console.error);
        } else {
            setLeagues([]);
        }
        setSelectedLeague('');
    }, [selectedCountry]);

    const fetchGames = async () => {
        try {
            setLoading(true);
            setError(null);
            setFixtures([]);

            // Reset pagination
            setVisibleCount(PAGE_SIZE);

            let data: Fixture[] = [];

            if (activeTab === 'live') {
                data = await getLiveFixtures();
            } else {
                const allGames = await getFixturesByDate(selectedDate);

                if (activeTab === 'finished') {
                    const finishedStatuses = ['FT', 'AET', 'PEN'];
                    data = allGames.filter((f) => finishedStatuses.includes(f.fixture.status.short));
                } else if (activeTab === 'scheduled') {
                    const scheduledStatuses = ['NS', 'TBD', 'Time']; // 'Time' added as it often appears for scheduled
                    // If status is undefined, assume scheduled? Or filter strictly.
                    // Let's stick to known scheduled statuses.
                    data = allGames.filter((f) => scheduledStatuses.includes(f.fixture.status.short));
                }
            }

            // Sort
            data.sort((a, b) => a.fixture.date.localeCompare(b.fixture.date));

            setFixtures(data);
        } catch (err) {
            setError('Falha ao carregar jogos. Verifique sua conexão ou a chave de API.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Tab/Date Effects
    useEffect(() => {
        if (activeTab === 'finished') setSelectedDate(getYesterday());
        else if (activeTab === 'scheduled') setSelectedDate(getToday());
        // For live, date doesn't strictly matter for fetch, but good to keep state clean
    }, [activeTab]);

    // Fetch on mount or when key dependencies change
    useEffect(() => {
        if (activeTab !== 'live' && !selectedDate) return;
        fetchGames();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, selectedDate]);

    // Auto-refresh for live games
    useEffect(() => {
        if (activeTab !== 'live') return;
        const interval = setInterval(fetchGames, 60000); // 1 min
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    // Filter Logic
    const filteredFixtures = useMemo(() => {
        return fixtures.filter((f) => {
            const matchesCountry = selectedCountry ? f.league.country === selectedCountry : true;
            const matchesLeague = selectedLeague ? f.league.id.toString() === selectedLeague : true;

            const matchesSearch = searchTerm
                ? f.teams.home.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                f.teams.away.name.toLowerCase().includes(searchTerm.toLowerCase())
                : true;

            return matchesCountry && matchesLeague && matchesSearch;
        });
    }, [fixtures, selectedCountry, selectedLeague, searchTerm]);

    const visibleFixtures = filteredFixtures.slice(0, visibleCount);
    const hasMore = visibleCount < filteredFixtures.length;

    const handleMatchClick = (fixture: Fixture) => {
        navigate(`/analise`, { state: { fixture } });
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white pl-64">

            <div className="p-8 max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-white tracking-tight">TODAS AS PARTIDAS</h1>
                    <p className="text-gray-400">Selecione uma partida para analisar</p>
                </div>

                {/* Tabs */}
                <div className="flex justify-center">
                    <div className="bg-panel-dark p-1.5 rounded-xl flex items-center gap-1 border border-gray-700">
                        {(['live', 'scheduled', 'finished'] as Tab[]).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`
                                    relative px-8 py-3 rounded-lg text-sm font-semibold transition-all
                                    ${activeTab === tab
                                        ? 'bg-accent-green text-white shadow-lg'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }
                                `}
                            >
                                <span className="flex items-center gap-2">
                                    {tab === 'live' && activeTab === 'live' && (
                                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    )}
                                    {tab === 'live' ? 'Ao Vivo' : tab === 'scheduled' ? 'Agendados' : 'Encerrados'}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-4 bg-panel-dark p-4 rounded-xl border border-gray-700 shadow-sm">
                    {/* Country Filter */}
                    <div className="relative min-w-[200px]">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                        <select
                            value={selectedCountry}
                            onChange={(e) => setSelectedCountry(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-1 focus:ring-accent-green focus:border-accent-green outline-none appearance-none cursor-pointer hover:border-gray-600 transition-colors"
                        >
                            <option value="">Todos os países</option>
                            {countries.map(c => (
                                <option key={c.name} value={c.name}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* League Filter */}
                    <div className="relative min-w-[200px]">
                        <Trophy className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                        <select
                            value={selectedLeague}
                            onChange={(e) => setSelectedLeague(e.target.value)}
                            disabled={!selectedCountry}
                            className={`w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-1 focus:ring-accent-green focus:border-accent-green outline-none appearance-none cursor-pointer hover:border-gray-600 transition-colors ${!selectedCountry ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <option value="">Todas as ligas</option>
                            {leagues.map(l => (
                                <option key={l.league.id} value={l.league.id}>{l.league.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar time..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-1 focus:ring-accent-green focus:border-accent-green outline-none placeholder:text-gray-600 transition-colors"
                        />
                    </div>

                    {/* Date Picker for Scheduled/Finished */}
                    {activeTab !== 'live' && (
                        <div className="relative min-w-[150px]">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-1 focus:ring-accent-green focus:border-accent-green outline-none cursor-pointer hover:border-gray-600 transition-colors"
                            />
                        </div>
                    )}
                </div>

                {/* Result Count */}
                <div className="text-gray-500 text-sm font-medium pl-1">
                    Exibindo {filteredFixtures.length} partidas
                </div>

                {/* Content */}
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-32 bg-panel-dark rounded-xl border border-gray-700 animate-pulse" />
                        ))}
                    </div>
                ) : error ? (
                    <div className="text-center py-20 text-red-400 bg-red-500/10 rounded-xl border border-red-500/20">
                        {error}
                    </div>
                ) : visibleFixtures.length === 0 ? (
                    <div className="text-center py-32 bg-panel-dark rounded-xl border border-gray-700 flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center">
                            <Calendar className="w-8 h-8 text-gray-600" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg">Nenhuma partida encontrada</h3>
                            <p className="text-gray-500 text-sm mt-1">Tente ajustar os filtros, buscar por outra data ou termo.</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3 pb-20">
                        {visibleFixtures.map((fixture) => (
                            <div
                                key={fixture.fixture.id}
                                onClick={() => handleMatchClick(fixture)}
                                className="group bg-panel-dark border border-gray-700 rounded-xl p-5 hover:border-accent-green cursor-pointer transition-all duration-300 relative overflow-hidden"
                            >
                                {/* Hover Gradient Overlay */}
                                <div className="absolute inset-0 bg-accent-green/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                                {/* Header: Status & League */}
                                <div className="flex justify-between items-center mb-6 relative z-10">
                                    <div className="flex items-center gap-2">
                                        {fixture.fixture.status.short === 'Live' || fixture.fixture.status.short === '1H' || fixture.fixture.status.short === '2H' || fixture.fixture.status.short === 'HT' ? (
                                            <span className="flex items-center gap-2 text-red-500 font-bold text-xs uppercase tracking-wider bg-red-500/10 px-2 py-1 rounded">
                                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                                AO VIVO · {fixture.fixture.status.elapsed ?? 0}'
                                            </span>
                                        ) : activeTab === 'scheduled' ? (
                                            <span className="text-yellow-500 font-bold text-xs uppercase tracking-wider bg-yellow-500/10 px-2 py-1 rounded">
                                                ⏰ {new Date(fixture.fixture.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 font-bold text-xs uppercase tracking-wider bg-gray-700/50 px-2 py-1 rounded">
                                                ✓ Encerrado
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-gray-400 text-xs font-medium uppercase tracking-wider flex items-center gap-2">
                                        <img src={fixture.league.flag || ''} alt="" className="w-4 h-4 object-contain opacity-50" />
                                        {fixture.league.name}
                                    </div>
                                </div>

                                {/* Teams & Score */}
                                <div className="flex items-center justify-between px-4 sm:px-12 relative z-10">
                                    {/* Home */}
                                    <div className="flex items-center gap-4 flex-1 justify-end">
                                        <span className="text-white font-bold text-lg text-right hidden sm:block">{fixture.teams.home.name}</span>
                                        <img src={fixture.teams.home.logo} alt={fixture.teams.home.name} className="w-12 h-12 object-contain" />
                                    </div>

                                    {/* Score / VS */}
                                    <div className="px-8 flex flex-col items-center">
                                        {fixture.goals.home !== null ? (
                                            <div className="text-3xl font-bold text-white tracking-widest">
                                                {fixture.goals.home} - {fixture.goals.away}
                                            </div>
                                        ) : (
                                            <div className="text-2xl font-bold text-gray-600">VS</div>
                                        )}
                                    </div>

                                    {/* Away */}
                                    <div className="flex items-center gap-4 flex-1 justify-start">
                                        <img src={fixture.teams.away.logo} alt={fixture.teams.away.name} className="w-12 h-12 object-contain" />
                                        <span className="text-white font-bold text-lg text-left hidden sm:block">{fixture.teams.away.name}</span>
                                    </div>
                                </div>

                                {/* Action Button (Visible on Hover) */}
                                <div className="mt-6 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0 relative z-10">
                                    <span className="text-accent-green font-medium text-sm flex items-center gap-1">
                                        Analisar Partida →
                                    </span>
                                </div>
                            </div>
                        ))}

                        {/* Load More */}
                        {hasMore && (
                            <button
                                onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                                className="w-full py-3 mt-4 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg transition-colors"
                            >
                                Carregar mais partidas
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default MatchSelection;
