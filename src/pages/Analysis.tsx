import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { useLocation, useParams } from 'react-router-dom';
import { Download, Save, Loader2, CheckCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

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

import { MousePointer2, TrendingUp, Eraser, UserPlus } from 'lucide-react';
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
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Phase State: 'defensive' | 'offensive' | 'transition'
    const [activePhase] = useState<'defensive' | 'offensive' | 'transition'>('defensive');

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

    // Arrows State - Separated by team AND phase
    const [homeArrows, setHomeArrows] = useState<Record<string, Arrow[]>>({
        'defensive': [],
        'offensive': [],
        'transition': []
    });
    const [awayArrows, setAwayArrows] = useState<Record<string, Arrow[]>>({
        'defensive': [],
        'offensive': [],
        'transition': []
    });

    const [interactionMode, setInteractionMode] = useState<'move' | 'draw'>('move');



    const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
    const [isCreatePlayerModalOpen, setIsCreatePlayerModalOpen] = useState(false);

    // Responsive State
    // const [isMobile, setIsMobile] = useState(false);
    // const [isTablet, setIsTablet] = useState(false);
    // const [reservesExpanded, setReservesExpanded] = useState(false);

    /*
    useEffect(() => {
        const checkSize = () => {
            setIsMobile(window.innerWidth < 768);
            // setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1280);
        };
        checkSize();
        window.addEventListener('resize', checkSize);
        return () => window.removeEventListener('resize', checkSize);
    }, []);
    */

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



    const handlePlayerMove = (id: number, pos: { x: number, y: number }, phase?: 'defensive' | 'offensive') => {
        // If phase provided, use it. Else fall back to activePhase (though activePhase is less relevant now with dual view)
        const targetPhase = phase || activePhase;

        const updateFn = viewTeam === 'home'
            ? (targetPhase === 'defensive' ? setHomePlayersDef : setHomePlayersOff)
            : (targetPhase === 'defensive' ? setAwayPlayersDef : setAwayPlayersOff);

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

    const handleSave = useCallback(async () => {
        // Allow save even without matchState for blank analyses
        setSaveStatus('loading');
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data: any = {
                id: currentAnalysisId,
                matchId: matchState?.fixture?.id,
                homeTeam: matchState?.teams?.home?.name || 'Time Casa',
                awayTeam: matchState?.teams?.away?.name || 'Time Visitante',
                homeTeamLogo: matchState?.teams?.home?.logo,
                awayTeamLogo: matchState?.teams?.away?.logo,
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

                homeArrowsDef: homeArrows.defensive,
                homeArrowsOff: homeArrows.offensive,
                awayArrowsDef: awayArrows.defensive,
                awayArrowsOff: awayArrows.offensive,

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
            setHasUnsavedChanges(false);
            toast.success('Análise salva com sucesso!');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error(error);
            setSaveStatus('idle');
            toast.error('Erro ao salvar análise');
        }
    }, [currentAnalysisId, homePlayersDef, homePlayersOff, awayPlayersDef, awayPlayersOff,
        homeSubstitutes, awaySubstitutes, homeArrows, awayArrows, gameNotes, notasCasa, notasVisitante,
        homeScore, awayScore, events, deletedEventIds, matchState, homeTeamNotes,
        notasCasaUpdatedAt, notasVisitanteUpdatedAt]);

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

                    // Load arrows for both teams
                    setHomeArrows({
                        defensive: data.homeArrowsDef || [],
                        offensive: data.homeArrowsOff || [],
                        transition: []
                    });
                    setAwayArrows({
                        defensive: data.awayArrowsDef || [],
                        offensive: data.awayArrowsOff || [],
                        transition: []
                    });

                    // Reset unsaved changes flag after load
                    setHasUnsavedChanges(false);
                }
                setLoading(false);
            });
        }
    }, [currentAnalysisId]);

    // Helpers need to be inside component or above.
    // ...

    // UUID import check

    const handleAddArrow = (arrow: Omit<Arrow, 'id'>, phase?: 'defensive' | 'offensive') => {
        const targetPhase = phase || activePhase;
        const newArrow: Arrow = { ...arrow, id: uuidv4() };
        const setArrowsFn = viewTeam === 'home' ? setHomeArrows : setAwayArrows;
        setArrowsFn(prev => ({
            ...prev,
            [targetPhase]: [...(prev[targetPhase] || []), newArrow]
        }));
    };

    const handleRemoveArrow = (id: string, phase?: 'defensive' | 'offensive') => {
        const targetPhase = phase || activePhase;
        const setArrowsFn = viewTeam === 'home' ? setHomeArrows : setAwayArrows;
        setArrowsFn(prev => ({
            ...prev,
            [targetPhase]: (prev[targetPhase] || []).filter(a => a.id !== id)
        }));
    };

    const handleClearArrows = () => {
        if (window.confirm('Tem certeza que deseja limpar todas as setas desta fase?')) {
            const setArrowsFn = viewTeam === 'home' ? setHomeArrows : setAwayArrows;
            setArrowsFn(prev => ({
                ...prev,
                defensive: [],
                offensive: []
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

    // Keyboard shortcut Ctrl+S / Cmd+S for save
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleSave]);

    // Detect unsaved changes
    useEffect(() => {
        if (loading) return; // Don't mark as changed during initial load
        setHasUnsavedChanges(true);
    }, [
        homePlayersDef, homePlayersOff, awayPlayersDef, awayPlayersOff,
        homeSubstitutes, awaySubstitutes, homeArrows, awayArrows, gameNotes,
        notasCasa, notasVisitante, events
    ]);


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
                {/* Top Control Bar - Centralized Team Toggle */}
                <div className="h-12 px-4 flex items-center justify-center bg-panel-dark/50 shrink-0 border-b border-gray-700/50 shadow-sm z-30">
                    <div className="flex bg-[#1a1f2e] rounded-lg p-1 border border-gray-700 shadow-lg">
                        <button
                            onClick={() => setViewTeam('home')}
                            className={`px-5 py-1.5 rounded-md text-sm font-bold transition-all ${viewTeam === 'home' ? 'bg-gray-600 text-white shadow ring-1 ring-white/10' : 'text-gray-400 hover:text-white'}`}
                        >
                            CASA
                        </button>
                        <button
                            onClick={() => setViewTeam('away')}
                            className={`px-5 py-1.5 rounded-md text-sm font-bold transition-all ${viewTeam === 'away' ? 'bg-gray-600 text-white shadow ring-1 ring-white/10' : 'text-gray-400 hover:text-white'}`}
                        >
                            VISITANTE
                        </button>
                    </div>
                </div>

                {/* Main Content: Single Green Background - NO borders, NO rounded corners */}
                <div className="flex-1 flex bg-[#242938] overflow-hidden p-4 gap-4">

                    {/* Toolbar - Keeps its OWN style with border */}
                    <div className="flex flex-col bg-[#1a1f2e] rounded-xl p-1.5 gap-1 shrink-0 self-center border border-gray-700/50">
                        {/* Mover */}
                        <button
                            onClick={() => setInteractionMode('move')}
                            className={`p-2 rounded-lg transition-all ${interactionMode === 'move' ? 'bg-green-500 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                            title="Mover jogadores"
                        >
                            <MousePointer2 className="w-5 h-5" />
                        </button>

                        {/* Desenhar setas */}
                        <button
                            onClick={() => setInteractionMode('draw')}
                            className={`p-2 rounded-lg transition-all ${interactionMode === 'draw' ? 'bg-green-500 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                            title="Desenhar deslocamento"
                        >
                            <TrendingUp className="w-5 h-5" />
                        </button>

                        {/* Adicionar jogador */}
                        <button
                            onClick={() => setIsCreatePlayerModalOpen(true)}
                            className="p-2 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                            title="Adicionar jogador"
                        >
                            <UserPlus className="w-5 h-5" />
                        </button>

                        {/* Separador */}
                        <div className="h-px bg-gray-600 my-1 mx-1" />

                        {/* Limpar setas */}
                        <button
                            onClick={handleClearArrows}
                            className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
                            title="Limpar setas"
                        >
                            <Eraser className="w-5 h-5 text-red-500" />
                        </button>

                        {/* Separador maior */}
                        <div className="my-2" />

                        {/* Download */}
                        <button
                            className="p-2 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                            title="Baixar análise"
                        >
                            <Download className="w-5 h-5" />
                        </button>

                        {/* Salvar */}
                        <button
                            onClick={handleSave}
                            className="relative p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 transition-colors"
                            title={saveStatus === 'loading' ? 'Salvando...' : 'Salvar análise (Ctrl+S)'}
                        >
                            {saveStatus === 'loading' ? (
                                <Loader2 className="w-5 h-5 text-green-500 animate-spin" />
                            ) : saveStatus === 'success' ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                                <Save className="w-5 h-5 text-green-500" />
                            )}
                            {/* Unsaved changes indicator */}
                            {hasUnsavedChanges && saveStatus === 'idle' && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full" />
                            )}
                        </button>
                    </div>

                    {/* Fields Area - Directly on green background, NO containers */}
                    <div className="flex-1 grid grid-cols-2 gap-6">
                        {/* Defensive Field */}
                        <div className="flex flex-col h-full">
                            {/* Label */}
                            <div className="text-center mb-2">
                                <span className="text-sm font-bold text-amber-400 uppercase tracking-widest">Defensivo</span>
                            </div>
                            {/* Field - Direct on background, no extra wrapper */}
                            <div className="flex-1 relative bg-field-pattern bg-center bg-cover rounded-lg overflow-hidden">
                                <TacticalField
                                    players={viewTeam === 'home' ? homePlayersDef : awayPlayersDef}
                                    onPlayerMove={(id, pos) => handlePlayerMove(id, pos, 'defensive')}
                                    onPlayerClick={handlePlayerClick}
                                    selectedPlayerId={selectedPlayerId}
                                    playerNotes={playerNotes}
                                    mode={interactionMode}
                                    arrows={viewTeam === 'home' ? homeArrows.defensive : awayArrows.defensive}
                                    onAddArrow={(arrow) => handleAddArrow(arrow, 'defensive')}
                                    onRemoveArrow={(id) => handleRemoveArrow(id, 'defensive')}
                                />
                            </div>
                        </div>

                        {/* Offensive Field */}
                        <div className="flex flex-col h-full">
                            {/* Label */}
                            <div className="text-center mb-2">
                                <span className="text-sm font-bold text-green-400 uppercase tracking-widest">Ofensivo</span>
                            </div>
                            {/* Field - Direct on background, no extra wrapper */}
                            <div className="flex-1 relative bg-field-pattern bg-center bg-cover rounded-lg overflow-hidden">
                                <TacticalField
                                    players={viewTeam === 'home' ? homePlayersOff : awayPlayersOff}
                                    onPlayerMove={(id, pos) => handlePlayerMove(id, pos, 'offensive')}
                                    onPlayerClick={handlePlayerClick}
                                    selectedPlayerId={selectedPlayerId}
                                    playerNotes={playerNotes}
                                    mode={interactionMode}
                                    arrows={viewTeam === 'home' ? homeArrows.offensive : awayArrows.offensive}
                                    onAddArrow={(arrow) => handleAddArrow(arrow, 'offensive')}
                                    onRemoveArrow={(id) => handleRemoveArrow(id, 'offensive')}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>     {/* Reserves Bar (Bottom) */}
            <div className="bg-panel-dark border-t border-gray-700 p-4 min-h-[96px] flex items-center justify-between px-8 z-40">
                <div className="flex items-center gap-4 overflow-x-auto w-full mr-4">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Reservas</span>

                    <div className="flex items-center gap-2 pb-1"> {/* pb-1 for scrollbar clearance */}
                        {/* Real Reserves from State ONLY - Removed Mock Data */}
                        {(viewTeam === 'home' ? homeSubstitutes : awaySubstitutes).map(sub => (
                            <div
                                key={sub.id}
                                onDoubleClick={() => handleBenchDoubleClick(sub)}
                                className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-700 border border-gray-500 flex items-center justify-center text-white font-bold cursor-grab hover:border-white transition-colors hover:bg-gray-600 shadow-sm"
                                title={sub.name}
                            >
                                {sub.number}
                            </div>
                        ))}

                        {/* Empty state if no reserves */}
                        {(viewTeam === 'home' ? homeSubstitutes : awaySubstitutes).length === 0 && (
                            <span className="text-xs text-gray-600 italic">Lista de reservas vazia</span>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => setIsCreatePlayerModalOpen(true)}
                    className="text-xs flex items-center gap-2 text-accent-green border border-accent-green/30 px-3 py-1.5 rounded-lg hover:bg-accent-green/10 transition whitespace-nowrap"
                >
                    <UserPlus size={14} />
                    <span className="hidden md:inline">Adicionar</span>
                </button>
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
            />

            <EventsExpansionModal
                isOpen={isEventsExpansionModalOpen}
                onClose={() => setIsEventsExpansionModalOpen(false)}
                events={events}
                onAddEvent={handleAddEventClick}
                onEditEvent={handleEditEventRequest}
                onDeleteEvent={handleDeleteEvent}
            />

            {/* Toast Notifications */}
            <Toaster
                position="bottom-right"
                toastOptions={{
                    style: {
                        background: '#1a1f2e',
                        color: '#fff',
                        border: '1px solid #374151',
                    },
                    success: {
                        iconTheme: {
                            primary: '#22c55e',
                            secondary: '#fff',
                        },
                    },
                    error: {
                        iconTheme: {
                            primary: '#ef4444',
                            secondary: '#fff',
                        },
                    },
                }}
            />

        </AnalysisLayout>
    );
}

export default Analysis;
