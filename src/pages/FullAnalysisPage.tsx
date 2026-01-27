import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

import AnalysisLayout from '../layouts/AnalysisLayout';
import { analysisService } from '../services/analysisService';
import type { Player } from '../types/Player';
import type { Arrow } from '../types/Arrow';
import type { Rectangle } from '../types/Rectangle';
import { type MatchEvent } from '../components/MatchTimeline';

import CreatePlayerModal from '../components/CreatePlayerModal';
import NotesModal from '../components/NotesModal';
import PlayerEditModal from '../components/PlayerEditModal';
import ShareModal from '../components/ShareModal';
import { FullAnalysisMode } from '../components/FullAnalysisMode';
import { type ToolType } from '../components/Toolbar';
import AddEventModal from '../components/AddEventModal';
import EventsExpansionModal from '../components/EventsExpansionModal';
import AnalysisSidebar from '../components/AnalysisSidebar';
import EventsSidebar from '../components/EventsSidebar';
import ColorPickerModal from '../components/ColorPickerModal';
// import { CoachNameDisplay } from '../components/CoachNameDisplay';

function FullAnalysisPage() {
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

    // Loading state removed as unused in UI
    const [saveStatus, setSaveStatus] = useState<'idle' | 'loading' | 'success'>('idle');
    const [loading, setLoading] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Data State (Single Source of Truth for Full Mode)
    const [homePlayersDef, setHomePlayersDef] = useState<Player[]>([]);
    const [homePlayersOff, setHomePlayersOff] = useState<Player[]>([]);
    const [awayPlayersDef, setAwayPlayersDef] = useState<Player[]>([]);
    const [awayPlayersOff, setAwayPlayersOff] = useState<Player[]>([]);

    const [homeBallDef, setHomeBallDef] = useState<{ x: number, y: number }>({ x: 50, y: 50 });
    const [homeBallOff, setHomeBallOff] = useState<{ x: number, y: number }>({ x: 50, y: 50 });
    const [awayBallDef, setAwayBallDef] = useState<{ x: number, y: number }>({ x: 50, y: 50 });
    const [awayBallOff, setAwayBallOff] = useState<{ x: number, y: number }>({ x: 50, y: 50 });

    const [homeSubstitutes, setHomeSubstitutes] = useState<Player[]>([]);
    const [awaySubstitutes, setAwaySubstitutes] = useState<Player[]>([]);

    const [homeScore, setHomeScore] = useState<number>(0);
    const [awayScore, setAwayScore] = useState<number>(0);

    const [notasCasa, setNotasCasa] = useState('');
    const [notasCasaUpdatedAt, setNotasCasaUpdatedAt] = useState<string | undefined>(undefined);
    const [notasVisitante, setNotasVisitante] = useState('');
    const [notasVisitanteUpdatedAt, setNotasVisitanteUpdatedAt] = useState<string | undefined>(undefined);

    const [homeDefensiveNotes, setHomeDefensiveNotes] = useState('');
    const [homeOffensiveNotes, setHomeOffensiveNotes] = useState('');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [homeBenchNotes] = useState('');
    const [awayDefensiveNotes, setAwayDefensiveNotes] = useState('');
    const [awayOffensiveNotes, setAwayOffensiveNotes] = useState('');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [awayBenchNotes] = useState('');

    const [homeCoach, setHomeCoach] = useState('');
    const [awayCoach, setAwayCoach] = useState('');

    const [events, setEvents] = useState<MatchEvent[]>([]);

    // Arrows & Rectangles (Independent Logic)
    const [homeArrows, setHomeArrows] = useState<Record<string, Arrow[]>>({ 'full_home': [] });
    const [awayArrows, setAwayArrows] = useState<Record<string, Arrow[]>>({ 'full_away': [] });
    const [homeRectangles, setHomeRectangles] = useState<Record<string, Rectangle[]>>({ 'full_home': [] });
    const [awayRectangles, setAwayRectangles] = useState<Record<string, Rectangle[]>>({ 'full_away': [] });

    // UI States
    const [activeTool, setActiveTool] = useState<ToolType>('select');
    const [homeTeamColor, setHomeTeamColor] = useState('#EF4444');
    const [awayTeamColor, setAwayTeamColor] = useState('#3B82F6');
    const [shareToken, setShareToken] = useState<string | undefined>(undefined);

    // Modals
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isAnalysisSidebarOpen, setIsAnalysisSidebarOpen] = useState(false);
    const [isEventsSidebarOpen, setIsEventsSidebarOpen] = useState(false);
    const [isCreatePlayerModalOpen, setIsCreatePlayerModalOpen] = useState(false);
    const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
    const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
    const [isEventsExpansionModalOpen, setIsEventsExpansionModalOpen] = useState(false);
    const [eventToEdit, setEventToEdit] = useState<MatchEvent | null>(null);
    const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

    // Player Interaction State
    const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
    const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

    // Initial Load
    useEffect(() => {
        if (routeAnalysisId && routeAnalysisId !== 'new') {
            setLoading(true);
            analysisService.getAnalysis(routeAnalysisId).then(data => {
                if (data) {
                    setCurrentAnalysisId(data.id);
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
                    setHomeSubstitutes(data.homeSubstitutes || []);
                    setAwaySubstitutes(data.awaySubstitutes || []);
                    setHomeBallDef(data.homeBallDef || { x: 50, y: 50 });
                    setHomeBallOff(data.homeBallOff || { x: 50, y: 50 });
                    setAwayBallDef(data.awayBallDef || { x: 50, y: 50 });
                    setAwayBallOff(data.awayBallOff || { x: 50, y: 50 });

                    setHomeScore(data.homeScore || 0);
                    setAwayScore(data.awayScore || 0);
                    setNotasCasa(data.notasCasa || '');
                    setNotasCasaUpdatedAt(data.notasCasaUpdatedAt);
                    setNotasVisitante(data.notasVisitante || '');
                    setNotasVisitanteUpdatedAt(data.notasVisitanteUpdatedAt);

                    setHomeDefensiveNotes(data.homeDefensiveNotes || '');
                    setHomeOffensiveNotes(data.homeOffensiveNotes || '');
                    // setHomeBenchNotes(data.homeBenchNotes || '');
                    setAwayDefensiveNotes(data.awayDefensiveNotes || '');
                    setAwayOffensiveNotes(data.awayOffensiveNotes || '');
                    // setAwayBenchNotes(data.awayBenchNotes || '');

                    setHomeCoach(data.homeCoach || '');
                    setAwayCoach(data.awayCoach || '');

                    if (data.shareToken) setShareToken(data.shareToken);

                    setEvents(data.events || []);

                    setHomeTeamColor(data.homeTeamColor || '#EF4444');
                    setAwayTeamColor(data.awayTeamColor || '#3B82F6');

                    const hArrowsDef = data.homeArrowsDef || [];
                    const aArrowsDef = data.awayArrowsDef || [];
                    const hRectsDef = data.homeRectanglesDef || [];
                    const aRectsDef = data.awayRectanglesDef || [];

                    setHomeArrows({ 'full_home': hArrowsDef });
                    setAwayArrows({ 'full_away': aArrowsDef });
                    setHomeRectangles({ 'full_home': hRectsDef });
                    setAwayRectangles({ 'full_away': aRectsDef });

                    setHasUnsavedChanges(false);
                }
            }).finally(() => setLoading(false));
        }
    }, [routeAnalysisId]);

    // Handlers
    const handlePlayerMove = (id: number, pos: { x: number, y: number }, team: 'home' | 'away', phase: 'defensive' | 'offensive') => {
        const updateFn = team === 'home'
            ? (phase === 'defensive' ? setHomePlayersDef : setHomePlayersOff)
            : (phase === 'defensive' ? setAwayPlayersDef : setAwayPlayersOff);

        updateFn(prev => prev.map(p => p.id === id ? { ...p, position: pos } : p));
        setHasUnsavedChanges(true);
    };

    const handleBallMove = (pos: { x: number, y: number }, team: 'home' | 'away', phase: 'defensive' | 'offensive') => {
        const updateFn = team === 'home'
            ? (phase === 'defensive' ? setHomeBallDef : setHomeBallOff)
            : (phase === 'defensive' ? setAwayBallDef : setAwayBallOff);
        updateFn(pos);
        setHasUnsavedChanges(true);
    };

    const handleBenchPlayerClick = (benchPlayer: Player) => {


        const isHomeBench = homeSubstitutes.find(p => p.id === benchPlayer.id);
        const isAwayBench = awaySubstitutes.find(p => p.id === benchPlayer.id);



        if (selectedPlayerId) {
            if (isHomeBench) {
                const starter = homePlayersDef.find(p => p.id === selectedPlayerId) || homePlayersOff.find(p => p.id === selectedPlayerId);


                if (starter) {
                    setHomeSubstitutes(prev => [...prev.filter(p => p.id !== benchPlayer.id), { ...starter, isStarter: false, position: { x: 50, y: 50 } }]);
                    const updateField = (prev: Player[]) => prev.map(p =>
                        p.id === starter.id ? { ...benchPlayer, position: p.position, isStarter: true } : p
                    );
                    setHomePlayersDef(updateField);
                    setHomePlayersOff(updateField);
                    setSelectedPlayerId(null);
                    toast.success('Substituição realizada');
                    setHasUnsavedChanges(true);
                } else {

                }
            } else if (isAwayBench) {
                const starter = awayPlayersDef.find(p => p.id === selectedPlayerId) || awayPlayersOff.find(p => p.id === selectedPlayerId);


                if (starter) {
                    setAwaySubstitutes(prev => [...prev.filter(p => p.id !== benchPlayer.id), { ...starter, isStarter: false, position: { x: 50, y: 50 } }]);
                    const updateField = (prev: Player[]) => prev.map(p =>
                        p.id === starter.id ? { ...benchPlayer, position: p.position, isStarter: true } : p
                    );
                    setAwayPlayersDef(updateField);
                    setAwayPlayersOff(updateField);
                    setSelectedPlayerId(null);
                    toast.success('Substituição realizada');
                    setHasUnsavedChanges(true);
                } else {

                }
            }
        } else {

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
            setHomeSubstitutes(prev => [...prev, newPlayer]);
        } else {
            setHomePlayersDef(prev => [...prev, newPlayer]);
            setHomePlayersOff(prev => [...prev, newPlayer]);
        }
        setHasUnsavedChanges(true);
        toast.success('Jogador adicionado ao Time da Casa (Padrão)');
    };

    const handleNoteSave = async (team: 'home' | 'away', content: string) => {
        setAutoSaveStatus('saving');
        if (team === 'home') { setNotasCasa(content); setNotasCasaUpdatedAt(new Date().toISOString()); }
        else { setNotasVisitante(content); setNotasVisitanteUpdatedAt(new Date().toISOString()); }
        setAutoSaveStatus('saved');
    };

    const handleSave = async () => {
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
                home_score: homeScore,
                away_score: awayScore,

                // Detailed Notes (Legacy/Specific)
                notasCasa: notasCasa,
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
                homeTeamNotes: '',
                homeOffNotes: '',
                awayTeamNotes: '',
                awayOffNotes: '',
                homeCoach,
                awayCoach,
                tipo: 'analise_completa',

                homePlayersDef,
                homePlayersOff,
                awayPlayersDef,
                awayPlayersOff,
                homeSubstitutes,
                awaySubstitutes,
                homeBallDef,
                homeBallOff,
                awayBallDef,
                awayBallOff,

                homeArrowsDef: homeArrows['full_home'],
                homeArrowsOff: [],
                awayArrowsDef: awayArrows['full_away'],
                awayArrowsOff: [],

                homeRectanglesDef: homeRectangles['full_home'],
                homeRectanglesOff: [],
                awayRectanglesDef: awayRectangles['full_away'],
                awayRectanglesOff: [],
                events,
                tags: []
            };

            const savedId = await analysisService.saveAnalysis(data);
            setCurrentAnalysisId(savedId);
            setSaveStatus('success');
            setHasUnsavedChanges(false);

            if (!routeAnalysisId || routeAnalysisId === 'new') {
                navigate(`/analysis-complete/saved/${savedId}`, { replace: true });
            }
            toast.success('Análise Completa salva!');
        } catch (e) {
            console.error(e);
            toast.error('Erro ao salvar');
            setSaveStatus('idle');
        } finally {
            setTimeout(() => setSaveStatus('idle'), 2000);
        }
    };

    // Drawing Handlers
    const handleAddArrow = (arrow: Omit<Arrow, 'id'>, team: 'home' | 'away', phase: string) => {
        const newArrow = { ...arrow, id: uuidv4() };
        if (team === 'home') setHomeArrows(prev => ({ ...prev, [phase]: [...(prev[phase] || []), newArrow] }));
        else setAwayArrows(prev => ({ ...prev, [phase]: [...(prev[phase] || []), newArrow] }));
        setHasUnsavedChanges(true);
    };
    const handleRemoveArrow = (id: string, team: 'home' | 'away', phase: string) => {
        if (team === 'home') setHomeArrows(prev => ({ ...prev, [phase]: prev[phase].filter(a => a.id !== id) }));
        else setAwayArrows(prev => ({ ...prev, [phase]: prev[phase].filter(a => a.id !== id) }));
        setHasUnsavedChanges(true);
    };
    const handleMoveArrow = (id: string, dx: number, dy: number, team: 'home' | 'away', phase: string) => {
        const update = (list: Arrow[]) => list.map(a => a.id === id ? { ...a, startX: a.startX + dx, startY: a.startY + dy, endX: a.endX + dx, endY: a.endY + dy } : a);
        if (team === 'home') setHomeArrows(prev => ({ ...prev, [phase]: update(prev[phase]) }));
        else setAwayArrows(prev => ({ ...prev, [phase]: update(prev[phase]) }));
        setHasUnsavedChanges(true);
    };
    const handleAddRectangle = (rect: Omit<Rectangle, 'id'>, team: 'home' | 'away', phase: string) => {
        const newRect = { ...rect, id: uuidv4() };
        if (team === 'home') setHomeRectangles(prev => ({ ...prev, [phase]: [...(prev[phase] || []), newRect] }));
        else setAwayRectangles(prev => ({ ...prev, [phase]: [...(prev[phase] || []), newRect] }));
        setHasUnsavedChanges(true);
    };
    const handleRemoveRectangle = (id: string, team: 'home' | 'away', phase: string) => {
        if (team === 'home') setHomeRectangles(prev => ({ ...prev, [phase]: prev[phase].filter(r => r.id !== id) }));
        else setAwayRectangles(prev => ({ ...prev, [phase]: prev[phase].filter(r => r.id !== id) }));
        setHasUnsavedChanges(true);
    };
    const handleMoveRectangle = (id: string, dx: number, dy: number, team: 'home' | 'away', phase: string) => {
        const update = (list: Rectangle[]) => list.map(r => r.id === id ? { ...r, startX: r.startX + dx, startY: r.startY + dy, endX: r.endX + dx, endY: r.endY + dy } : r);
        if (team === 'home') setHomeRectangles(prev => ({ ...prev, [phase]: update(prev[phase]) }));
        else setAwayRectangles(prev => ({ ...prev, [phase]: update(prev[phase]) }));
        setHasUnsavedChanges(true);
    };

    const handlePromoteToStarter = (player: Player) => {
        const isHome = homeSubstitutes.some(p => p.id === player.id);
        const isAway = awaySubstitutes.some(p => p.id === player.id);

        if (isHome) {
            setHomeSubstitutes(prev => prev.filter(p => p.id !== player.id));
            setHomePlayersDef(prev => [...prev, { ...player, isStarter: true, position: { x: 50, y: 50 } }]);
            setHomePlayersOff(prev => [...prev, { ...player, isStarter: true, position: { x: 50, y: 50 } }]);
        } else if (isAway) {
            setAwaySubstitutes(prev => prev.filter(p => p.id !== player.id));
            setAwayPlayersDef(prev => [...prev, { ...player, isStarter: true, position: { x: 50, y: 50 } }]);
            setAwayPlayersOff(prev => [...prev, { ...player, isStarter: true, position: { x: 50, y: 50 } }]);
        }
        setEditingPlayer(null);
        setHasUnsavedChanges(true);
        toast.success('Promovido para titular');
    };

    const handleAddEvent = (newEvent: Omit<MatchEvent, 'id'>) => {
        const event: MatchEvent = {
            ...newEvent,
            id: uuidv4()
        };
        setEvents(prev => [...prev, event]);
        setHasUnsavedChanges(true);
        toast.success('Evento adicionado');
        setIsAddEventModalOpen(false);
    };

    const handleRemoveEvent = (id: string) => {
        setEvents(prev => prev.filter(e => e.id !== id));
        setHasUnsavedChanges(true);
        toast.success('Evento removido');
    };

    const handleSaveEvent = (eventData: Omit<MatchEvent, 'id'>) => {
        if (eventToEdit) {
            setEvents(prev => prev.map(e => e.id === eventToEdit.id ? { ...eventData, id: e.id } : e));
            setHasUnsavedChanges(true);
            toast.success('Evento atualizado');
            setEventToEdit(null);
        } else {
            handleAddEvent(eventData);
        }
        setIsAddEventModalOpen(false);
    };

    return (
        <AnalysisLayout
            matchInfo={matchInfo}
        >
            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center bg-gray-900">
                    <Loader2 className="w-12 h-12 text-green-500 animate-spin mb-4" />
                    <p className="text-gray-400 font-medium">Carregando análise...</p>
                </div>
            ) : (
                <FullAnalysisMode
                    homeTeamName={matchInfo.homeTeam}
                    awayTeamName={matchInfo.awayTeam}
                    homeTeamColor={homeTeamColor}
                    awayTeamColor={awayTeamColor}

                    homePlayersDef={homePlayersDef}
                    homePlayersOff={homePlayersOff}
                    homeSubstitutes={homeSubstitutes}
                    homeArrows={homeArrows}
                    homeRectangles={homeRectangles}

                    awayPlayersDef={awayPlayersDef}
                    awayPlayersOff={awayPlayersOff}
                    awaySubstitutes={awaySubstitutes}
                    awayArrows={awayArrows}

                    awayRectangles={awayRectangles}

                    homeCoachName={homeCoach}
                    awayCoachName={awayCoach}
                    onHomeCoachChange={(name) => { setHomeCoach(name); setHasUnsavedChanges(true); }}
                    onAwayCoachChange={(name) => { setAwayCoach(name); setHasUnsavedChanges(true); }}

                    ballPositions={{
                        homeDef: homeBallDef,
                        homeOff: homeBallOff,
                        awayDef: awayBallDef,
                        awayOff: awayBallOff
                    }}
                    onBallMove={handleBallMove}

                    onPlayerMove={handlePlayerMove}
                    onPlayerClick={(p) => { setSelectedPlayerId(p.id); }}
                    onPlayerDoubleClick={(p) => setEditingPlayer(p)}
                    onBenchPlayerClick={handleBenchPlayerClick}

                    activeTool={activeTool}
                    onToolChange={setActiveTool}

                    onAddArrow={handleAddArrow}
                    onRemoveArrow={handleRemoveArrow}
                    onMoveArrow={handleMoveArrow}
                    onAddRectangle={handleAddRectangle}
                    onRemoveRectangle={handleRemoveRectangle}
                    onMoveRectangle={handleMoveRectangle}

                    onOpenColorPicker={() => setIsColorPickerOpen(true)}
                    onOpenAnalysis={() => setIsAnalysisSidebarOpen(true)}
                    onOpenEvents={() => setIsEventsSidebarOpen(true)}
                    onSave={handleSave}
                    onExport={() => toast.error('Em breve')}
                    onAddPlayer={() => setIsCreatePlayerModalOpen(true)}
                    isSaving={saveStatus === 'loading'}
                    hasUnsavedChanges={hasUnsavedChanges}
                    onShare={() => setIsShareModalOpen(true)}
                />
            )}

            {/* Real Coach Names hidden or custom implementation? */}
            <div className="hidden" />

            <CreatePlayerModal
                isOpen={isCreatePlayerModalOpen}
                onClose={() => setIsCreatePlayerModalOpen(false)}
                onConfirm={handleCreatePlayer}
                existingNumbers={[]}
            />
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
            <AnalysisSidebar
                isOpen={isAnalysisSidebarOpen}
                onClose={() => setIsAnalysisSidebarOpen(false)}
                homeTeamName={matchInfo.homeTeam}
                awayTeamName={matchInfo.awayTeam}
                homeDefensiveNotes={homeDefensiveNotes}
                homeOffensiveNotes={homeOffensiveNotes}
                onHomeDefensiveNotesChange={(v) => { setHomeDefensiveNotes(v); setHasUnsavedChanges(true); }}
                onHomeOffensiveNotesChange={(v) => { setHomeOffensiveNotes(v); setHasUnsavedChanges(true); }}
                awayDefensiveNotes={awayDefensiveNotes}
                awayOffensiveNotes={awayOffensiveNotes}
                onAwayDefensiveNotesChange={(v) => { setAwayDefensiveNotes(v); setHasUnsavedChanges(true); }}
                onAwayOffensiveNotesChange={(v) => { setAwayOffensiveNotes(v); setHasUnsavedChanges(true); }}
                autoSaveStatus="idle"
            />
            <EventsSidebar
                isOpen={isEventsSidebarOpen}
                onClose={() => setIsEventsSidebarOpen(false)}
                events={events
                    .filter(e => ['goal', 'yellow_card', 'red_card', 'substitution', 'other'].includes(e.type))
                    .map(e => ({
                        id: e.id,
                        type: e.type as any, // Cast to any to avoid strict union mismatch if 'other' is not in MatchTimeline types
                        minute: e.minute,
                        playerName: e.player_name,
                        team: 'home' as const // Simplified: in full mode we might not know team easily unless tracked; defaulting to home for now or need better logic.
                    }))}
                onAddEvent={(newEvent) => handleAddEvent({ ...newEvent, player_name: newEvent.playerName, type: newEvent.type as any })}
                onRemoveEvent={handleRemoveEvent}
                homeTeam={matchInfo.homeTeam}
                awayTeam={matchInfo.awayTeam}
                homePlayers={homePlayersDef.map(p => ({ id: p.id, name: p.name, number: p.number }))}
                awayPlayers={awayPlayersDef.map(p => ({ id: p.id, name: p.name, number: p.number }))}
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
                onAddEvent={() => setIsAddEventModalOpen(true)}
                onEditEvent={(e) => { setEventToEdit(e); setIsAddEventModalOpen(true); }}
                onDeleteEvent={handleRemoveEvent}
            />
            <PlayerEditModal
                player={editingPlayer}
                isOpen={!!editingPlayer}
                onClose={() => setEditingPlayer(null)}
                onSave={(p) => {
                    // Quick update
                    const update = (list: Player[]) => list.map(orig => orig.id === p.id ? { ...orig, ...p } : orig);
                    setHomePlayersDef(update); setHomePlayersOff(update);
                    setAwayPlayersDef(update); setAwayPlayersOff(update);
                    setHomeSubstitutes(update); setAwaySubstitutes(update);
                    setEditingPlayer(null);
                    setHasUnsavedChanges(true);
                }}
                benchPlayers={(() => {
                    if (!editingPlayer) return homeSubstitutes;
                    // Check if player is on field
                    const isHomeField = homePlayersDef.some(p => p.id === editingPlayer.id) || homePlayersOff.some(p => p.id === editingPlayer.id);
                    const isAwayField = awayPlayersDef.some(p => p.id === editingPlayer.id) || awayPlayersOff.some(p => p.id === editingPlayer.id);

                    if (isHomeField) return homeSubstitutes;
                    if (isAwayField) return awaySubstitutes;

                    // If not on field, check if on bench
                    const isHomeBench = homeSubstitutes.some(p => p.id === editingPlayer.id);
                    if (isHomeBench) return homePlayersDef; // Return starters for swapping
                    return awayPlayersDef; // Return starters for swapping
                })()}
                substituteListTitle={(() => {
                    if (!editingPlayer) return 'Substituir por um Reserva';
                    const isHomeBench = homeSubstitutes.some(p => p.id === editingPlayer.id);
                    const isAwayBench = awaySubstitutes.some(p => p.id === editingPlayer.id);
                    if (isHomeBench || isAwayBench) return 'Substituir por um Titular';
                    return 'Substituir por um Reserva';
                })()}
                onPromoteToStarter={(() => {
                    if (!editingPlayer) return undefined;
                    const isBench = homeSubstitutes.some(p => p.id === editingPlayer.id) || awaySubstitutes.some(p => p.id === editingPlayer.id);
                    return isBench ? handlePromoteToStarter : undefined;
                })()}
                onSendToBench={(() => {
                    if (!editingPlayer) return undefined;
                    const isField = homePlayersDef.some(p => p.id === editingPlayer.id) || homePlayersOff.some(p => p.id === editingPlayer.id) ||
                        awayPlayersDef.some(p => p.id === editingPlayer.id) || awayPlayersOff.some(p => p.id === editingPlayer.id);
                    return isField ? (p) => {
                        if (!editingPlayer) return;
                        const isHome = homePlayersDef.some(pl => pl.id === p.id) || homePlayersOff.some(pl => pl.id === p.id);
                        if (isHome) {
                            setHomePlayersDef(prev => prev.filter(pl => pl.id !== p.id));
                            setHomePlayersOff(prev => prev.filter(pl => pl.id !== p.id));
                            setHomeSubstitutes(prev => [...prev, { ...p, isStarter: false, position: { x: 50, y: 50 } }]);
                        } else {
                            setAwayPlayersDef(prev => prev.filter(pl => pl.id !== p.id));
                            setAwayPlayersOff(prev => prev.filter(pl => pl.id !== p.id));
                            setAwaySubstitutes(prev => [...prev, { ...p, isStarter: false, position: { x: 50, y: 50 } }]);
                        }
                        setEditingPlayer(null);
                        setHasUnsavedChanges(true);
                        toast.success('Enviado para o banco');
                    } : undefined;
                })()}
                onSubstitute={(target, replacement) => {
                    if (!target) return;

                    const isHomeStarter = homePlayersDef.some(p => p.id === target.id) || homePlayersOff.some(p => p.id === target.id);
                    const isAwayStarter = awayPlayersDef.some(p => p.id === target.id) || awayPlayersOff.some(p => p.id === target.id);
                    const isHomeBench = homeSubstitutes.some(p => p.id === target.id);
                    const isAwayBench = awaySubstitutes.some(p => p.id === target.id);

                    if (isHomeStarter) {
                        setHomeSubstitutes(prev => [...prev.filter(p => p.id !== replacement.id), { ...target, isStarter: false, position: { x: 50, y: 50 } }]);
                        const updateField = (prev: Player[]) => prev.map(p =>
                            p.id === target.id ? { ...replacement, position: p.position, isStarter: true } : p
                        );
                        setHomePlayersDef(updateField); setHomePlayersOff(updateField);
                    } else if (isAwayStarter) {
                        setAwaySubstitutes(prev => [...prev.filter(p => p.id !== replacement.id), { ...target, isStarter: false, position: { x: 50, y: 50 } }]);
                        const updateField = (prev: Player[]) => prev.map(p =>
                            p.id === target.id ? { ...replacement, position: p.position, isStarter: true } : p
                        );
                        setAwayPlayersDef(updateField); setAwayPlayersOff(updateField);
                    } else if (isHomeBench) {
                        const starter = replacement;
                        const benchPlayer = target;
                        setHomeSubstitutes(prev => [...prev.filter(p => p.id !== benchPlayer.id), { ...starter, isStarter: false, position: { x: 50, y: 50 } }]);
                        const updateField = (prev: Player[]) => prev.map(p =>
                            p.id === starter.id ? { ...benchPlayer, position: p.position, isStarter: true } : p
                        );
                        setHomePlayersDef(updateField); setHomePlayersOff(updateField);

                    } else if (isAwayBench) {
                        const starter = replacement;
                        const benchPlayer = target;
                        setAwaySubstitutes(prev => [...prev.filter(p => p.id !== benchPlayer.id), { ...starter, isStarter: false, position: { x: 50, y: 50 } }]);
                        const updateField = (prev: Player[]) => prev.map(p =>
                            p.id === starter.id ? { ...benchPlayer, position: p.position, isStarter: true } : p
                        );
                        setAwayPlayersDef(updateField); setAwayPlayersOff(updateField);
                    }

                    setEditingPlayer(null);
                    setHasUnsavedChanges(true);
                    toast.success('Substituição realizada via Modal');
                }}
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

            {currentAnalysisId && (
                <ShareModal
                    isOpen={isShareModalOpen}
                    onClose={() => setIsShareModalOpen(false)}
                    analysisId={currentAnalysisId}
                    existingShareToken={shareToken}
                    analysisTitle={matchInfo.homeTeam + ' vs ' + matchInfo.awayTeam}
                />
            )}
            <Toaster position="bottom-right" />
        </AnalysisLayout>
    );
}

export default FullAnalysisPage;
