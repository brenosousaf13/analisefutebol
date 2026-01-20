import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

import AnalysisLayout from '../layouts/AnalysisLayout';
import TacticalField from '../components/TacticalField';

import Toolbar, { type ToolType } from '../components/Toolbar';
import ColorPickerModal from '../components/ColorPickerModal';
import AnalysisSidebar from '../components/AnalysisSidebar';
import EventsSidebar from '../components/EventsSidebar';

import { homeTeamPlayers as initialHomePlayers, awayTeamPlayers as initialAwayPlayers } from '../data/mockData';
import { getMatchLineups, type Lineup, type LineupPlayer } from '../services/apiFootball';
import { analysisService } from '../services/analysisService';
import type { Player } from '../types/Player';

import type { Arrow } from '../types/Arrow';
import AddEventModal from '../components/AddEventModal';
import { type MatchEvent } from '../components/MatchTimeline';
import EventsExpansionModal from '../components/EventsExpansionModal';

import CreatePlayerModal from '../components/CreatePlayerModal';
import NotesModal from '../components/NotesModal';
import PlayerEditModal from '../components/PlayerEditModal';
import { CoachNameDisplay } from '../components/CoachNameDisplay';
function Analysis() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id: routeAnalysisId } = useParams();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const locationState = location.state as any;

    const [currentAnalysisId, setCurrentAnalysisId] = useState<string | undefined>(
        routeAnalysisId === 'new' ? undefined : routeAnalysisId
    );

    // Match Info State
    const [matchInfo, setMatchInfo] = useState({
        matchId: locationState?.matchId,
        homeTeam: locationState?.homeTeam?.name || 'Casa',
        awayTeam: locationState?.awayTeam?.name || 'Visitante',
        homeTeamLogo: locationState?.homeTeam?.logo,
        awayTeamLogo: locationState?.awayTeam?.logo,
        competition: locationState?.competition?.name,
        date: locationState?.date || locationState?.matchDate,
        time: locationState?.time || locationState?.matchTime,
    });

    const [saveStatus, setSaveStatus] = useState<'idle' | 'loading' | 'success'>('idle');
    const [loading, setLoading] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Phase State: 'defensive' | 'offensive' | 'transition'
    const [activePhase] = useState<'defensive' | 'offensive' | 'transition'>('defensive');

    // Team View State: 'home' | 'away' - Toggle to see which team's tactic
    const [viewTeam, setViewTeam] = useState<'home' | 'away'>('home');

    // Data State
    // Initial players should be empty if we are starting a new analysis (API)
    // Use defaults for CUSTOM matches
    // Only use mock data if accessing directly without state (Legacy/Fallback)
    const shouldInitEmpty = !!locationState;
    const isCustomMatch = !!locationState && !locationState.matchId;

    const [homePlayersDef, setHomePlayersDef] = useState<Player[]>(
        isCustomMatch ? analysisService.generateDefaultPlayers(true) :
            (shouldInitEmpty ? [] : initialHomePlayers)
    );
    const [homePlayersOff, setHomePlayersOff] = useState<Player[]>(
        isCustomMatch ? analysisService.generateDefaultPlayers(true) :
            (shouldInitEmpty ? [] : initialHomePlayers)
    );
    const [awayPlayersDef, setAwayPlayersDef] = useState<Player[]>(
        isCustomMatch ? analysisService.generateDefaultPlayers(false) :
            (shouldInitEmpty ? [] : initialAwayPlayers)
    );
    const [awayPlayersOff, setAwayPlayersOff] = useState<Player[]>(
        isCustomMatch ? analysisService.generateDefaultPlayers(false) :
            (shouldInitEmpty ? [] : initialAwayPlayers)
    );

    // Substitutes
    const [homeSubstitutes, setHomeSubstitutes] = useState<Player[]>(
        isCustomMatch ? analysisService.generateDefaultSubstitutes(true) : []
    );
    const [awaySubstitutes, setAwaySubstitutes] = useState<Player[]>(
        isCustomMatch ? analysisService.generateDefaultSubstitutes(false) : []
    );

    // Scores
    const [homeScore, setHomeScore] = useState<number>(locationState?.score?.home ?? 0);
    const [awayScore, setAwayScore] = useState<number>(locationState?.score?.away ?? 0);

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

    // New tool state (maps to Toolbar component)
    const [activeTool, setActiveTool] = useState<ToolType>('select');

    // Team colors
    const [homeTeamColor, setHomeTeamColor] = useState('#EF4444');
    const [awayTeamColor, setAwayTeamColor] = useState('#3B82F6');

    // Modal states
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

    // Sidebar states (sliding panels from toolbar)
    const [isAnalysisSidebarOpen, setIsAnalysisSidebarOpen] = useState(false);
    const [isEventsSidebarOpen, setIsEventsSidebarOpen] = useState(false);

    // Phase notes for AnalysisSidebar
    // Phase notes for AnalysisSidebar (Team Specific)
    const [homeDefensiveNotes, setHomeDefensiveNotes] = useState('');
    const [homeOffensiveNotes, setHomeOffensiveNotes] = useState('');
    const [homeBenchNotes, setHomeBenchNotes] = useState('');

    const [awayDefensiveNotes, setAwayDefensiveNotes] = useState('');
    const [awayOffensiveNotes, setAwayOffensiveNotes] = useState('');
    const [awayBenchNotes, setAwayBenchNotes] = useState('');

    // Mobile Tab State
    const [mobileTab, setMobileTab] = useState<'defensive' | 'offensive'>('defensive');

    // Coach Names
    const [homeCoach, setHomeCoach] = useState('');
    const [awayCoach, setAwayCoach] = useState('');

    // Rectangle state - separated by team and phase
    const [homeRectangles, setHomeRectangles] = useState<Record<string, import('../types/Rectangle').Rectangle[]>>({
        'defensive': [],
        'offensive': []
    });
    const [awayRectangles, setAwayRectangles] = useState<Record<string, import('../types/Rectangle').Rectangle[]>>({
        'defensive': [],
        'offensive': []
    });

    // Tool change handler - simply updates activeTool
    const handleToolChange = (tool: ToolType) => {
        setActiveTool(tool);
    };

    // Get current mode for TacticalField based on activeTool
    const getTacticalFieldMode = (): 'move' | 'draw' | 'rectangle' => {
        if (activeTool === 'rectangle') return 'rectangle';
        if (activeTool === 'arrow' || activeTool === 'line') return 'draw';
        return 'move';
    };

    // Export handler (placeholder)
    const handleExport = () => {
        toast.success('Funcionalidade de exportação em desenvolvimento');
    };



    const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
    const [isCreatePlayerModalOpen, setIsCreatePlayerModalOpen] = useState(false);

    // Player Edit Modal State
    const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
    const [editingPlayerPhase, setEditingPlayerPhase] = useState<'defensive' | 'offensive' | null>(null);

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
        if (routeAnalysisId && routeAnalysisId !== 'new') {
            setLoading(true);
            analysisService.getAnalysis(routeAnalysisId).then(data => {
                if (data) {
                    setCurrentAnalysisId(data.id);
                    // Update Match Info from Analysis Data
                    setMatchInfo(prev => ({
                        ...prev,
                        matchId: data.matchId,
                        homeTeam: data.homeTeam,
                        awayTeam: data.awayTeam,
                        homeTeamLogo: data.homeTeamLogo,
                        awayTeamLogo: data.awayTeamLogo,
                        date: data.matchDate,
                        time: data.matchTime
                    }));

                    setHomePlayersDef(data.homePlayersDef);
                    setHomePlayersOff(data.homePlayersOff);
                    setAwayPlayersDef(data.awayPlayersDef);
                    setAwayPlayersOff(data.awayPlayersOff);
                    if (data.homeScore !== undefined) setHomeScore(data.homeScore);
                    if (data.awayScore !== undefined) setAwayScore(data.awayScore);

                    setHomeSubstitutes(data.homeSubstitutes || []);
                    setAwaySubstitutes(data.awaySubstitutes || []);
                    setGameNotes(data.gameNotes || '');

                    setNotasCasa(data.notasCasa || '');
                    setNotasCasaUpdatedAt(data.notasCasaUpdatedAt);
                    setNotasVisitante(data.notasVisitante || '');
                    setNotasVisitanteUpdatedAt(data.notasVisitanteUpdatedAt);
                    setEvents(data.events || []);

                    setHomeDefensiveNotes(data.homeDefensiveNotes || '');
                    setHomeOffensiveNotes(data.homeOffensiveNotes || '');
                    setHomeBenchNotes(data.homeBenchNotes || '');

                    setAwayDefensiveNotes(data.awayDefensiveNotes || '');
                    setAwayOffensiveNotes(data.awayOffensiveNotes || '');
                    setAwayBenchNotes(data.awayBenchNotes || '');
                    setHomeTeamColor(data.homeTeamColor || '#EF4444');
                    setHomeTeamColor(data.homeTeamColor || '#EF4444');
                    setAwayTeamColor(data.awayTeamColor || '#3B82F6');

                    setHomeCoach(data.homeCoach || '');
                    setAwayCoach(data.awayCoach || '');

                    if (data.homeArrowsDef || data.homeArrowsOff) {
                        setHomeArrows({
                            defensive: data.homeArrowsDef || [],
                            offensive: data.homeArrowsOff || [],
                            transition: []
                        });
                    }
                    if (data.awayArrowsDef || data.awayArrowsOff) {
                        setAwayArrows({
                            defensive: data.awayArrowsDef || [],
                            offensive: data.awayArrowsOff || [],
                            transition: []
                        });
                    }

                    setHasUnsavedChanges(false);
                }
            }).finally(() => setLoading(false));
        }
    }, [routeAnalysisId]);

    // Load Lineups
    useEffect(() => {
        if ((!routeAnalysisId || routeAnalysisId === 'new') && matchInfo.matchId) {
            getMatchLineups(matchInfo.matchId).then(data => {
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
        }
    }, [routeAnalysisId, matchInfo.matchId]);


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



    const handlePlayerMove = (id: number, pos: { x: number, y: number }, phase: 'defensive' | 'offensive') => {
        const updateFn = viewTeam === 'home'
            ? (phase === 'defensive' ? setHomePlayersDef : setHomePlayersOff)
            : (phase === 'defensive' ? setAwayPlayersDef : setAwayPlayersOff);

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
                setAutoSaveStatus('saved');
            }

        } catch (err) {
            console.error(err);
            setAutoSaveStatus('error');
        }
    };

    const handleSave = useCallback(async () => {
        setSaveStatus('loading');
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data: any = {
                id: currentAnalysisId,
                matchId: matchInfo.matchId,
                homeTeam: matchInfo.homeTeam,
                awayTeam: matchInfo.awayTeam,
                homeTeamLogo: matchInfo.homeTeamLogo,
                awayTeamLogo: matchInfo.awayTeamLogo,
                homeScore,
                awayScore,
                gameNotes,
                notasCasa,
                notasCasaUpdatedAt,
                notasVisitante,
                notasVisitanteUpdatedAt,
                homeDefensiveNotes,
                homeOffensiveNotes,
                homeBenchNotes,

                awayDefensiveNotes,
                awayOffensiveNotes,
                awayBenchNotes,
                homeTeamColor,
                awayTeamColor,
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
                homeRectanglesDef: homeRectangles.defensive,
                homeRectanglesOff: homeRectangles.offensive,
                awayRectanglesDef: awayRectangles.defensive,
                awayRectanglesOff: awayRectangles.offensive,
                homeCoach,
                awayCoach,
                events: events,
                tags: []
            };

            const savedId = await analysisService.saveAnalysis(data);

            setCurrentAnalysisId(savedId);
            setSaveStatus('success');
            setHasUnsavedChanges(false);

            if (!currentAnalysisId) {
                navigate(`/analise/${savedId}`, { replace: true });
            }

            toast.success('Análise salva com sucesso!');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error(error);
            setSaveStatus('idle');
            toast.error('Erro ao salvar análise');
        }
    }, [currentAnalysisId, homePlayersDef, homePlayersOff, awayPlayersDef, awayPlayersOff,
        homeSubstitutes, awaySubstitutes, homeArrows, awayArrows, gameNotes, notasCasa, notasVisitante,
        homeScore, awayScore, events, matchInfo, homeTeamNotes,
        notasCasaUpdatedAt, notasVisitanteUpdatedAt,
        notasCasaUpdatedAt, notasVisitanteUpdatedAt,
        homeDefensiveNotes, homeOffensiveNotes, homeBenchNotes,
        awayDefensiveNotes, awayOffensiveNotes, awayBenchNotes,
        homeTeamColor, awayTeamColor, navigate,
        homeRectangles, awayRectangles, homeCoach, awayCoach]);

    // Load existing analysis if available
    useEffect(() => {
        if (currentAnalysisId) {
            setLoading(true);
            analysisService.getAnalysis(currentAnalysisId).then(data => {
                if (data) {
                    setHomePlayersDef(data.homePlayersDef);
                    setHomePlayersOff(data.homePlayersOff);
                    setAwayPlayersDef(data.awayPlayersDef);
                    setAwayPlayersOff(data.awayPlayersOff);
                    setHomeSubstitutes(data.homeSubstitutes);
                    setAwaySubstitutes(data.awaySubstitutes);
                    setGameNotes(data.gameNotes);

                    setNotasCasa(data.notasCasa);
                    setNotasCasaUpdatedAt(data.notasCasaUpdatedAt);
                    setNotasVisitante(data.notasVisitante);
                    setNotasVisitanteUpdatedAt(data.notasVisitanteUpdatedAt);

                    setHomeDefensiveNotes(data.homeDefensiveNotes || '');
                    setHomeOffensiveNotes(data.homeOffensiveNotes || '');
                    setHomeBenchNotes(data.homeBenchNotes || '');

                    setAwayDefensiveNotes(data.awayDefensiveNotes || '');
                    setAwayOffensiveNotes(data.awayOffensiveNotes || '');
                    setAwayBenchNotes(data.awayBenchNotes || '');
                    setHomeTeamColor(data.homeTeamColor || '#EF4444');
                    setAwayTeamColor(data.awayTeamColor || '#3B82F6');

                    setEvents(data.events || []);

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

                    setHomeRectangles({
                        defensive: data.homeRectanglesDef || [],
                        offensive: data.homeRectanglesOff || []
                    });
                    setAwayRectangles({
                        defensive: data.awayRectanglesDef || [],
                        offensive: data.awayRectanglesOff || []
                    });

                    setHasUnsavedChanges(false);
                }
                setLoading(false);
            });
        }
    }, [currentAnalysisId]);

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

    const handleAddRectangle = (rect: Omit<import('../types/Rectangle').Rectangle, 'id'>, phase?: 'defensive' | 'offensive') => {
        const targetPhase = phase || activePhase;
        const newRect = { ...rect, id: uuidv4() };
        const setRectsFn = viewTeam === 'home' ? setHomeRectangles : setAwayRectangles;
        setRectsFn(prev => ({
            ...prev,
            [targetPhase]: [...(prev[targetPhase] || []), newRect]
        }));
    };

    const handleRemoveRectangle = (id: string, phase?: 'defensive' | 'offensive') => {
        const targetPhase = phase || activePhase;
        const setRectsFn = viewTeam === 'home' ? setHomeRectangles : setAwayRectangles;
        setRectsFn(prev => ({
            ...prev,
            [targetPhase]: (prev[targetPhase] || []).filter(r => r.id !== id)
        }));
    };

    const handleMoveArrow = (id: string, deltaX: number, deltaY: number, phase?: 'defensive' | 'offensive') => {
        const targetPhase = phase || activePhase;
        const setArrowsFn = viewTeam === 'home' ? setHomeArrows : setAwayArrows;
        setArrowsFn(prev => ({
            ...prev,
            [targetPhase]: (prev[targetPhase] || []).map(arrow =>
                arrow.id === id
                    ? { ...arrow, startX: arrow.startX + deltaX, startY: arrow.startY + deltaY, endX: arrow.endX + deltaX, endY: arrow.endY + deltaY }
                    : arrow
            )
        }));
    };

    const handleMoveRectangle = (id: string, deltaX: number, deltaY: number, phase?: 'defensive' | 'offensive') => {
        const targetPhase = phase || activePhase;
        const setRectsFn = viewTeam === 'home' ? setHomeRectangles : setAwayRectangles;
        setRectsFn(prev => ({
            ...prev,
            [targetPhase]: (prev[targetPhase] || []).map(rect =>
                rect.id === id
                    ? { ...rect, startX: rect.startX + deltaX, startY: rect.startY + deltaY, endX: rect.endX + deltaX, endY: rect.endY + deltaY }
                    : rect
            )
        }));
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

    const handleSaveEvent = async (eventData: any) => {
        if (eventToEdit) {
            setEvents(prev => prev.map(e => e.id === eventToEdit.id ? { ...eventData, id: e.id, analysis_id: e.analysis_id } : e));
            setEventToEdit(null);
        } else {
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

    const handleDeleteEvent = (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este evento?')) {
            setEvents(prev => prev.filter(e => e.id !== id));
        }
    };



    const handlePlayerClick = (player: Player) => {
        setSelectedPlayerId(player.id);
    };

    const handlePlayerDoubleClick = (player: Player, phase: 'defensive' | 'offensive') => {
        setEditingPlayer(player);
        setEditingPlayerPhase(phase);
    };

    const handleSendToBench = (player: Player) => {
        if (!editingPlayerPhase) return;

        if (viewTeam === 'home') {
            setHomePlayersDef(prev => prev.filter(p => p.id !== player.id));
            setHomePlayersOff(prev => prev.filter(p => p.id !== player.id));
            setHomeSubstitutes(prev => {
                if (prev.some(p => p.id === player.id)) return prev;
                return [...prev, { ...player, isStarter: false, position: { x: 50, y: 50 } }];
            });
        } else {
            setAwayPlayersDef(prev => prev.filter(p => p.id !== player.id));
            setAwayPlayersOff(prev => prev.filter(p => p.id !== player.id));
            setAwaySubstitutes(prev => {
                if (prev.some(p => p.id === player.id)) return prev;
                return [...prev, { ...player, isStarter: false, position: { x: 50, y: 50 } }];
            });
        }
    };

    const handleSubstitute = (starter: Player, benchPlayer: Player) => {
        if (!editingPlayerPhase) return;

        if (viewTeam === 'home') {
            setHomeSubstitutes(prev => [...prev.filter(p => p.id !== benchPlayer.id), { ...starter, isStarter: false, position: { x: 50, y: 50 } }]);
            const updateField = (prev: Player[]) => prev.map(p => {
                if (p.id === starter.id) {
                    return { ...benchPlayer, position: p.position, isStarter: true };
                }
                return p;
            });
            setHomePlayersDef(updateField);
            setHomePlayersOff(updateField);
        } else {
            setAwaySubstitutes(prev => [...prev.filter(p => p.id !== benchPlayer.id), { ...starter, isStarter: false, position: { x: 50, y: 50 } }]);
            const updateField = (prev: Player[]) => prev.map(p => {
                if (p.id === starter.id) {
                    return { ...benchPlayer, position: p.position, isStarter: true };
                }
                return p;
            });
            setAwayPlayersDef(updateField);
            setAwayPlayersOff(updateField);
        }
    };

    const handleSaveEditedPlayer = (updatedPlayer: Player) => {
        const updatePlayerInList = (players: Player[]) =>
            players.map(p => p.id === updatedPlayer.id ? updatedPlayer : p);

        const isInHomeSubs = homeSubstitutes.some(p => p.id === updatedPlayer.id);
        const isInAwaySubs = awaySubstitutes.some(p => p.id === updatedPlayer.id);

        if (isInHomeSubs) {
            setHomeSubstitutes(updatePlayerInList);
            return;
        }
        if (isInAwaySubs) {
            setAwaySubstitutes(updatePlayerInList);
            return;
        }

        if (!editingPlayerPhase) return;

        if (viewTeam === 'home') {
            if (editingPlayerPhase === 'defensive') {
                setHomePlayersDef(updatePlayerInList);
            } else {
                setHomePlayersOff(updatePlayerInList);
            }
        } else {
            if (editingPlayerPhase === 'defensive') {
                setAwayPlayersDef(updatePlayerInList);
            } else {
                setAwayPlayersOff(updatePlayerInList);
            }
        }
    };

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

    useEffect(() => {
        if (loading) return;
        setHasUnsavedChanges(true);
    }, [
        homePlayersDef, homePlayersOff, awayPlayersDef, awayPlayersOff,
        homeSubstitutes, awaySubstitutes, homeArrows, awayArrows, gameNotes,
        notasCasa, notasVisitante, events
    ]);


    return (
        <AnalysisLayout
            matchInfo={{
                homeTeam: matchInfo.homeTeam,
                awayTeam: matchInfo.awayTeam,
                homeTeamLogo: matchInfo.homeTeamLogo,
                awayTeamLogo: matchInfo.awayTeamLogo,
                competition: matchInfo.competition,
                date: matchInfo.date,
                time: matchInfo.time
            }}
            activeTeam={viewTeam}
            onTeamChange={setViewTeam}
            sidebar={!loading ? (
                <Toolbar
                    activeTool={activeTool}
                    onToolChange={handleToolChange}
                    onOpenColorPicker={() => setIsColorPickerOpen(true)}
                    onOpenAnalysis={() => {
                        setIsEventsSidebarOpen(false);
                        setIsAnalysisSidebarOpen(true);
                    }}
                    onOpenEvents={() => {
                        setIsAnalysisSidebarOpen(false);
                        setIsEventsSidebarOpen(true);
                    }}
                    onSave={handleSave}
                    onExport={handleExport}
                    onAddPlayer={() => setIsCreatePlayerModalOpen(true)}
                    isSaving={saveStatus === 'loading'}
                    hasUnsavedChanges={hasUnsavedChanges && saveStatus === 'idle'}
                />
            ) : undefined}
        >
            {loading ? (
                <div className="flex-1 flex items-center justify-center h-full bg-[#242938]">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-10 h-10 text-accent-green animate-spin" />
                        <span className="text-gray-400 font-medium">Carregando análise...</span>
                    </div>
                </div>
            ) : (
                <>
                    {/* Main Content Area */}
                    <div className="flex-1 h-full flex flex-col p-2 md:p-4 overflow-hidden relative">

                        {/* Mobile Tab Switcher */}
                        <div className="lg:hidden shrink-0 mb-2 flex bg-gray-800 rounded-lg p-0.5 mx-12">
                            <button
                                onClick={() => setMobileTab('defensive')}
                                className={`flex-1 py-1 rounded-md text-xs font-bold uppercase transition-all ${mobileTab === 'defensive'
                                    ? 'bg-amber-500/20 text-amber-400 shadow-sm'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                Defensivo
                            </button>
                            <button
                                onClick={() => setMobileTab('offensive')}
                                className={`flex-1 py-1 rounded-md text-xs font-bold uppercase transition-all ${mobileTab === 'offensive'
                                    ? 'bg-green-500/20 text-green-400 shadow-sm'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                Ofensivo
                            </button>
                        </div>

                        {/* Labels Row - Desktop Only */}
                        <div className="hidden lg:flex shrink-0 mb-3 lg:ml-16">
                            <div className="flex-1 text-center">
                                <span className="text-sm font-bold text-amber-400 uppercase tracking-widest">
                                    Defensivo
                                </span>
                            </div>
                            <div className="w-6"></div>
                            <div className="flex-1 text-center">
                                <span className="text-sm font-bold text-green-400 uppercase tracking-widest">
                                    Ofensivo
                                </span>
                            </div>
                        </div>

                        {/* Fields Container */}
                        <div className="flex-1 flex flex-col lg:grid lg:grid-cols-2 gap-4 lg:gap-6 ml-0 lg:ml-16 overflow-y-auto lg:overflow-hidden pb-16 lg:pb-0">

                            {/* Defensive Field Column */}
                            <div className={`flex-col h-full relative min-h-[325px] lg:min-h-0 ${mobileTab === 'defensive' ? 'flex' : 'hidden lg:flex'
                                }`}>
                                <div className="flex-1 relative min-h-0 w-full max-w-[300px] lg:max-w-[48vh] mx-auto mt-2 lg:mt-0">
                                    <TacticalField
                                        players={viewTeam === 'home' ? homePlayersDef : awayPlayersDef}
                                        onPlayerMove={(id, pos) => handlePlayerMove(id, pos, 'defensive')}
                                        onPlayerClick={handlePlayerClick}
                                        onPlayerDoubleClick={(player) => handlePlayerDoubleClick(player, 'defensive')}
                                        selectedPlayerId={selectedPlayerId}
                                        playerNotes={playerNotes}
                                        mode={getTacticalFieldMode()}
                                        arrows={viewTeam === 'home' ? homeArrows.defensive : awayArrows.defensive}
                                        onAddArrow={(arrow) => handleAddArrow(arrow, 'defensive')}
                                        onRemoveArrow={(id) => handleRemoveArrow(id, 'defensive')}
                                        onMoveArrow={(id, dx, dy) => handleMoveArrow(id, dx, dy, 'defensive')}
                                        rectangles={viewTeam === 'home' ? homeRectangles.defensive : awayRectangles.defensive}
                                        onAddRectangle={(rect) => handleAddRectangle(rect, 'defensive')}
                                        onRemoveRectangle={(id) => handleRemoveRectangle(id, 'defensive')}
                                        onMoveRectangle={(id, dx, dy) => handleMoveRectangle(id, dx, dy, 'defensive')}
                                        isEraserMode={activeTool === 'eraser'}
                                        rectangleColor={viewTeam === 'home' ? homeTeamColor : awayTeamColor}
                                        playerColor={viewTeam === 'home' ? homeTeamColor : awayTeamColor}
                                    />
                                </div>

                            </div>

                            {/* Offensive Field Column */}
                            <div className={`flex-col h-full relative min-h-[325px] lg:min-h-0 ${mobileTab === 'offensive' ? 'flex' : 'hidden lg:flex'
                                }`}>
                                <div className="flex-1 relative min-h-0 w-full max-w-[300px] lg:max-w-[48vh] mx-auto mt-2 lg:mt-0">
                                    <TacticalField
                                        players={viewTeam === 'home' ? homePlayersOff : awayPlayersOff}
                                        onPlayerMove={(id, pos) => handlePlayerMove(id, pos, 'offensive')}
                                        onPlayerClick={handlePlayerClick}
                                        onPlayerDoubleClick={(player) => handlePlayerDoubleClick(player, 'offensive')}
                                        selectedPlayerId={selectedPlayerId}
                                        playerNotes={playerNotes}
                                        mode={getTacticalFieldMode()}
                                        arrows={viewTeam === 'home' ? homeArrows.offensive : awayArrows.offensive}
                                        onAddArrow={(arrow) => handleAddArrow(arrow, 'offensive')}
                                        onRemoveArrow={(id) => handleRemoveArrow(id, 'offensive')}
                                        onMoveArrow={(id, dx, dy) => handleMoveArrow(id, dx, dy, 'offensive')}
                                        rectangles={viewTeam === 'home' ? homeRectangles.offensive : awayRectangles.offensive}
                                        onAddRectangle={(rect) => handleAddRectangle(rect, 'offensive')}
                                        onRemoveRectangle={(id) => handleRemoveRectangle(id, 'offensive')}
                                        onMoveRectangle={(id, dx, dy) => handleMoveRectangle(id, dx, dy, 'offensive')}
                                        isEraserMode={activeTool === 'eraser'}
                                        rectangleColor={viewTeam === 'home' ? homeTeamColor : awayTeamColor}
                                        playerColor={viewTeam === 'home' ? homeTeamColor : awayTeamColor}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Centered Coach Name - Footer */}
                        <div className="mt-2 text-center shrink-0 w-full flex justify-center pb-16 lg:pb-2">
                            <CoachNameDisplay
                                coachName={viewTeam === 'home' ? homeCoach : awayCoach}
                                onSave={viewTeam === 'home' ? setHomeCoach : setAwayCoach}
                                align="center"
                            />
                        </div>

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
                        homeTeamName={matchInfo.homeTeam}
                        awayTeamName={matchInfo.awayTeam}
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
                        homeTeamName={matchInfo.homeTeam}
                        awayTeamName={matchInfo.awayTeam}
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

                    {/* Player Edit Modal */}
                    <PlayerEditModal
                        player={editingPlayer}
                        isOpen={!!editingPlayer}
                        onClose={() => {
                            setEditingPlayer(null);
                            setEditingPlayerPhase(null);
                        }}
                        onSave={handleSaveEditedPlayer}
                        benchPlayers={viewTeam === 'home' ? homeSubstitutes : awaySubstitutes}
                        onSubstitute={handleSubstitute}
                        onSendToBench={handleSendToBench}
                    />
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
                    {/* Color Picker Modal */}
                    <ColorPickerModal
                        isOpen={isColorPickerOpen}
                        onClose={() => setIsColorPickerOpen(false)}
                        homeTeamName={matchInfo.homeTeam}
                        awayTeamName={matchInfo.awayTeam}
                        homeTeamColor={homeTeamColor}
                        awayTeamColor={awayTeamColor}
                        onHomeColorChange={setHomeTeamColor}
                        onAwayColorChange={setAwayTeamColor}
                    />

                    {/* Analysis Sidebar (slides from left) */}
                    <AnalysisSidebar
                        isOpen={isAnalysisSidebarOpen}
                        onClose={() => setIsAnalysisSidebarOpen(false)}
                        homeTeamName={matchInfo.homeTeam}
                        awayTeamName={matchInfo.awayTeam}

                        homeDefensiveNotes={homeDefensiveNotes}
                        homeOffensiveNotes={homeOffensiveNotes}
                        onHomeDefensiveNotesChange={setHomeDefensiveNotes}
                        onHomeOffensiveNotesChange={setHomeOffensiveNotes}

                        awayDefensiveNotes={awayDefensiveNotes}
                        awayOffensiveNotes={awayOffensiveNotes}
                        onAwayDefensiveNotesChange={setAwayDefensiveNotes}
                        onAwayOffensiveNotesChange={setAwayOffensiveNotes}

                        autoSaveStatus="idle"
                    />

                    {/* Events Sidebar (slides from left) */}
                    <EventsSidebar
                        isOpen={isEventsSidebarOpen}
                        onClose={() => setIsEventsSidebarOpen(false)}
                        events={events
                            .filter(e => ['goal', 'yellow_card', 'red_card', 'substitution', 'other'].includes(e.type))
                            .map(e => ({
                                id: e.id,
                                type: e.type as 'goal' | 'yellow_card' | 'red_card' | 'substitution' | 'other',
                                minute: e.minute,
                                playerName: e.player_name,
                                team: 'home' as const
                            }))}
                        onAddEvent={(newEvent) => {
                            setEvents(prev => [...prev, {
                                id: uuidv4(),
                                type: newEvent.type,
                                minute: newEvent.minute,
                                player_name: newEvent.playerName
                            } as MatchEvent]);
                        }}
                        onRemoveEvent={(id) => handleDeleteEvent(id)}
                        homeTeam={matchInfo.homeTeam}
                        awayTeam={matchInfo.awayTeam}
                        homePlayers={[
                            ...homePlayersDef,
                            ...homeSubstitutes
                        ].map(p => ({ id: p.id, name: p.name, number: p.number }))}
                        awayPlayers={[
                            ...awayPlayersDef,
                            ...awaySubstitutes
                        ].map(p => ({ id: p.id, name: p.name, number: p.number }))}
                    />
                </>
            )}
        </AnalysisLayout>
    );
};

export default Analysis;
