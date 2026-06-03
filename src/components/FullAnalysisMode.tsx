import React, { useState, useMemo, type ReactNode } from 'react';
import TacticalField from './TacticalField';
import { type ToolType } from './Toolbar';
import { FullAnalysisToolbar } from './FullAnalysisToolbar';
import BenchArea from './BenchArea';
import MobileBottomSheet from './MobileBottomSheet';
import { useIsMobile } from '../hooks/useIsMobile';
import type { Player } from '../types/Player';
import type { Arrow } from '../types/Arrow';
import type { Rectangle } from '../types/Rectangle';
import {
    Eye, EyeOff, Menu, X, ChevronDown, ChevronUp,
    Hand, MoveRight, Square, Palette, Eraser,
    FileText, Zap, Share2, Save, Loader2, UserPlus,
    Pencil, Users,
} from 'lucide-react';
import { CoachNameDisplay } from './CoachNameDisplay';

interface FullAnalysisModeProps {
    homeTeamName: string;
    awayTeamName: string;
    homeTeamColor: string;
    awayTeamColor: string;
    homeTeamBgColor?: string;
    awayTeamBgColor?: string;
    homeCoachName: string;
    awayCoachName: string;
    onHomeCoachChange?: (name: string) => void;
    onAwayCoachChange?: (name: string) => void;

    ballPositions: {
        homeDef: { x: number; y: number };
        homeOff: { x: number; y: number };
        awayDef: { x: number; y: number };
        awayOff: { x: number; y: number };
    };
    homePlayersDef: Player[];
    homePlayersOff: Player[];
    homeSubstitutes: Player[];
    homeArrows: Record<string, Arrow[]>;
    homeRectangles: Record<string, Rectangle[]>;

    awayPlayersDef: Player[];
    awayPlayersOff: Player[];
    awaySubstitutes: Player[];
    awayArrows: Record<string, Arrow[]>;
    awayRectangles: Record<string, Rectangle[]>;

    onBallMove: (pos: { x: number, y: number }, team: 'home' | 'away', phase: string) => void;
    onPlayerMove: (id: number, pos: { x: number, y: number }, team: 'home' | 'away', phase: string) => void;
    onBenchPlayerClick: (player: Player, team: 'home' | 'away') => void;
    onPlayerClick: (player: Player) => void;
    onPlayerDoubleClick: (player: Player) => void;

    activeTool: ToolType;
    onToolChange: (tool: ToolType) => void;
    onOpenColorPicker: () => void;
    onOpenAnalysis: () => void;
    onOpenEvents: () => void;
    onSave: () => void;
    onExport: () => void;
    onAddPlayer: () => void;
    isSaving: boolean;
    hasUnsavedChanges: boolean;
    onShare: () => void;
    onHeaderTeamClick?: (team: 'home' | 'away') => void;

    onAddArrow: (arrow: Omit<Arrow, 'id'>, team: 'home' | 'away', phase: string) => void;
    onRemoveArrow: (id: string, team: 'home' | 'away', phase: string) => void;
    onMoveArrow: (id: string, dx: number, dy: number, team: 'home' | 'away', phase: string) => void;

    onAddRectangle: (rect: Omit<Rectangle, 'id'>, team: 'home' | 'away', phase: string) => void;
    onRemoveRectangle: (id: string, team: 'home' | 'away', phase: string) => void;
    onMoveRectangle: (id: string, dx: number, dy: number, team: 'home' | 'away', phase: string) => void;

    readOnly?: boolean;
    tabsSlot?: ReactNode;
}


// ─── Desktop TeamColumn (unchanged) ─────────────────────────────────────────
const TeamColumn: React.FC<{
    name: string;
    players: Player[];
    substitutes: Player[];
    color: string;
    bgColor?: string;
    isVisible: boolean;
    onToggleVisibility: () => void;
    team: 'home' | 'away';
    align?: 'left' | 'right';
    coachName?: string;
    onCoachChange?: (name: string) => void;
    onTeamClick?: () => void;
    isExpandedOnMobile?: boolean;
    onToggleMobileExpansion?: () => void;
    readOnly?: boolean;
    onBenchPlayerClick: (player: Player, team: 'home' | 'away') => void;
    onPlayerDoubleClick: (player: Player) => void;
}> = ({
    name, players, substitutes, color, bgColor = '#090909',
    isVisible, onToggleVisibility, team, align, coachName, onCoachChange,
    onTeamClick, isExpandedOnMobile, onToggleMobileExpansion,
    readOnly = false, onBenchPlayerClick, onPlayerDoubleClick,
}) => (
    <div className="flex flex-col border-r border-l border-gray-800 bg-[#070d0d] w-full lg:w-[18%] h-auto lg:h-full shrink-0 order-2 lg:order-none overflow-hidden">
        <div
            className="p-4 border-b border-gray-700 bg-[#070d0d] cursor-pointer lg:cursor-default"
            onClick={() => {
                if (onToggleMobileExpansion && window.innerWidth < 1024) onToggleMobileExpansion();
            }}
        >
            <div className="flex justify-between items-center">
                <h3
                    className={`text-white font-bold uppercase text-sm tracking-wider mb-1 px-1 border-l-4 ${align === 'right' ? 'text-right border-l-0 border-r-4' : ''} cursor-pointer hover:opacity-80 transition-opacity`}
                    style={{ borderColor: color }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onTeamClick?.();
                        if (onToggleMobileExpansion && window.innerWidth < 1024) onToggleMobileExpansion();
                    }}
                >
                    {name}
                </h3>
                <div className="lg:hidden text-gray-400">
                    {isExpandedOnMobile ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
            </div>

            <div className={`flex items-center mt-2 ${align === 'right' ? 'justify-end' : 'justify-between'}`}>
                {align !== 'right' && (
                    <>
                        <span className="text-xs text-gray-400 font-mono">{players.length} Jogadores</span>
                        <button
                            onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
                            className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                        >
                            {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                    </>
                )}
                {align === 'right' && (
                    <>
                        <button
                            onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
                            className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors mr-auto"
                        >
                            {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                        <span className="text-xs text-gray-400 font-mono">{players.length} Jogadores</span>
                    </>
                )}
            </div>
        </div>

        <div className={`${isExpandedOnMobile ? 'flex' : 'hidden'} lg:flex flex-col flex-1 min-h-0 overflow-hidden`}>
            <div className="px-4 py-2 border-b border-gray-700/50 bg-[#070d0d]">
                <CoachNameDisplay
                    coachName={coachName || ''}
                    onSave={onCoachChange || (() => {})}
                    align={align === 'right' ? 'right' : 'left'}
                    placeholder="Nome do Técnico"
                    readOnly={readOnly}
                />
            </div>
            <div className="flex flex-col p-2 flex-1 min-h-0 overflow-hidden">
                <BenchArea
                    players={substitutes}
                    team={team}
                    teamColor={color}
                    teamBgColor={bgColor}
                    orientation="vertical"
                    align={align || 'left'}
                    onPromotePlayer={readOnly ? () => {} : (p) => onBenchPlayerClick(p, team)}
                    onPlayerDoubleClick={onPlayerDoubleClick}
                />
            </div>
        </div>
    </div>
);

// ─── Main component ──────────────────────────────────────────────────────────
export const FullAnalysisMode: React.FC<FullAnalysisModeProps> = ({
    homeTeamName, awayTeamName,
    homeTeamColor, awayTeamColor,
    homeTeamBgColor = '#090909', awayTeamBgColor = '#090909',
    homeCoachName, awayCoachName,
    onHomeCoachChange, onAwayCoachChange,
    ballPositions,
    homePlayersDef, homePlayersOff, homeSubstitutes, homeArrows, homeRectangles,
    awayPlayersDef, awayPlayersOff, awaySubstitutes, awayArrows, awayRectangles,
    onBallMove, onPlayerMove, onBenchPlayerClick, onPlayerClick, onPlayerDoubleClick,
    activeTool, onToolChange, onOpenColorPicker, onOpenAnalysis, onOpenEvents,
    onSave, onExport, onAddPlayer, isSaving, hasUnsavedChanges, onShare, onHeaderTeamClick,
    onAddArrow, onRemoveArrow, onMoveArrow,
    onAddRectangle, onRemoveRectangle, onMoveRectangle,
    readOnly = false, tabsSlot,
}) => {
    const isMobile = useIsMobile();
    const [possession, setPossession] = useState<'home' | 'away'>('home');
    const [isToolbarOpen, setIsToolbarOpen] = useState(false);
    const [showHomePlayers, setShowHomePlayers] = useState(true);
    const [showAwayPlayers, setShowAwayPlayers] = useState(true);
    const [mobileExpandedTeam, setMobileExpandedTeam] = useState<'home' | 'away' | null>(null);
    const [isBenchSheetOpen, setIsBenchSheetOpen] = useState(false);
    const [isToolsSheetOpen, setIsToolsSheetOpen] = useState(false);

    const toggleMobileExpansion = (team: 'home' | 'away') =>
        setMobileExpandedTeam(prev => prev === team ? null : team);

    const playersToRender = useMemo(() => {
        const list: Player[] = [];
        if (possession === 'home') {
            if (showHomePlayers) list.push(...homePlayersOff.map(p => ({ ...p, color: homeTeamColor, backgroundColor: homeTeamBgColor, borderColor: homeTeamColor })));
            if (showAwayPlayers) list.push(...awayPlayersDef.map(p => ({ ...p, color: awayTeamColor, backgroundColor: awayTeamBgColor, borderColor: awayTeamColor })));
        } else {
            if (showAwayPlayers) list.push(...awayPlayersOff.map(p => ({ ...p, color: awayTeamColor, backgroundColor: awayTeamBgColor, borderColor: awayTeamColor })));
            if (showHomePlayers) list.push(...homePlayersDef.map(p => ({ ...p, color: homeTeamColor, backgroundColor: homeTeamBgColor, borderColor: homeTeamColor })));
        }
        return list;
    }, [possession, showHomePlayers, showAwayPlayers, homePlayersOff, homePlayersDef, awayPlayersOff, awayPlayersDef, homeTeamColor, awayTeamColor, homeTeamBgColor, awayTeamBgColor]);

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
        if (team && phase) onPlayerMove(id, pos, team, phase);
    };

    const currentDrawTeam = possession === 'home' ? 'home' : 'away';
    const currentPhaseKey = possession === 'home' ? 'full_home' : 'full_away';
    const currentArrows = possession === 'home'
        ? (showHomePlayers ? homeArrows['full_home'] : [])
        : (showAwayPlayers ? awayArrows['full_away'] : []);
    const currentRects = possession === 'home'
        ? (showHomePlayers ? homeRectangles['full_home'] : [])
        : (showAwayPlayers ? awayRectangles['full_away'] : []);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const playerNotes = playersToRender.reduce((acc, p) => (p as any).note ? ({ ...acc, [p.id]: (p as any).note }) : acc, {} as Record<number, string>);

    const tacticalFieldProps = {
        tabsSlot,
        players: playersToRender,
        onPlayerMove: (id: number, pos: { x: number, y: number }) => handlePlayerMove(id, pos),
        onPlayerClick,
        onPlayerDoubleClick,
        mode: (activeTool === 'select' ? 'move' : activeTool === 'rectangle' ? 'rectangle' : 'draw') as 'move' | 'draw' | 'rectangle',
        isEraserMode: activeTool === 'eraser',
        arrows: currentArrows || [],
        rectangles: currentRects || [],
        onAddArrow: (a: Omit<Arrow, 'id'>) => onAddArrow(a, currentDrawTeam, currentPhaseKey),
        onRemoveArrow: (id: string) => onRemoveArrow(id, currentDrawTeam, currentPhaseKey),
        onMoveArrow: (id: string, x: number, y: number) => onMoveArrow(id, x, y, currentDrawTeam, currentPhaseKey),
        onAddRectangle: (r: Omit<Rectangle, 'id'>) => onAddRectangle(r, currentDrawTeam, currentPhaseKey),
        onRemoveRectangle: (id: string) => onRemoveRectangle(id, currentDrawTeam, currentPhaseKey),
        onMoveRectangle: (id: string, x: number, y: number) => onMoveRectangle(id, x, y, currentDrawTeam, currentPhaseKey),
        playerColor: currentDrawTeam === 'home' ? homeTeamColor : awayTeamColor,
        rectangleColor: currentDrawTeam === 'home' ? homeTeamColor : awayTeamColor,
        playerScale: 0.85,
        readOnly,
        playerNotes,
        ballPosition: possession === 'home' ? ballPositions?.homeOff : ballPositions?.awayOff,
        onBallMove: (pos: { x: number, y: number }) => onBallMove?.(pos, possession, 'offensive'),
        ballScale: 0.7,
    };

    // ── MOBILE LAYOUT ────────────────────────────────────────────────────────
    if (isMobile) {
        const totalBench = homeSubstitutes.length + awaySubstitutes.length;

        // Active tool icon for the FAB
        const fabToolIcon = activeTool === 'arrow' ? <MoveRight className="w-5 h-5" />
            : activeTool === 'rectangle' ? <Square className="w-5 h-5" />
            : activeTool === 'eraser' ? <Eraser className="w-5 h-5" />
            : <Pencil className="w-5 h-5" />;

        return (
            <div className="flex flex-col h-full bg-[#0b1111] overflow-hidden">

                {/* Board tabs — ultra-compact, only when present */}
                {tabsSlot && (
                    <div className="shrink-0 border-b border-gray-800/60 bg-[#0b1111]">
                        {tabsSlot}
                    </div>
                )}

                {/* ── Campo: protagonista absoluto ───────────────────────── */}
                <div className="flex-1 relative min-h-0 overflow-hidden">
                    <TacticalField
                        {...tacticalFieldProps}
                        orientation="vertical"
                        tabsSlot={undefined}
                        playerScale={1.15}
                    />

                    {/* Possession pill — sobreposto no canto superior direito */}
                    <div
                        className="absolute top-2 right-2 z-[60] flex items-center rounded-full p-0.5 border border-white/10"
                        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
                    >
                        <button
                            onClick={() => setPossession('home')}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all truncate max-w-[80px] ${possession === 'home' ? 'text-white' : 'text-gray-400'}`}
                            style={possession === 'home' ? { backgroundColor: homeTeamColor } : {}}
                        >
                            {homeTeamName}
                        </button>
                        <button
                            onClick={() => setPossession('away')}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all truncate max-w-[80px] ${possession === 'away' ? 'text-white' : 'text-gray-400'}`}
                            style={possession === 'away' ? { backgroundColor: awayTeamColor } : {}}
                        >
                            {awayTeamName}
                        </button>
                    </div>

                    {/* Bench FAB — canto inferior esquerdo */}
                    <button
                        onClick={() => setIsBenchSheetOpen(true)}
                        className="absolute bottom-3 left-3 z-[60] flex items-center gap-1.5 rounded-2xl px-3 py-2.5 border border-white/10 active:scale-95 transition-transform"
                        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
                        title="Banco de reservas"
                    >
                        <Users className="w-4 h-4 text-gray-300" />
                        {totalBench > 0 && (
                            <span className="text-xs font-bold text-gray-300">{totalBench}</span>
                        )}
                    </button>

                    {/* Tools FAB — canto inferior direito (somente edit) */}
                    {!readOnly && (
                        <button
                            onClick={() => setIsToolsSheetOpen(true)}
                            className={`absolute bottom-3 right-3 z-[60] w-12 h-12 rounded-2xl flex items-center justify-center border border-white/10 active:scale-95 transition-transform ${activeTool !== 'select' ? 'text-gray-900' : 'text-white'}`}
                            style={{
                                background: activeTool !== 'select' ? homeTeamColor : 'rgba(0,0,0,0.7)',
                                backdropFilter: activeTool === 'select' ? 'blur(8px)' : undefined,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                            }}
                            title="Ferramentas"
                        >
                            {fabToolIcon}
                            {hasUnsavedChanges && !isSaving && (
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full border border-[#0b1111]" />
                            )}
                        </button>
                    )}
                </div>

                {/* ── Bench bottom sheet ─────────────────────────────────── */}
                {isBenchSheetOpen && (
                    <MobileBottomSheet
                        homeTeamName={homeTeamName}
                        awayTeamName={awayTeamName}
                        homeTeamColor={homeTeamColor}
                        awayTeamColor={awayTeamColor}
                        homeSubstitutes={homeSubstitutes}
                        awaySubstitutes={awaySubstitutes}
                        activePossession={possession}
                        onBenchPlayerClick={onBenchPlayerClick}
                        onPlayerDoubleClick={onPlayerDoubleClick}
                        onClose={() => setIsBenchSheetOpen(false)}
                        readOnly={readOnly}
                    />
                )}

                {/* ── Tools bottom sheet ─────────────────────────────────── */}
                {isToolsSheetOpen && !readOnly && (
                    <>
                        <div
                            className="fixed inset-0 z-[75] bg-black/40"
                            onClick={() => setIsToolsSheetOpen(false)}
                        />
                        <div
                            className="fixed bottom-0 left-0 right-0 z-[80] flex flex-col rounded-t-2xl border-t border-gray-700/50"
                            style={{ background: '#0d1414', boxShadow: '0 -8px 40px rgba(0,0,0,0.7)' }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Drag handle */}
                            <div className="flex justify-center pt-3 pb-1 shrink-0">
                                <div className="w-10 h-1 bg-gray-600 rounded-full" />
                            </div>

                            <div className="px-4 pb-4">
                                {/* Tool grid — row 1: drawing tools */}
                                <div className="grid grid-cols-4 gap-2 mb-2">
                                    {[
                                        { tool: 'select' as const, icon: <Hand className="w-5 h-5" />, label: 'Mover' },
                                        { tool: 'arrow' as const, icon: <MoveRight className="w-5 h-5" />, label: 'Seta' },
                                        { tool: 'rectangle' as const, icon: <Square className="w-5 h-5" />, label: 'Área' },
                                        { tool: 'eraser' as const, icon: <Eraser className="w-5 h-5" />, label: 'Apagar' },
                                    ].map(({ tool, icon, label }) => (
                                        <button
                                            key={tool}
                                            onClick={() => { onToolChange(tool); setIsToolsSheetOpen(false); }}
                                            className={`flex flex-col items-center justify-center h-16 rounded-xl gap-1.5 transition-all active:scale-95 border ${
                                                activeTool === tool
                                                    ? 'bg-brand-primary/15 border-brand-primary/40 text-brand-primary'
                                                    : 'bg-gray-800/70 border-gray-700/40 text-gray-300 hover:text-white'
                                            }`}
                                        >
                                            {icon}
                                            <span className="text-[10px] font-medium">{label}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* Tool grid — row 2: create/secondary */}
                                <div className="grid grid-cols-4 gap-2 mb-3">
                                    {[
                                        { icon: <Palette className="w-5 h-5" />, label: 'Cor', action: () => { onOpenColorPicker(); setIsToolsSheetOpen(false); } },
                                        { icon: <UserPlus className="w-5 h-5" />, label: 'Jogador', action: () => { onAddPlayer(); setIsToolsSheetOpen(false); } },
                                        { icon: <FileText className="w-5 h-5" />, label: 'Notas', action: () => { onOpenAnalysis(); setIsToolsSheetOpen(false); } },
                                        { icon: <Zap className="w-5 h-5" />, label: 'Eventos', action: () => { onOpenEvents(); setIsToolsSheetOpen(false); } },
                                    ].map(({ icon, label, action }) => (
                                        <button
                                            key={label}
                                            onClick={action}
                                            className="flex flex-col items-center justify-center h-16 rounded-xl gap-1.5 bg-gray-800/70 border border-gray-700/40 text-gray-300 hover:text-white transition-all active:scale-95"
                                        >
                                            {icon}
                                            <span className="text-[10px] font-medium">{label}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* Save + Share row */}
                                <div className="flex gap-2" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                                    <button
                                        onClick={() => { onShare(); setIsToolsSheetOpen(false); }}
                                        className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-gray-800/80 border border-gray-700/40 text-gray-300 text-sm font-medium active:scale-95 transition-all"
                                    >
                                        <Share2 className="w-4 h-4" />
                                        Compartilhar
                                    </button>
                                    <button
                                        onClick={() => { onSave(); setIsToolsSheetOpen(false); }}
                                        disabled={isSaving}
                                        className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-bold active:scale-95 transition-all border ${
                                            hasUnsavedChanges
                                                ? 'bg-brand-primary/20 border-brand-primary/40 text-brand-primary'
                                                : 'bg-gray-800/80 border-gray-700/40 text-gray-300'
                                        }`}
                                    >
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        {isSaving ? 'Salvando…' : 'Salvar'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    }

    // ── DESKTOP LAYOUT (unchanged) ───────────────────────────────────────────
    return (
        <div className="flex flex-col lg:flex-row flex-1 h-full overflow-y-auto lg:overflow-hidden relative bg-[#0b1111]">

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
                onTeamClick={() => onHeaderTeamClick?.('home')}
                isExpandedOnMobile={mobileExpandedTeam === 'home'}
                onToggleMobileExpansion={() => toggleMobileExpansion('home')}
                readOnly={readOnly}
                onBenchPlayerClick={onBenchPlayerClick}
                onPlayerDoubleClick={onPlayerDoubleClick}
            />

            {/* CENTER: FIELD */}
            <div className="flex flex-col w-full lg:w-[64%] h-auto lg:h-full relative shrink-0 order-1 lg:order-none">

                <div className="flex flex-col items-center justify-center pt-2 pb-1 gap-1 z-30 shrink-0 relative">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold">
                        Posse de Bola
                    </span>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center bg-gray-800 rounded-full p-1 border border-gray-700">
                            <button
                                onClick={() => setPossession('home')}
                                className={`px-6 py-1.5 rounded-full text-xs font-bold transition-all ${possession === 'home' ? 'bg-white text-gray-900 shadow-lg scale-105' : 'text-gray-400 hover:text-white'}`}
                            >
                                {homeTeamName}
                            </button>
                            <button
                                onClick={() => setPossession('away')}
                                className={`px-6 py-1.5 rounded-full text-xs font-bold transition-all ${possession === 'away' ? 'bg-white text-gray-900 shadow-lg scale-105' : 'text-gray-400 hover:text-white'}`}
                            >
                                {awayTeamName}
                            </button>
                        </div>

                        {!readOnly && (
                            <button
                                onClick={() => setIsToolbarOpen(!isToolbarOpen)}
                                className={`p-2 rounded-full border transition-all duration-200 ${isToolbarOpen ? 'bg-white border-white text-black shadow-lg rotate-90' : 'bg-gray-800 border-gray-700 text-white hover:bg-gray-700'}`}
                                title="Ferramentas"
                            >
                                {isToolbarOpen ? <X size={18} /> : <Menu size={18} />}
                            </button>
                        )}
                    </div>

                    {isToolbarOpen && !readOnly && (
                        <div className="absolute top-full mt-2 z-50 animate-in slide-in-from-top-2 fade-in duration-200">
                            <FullAnalysisToolbar
                                activeTool={activeTool}
                                onToolChange={(tool) => { onToolChange(tool); setIsToolbarOpen(false); }}
                                onOpenColorPicker={() => { onOpenColorPicker(); setIsToolbarOpen(false); }}
                                onOpenAnalysis={() => { onOpenAnalysis(); setIsToolbarOpen(false); }}
                                onOpenEvents={() => { onOpenEvents(); setIsToolbarOpen(false); }}
                                onSave={onSave}
                                onExport={onExport}
                                onAddPlayer={() => { onAddPlayer(); setIsToolbarOpen(false); }}
                                isSaving={isSaving}
                                hasUnsavedChanges={hasUnsavedChanges}
                                onShare={onShare}
                            />
                        </div>
                    )}
                </div>

                <div className="flex-1 w-full flex items-center justify-center relative pb-4">
                    <TacticalField {...tacticalFieldProps} orientation="horizontal" />
                </div>
            </div>

            {/* RIGHT COLUMN: AWAY */}
            <TeamColumn
                name={awayTeamName}
                players={awayPlayersDef}
                substitutes={awaySubstitutes}
                color={awayTeamColor}
                bgColor={awayTeamBgColor}
                isVisible={showAwayPlayers}
                onToggleVisibility={() => setShowAwayPlayers(!showAwayPlayers)}
                team="away"
                align="right"
                coachName={awayCoachName}
                onCoachChange={onAwayCoachChange}
                onTeamClick={() => onHeaderTeamClick?.('away')}
                isExpandedOnMobile={mobileExpandedTeam === 'away'}
                onToggleMobileExpansion={() => toggleMobileExpansion('away')}
                readOnly={readOnly}
                onBenchPlayerClick={onBenchPlayerClick}
                onPlayerDoubleClick={onPlayerDoubleClick}
            />
        </div>
    );
};
