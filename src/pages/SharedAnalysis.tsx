import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import TacticalField from '../components/TacticalField';
import { analysisService, type AnalysisData } from '../services/analysisService';
import { CoachNameDisplay } from '../components/CoachNameDisplay';
import MatchTimeline from '../components/MatchTimeline';

export default function SharedAnalysis() {
    const { token } = useParams<{ token: string }>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<AnalysisData | null>(null);
    const [viewTeam, setViewTeam] = useState<'home' | 'away'>('home');

    // Load data
    useEffect(() => {
        if (!token) return;
        setLoading(true);
        analysisService.getSharedAnalysis(token)
            .then(analysis => {
                if (analysis) {
                    setData(analysis);
                } else {
                    setError("Análise não encontrada ou link inválido.");
                }
            })
            .catch(err => {
                console.error(err);
                setError("Erro ao carregar a análise.");
            })
            .finally(() => setLoading(false));
    }, [token]);

    if (loading) {
        return (
            <div className="min-h-screen bg-app-dark flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-app-dark flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <h1 className="text-2xl font-bold text-white mb-2">Ops! Algo deu errado.</h1>
                    <p className="text-gray-400 mb-6">{error || "Não foi possível carregar esta análise."}</p>
                    <Link to="/" className="text-emerald-500 hover:text-emerald-400 font-medium">
                        Ir para a página inicial
                    </Link>
                </div>
            </div>
        );
    }

    // Determine phase based on what has content (simple heuristic for read-only view)
    // Or just default to defensive like the main app.
    // Ideally we could let the user toggle phases if they are distinct.
    // For now, let's keep it simple: assume 'defensive' is the primary view or just show raw positions.
    // Actually, TacticalField needs field/bench props.
    // The data object has homePlayersDef, homePlayersOff, etc.
    // Let's create a phase toggler for the viewer if they want to see "Com Posse" vs "Sem Posse"
    // Wait, the main app has a phase selector. We should probably offer that too.

    const [activePhase, setActivePhase] = useState<'defensive' | 'offensive'>('defensive');

    // Data prep
    const currentTeamPlayers = viewTeam === 'home'
        ? (activePhase === 'defensive' ? data.homePlayersDef : data.homePlayersOff)
        : (activePhase === 'defensive' ? data.awayPlayersDef : data.awayPlayersOff);

    const currentArrows = viewTeam === 'home'
        ? (activePhase === 'defensive' ? data.homeArrowsDef : data.homeArrowsOff)
        : (activePhase === 'defensive' ? data.awayArrowsDef : data.awayArrowsOff);

    const currentRectangles = viewTeam === 'home'
        ? (activePhase === 'defensive' ? data.homeRectanglesDef.map(r => ({ ...r, startX: r.startX, startY: r.startY, endX: r.endX, endY: r.endY })) : data.homeRectanglesOff.map(r => ({ ...r, startX: r.startX, startY: r.startY, endX: r.endX, endY: r.endY })))
        : (activePhase === 'defensive' ? data.awayRectanglesDef.map(r => ({ ...r, startX: r.startX, startY: r.startY, endX: r.endX, endY: r.endY })) : data.awayRectanglesOff.map(r => ({ ...r, startX: r.startX, startY: r.startY, endX: r.endX, endY: r.endY })));


    // Notes logic logic
    const teamColor = viewTeam === 'home' ? data.homeTeamColor : data.awayTeamColor;

    const defensiveNotes = viewTeam === 'home' ? data.homeDefensiveNotes : data.awayDefensiveNotes;
    const offensiveNotes = viewTeam === 'home' ? data.homeOffensiveNotes : data.awayOffensiveNotes;
    const benchNotes = viewTeam === 'home' ? data.homeBenchNotes : data.awayBenchNotes;


    return (
        <div className="min-h-screen bg-app-dark text-white flex flex-col">
            {/* Header */}
            <header className="bg-nav-dark border-b border-gray-800 p-4 shrink-0">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-700/50 flex items-center justify-center font-bold text-gray-500 text-xs overflow-hidden border border-gray-600">
                            {/* Logo fallback */}
                            {data.homeTeamLogo ? (
                                <img src={data.homeTeamLogo} className="w-full h-full object-cover" />
                            ) : (
                                <span>LOGO</span>
                            )}
                        </div>
                        <div>
                            <h1 className="text-lg font-bold leading-tight">{data.titulo}</h1>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                <span>{data.homeTeam}</span>
                                <span className="font-bold text-gray-600">vs</span>
                                <span>{data.awayTeam}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <div className="text-2xl font-black tabular-nums tracking-widest bg-black/30 px-3 py-1 rounded">
                                {data.homeScore} - {data.awayScore}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-4 lg:p-6">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[calc(100vh-140px)]">

                    {/* Left Panel: Field */}
                    <div className="lg:col-span-2 flex flex-col gap-4 h-full">
                        {/* Controls */}
                        <div className="flex items-center justify-between bg-card-dark p-2 rounded-lg border border-gray-700">
                            {/* Team Toggle */}
                            <div className="flex rounded-md bg-gray-800 p-1">
                                <button
                                    onClick={() => setViewTeam('home')}
                                    className={`px-4 py-1.5 text-sm font-medium rounded transition-all ${viewTeam === 'home' ? 'bg-gray-600 text-white shadow' : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    {data.homeTeam}
                                </button>
                                <button
                                    onClick={() => setViewTeam('away')}
                                    className={`px-4 py-1.5 text-sm font-medium rounded transition-all ${viewTeam === 'away' ? 'bg-gray-600 text-white shadow' : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    {data.awayTeam}
                                </button>
                            </div>

                            {/* Phase Toggle */}
                            <div className="flex rounded-md bg-gray-800 p-1">
                                <button
                                    onClick={() => setActivePhase('defensive')}
                                    className={`px-4 py-1.5 text-sm font-medium rounded transition-all ${activePhase === 'defensive' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    Sem Posse
                                </button>
                                <button
                                    onClick={() => setActivePhase('offensive')}
                                    className={`px-4 py-1.5 text-sm font-medium rounded transition-all ${activePhase === 'offensive' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    Com Posse
                                </button>
                            </div>
                        </div>

                        {/* Field Wrapper */}
                        <div className="flex-1 bg-card-dark rounded-xl border border-gray-700 shadow-xl p-4 flex items-center justify-center overflow-hidden relative">
                            <div className="w-full max-w-[600px] aspect-[68/105]">
                                <TacticalField
                                    players={currentTeamPlayers}
                                    onPlayerMove={() => { }} // Read-only
                                    arrows={currentArrows}
                                    rectangles={currentRectangles}
                                    readOnly={true}
                                    playerColor={teamColor}
                                    // Pass mock methods to satisfy required props
                                    onAddArrow={undefined}
                                    onRemoveArrow={undefined}
                                    onMoveArrow={undefined}
                                    onAddRectangle={undefined}
                                    onRemoveRectangle={undefined}
                                    onMoveRectangle={undefined}
                                    playerNotes={currentTeamPlayers.reduce((acc, p) => p.note ? ({ ...acc, [p.id]: p.note }) : acc, {})}
                                    onPlayerClick={(player) => {
                                        if (player.note) {
                                            // Could show note toast or modal?
                                            // For now, let's rely on standard browser title or basic visual indicator
                                        }
                                    }}
                                />
                            </div>

                            {/* Coach Display Overlay */}
                            <div className="absolute top-4 left-4">
                                <CoachNameDisplay
                                    coachName={viewTeam === 'home' ? (data.homeCoach || '') : (data.awayCoach || '')}
                                    onSave={() => { }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Notes & Events */}
                    <div className="flex flex-col gap-6 lg:h-full lg:overflow-hidden">

                        {/* Notes Section - scrollable */}
                        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                            <div className="bg-card-dark rounded-xl border border-gray-700 p-5 shadow-lg">
                                <h3 className="text-emerald-400 text-sm font-bold uppercase tracking-wider mb-3">
                                    Resumo da Partida
                                </h3>
                                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                                    {data.gameNotes || "Nenhuma observação geral registrada."}
                                </p>
                            </div>

                            <div className="bg-card-dark rounded-xl border border-gray-700 p-5 shadow-lg">
                                <h3 className="text-white text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: teamColor }} />
                                    Organização - {activePhase === 'defensive' ? 'Sem Posse' : 'Com Posse'}
                                </h3>
                                <div className="space-y-4">
                                    <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                                        {activePhase === 'defensive' ? defensiveNotes : offensiveNotes || "Sem anotações para esta fase."}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-card-dark rounded-xl border border-gray-700 p-5 shadow-lg">
                                <h3 className="text-white text-sm font-bold uppercase tracking-wider mb-3">
                                    Banco de Reservas
                                </h3>
                                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                                    {benchNotes || "Sem anotações sobre o banco."}
                                </p>
                            </div>
                        </div>

                        {/* Timeline Section */}
                        {data.events && data.events.length > 0 && (
                            <div className="bg-card-dark rounded-xl border border-gray-700 shadow-lg flex flex-col max-h-[300px]">
                                <div className="p-4 border-b border-gray-700 bg-gray-800/50 rounded-t-xl">
                                    <h3 className="text-white font-bold text-sm uppercase tracking-wide">Linha do Tempo</h3>
                                </div>
                                <div className="overflow-y-auto p-2">
                                    <MatchTimeline
                                        events={data.events}
                                        onAddClick={() => { }}
                                        onDeleteEvent={() => { }}
                                        onExpand={() => { }} // Could implement expand modal if needed
                                        readOnly={true}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Footer Badge */}
                        <div className="text-center pt-4 opacity-50">
                            <p className="text-xs text-gray-500 font-mono">
                                Powered by <span className="text-emerald-500 font-bold">Analise.Futebol</span>
                            </p>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}
