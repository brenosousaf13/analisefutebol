import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, X, StickyNote } from 'lucide-react';
import TacticalField from '../components/TacticalField';
import { analysisService, type AnalysisData } from '../services/analysisService';
import { CoachNameDisplay } from '../components/CoachNameDisplay';
import MatchTimeline from '../components/MatchTimeline';
import { FullAnalysisMode } from '../components/FullAnalysisMode';
import AnalysisSidebar from '../components/AnalysisSidebar';
import EventsSidebar from '../components/EventsSidebar';

export default function SharedAnalysis() {
    const { token } = useParams<{ token: string }>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<AnalysisData | null>(null);
    const [viewTeam, setViewTeam] = useState<'home' | 'away'>('home');
    const [activePhase, setActivePhase] = useState<'defensive' | 'offensive'>('defensive');
    const [isAnalysisSidebarOpen, setIsAnalysisSidebarOpen] = useState(false);
    const [isEventsSidebarOpen, setIsEventsSidebarOpen] = useState(false);
    const [viewingPlayerNote, setViewingPlayerNote] = useState<{ name: string; note: string } | null>(null);

    const handlePlayerDoubleClick = (player: any) => {
        if (player && player.note) {
            setViewingPlayerNote({ name: player.name, note: player.note });
        }
    };

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
            <div className="min-h-screen bg-panel-dark flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-panel-dark flex items-center justify-center p-4">
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

    // Mode Check
    const isFullMode = data.tipo === 'analise_completa';

    // Simple Mode Data Prep
    const currentTeamPlayers = viewTeam === 'home'
        ? (activePhase === 'defensive' ? data.homePlayersDef : data.homePlayersOff)
        : (activePhase === 'defensive' ? data.awayPlayersDef : data.awayPlayersOff);

    // Fix: Ensure we correctly map simple mode arrows/rects
    const currentArrows = viewTeam === 'home'
        ? (activePhase === 'defensive' ? data.homeArrowsDef : data.homeArrowsOff)
        : (activePhase === 'defensive' ? data.awayArrowsDef : data.awayArrowsOff);

    const currentRectangles = viewTeam === 'home'
        ? (activePhase === 'defensive' ? data.homeRectanglesDef : data.homeRectanglesOff) // Assume simple mode stores flat arrays or mapped properly
        : (activePhase === 'defensive' ? data.awayRectanglesDef : data.awayRectanglesOff);

    // Notes for Simple Mode
    const teamColor = viewTeam === 'home' ? data.homeTeamColor : data.awayTeamColor;
    const defensiveNotes = viewTeam === 'home' ? data.homeDefensiveNotes : data.awayDefensiveNotes;
    const offensiveNotes = viewTeam === 'home' ? data.homeOffensiveNotes : data.awayOffensiveNotes;


    return (
        <div className="min-h-screen bg-panel-dark text-white flex flex-col">
            {/* Header */}
            <header className="bg-nav-dark border-b border-gray-800 p-4 shrink-0">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div>
                            <h1 className="text-lg font-bold leading-tight">{data.titulo}</h1>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                <span>{data.matchDate || 'Data não definida'}</span>
                                {data.matchTime && (
                                    <>
                                        <span className="w-1 h-1 rounded-full bg-gray-600" />
                                        <span>{data.matchTime}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {isFullMode && (
                            <div className="flex gap-2 mr-4">
                                <button
                                    onClick={() => setIsAnalysisSidebarOpen(true)}
                                    className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded text-sm font-medium transition"
                                >
                                    Notas da Partida
                                </button>
                                <button
                                    onClick={() => setIsEventsSidebarOpen(true)}
                                    className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded text-sm font-medium transition"
                                >
                                    Linha do Tempo
                                </button>
                            </div>
                        )}

                        <div className="text-right hidden sm:block">
                            <div className="text-2xl font-black tabular-nums tracking-widest bg-black/30 px-3 py-1 rounded">
                                {data.homeScore} - {data.homeScore !== undefined ? data.awayScore : 0}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className={`flex-1 overflow-y-auto ${isFullMode ? 'flex flex-col' : 'p-4 lg:p-6'}`}>
                {isFullMode ? (
                    <div className="flex-1 relative">
                        <FullAnalysisMode
                            homeTeamName={data.homeTeam}
                            awayTeamName={data.awayTeam}
                            homeTeamColor={data.homeTeamColor || '#EF4444'}
                            awayTeamColor={data.awayTeamColor || '#3B82F6'}

                            homePlayersDef={data.homePlayersDef}
                            homePlayersOff={data.homePlayersOff}
                            homeSubstitutes={data.homeSubstitutes || []}
                            homeArrows={{ 'full_home': data.homeArrowsDef || [] }}
                            homeRectangles={{ 'full_home': data.homeRectanglesDef || [] }}

                            awayPlayersDef={data.awayPlayersDef}
                            awayPlayersOff={data.awayPlayersOff}
                            awaySubstitutes={data.awaySubstitutes || []}
                            awayArrows={{ 'full_away': data.awayArrowsDef || [] }}
                            awayRectangles={{ 'full_away': data.awayRectanglesDef || [] }}

                            homeCoachName={data.homeCoach}
                            awayCoachName={data.awayCoach}
                            onHomeCoachChange={() => { }}
                            onAwayCoachChange={() => { }}

                            onPlayerMove={() => { }}
                            onPlayerClick={() => { }}
                            onPlayerDoubleClick={handlePlayerDoubleClick}
                            onBenchPlayerClick={() => { }}

                            activeTool="select"
                            onToolChange={() => { }}

                            onAddArrow={() => { }}
                            onRemoveArrow={() => { }}
                            onMoveArrow={() => { }}
                            onAddRectangle={() => { }}
                            onRemoveRectangle={() => { }}
                            onMoveRectangle={() => { }}

                            onOpenColorPicker={() => { }}
                            onOpenAnalysis={() => setIsAnalysisSidebarOpen(true)}
                            onOpenEvents={() => setIsEventsSidebarOpen(true)}
                            onSave={() => { }}
                            onExport={() => { }}
                            onAddPlayer={() => { }}
                            isSaving={false}
                            hasUnsavedChanges={false}
                            readOnly={true}
                        />

                        <AnalysisSidebar
                            isOpen={isAnalysisSidebarOpen}
                            onClose={() => setIsAnalysisSidebarOpen(false)}
                            homeTeamName={data.homeTeam}
                            awayTeamName={data.awayTeam}
                            homeDefensiveNotes={data.homeDefensiveNotes}
                            homeOffensiveNotes={data.homeOffensiveNotes}
                            onHomeDefensiveNotesChange={() => { }}
                            onHomeOffensiveNotesChange={() => { }}
                            awayDefensiveNotes={data.awayDefensiveNotes}
                            awayOffensiveNotes={data.awayOffensiveNotes}
                            onAwayDefensiveNotesChange={() => { }}
                            onAwayOffensiveNotesChange={() => { }}
                            autoSaveStatus="idle"
                            readOnly={true}
                            tags={data.tags || []} // Pass loaded tags
                            onTagsChange={() => { }} // Read-only, do nothing
                        />
                        <EventsSidebar
                            isOpen={isEventsSidebarOpen}
                            onClose={() => setIsEventsSidebarOpen(false)}
                            events={(data.events || [])
                                .filter(e => ['goal', 'yellow_card', 'red_card', 'substitution', 'other'].includes(e.type))
                                .map(e => ({
                                    id: e.id,
                                    type: e.type as any,
                                    minute: e.minute,
                                    playerName: e.player_name,
                                    team: 'home' as const // Simplified team logic
                                }))}
                            onAddEvent={() => { }}
                            onRemoveEvent={() => { }}
                            homeTeam={data.homeTeam}
                            awayTeam={data.awayTeam}
                            homePlayers={(data.homePlayersDef || []).map(p => ({ id: p.id, name: p.name, number: p.number }))}
                            awayPlayers={(data.awayPlayersDef || []).map(p => ({ id: p.id, name: p.name, number: p.number }))}
                            readOnly={true}
                        />
                    </div>
                ) : (
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
                                        arrows={currentArrows || []}
                                        rectangles={(currentRectangles || []).map(r => ({ ...r, startX: r.startX, startY: r.startY, endX: r.endX, endY: r.endY }))}
                                        readOnly={true}
                                        playerColor={teamColor}
                                        // Pass mock methods to satisfy required props
                                        onAddArrow={() => { }}
                                        onRemoveArrow={() => { }}
                                        onMoveArrow={() => { }}
                                        onAddRectangle={() => { }}
                                        onRemoveRectangle={() => { }}
                                        onMoveRectangle={() => { }}
                                    />
                                </div>

                                {/* Coach Display Overlay */}
                                <div className="absolute top-4 left-4">
                                    <CoachNameDisplay
                                        coachName={viewTeam === 'home' ? (data.homeCoach || '') : (data.awayCoach || '')}
                                        onSave={() => { }}
                                        readOnly={true}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Right Panel: Notes & Events */}
                        <div className="flex flex-col gap-6 lg:h-full lg:overflow-hidden">

                            {/* Notes Section - scrollable */}
                            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
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

                                {/* Timeline Section */}
                                {data.events && data.events.length > 0 && (
                                    <div className="bg-card-dark rounded-xl border border-gray-700 shadow-lg flex flex-col max-h-[400px]">
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
                    </div>
                )}
            </main>

            {/* Note Viewer Modal */}
            {viewingPlayerNote && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4" onClick={() => setViewingPlayerNote(null)}>
                    <div
                        className="bg-[#1a1f2e] rounded-xl border border-gray-700 shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-700">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                                {viewingPlayerNote.name}
                            </h3>
                            <button
                                onClick={() => setViewingPlayerNote(null)}
                                className="w-8 h-8 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 flex items-center justify-center transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            <h4 className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-3 flex items-center gap-2">
                                <StickyNote size={14} />
                                Anotação Tática
                            </h4>
                            <div className="bg-black/20 rounded-lg p-5 border border-gray-700/50">
                                <p className="text-gray-200 text-base leading-relaxed whitespace-pre-wrap font-medium">
                                    {viewingPlayerNote.note}
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-700/50 bg-black/20 text-center">
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold opacity-70">Analise.Futebol</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
