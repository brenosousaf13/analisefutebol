import React, { useState, useMemo } from 'react';
import TacticalField from './TacticalField';
import { type ToolType } from './Toolbar';
import { FullAnalysisToolbar } from './FullAnalysisToolbar';
import BenchArea from './BenchArea';
import type { Player } from '../types/Player';
import type { Arrow } from '../types/Arrow';
import type { Rectangle } from '../types/Rectangle';
import { Eye, EyeOff } from 'lucide-react';
import { CoachNameDisplay } from './CoachNameDisplay';

interface FullAnalysisModeProps {
    // Teams Info
    homeTeamName: string;
    awayTeamName: string;
    homeTeamColor: string;
    awayTeamColor: string;
    homeCoachName?: string;
    awayCoachName?: string;
    onHomeCoachChange?: (name: string) => void;
    onAwayCoachChange?: (name: string) => void;

    // Data - Home
    homePlayersDef: Player[];
    homePlayersOff: Player[];
    homeSubstitutes: Player[];
    homeArrows: Record<string, Arrow[]>;
    homeRectangles: Record<string, Rectangle[]>;

    // Data - Away
    awayPlayersDef: Player[];
    awayPlayersOff: Player[];
    awaySubstitutes: Player[];
    awayArrows: Record<string, Arrow[]>;
    awayRectangles: Record<string, Rectangle[]>;

    // Handlers
    onPlayerMove: (id: number, pos: { x: number, y: number }, team: 'home' | 'away', phase: 'defensive' | 'offensive') => void;
    onPlayerClick: (player: Player) => void;
    onPlayerDoubleClick: (player: Player) => void;
    onBenchPlayerClick: (player: Player) => void;

    // Toolbar & Drawing Handlers
    activeTool: ToolType;
    onToolChange: (tool: ToolType) => void;

    // Drawing Handlers - accept Omit<..., 'id'> as per TacticalField
    onAddArrow: (arrow: Omit<Arrow, 'id'>, team: 'home' | 'away', phase: string) => void;
    onRemoveArrow: (id: string, team: 'home' | 'away', phase: string) => void;
    onMoveArrow: (id: string, dx: number, dy: number, team: 'home' | 'away', phase: string) => void;

    onAddRectangle: (rect: Omit<Rectangle, 'id'>, team: 'home' | 'away', phase: string) => void;
    onRemoveRectangle: (id: string, team: 'home' | 'away', phase: string) => void;
    onMoveRectangle: (id: string, dx: number, dy: number, team: 'home' | 'away', phase: string) => void;

    // Toolbar Actions
    onOpenColorPicker: () => void;
    onOpenAnalysis: () => void;
    onOpenEvents: () => void;
    onSave: () => void;
    onExport: () => void;
    onAddPlayer: () => void;
    isSaving?: boolean;
    hasUnsavedChanges?: boolean;
    onShare?: () => void;
    readOnly?: boolean;
}

export const FullAnalysisMode: React.FC<FullAnalysisModeProps> = ({
    homeTeamName,
    awayTeamName,
    homeTeamColor,
    awayTeamColor,
    homeCoachName,
    awayCoachName,
    onHomeCoachChange,
    onAwayCoachChange,
    homePlayersDef,
    homePlayersOff,
    homeSubstitutes,
    homeArrows,
    homeRectangles,
    awayPlayersDef,
    awayPlayersOff,
    awaySubstitutes,
    awayArrows,
    awayRectangles,
    onPlayerMove,
    onPlayerClick,
    onPlayerDoubleClick,
    onBenchPlayerClick,
    activeTool,
    onToolChange,
    onAddArrow,
    onRemoveArrow,
    onMoveArrow,
    onAddRectangle,
    onRemoveRectangle,
    onMoveRectangle,
    onOpenColorPicker,
    onOpenAnalysis,
    onOpenEvents,
    onSave,
    onExport,
    onAddPlayer,
    isSaving,
    hasUnsavedChanges,
    onShare,
    readOnly = false
}) => {
    // State
    const [possession, setPossession] = useState<'home' | 'away'>('home');

    // Visibility Toggles
    const [showHomePlayers, setShowHomePlayers] = useState(true);
    const [showAwayPlayers, setShowAwayPlayers] = useState(true);

    // Derived Data
    const playersToRender = useMemo(() => {
        const list: Player[] = [];

        // If Home has possession:
        // Show Home Offensive players + Away Defensive players
        if (possession === 'home') {
            if (showHomePlayers) {
                list.push(...homePlayersOff.map(p => ({ ...p, color: homeTeamColor })));
            }
            if (showAwayPlayers) {
                list.push(...awayPlayersDef.map(p => ({ ...p, color: awayTeamColor })));
            }
        }
        // If Away has possession:
        // Show Away Offensive players + Home Defensive players
        else {
            if (showAwayPlayers) {
                list.push(...awayPlayersOff.map(p => ({ ...p, color: awayTeamColor })));
            }
            if (showHomePlayers) {
                list.push(...homePlayersDef.map(p => ({ ...p, color: homeTeamColor })));
            }
        }

        return list;
    }, [possession, showHomePlayers, showAwayPlayers, homePlayersOff, homePlayersDef, awayPlayersOff, awayPlayersDef, homeTeamColor, awayTeamColor]);

    // Helper to handle moves
    const handlePlayerMove = (id: number, pos: { x: number, y: number }) => {
        let team: 'home' | 'away' | null = null;
        let phase: 'defensive' | 'offensive' | null = null;

        if (possession === 'home') {
            if (homePlayersOff.find(p => p.id === id)) { team = 'home'; phase = 'offensive'; }
            else if (awayPlayersDef.find(p => p.id === id)) { team = 'away'; phase = 'defensive'; }
        } else {
            if (awayPlayersOff.find(p => p.id === id)) { team = 'away'; phase = 'offensive'; }
            else if (homePlayersDef.find(p => p.id === id)) { team = 'home'; phase = 'defensive'; }
        }

        if (team && phase) {
            onPlayerMove(id, pos, team, phase);
        }
    };

    // Columns
    const TeamColumn = ({
        name,
        players,
        substitutes,
        color,
        isVisible,
        onToggleVisibility,
        team,
        align,
        coachName,
        onCoachChange
    }: {
        name: string,
        players: Player[],
        substitutes: Player[],
        color: string,
        isVisible: boolean,
        onToggleVisibility: () => void,
        team: 'home' | 'away',
        align?: 'left' | 'right',
        coachName?: string,
        onCoachChange?: (name: string) => void
    }) => (
        <div className="h-full bg-nav-dark flex flex-col border-r border-l border-gray-800" style={{ width: '18%' }}>
            {/* Header */}
            <div className="p-4 border-b border-gray-700">
                <h3 className={`text-white font-bold uppercase text-sm tracking-wider mb-1 px-1 border-l-4 ${align === 'right' ? 'text-right border-l-0 border-r-4' : ''}`} style={{ borderColor: color }}>
                    {name}
                </h3>
                <div className={`flex items-center mt-2 ${align === 'right' ? 'justify-end' : 'justify-between'}`}>
                    {align !== 'right' && (
                        <>
                            <span className="text-xs text-gray-400 font-mono">
                                {players.length} Jogadores
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={onToggleVisibility}
                                    className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                                    title={isVisible ? "Ocultar jogadores" : "Mostrar jogadores"}
                                >
                                    {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                                </button>
                            </div>
                        </>
                    )}

                    {align === 'right' && (
                        <>
                            <div className="flex gap-2 mr-auto">
                                <button
                                    onClick={onToggleVisibility}
                                    className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                                    title={isVisible ? "Ocultar jogadores" : "Mostrar jogadores"}
                                >
                                    {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                                </button>
                            </div>
                            <span className="text-xs text-gray-400 font-mono">
                                {players.length} Jogadores
                            </span>
                        </>
                    )}
                </div>

                {/* Coach Name directly under Header */}
                <div className="mt-2 pt-2 border-t border-gray-700/50">
                    <CoachNameDisplay
                        coachName={coachName || ''}
                        onSave={onCoachChange || (() => { })}
                        align={align === 'right' ? 'right' : 'left'}
                        placeholder="Nome do Técnico"
                        readOnly={readOnly}
                    />
                </div>
            </div>

            {/* Substitutes / Bench - Taking full height now */}
            <div className="flex flex-col p-2 flex-1 min-h-0 overflow-hidden">
                <BenchArea
                    players={substitutes}
                    team={team}
                    orientation="vertical"
                    align={align || 'left'}
                    onPromotePlayer={readOnly ? () => { } : onBenchPlayerClick}
                    onPlayerDoubleClick={onPlayerDoubleClick}
                />
            </div>
        </div>
    );

    // Drawing Data Logic
    const currentDrawTeam = possession === 'home' ? 'home' : 'away'; // 'full_home' drawings stored in HOME arrows req?
    // Using keys 'full_home' and 'full_away' in the respective team records
    const currentPhaseKey = possession === 'home' ? 'full_home' : 'full_away';

    // We access the records passed via props
    const currentArrows = possession === 'home' ? homeArrows['full_home'] : awayArrows['full_away'];

    const currentRects = possession === 'home' ? homeRectangles['full_home'] : awayRectangles['full_away'];

    // Map player notes for indicator
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const playerNotes = playersToRender.reduce((acc, p) => (p as any).note ? ({ ...acc, [p.id]: (p as any).note }) : acc, {} as Record<number, string>);

    return (
        <div className="flex flex-1 h-full overflow-hidden bg-panel-dark relative" style={{ height: 'calc(100vh - 64px)' }}>

            {/* LEFT COLUMN: HOME */}
            <TeamColumn
                name={homeTeamName}
                players={homePlayersDef}
                substitutes={homeSubstitutes}
                color={homeTeamColor}
                isVisible={showHomePlayers}
                onToggleVisibility={() => setShowHomePlayers(!showHomePlayers)}
                team="home"
                coachName={homeCoachName}
                onCoachChange={onHomeCoachChange}
            />

            {/* CENTER: FIELD */}
            <div className="flex flex-col flex-1 h-full relative" style={{ width: '64%' }}>

                {/* Switcher & Header */}
                <div className="flex flex-col items-center justify-center pt-2 pb-1 gap-1 z-10 shrink-0">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold">
                        Posse de Bola
                    </span>

                    <div className="flex items-center bg-gray-800 rounded-full p-1 border border-gray-700">
                        <button
                            onClick={() => setPossession('home')}
                            className={`px-6 py-1.5 rounded-full text-xs font-bold transition-all ${possession === 'home'
                                ? 'bg-white text-gray-900 shadow-lg scale-105'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            {homeTeamName}
                        </button>
                        <button
                            onClick={() => setPossession('away')}
                            className={`px-6 py-1.5 rounded-full text-xs font-bold transition-all ${possession === 'away'
                                ? 'bg-white text-gray-900 shadow-lg scale-105'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            {awayTeamName}
                        </button>
                    </div>
                </div>

                {/* Field Area */}
                <div className="flex-1 w-full p-2 flex items-center justify-center relative overflow-hidden pb-16">
                    <div className="w-full h-full relative" style={{ maxWidth: '100%', maxHeight: '100%', aspectRatio: '105/68' }}>
                        {/* Wrapper to maintain aspect ratio but scale down if needed */}
                        <div className="absolute inset-0 shadow-2xl rounded-lg overflow-hidden border border-white/10">
                            <TacticalField
                                players={playersToRender}
                                onPlayerMove={(id, pos) => handlePlayerMove(id, pos)}
                                onPlayerClick={onPlayerClick}
                                onPlayerDoubleClick={onPlayerDoubleClick}
                                orientation="horizontal"
                                mode={activeTool === 'select' ? 'move' : activeTool === 'rectangle' ? 'rectangle' : 'draw'}
                                isEraserMode={activeTool === 'eraser'}
                                arrows={currentArrows || []}
                                rectangles={currentRects || []}
                                onAddArrow={(a) => onAddArrow(a, currentDrawTeam, currentPhaseKey)}
                                onRemoveArrow={(id) => onRemoveArrow(id, currentDrawTeam, currentPhaseKey)}
                                onMoveArrow={(id, x, y) => onMoveArrow(id, x, y, currentDrawTeam, currentPhaseKey)}
                                onAddRectangle={(r) => onAddRectangle(r, currentDrawTeam, currentPhaseKey)}
                                onRemoveRectangle={(id) => onRemoveRectangle(id, currentDrawTeam, currentPhaseKey)}
                                onMoveRectangle={(id, x, y) => onMoveRectangle(id, x, y, currentDrawTeam, currentPhaseKey)}
                                playerColor={currentDrawTeam === 'home' ? homeTeamColor : awayTeamColor}
                                rectangleColor={currentDrawTeam === 'home' ? homeTeamColor : awayTeamColor}
                                playerScale={0.85}
                                readOnly={readOnly}
                                playerNotes={playerNotes}
                            />
                        </div>
                    </div>
                </div>

                {/* TOOLBAR - Bottom Center absolute */}
                {!readOnly && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 transform scale-90 origin-bottom">
                        <FullAnalysisToolbar
                            activeTool={activeTool}
                            onToolChange={onToolChange}
                            onOpenColorPicker={onOpenColorPicker}
                            onOpenAnalysis={onOpenAnalysis}
                            onOpenEvents={onOpenEvents}
                            onSave={onSave}
                            onExport={onExport}
                            onAddPlayer={onAddPlayer}
                            isSaving={isSaving}
                            hasUnsavedChanges={hasUnsavedChanges}
                            onShare={onShare}
                        />
                    </div>
                )}

            </div>

            {/* RIGHT COLUMN: AWAY */}
            <TeamColumn
                name={awayTeamName}
                players={awayPlayersDef}
                substitutes={awaySubstitutes}
                color={awayTeamColor}
                isVisible={showAwayPlayers}
                onToggleVisibility={() => setShowAwayPlayers(!showAwayPlayers)}
                team="away"
                coachName={awayCoachName}
                onCoachChange={onAwayCoachChange}
            />

        </div>
    );
};
