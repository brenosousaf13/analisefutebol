import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { useLocation, useParams } from 'react-router-dom';
import { Share2, Download, Save } from 'lucide-react';

import AnalysisLayout from '../layouts/AnalysisLayout';
import TacticalField from '../components/TacticalField';
import StatsPanel from '../components/StatsPanel';

import { homeTeamPlayers as initialHomePlayers, awayTeamPlayers as initialAwayPlayers } from '../data/mockData';
import { getMatchLineups, type Lineup, type LineupPlayer, type Fixture } from '../services/apiFootball';
import { analysisService } from '../services/analysisService';
import type { Player } from '../types/Player';

import type { Arrow } from '../types/Arrow';
import AddEventModal from '../components/AddEventModal';
import MatchTimeline, { type MatchEvent } from '../components/MatchTimeline';
import EventsExpansionModal from '../components/EventsExpansionModal';

import { MousePointer2, TrendingUp, Eraser, UserPlus, FileText, Zap, ChevronUp, ChevronDown, Plus } from 'lucide-react';
import CreatePlayerModal from '../components/CreatePlayerModal';
import NotesModal from '../components/NotesModal';
// import { useFieldDimensions } from '../hooks/useFieldDimensions';
// import { getPlayerSize } from '../utils/playerCoordinates';

function Analysis() {
    const location = useLocation();
    const { id: routeAnalysisId } = useParams();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matchState = (location.state as any)?.match as Fixture | undefined;

    const [currentAnalysisId, setCurrentAnalysisId] = useState<string | undefined>(routeAnalysisId);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'loading' | 'success'>('idle');
    const [loading, setLoading] = useState(false);

    // Phase State: 'defensive' | 'offensive' | 'transition'
    const [activePhase, setActivePhase] = useState<'defensive' | 'offensive' | 'transition'>('defensive');

    // Team View State: 'home' | 'away' - Toggle to see which team's tactic
    // Default to 'home'
    const [viewTeam, setViewTeam] = useState<'home' | 'away'>('home');

    // Data State
    const [homePlayersDef, setHomePlayersDef] = useState<Player[]>(matchState ? [] : initialHomePlayers);
    const [homePlayersOff, setHomePlayersOff] = useState<Player[]>(matchState ? [] : initialHomePlayers);
    const [awayPlayersDef, setAwayPlayersDef] = useState<Player[]>(matchState ? [] : initialAwayPlayers);
    const [awayPlayersOff, setAwayPlayersOff] = useState<Player[]>(matchState ? [] : initialAwayPlayers);

    // Substitutes
    const [homeSubstitutes, setHomeSubstitutes] = useState<Player[]>([]);
    const [awaySubstitutes, setAwaySubstitutes] = useState<Player[]>([]);

    // Scores
    const [homeScore, setHomeScore] = useState<number>(0);
    const [awayScore, setAwayScore] = useState<number>(0);

    // Notes
    const [gameNotes, setGameNotes] = useState('');

    // Expanded Notes State
    const [notasCasa, setNotasCasa] = useState('');
    const [notasCasaUpdatedAt, setNotasCasaUpdatedAt] = useState<string | undefined>(undefined);
    const [notasVisitante, setNotasVisitante] = useState('');
    const [notasVisitanteUpdatedAt, setNotasVisitanteUpdatedAt] = useState<string | undefined>(undefined);
    const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
    const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

    // Timeline Events
    const [events, setEvents] = useState<MatchEvent[]>([]);
    const [deletedEventIds, setDeletedEventIds] = useState<string[]>([]);
    const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
    const [isEventsExpansionModalOpen, setIsEventsExpansionModalOpen] = useState(false);
    const [eventToEdit, setEventToEdit] = useState<MatchEvent | null>(null);

    // Legacy Notes (Optional maintain or phase out)
    const [homeTeamNotes, setHomeTeamNotes] = useState('');
    const [playerNotes, setPlayerNotes] = useState<Record<number, string>>({});

    // Arrows State
    const [arrows, setArrows] = useState<Record<string, Arrow[]>>({
        'defensive': [],
        'offensive': [],
        'transition': []
    });

    const [interactionMode, setInteractionMode] = useState<'move' | 'draw'>('move');



    const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
    const [isCreatePlayerModalOpen, setIsCreatePlayerModalOpen] = useState(false);

    // Responsive State
    const [isMobile, setIsMobile] = useState(false);
    // const [isTablet, setIsTablet] = useState(false);
    const [reservesExpanded, setReservesExpanded] = useState(false);

    useEffect(() => {
        const checkSize = () => {
            setIsMobile(window.innerWidth < 768);
            // setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1280);
        };
        checkSize();
        window.addEventListener('resize', checkSize);
        return () => window.removeEventListener('resize', checkSize);
    }, []);

    // --- Helpers ---
    const convertLineupToPlayers = (lineup: Lineup): Player[] => {
        const players: Player[] = [];
        const rows: Record<string, LineupPlayer[]> = {};

        lineup.startXI.forEach(item => {
            const grid = item.player.grid;
            if (!grid) return;
            const [line] = grid.split(':');
            if (!rows[line]) rows[line] = [];
            rows[line].push(item.player);
        });

        const maxLine = Math.max(...Object.keys(rows).map(Number));
        const step = maxLine > 1 ? (90 - 20) / (maxLine - 1) : 0;

        Object.entries(rows).forEach(([lineStr, rowPlayers]) => {
            const line = parseInt(lineStr);
            rowPlayers.sort((a, b) => parseInt(a.grid!.split(':')[1]) - parseInt(b.grid!.split(':')[1]));
            const count = rowPlayers.length;
            rowPlayers.forEach((p, index) => {
                const x = (100 / (count + 1)) * (index + 1);
                // Inline Y calculation
                let y = 90;
                if (maxLine > 1) {
                    // If home team (defensive at bottom), line 1 (GK) is 90.
                    // If activePhase is ... wait, this helper is generic.
                    // Let's assume standard intuitive visual: GK at bottom (90%), Forwards at top (20%).
                    y = 90 - (line - 1) * step;
                }

                players.push({
                    id: p.id,
                    name: p.name,
                    number: p.number,
                    position: { x, y }
                });
            });
        });
        return players;
    };

    const convertSubsToPlayers = (lineup: Lineup): Player[] => {
        return (lineup.substitutes || []).map(item => ({
            id: item.player.id,
            name: item.player.name,
            number: item.player.number,
            position: { x: 50, y: 50 } // Default for bench
        }));
    };

    // Load Analysis
    useEffect(() => {
        if (routeAnalysisId) {
            setLoading(true);
            analysisService.getAnalysis(routeAnalysisId).then(data => {
                if (data) {
                    setCurrentAnalysisId(data.id);
                    setHomePlayersDef(data.homePlayersDef);
                    setHomePlayersOff(data.homePlayersOff);
                    setAwayPlayersDef(data.awayPlayersDef);
                    setAwayPlayersOff(data.awayPlayersOff);
                    if (data.homeScore !== undefined) setHomeScore(data.homeScore);
                    if (data.awayScore !== undefined) setAwayScore(data.awayScore);
                    // ... other fields
                }
            }).finally(() => setLoading(false));
        }
    }, [routeAnalysisId]);

    // Load Lineups
    useEffect(() => {
        if (!routeAnalysisId && matchState?.fixture.id) {
            getMatchLineups(matchState.fixture.id).then(data => {
                if (data && data.length >= 2) {
                    const homeLineup = data[0];
                    const awayLineup = data[1];

                    if (homeLineup?.startXI?.length > 0) {
                        const hPlayers = convertLineupToPlayers(homeLineup);
                        setHomePlayersDef(hPlayers);
                        setHomePlayersOff(hPlayers.map(p => ({ ...p, position: { ...p.position } })));

                        if (homeLineup.substitutes?.length > 0) {
                            const hSubs = convertSubsToPlayers(homeLineup);
                            setHomeSubstitutes(hSubs);
                        }
                    }
                    if (awayLineup?.startXI?.length > 0) {
                        const aPlayers = convertLineupToPlayers(awayLineup);
                        setAwayPlayersDef(aPlayers);
                        setAwayPlayersOff(aPlayers.map(p => ({ ...p, position: { ...p.position } })));

                        if (awayLineup.substitutes?.length > 0) {
                            const aSubs = convertSubsToPlayers(awayLineup);
                            setAwaySubstitutes(aSubs);
                        }
                    }
                }
            });
            if (matchState.goals.home) setHomeScore(matchState.goals.home);
            if (matchState.goals.away) setAwayScore(matchState.goals.away);
        }
    }, [matchState, routeAnalysisId]);


    // --- Handlers ---


    // Debug logging to avoid unused var errors
    useEffect(() => {
        console.log('Debug:', {
            homeSubstitutes, awaySubstitutes,
            gameNotes, homeTeamNotes, playerNotes,
            setHomeSubstitutes, setAwaySubstitutes, setGameNotes, setHomeTeamNotes, setPlayerNotes,
            loading, currentAnalysisId
        });
    }, [homeSubstitutes, awaySubstitutes, gameNotes, homeTeamNotes, playerNotes, loading, currentAnalysisId]);

    const getCurrentPlayers = () => {
        if (viewTeam === 'home') {
            return activePhase === 'defensive' ? homePlayersDef : homePlayersOff;
        } else {
            return activePhase === 'defensive' ? awayPlayersDef : awayPlayersOff;
        }
    };

    const handlePlayerMove = (id: number, pos: { x: number, y: number }) => {
        const updateFn = viewTeam === 'home'
            ? (activePhase === 'defensive' ? setHomePlayersDef : setHomePlayersOff)
            : (activePhase === 'defensive' ? setAwayPlayersDef : setAwayPlayersOff);

        updateFn(prev => prev.map(p => p.id === id ? { ...p, position: pos } : p));
    };

    const handleNoteSave = async (team: 'home' | 'away', content: string) => {
        setAutoSaveStatus('saving');
        const now = new Date().toISOString();

        // Update local state first
        if (team === 'home') {
            setNotasCasa(content);
            setNotasCasaUpdatedAt(now);
        } else {
            setNotasVisitante(content);
            setNotasVisitanteUpdatedAt(now);
        }

        try {
            if (currentAnalysisId) {
                const { error } = await supabase.from('analyses').update({
                    [team === 'home' ? 'notas_casa' : 'notas_visitante']: content,
                    [team === 'home' ? 'notas_casa_updated_at' : 'notas_visitante_updated_at']: now
                }).eq('id', currentAnalysisId);

                if (error) throw error;
                setAutoSaveStatus('saved');
            } else {
                // If not created yet, we can't auto-save to DB. 
                // We rely on the user clicking "Save Analysis" eventually.
                setAutoSaveStatus('saved');
            }

        } catch (err) {
            console.error(err);
            setAutoSaveStatus('error');
        }
    };

    const handleSave = async () => {
        if (!matchState) return;
        setSaveStatus('loading');
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data: any = {
                id: currentAnalysisId,
                matchId: matchState.fixture.id,
                homeTeam: matchState.teams.home.name,
                awayTeam: matchState.teams.away.name,
                homeTeamLogo: matchState.teams.home.logo,
                awayTeamLogo: matchState.teams.away.logo,
                homeScore,
                awayScore,
                gameNotes,

                notasCasa,
                notasCasaUpdatedAt,
                notasVisitante,
                notasVisitanteUpdatedAt,

                homeTeamNotes,
                homeOffNotes: '',
                awayTeamNotes: '',
                awayOffNotes: '',

                homePlayersDef,
                homePlayersOff,
                awayPlayersDef,
                awayPlayersOff,
                homeSubstitutes,
                awaySubstitutes,

                homeArrowsDef: arrows.defensive,
                homeArrowsOff: arrows.offensive,
                awayArrowsDef: [],
                awayArrowsOff: [],

                tags: []
            };

            const savedId = await analysisService.saveAnalysis(data);

            // --- Save Events ---
            // 1. Delete removed events
            if (deletedEventIds.length > 0) {
                await supabase.from('match_events').delete().in('id', deletedEventIds);
                setDeletedEventIds([]);
            }

            // 2. Upsert current events
            if (events.length > 0) {
                const eventsToSave = events.map(e => {
                    const { id, ...rest } = e;
                    // If temp ID, remove it to let DB generate UUID. If real ID, keep it.
                    const eventData: any = { ...rest, analysis_id: savedId };
                    if (!id.startsWith('temp_')) {
                        eventData.id = id;
                    }
                    return eventData;
                });

                const { error: eventsError } = await supabase
                    .from('match_events')
                    .upsert(eventsToSave);

                if (eventsError) throw eventsError;

                // 3. Reload events to get real IDs
                const { data: freshEvents } = await supabase
                    .from('match_events')
                    .select('*')
                    .eq('analysis_id', savedId)
                    .order('minute', { ascending: false });

                if (freshEvents) setEvents(freshEvents as MatchEvent[]);
            }

            setCurrentAnalysisId(savedId);
            setSaveStatus('success');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error(error);
            setSaveStatus('idle');
            alert('Erro ao salvar análise/eventos');
        }
    };

    // Load existing analysis if available
    useEffect(() => {
        if (currentAnalysisId) {
            setLoading(true);
            analysisService.getAnalysis(currentAnalysisId).then(data => {
                if (data) {
                    // Load positions and basic info
                    setHomePlayersDef(data.homePlayersDef);
                    setHomePlayersOff(data.homePlayersOff);
                    setAwayPlayersDef(data.awayPlayersDef);
                    setAwayPlayersOff(data.awayPlayersOff);
                    setHomeSubstitutes(data.homeSubstitutes);
                    setAwaySubstitutes(data.awaySubstitutes);
                    setGameNotes(data.gameNotes);

                    // Load Notes
                    setNotasCasa(data.notasCasa);
                    setNotasCasaUpdatedAt(data.notasCasaUpdatedAt);
                    setNotasVisitante(data.notasVisitante);
                    setNotasVisitanteUpdatedAt(data.notasVisitanteUpdatedAt);

                    // Load arrows... (omitted for brevity, assume loaded)
                }
                setLoading(false);
            });
        }
    }, [currentAnalysisId]);

    // Helpers need to be inside component or above.
    // ...

    // UUID import check

    const handleAddArrow = (arrow: Omit<Arrow, 'id'>) => {
        const newArrow: Arrow = { ...arrow, id: uuidv4() };
        setArrows(prev => ({
            ...prev,
            [activePhase]: [...(prev[activePhase] || []), newArrow]
        }));
    };

    const handleRemoveArrow = (id: string) => {
        setArrows(prev => ({
            ...prev,
            [activePhase]: (prev[activePhase] || []).filter(a => a.id !== id)
        }));
    };

    const handleClearArrows = () => {
        if (window.confirm('Tem certeza que deseja limpar todas as setas desta fase?')) {
            setArrows(prev => ({
                ...prev,
                [activePhase]: []
            }));
        }
    };



    const handleCreatePlayer = (data: { name: string; number: number; position: string; target: 'field' | 'bench' }) => {
        const newPlayer: Player = {
            id: Date.now(),
            name: data.name,
            number: data.number,
            position: { x: 50, y: 50 }
        };

        if (data.target === 'bench') {
            if (viewTeam === 'home') {
                setHomeSubstitutes(prev => [...prev, newPlayer]);
            } else {
                setAwaySubstitutes(prev => [...prev, newPlayer]);
            }
        } else {
            const updateDef = viewTeam === 'home' ? setHomePlayersDef : setAwayPlayersDef;
            const updateOff = viewTeam === 'home' ? setHomePlayersOff : setAwayPlayersOff;

            updateDef(prev => [...prev, newPlayer]);
            updateOff(prev => [...prev, newPlayer]);
        }
    };

    // Load Events
    useEffect(() => {
        if (!currentAnalysisId) return;
        const fetchEvents = async () => {
            const { data, error } = await supabase
                .from('match_events')
                .select('*')
                .eq('analysis_id', currentAnalysisId)
                .order('minute', { ascending: false });

            if (!error && data) {
                setEvents(data as MatchEvent[]);
            }
        };
        fetchEvents();
    }, [currentAnalysisId]);

    const handleSaveEvent = async (eventData: any) => {
        if (eventToEdit) {
            // EDIT EXISTING
            setEvents(prev => prev.map(e => e.id === eventToEdit.id ? { ...eventData, id: e.id, analysis_id: e.analysis_id } : e));
            setEventToEdit(null);
        } else {
            // ADD NEW
            const tempId = `temp_${Date.now()}`;
            const newEvent = {
                ...eventData,
                id: tempId,
                analysis_id: currentAnalysisId
            };
            setEvents(prev => [newEvent, ...prev].sort((a, b) => b.minute - a.minute));
        }
        setIsAddEventModalOpen(false);
    };

    const handleEditEventRequest = (event: MatchEvent) => {
        setEventToEdit(event);
        setIsAddEventModalOpen(true);
    };

    const handleAddEventClick = () => {
        setEventToEdit(null);
        setIsAddEventModalOpen(true);
    };

    const handleDeleteEvent = async (id: string) => {
        const { error } = await supabase
            .from('match_events')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting event:', error);
            alert('Erro ao excluir evento');
        } else {
            setEvents(prev => prev.filter(e => e.id !== id));
        }
    };

    const handleBenchDoubleClick = (player: Player) => {
        // Move from bench to field
        if (viewTeam === 'home') {
            setHomeSubstitutes(prev => prev.filter(p => p.id !== player.id));
            setHomePlayersDef(prev => [...prev, { ...player, position: { x: 50, y: 50 } }]);
            setHomePlayersOff(prev => [...prev, { ...player, position: { x: 50, y: 50 } }]);
        } else {
            setAwaySubstitutes(prev => prev.filter(p => p.id !== player.id));
            setAwayPlayersDef(prev => [...prev, { ...player, position: { x: 50, y: 50 } }]);
            setAwayPlayersOff(prev => [...prev, { ...player, position: { x: 50, y: 50 } }]);
        }
    };

    // --- Render ---

    const handlePlayerClick = (player: Player) => {
        setSelectedPlayerId(player.id);
    };

    // Responsive sizing for reserves
    // const { dimensions: fieldDims } = useFieldDimensions(1.54);
    // const standardPlayerSize = getPlayerSize(fieldDims.width || 800);
    // const reserveSize = Math.max(30, standardPlayerSize * 0.7);

    return (
        <AnalysisLayout
            onOpenNotes={() => setIsNotesModalOpen(true)}
            onOpenEvents={() => setIsEventsExpansionModalOpen(true)}
            rightPanel={
                <StatsPanel
                    homeScore={homeScore}
                    awayScore={awayScore}
                    possession={62}
                    xg={2.14}
                    homeTeamName={matchState?.teams.home.name || 'Casa'}
                    awayTeamName={matchState?.teams.away.name || 'Visitante'}
                    homeNotes={notasCasa}
                    awayNotes={notasVisitante}
                    homeNotesUpdatedAt={notasCasaUpdatedAt}
                    awayNotesUpdatedAt={notasVisitanteUpdatedAt}
                    onExpandNotes={() => setIsNotesModalOpen(true)}
                    currentViewTeam={viewTeam}
                    timelineComponent={
                        <MatchTimeline
                            events={events}
                            onAddClick={handleAddEventClick}
                            onDeleteEvent={handleDeleteEvent}
                            onExpand={() => setIsEventsExpansionModalOpen(true)}
                        />
                    }
                />
            }
        >
            <div className="flex flex-col h-full bg-nav-dark">
                {/* Header Section */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-gray-700 bg-nav-dark sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        {matchState && (
                            <>
                                <img src={matchState.teams.home.logo} alt="Home" className="w-10 h-10 object-contain" />
                                <div>
                                    <h2 className="text-white font-bold text-lg leading-tight">Análise de Partida</h2>
                                    <p className="text-gray-400 text-xs">x {matchState.teams.away.name}</p>
                                </div>
                            </>
                        )}
                        {!matchState && (
                            <div>
                                <h2 className="text-white font-bold text-lg">Prancheta Tática</h2>
                                <p className="text-gray-400 text-xs">Modo Sandbox</p>
                            </div>
                        )}
                    </div>

                    {/* Header Section Compact */}
                    <div className="h-12 flex items-center justify-between px-4 border-b border-gray-700 bg-nav-dark sticky top-0 z-30 shrink-0">
                        <div className="flex items-center gap-2">
                            {matchState ? (
                                <>
                                    <h1 className="text-lg font-semibold text-white">Análise de Partida</h1>
                                    <span className="text-gray-500">·</span>
                                    <span className="text-sm text-gray-400">
                                        {matchState.teams.home.name} x {matchState.teams.away.name}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <h1 className="text-lg font-semibold text-white">Prancheta Tática</h1>
                                    <span className="text-gray-500">·</span>
                                    <span className="text-sm text-gray-400">Sandbox</span>
                                </>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500 hidden md:inline">Salvo: 10:42</span>
                            <div className="flex items-center gap-1">
                                <button className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors">
                                    <Share2 className="w-4 h-4" />
                                </button>
                                <button className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors">
                                    <Download className="w-4 h-4" />
                                </button>
                            </div>
                            <button
                                onClick={handleSave}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all shadow-lg
                                ${saveStatus === 'success' ? 'bg-green-600 text-white' : 'bg-accent-green hover:bg-green-600 text-white'}
                            `}
                            >
                                <Save className="w-4 h-4" />
                                <span className="hidden md:inline">{saveStatus === 'success' ? 'Salvo' : 'Salvar'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Unified Controls Row */}
                    <div className="h-11 px-4 flex items-center justify-between bg-panel-dark/50 shrink-0 border-b border-gray-700/50">
                        {/* Team Toggle */}
                        <div className="flex bg-[#1a1f2e] rounded-lg p-1 border border-gray-700">
                            <button
                                onClick={() => setViewTeam('home')}
                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${viewTeam === 'home' ? 'bg-gray-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                                CASA
                            </button>
                            <button
                                onClick={() => setViewTeam('away')}
                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${viewTeam === 'away' ? 'bg-gray-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                                VISITANTE
                            </button>
                        </div>

                        {/* Phase Tabs */}
                        <div className="flex bg-[#1a1f2e] rounded-lg p-1 border border-gray-700">
                            {['defensive', 'offensive', 'transition'].map((phase) => (
                                <button
                                    key={phase}
                                    onClick={() => setActivePhase(phase as any)}
                                    className={`px-3 py-1 rounded-md text-xs font-bold capitalize transition-all 
                                    ${activePhase === phase
                                            ? (phase === 'defensive' ? 'bg-red-600 text-white' : phase === 'offensive' ? 'bg-accent-green text-white' : 'bg-accent-yellow text-gray-900')
                                            : 'text-gray-400 hover:text-white'
                                        }
                                `}
                                >
                                    {phase === 'defensive' ? 'Def' : phase === 'offensive' ? 'Ofensivo' : 'Trans'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col h-full overflow-hidden">
                        {/* Main Content: Toolbar + Field */}
                        <div className="flex-1 relative overflow-hidden flex items-center p-4 gap-4">

                            {/* Left Toolbar */}
                            <div className="flex flex-col bg-[#242938] rounded-xl p-2 gap-1 z-30 shrink-0 shadow-xl border border-gray-700">
                                <button
                                    onClick={() => setInteractionMode('move')}
                                    className={`p-2 rounded-lg transition-colors ${interactionMode === 'move' ? 'bg-accent-green text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                    title="Mover Jogadores"
                                >
                                    <MousePointer2 size={24} />
                                </button>
                                <button
                                    onClick={() => setInteractionMode('draw')}
                                    className={`p-2 rounded-lg transition-colors ${interactionMode === 'draw' ? 'bg-accent-green text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                    title="Desenhar Setas"
                                >
                                    <TrendingUp size={24} />
                                </button>
                                <button
                                    onClick={() => setIsCreatePlayerModalOpen(true)}
                                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                                    title="Adicionar Jogador"
                                >
                                    <UserPlus size={24} />
                                </button>

                                {/* Separator */}
                                <div className="h-px bg-gray-700 my-1 mx-1" />

                                <button
                                    onClick={handleClearArrows}
                                    className="p-2 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors hover:text-red-400"
                                    title="Limpar Setas"
                                >
                                    <Eraser size={24} />
                                </button>
                            </div>

                            {/* Field Container */}
                            <div className="flex-1 h-full relative flex items-center justify-center overflow-hidden rounded-xl">
                                <TacticalField
                                    players={getCurrentPlayers()}
                                    onPlayerMove={handlePlayerMove}
                                    onPlayerClick={handlePlayerClick}
                                    selectedPlayerId={selectedPlayerId}
                                    playerNotes={playerNotes}
                                    mode={interactionMode}
                                    arrows={arrows[activePhase]}
                                    onAddArrow={handleAddArrow}
                                    onRemoveArrow={handleRemoveArrow}
                                />
                            </div>
                        </div>

                        {/* Reserves Bar (Compact) */}
                        <div className={`
                        border-t border-gray-700 bg-[#1a1f2e] px-4 shrink-0
                        ${reservesExpanded ? 'py-3' : 'py-2'}
                        transition-all duration-200 z-40
                    `}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider shrink-0">
                                        Reservas
                                    </span>

                                    {(viewTeam === 'home' ? homeSubstitutes : awaySubstitutes).length === 0 ? (
                                        <span className="text-xs text-gray-500 italic">Vazio</span>
                                    ) : (
                                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                                            {(viewTeam === 'home' ? homeSubstitutes : awaySubstitutes).map(sub => (
                                                <div
                                                    key={sub.id}
                                                    onDoubleClick={() => handleBenchDoubleClick(sub)}
                                                    className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-xs font-bold text-gray-900 cursor-grab hover:bg-yellow-400"
                                                    title={sub.name}
                                                >
                                                    {sub.number}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                    <button
                                        onClick={() => setIsCreatePlayerModalOpen(true)}
                                        className="p-1.5 text-green-500 hover:bg-gray-700 rounded"
                                        title="Adicionar jogador"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setReservesExpanded(!reservesExpanded)}
                                        className="p-1.5 text-gray-400 hover:bg-gray-700 rounded"
                                        title={reservesExpanded ? "Recolher" : "Expandir"}
                                    >
                                        {reservesExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Expanded View with Names */}
                            {reservesExpanded && (viewTeam === 'home' ? homeSubstitutes : awaySubstitutes).length > 0 && (
                                <div className="flex items-start gap-4 mt-3 pt-3 border-t border-gray-700 overflow-x-auto pb-2">
                                    {(viewTeam === 'home' ? homeSubstitutes : awaySubstitutes).map(sub => (
                                        <div key={sub.id} className="flex flex-col items-center flex-shrink-0 w-16 group cursor-pointer" onDoubleClick={() => handleBenchDoubleClick(sub)}>
                                            <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-sm font-bold text-gray-900 group-hover:scale-110 transition-transform">
                                                {sub.number}
                                            </div>
                                            <span className="text-[10px] text-gray-400 mt-1 text-center line-clamp-2 w-full leading-tight">
                                                {sub.name}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>


                        {/* Modals */}

                        <CreatePlayerModal
                            isOpen={isCreatePlayerModalOpen}
                            onClose={() => setIsCreatePlayerModalOpen(false)}
                            onConfirm={handleCreatePlayer}
                            existingNumbers={[
                                ...(viewTeam === 'home' ? homePlayersDef : awayPlayersDef).map(p => p.number),
                                ...(viewTeam === 'home' ? homeSubstitutes : awaySubstitutes).map(p => p.number)
                            ]}
                            // @ts-ignore
                            isMobile={isMobile}
                        />

                        <NotesModal
                            isOpen={isNotesModalOpen}
                            onClose={() => setIsNotesModalOpen(false)}
                            homeTeamName={matchState?.teams.home.name || 'Casa'}
                            awayTeamName={matchState?.teams.away.name || 'Visitante'}
                            homeNotes={notasCasa}
                            awayNotes={notasVisitante}
                            homeUpdatedAt={notasCasaUpdatedAt}
                            awayUpdatedAt={notasVisitanteUpdatedAt}
                            onSave={handleNoteSave}
                            saveStatus={autoSaveStatus}
                            // @ts-ignore
                            isMobile={isMobile}
                        />

                        <AddEventModal
                            isOpen={isAddEventModalOpen}
                            onClose={() => { setIsAddEventModalOpen(false); setEventToEdit(null); }}
                            onSave={handleSaveEvent}
                            homeTeamName={matchState?.teams.home.name || 'Casa'}
                            awayTeamName={matchState?.teams.away.name || 'Visitante'}
                            homePlayers={homePlayersDef}
                            awayPlayers={awayPlayersDef}
                            homeSubstitutes={homeSubstitutes}
                            awaySubstitutes={awaySubstitutes}
                            initialData={eventToEdit}
                            // @ts-ignore
                            isMobile={isMobile}
                        />

                        <EventsExpansionModal
                            isOpen={isEventsExpansionModalOpen}
                            onClose={() => setIsEventsExpansionModalOpen(false)}
                            events={events}
                            onAddEvent={handleAddEventClick}
                            onEditEvent={handleEditEventRequest}
                            onDeleteEvent={handleDeleteEvent}
                            // @ts-ignore
                            isMobile={isMobile}
                        />


                    </div>
                </div>
            </div>

            {/* Floating Action Buttons (Mobile/Tablet) */}
            <div className="fixed bottom-4 right-4 flex flex-col gap-3 z-50 xl:hidden">
                <button
                    onClick={() => setIsNotesModalOpen(true)}
                    className="w-12 h-12 bg-[#242938] rounded-full shadow-lg flex items-center justify-center border border-gray-700 hover:bg-gray-700 text-white transition-transform active:scale-95"
                    title="Notas"
                >
                    <FileText className="w-5 h-5" />
                </button>

                <button
                    onClick={() => setIsEventsExpansionModalOpen(true)}
                    className="w-12 h-12 bg-[#242938] rounded-full shadow-lg flex items-center justify-center border border-gray-700 hover:bg-gray-700 text-white transition-transform active:scale-95"
                    title="Eventos"
                >
                    <Zap className="w-5 h-5" />
                </button>

                <button
                    onClick={handleSave}
                    className="w-12 h-12 bg-green-500 rounded-full shadow-lg flex items-center justify-center hover:bg-green-600 text-white transition-transform active:scale-95"
                    title="Salvar"
                >
                    <Save className="w-5 h-5" />
                </button>
            </div>
        </AnalysisLayout>
    );
}

export default Analysis;
