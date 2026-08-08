import React, { useState, useMemo, type ReactNode } from 'react';
import TacticalField from './TacticalField';
import { type ToolType } from './Toolbar';
import { FullAnalysisToolbar } from './FullAnalysisToolbar';
import MobileBottomSheet from './MobileBottomSheet';
import { useIsMobile } from '../hooks/useIsMobile';
import type { Player } from '../types/Player';
import type { Arrow } from '../types/Arrow';
import type { Rectangle } from '../types/Rectangle';
import {
    Eye, EyeOff, ChevronDown, ChevronUp,
    Hand, MoveRight, Square, Palette, Eraser,
    FileText, Zap, Share2, Save, Loader2, UserPlus,
    Pencil, Users, Trash2,
} from 'lucide-react';
import { CoachNameDisplay } from './CoachNameDisplay';
import TeamLogoImage from './TeamLogoImage';
import RosterList from './analysis/RosterList';
import RichTextEditor from './analysis/RichTextEditor';
import { nameKey, type PlayerTally } from '../utils/playerTally';

interface FullAnalysisModeProps {
    homeTeamName: string;
    awayTeamName: string;
    homeTeamColor: string;
    awayTeamColor: string;
    homeTeamBgColor?: string;
    awayTeamBgColor?: string;
    homeTeamLogo?: string;
    awayTeamLogo?: string;
    /** Vem da escalacao da API-Football; nao e editavel na tela. */
    homeCoachName: string;
    awayCoachName: string;

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

    onAddArrow: (arrow: Omit<Arrow, 'id'>, team: 'home' | 'away', phase: string) => void;
    onRemoveArrow: (id: string, team: 'home' | 'away', phase: string) => void;
    onMoveArrow: (id: string, dx: number, dy: number, team: 'home' | 'away', phase: string) => void;

    onAddRectangle: (rect: Omit<Rectangle, 'id'>, team: 'home' | 'away', phase: string) => void;
    onRemoveRectangle: (id: string, team: 'home' | 'away', phase: string) => void;
    onMoveRectangle: (id: string, dx: number, dy: number, team: 'home' | 'away', phase: string) => void;

    /** Eventos da partida — alimentam os indicativos de gol e assistencia. */
    events?: Array<{ type?: string; player_name?: string; secondary_player_name?: string }>;

    /**
     * Anotacao unica por time (HTML). Qual das duas aparece e definido pelo
     * switcher de posse de bola.
     */
    homeNoteHtml?: string;
    awayNoteHtml?: string;
    onNoteChange?: (team: 'home' | 'away', html: string) => void;
    onNoteError?: (message: string) => void;

    readOnly?: boolean;
    hideSidePanels?: boolean;
    tabsSlot?: ReactNode;
    activeBoardId?: string | null;
    onDeleteBoard?: (boardId: string) => void;
}


// ─── Desktop TeamColumn ─────────────────────────────────────────────────────
const TeamColumn: React.FC<{
    name: string;
    logoUrl?: string;
    players: Player[];
    substitutes: Player[];
    color: string;
    bgColor?: string;
    isVisible: boolean;
    onToggleVisibility: () => void;
    team: 'home' | 'away';
    align?: 'left' | 'right';
    coachName?: string;
    isExpandedOnMobile?: boolean;
    onToggleMobileExpansion?: () => void;
    readOnly?: boolean;
    onBenchPlayerClick: (player: Player, team: 'home' | 'away') => void;
    onPlayerDoubleClick: (player: Player) => void;
    tallies: Map<string, PlayerTally>;
}> = ({
    name, logoUrl, players, substitutes, color, bgColor,
    isVisible, onToggleVisibility, team, align, coachName,
    isExpandedOnMobile, onToggleMobileExpansion,
    readOnly = false, onBenchPlayerClick, onPlayerDoubleClick, tallies,
}) => (
    <div className="flex flex-col border-r border-l border-gray-800 bg-[#070d0d] w-full lg:w-[18%] h-auto lg:h-full shrink-0 order-2 lg:order-none overflow-hidden">
        <div
            className="p-4 border-b border-gray-700 bg-[#070d0d] cursor-pointer lg:cursor-default"
            onClick={() => {
                if (onToggleMobileExpansion && window.innerWidth < 1024) onToggleMobileExpansion();
            }}
        >
            {/* Escudo acima do nome, como na tela de ver partida. O nome nao e
                mais um link: a anotacao coletiva abre pelo botao de notas da
                barra de ferramentas. */}
            <div className={`flex items-center justify-between gap-2 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
                <div className={`min-w-0 ${align === 'right' ? 'text-right' : ''}`}>
                    <div className={`mb-2 grid h-12 w-12 place-items-center overflow-hidden rounded-lg border border-gray-700 bg-black/40 ${align === 'right' ? 'ml-auto' : ''}`}>
                        <TeamLogoImage logoUrl={logoUrl} teamName={name} className="h-9 w-9" />
                    </div>
                    <h3
                        className={`truncate text-white font-bold uppercase text-sm tracking-wider px-1 border-l-4 ${align === 'right' ? 'border-l-0 border-r-4' : ''}`}
                        style={{ borderColor: color }}
                    >
                        {name}
                    </h3>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
                        title={isVisible ? 'Ocultar time no campo' : 'Mostrar time no campo'}
                        className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                    >
                        {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <div className="lg:hidden text-gray-400">
                        {isExpandedOnMobile ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                </div>
            </div>
        </div>

        <div className={`${isExpandedOnMobile ? 'flex' : 'hidden'} lg:flex flex-col flex-1 min-h-0 overflow-hidden`}>
            <div className="px-4 py-2 border-b border-gray-700/50 bg-[#070d0d]">
                {/* Sempre readOnly: o nome vem da escalacao da API-Football. */}
                <CoachNameDisplay
                    coachName={coachName || ''}
                    onSave={() => { /* nao editavel */ }}
                    align={align === 'right' ? 'right' : 'left'}
                    placeholder="Não informado"
                    readOnly
                />
            </div>
            {/* Duas listas: quem esta em campo e quem esta no banco. */}
            <div className="flex flex-col gap-4 p-2 flex-1 min-h-0 overflow-y-auto">
                <RosterList
                    title="Em campo"
                    players={players}
                    teamColor={color}
                    teamBgColor={bgColor}
                    tallies={tallies}
                    onPlayerDoubleClick={onPlayerDoubleClick}
                    emptyLabel="Nenhum jogador em campo."
                />
                <RosterList
                    title="Suplentes"
                    players={substitutes}
                    teamColor={color}
                    teamBgColor={bgColor}
                    tallies={tallies}
                    onPlayerDoubleClick={onPlayerDoubleClick}
                    onPlayerClick={readOnly ? undefined : (p) => onBenchPlayerClick(p, team)}
                    emptyLabel="Banco vazio."
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
    homeTeamLogo, awayTeamLogo,
    ballPositions,
    homePlayersDef, homePlayersOff, homeSubstitutes, homeArrows, homeRectangles,
    awayPlayersDef, awayPlayersOff, awaySubstitutes, awayArrows, awayRectangles,
    onBallMove, onPlayerMove, onBenchPlayerClick, onPlayerClick, onPlayerDoubleClick,
    activeTool, onToolChange, onOpenColorPicker, onOpenAnalysis, onOpenEvents,
    // onExport nao e mais usado aqui: a acao de baixar subiu para o cabecalho.
    onSave, onAddPlayer, isSaving, hasUnsavedChanges, onShare,
    onAddArrow, onRemoveArrow, onMoveArrow,
    onAddRectangle, onRemoveRectangle, onMoveRectangle,
    events,
    homeNoteHtml = '', awayNoteHtml = '', onNoteChange, onNoteError,
    readOnly = false, hideSidePanels = false, tabsSlot, activeBoardId, onDeleteBoard,
}) => {
    const isMobile = useIsMobile();
    const [possession, setPossession] = useState<'home' | 'away'>('home');
    // A toolbar do desktop agora e sempre visivel, entao nao ha mais estado de
    // aberta/fechada. No mobile as ferramentas continuam no bottom sheet.
    const [showHomePlayers, setShowHomePlayers] = useState(true);
    const [showAwayPlayers, setShowAwayPlayers] = useState(true);
    const [mobileExpandedTeam, setMobileExpandedTeam] = useState<'home' | 'away' | null>(null);
    const [isBenchSheetOpen, setIsBenchSheetOpen] = useState(false);
    const [isToolsSheetOpen, setIsToolsSheetOpen] = useState(false);
    const [showLabels, setShowLabels] = useState(true);
    // Antes um unico toggle escondia nome e bola juntos; agora sao independentes.
    const [showBall, setShowBall] = useState(true);

    // Gols e assistencias por jogador. Associados por nome porque MatchEvent
    // guarda player_name/secondary_player_name, nao o id do jogador.
    const tallies = useMemo(() => {
        const map = new Map<string, PlayerTally>();
        const bump = (n: string | undefined, field: keyof PlayerTally) => {
            if (!n?.trim()) return;
            const key = nameKey(n);
            const cur = map.get(key) ?? { goals: 0, assists: 0 };
            cur[field] += 1;
            map.set(key, cur);
        };
        for (const e of events ?? []) {
            if (e?.type !== 'goal') continue;
            bump(e.player_name, 'goals');
            bump(e.secondary_player_name, 'assists');
        }
        return map;
    }, [events]);

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
        showLabels,
        showBall,
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
            <div className="flex flex-col flex-1 min-h-0 bg-[#0b1111] overflow-hidden">

                {/* Board tabs — ultra-compact, only when present */}
                {tabsSlot && (
                    <div className="shrink-0 border-b border-gray-800/60 bg-[#0b1111]">
                        {tabsSlot}
                    </div>
                )}

                {/* ── Campo + barra de controles ────────────────────────── */}
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                    {/* Field — fills all available space between tabs and controls bar */}
                    <div className="flex-1 min-h-0 relative w-full overflow-hidden">
                        <TacticalField
                            {...tacticalFieldProps}
                            orientation="vertical"
                            tabsSlot={undefined}
                            playerScale={1.5}
                        />
                    </div>

                    {/* Controls bar — bench | possession | tools, BELOW the field */}
                    <div className="shrink-0 flex items-center gap-2 px-3" style={{ height: 'calc(56px + env(safe-area-inset-bottom, 0px))', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
                        {/* Bench button */}
                        {!hideSidePanels && (
                        <button
                            onClick={() => setIsBenchSheetOpen(true)}
                            className="flex items-center gap-1.5 rounded-2xl px-3 py-2.5 border border-white/10 active:scale-95 transition-transform shrink-0"
                            style={{ background: 'rgba(0,0,0,0.7)', boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
                            title="Banco de reservas"
                        >
                            <Users className="w-4 h-4 text-gray-300" />
                            {totalBench > 0 && (
                                <span className="text-xs font-bold text-gray-300">{totalBench}</span>
                            )}
                        </button>
                        )}

                        {/* Possession pill — flex-1 center */}
                        <div
                            className="flex-1 flex items-center rounded-full p-0.5 border border-white/10"
                            style={{ background: 'rgba(0,0,0,0.65)', boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
                        >
                            <button
                                onClick={() => setPossession('home')}
                                className={`flex-1 rounded-full text-[9px] font-bold transition-all truncate text-center ${possession === 'home' ? 'text-white' : 'text-gray-400'}`}
                                style={{ paddingTop: '3px', paddingBottom: '3px', ...(possession === 'home' ? { backgroundColor: homeTeamColor } : {}) }}
                            >
                                {homeTeamName}
                            </button>
                            <button
                                onClick={() => setPossession('away')}
                                className={`flex-1 rounded-full text-[9px] font-bold transition-all truncate text-center ${possession === 'away' ? 'text-white' : 'text-gray-400'}`}
                                style={{ paddingTop: '3px', paddingBottom: '3px', ...(possession === 'away' ? { backgroundColor: awayTeamColor } : {}) }}
                            >
                                {awayTeamName}
                            </button>
                        </div>

                        {/* Toggle labels & ball */}
                        <button
                            onClick={() => setShowLabels(v => !v)}
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center border active:scale-95 transition-transform shrink-0 ${!showLabels ? 'border-brand-primary/50 text-brand-primary' : 'border-white/10 text-gray-300'}`}
                            style={{ background: !showLabels ? 'rgba(39,216,136,0.12)' : 'rgba(0,0,0,0.7)', boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
                            title={showLabels ? 'Ocultar nomes e bola' : 'Mostrar nomes e bola'}
                        >
                            {showLabels ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>

                        {/* Tools button */}
                        {!readOnly && (
                            <button
                                onClick={() => setIsToolsSheetOpen(true)}
                                className={`w-12 h-12 rounded-2xl flex items-center justify-center border border-white/10 active:scale-95 transition-transform relative shrink-0 ${activeTool !== 'select' ? 'text-gray-900' : 'text-white'}`}
                                style={{
                                    background: activeTool !== 'select' ? homeTeamColor : 'rgba(0,0,0,0.7)',
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
                </div>

                {/* ── Bench bottom sheet ─────────────────────────────────── */}
                {isBenchSheetOpen && !hideSidePanels && (
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
                                <div className="flex gap-2">
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

                                {/* Delete scene — only when not on Principal tab */}
                                {activeBoardId && onDeleteBoard && (
                                    <button
                                        onClick={() => {
                                            setIsToolsSheetOpen(false);
                                            if (confirm('Excluir esta cena?')) onDeleteBoard(activeBoardId);
                                        }}
                                        className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-red-900/20 border border-red-800/40 text-red-400 text-sm font-medium active:scale-95 transition-all mt-2"
                                        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Excluir Cena
                                    </button>
                                )}
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
            {!hideSidePanels && (
            <TeamColumn
                tallies={tallies}
                name={homeTeamName}
                logoUrl={homeTeamLogo}
                players={homePlayersDef}
                substitutes={homeSubstitutes}
                color={homeTeamColor}
                bgColor={homeTeamBgColor}
                isVisible={showHomePlayers}
                onToggleVisibility={() => setShowHomePlayers(!showHomePlayers)}
                team="home"
                coachName={homeCoachName}
                isExpandedOnMobile={mobileExpandedTeam === 'home'}
                onToggleMobileExpansion={() => toggleMobileExpansion('home')}
                readOnly={readOnly}
                onBenchPlayerClick={onBenchPlayerClick}
                onPlayerDoubleClick={onPlayerDoubleClick}
            />
            )}

            {/* CENTER: FIELD */}
            <div className={`flex flex-col w-full ${hideSidePanels ? '' : 'lg:w-[64%]'} h-auto lg:h-full relative shrink-0 order-1 lg:order-none`}>

                {/* Barra do topo: posse de bola a esquerda, ferramentas a direita,
                    sempre visiveis — sem menu escondendo as ferramentas. */}
                <div className="shrink-0 z-30 flex flex-wrap items-end justify-between gap-x-3 gap-y-2 px-4 pt-3 pb-2">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold">
                            Posse de Bola
                        </span>
                        <div className="flex items-center bg-gray-800 rounded-full p-1 border border-gray-700">
                            <button
                                onClick={() => setPossession('home')}
                                className={`max-w-[150px] truncate px-5 py-1.5 rounded-full text-xs font-bold transition-all ${possession === 'home' ? 'bg-white text-gray-900 shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                                {homeTeamName}
                            </button>
                            <button
                                onClick={() => setPossession('away')}
                                className={`max-w-[150px] truncate px-5 py-1.5 rounded-full text-xs font-bold transition-all ${possession === 'away' ? 'bg-white text-gray-900 shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                                {awayTeamName}
                            </button>
                        </div>
                    </div>

                    {!readOnly && (
                        <div className="min-w-0 max-w-full overflow-x-auto no-scrollbar">
                            <FullAnalysisToolbar
                                activeTool={activeTool}
                                onToolChange={onToolChange}
                                onOpenColorPicker={onOpenColorPicker}
                                onOpenAnalysis={onOpenAnalysis}
                                onOpenEvents={onOpenEvents}
                                onAddPlayer={onAddPlayer}
                                showLabels={showLabels}
                                onToggleLabels={() => setShowLabels(v => !v)}
                                showBall={showBall}
                                onToggleBall={() => setShowBall(v => !v)}
                            />
                        </div>
                    )}
                </div>

                {/* Area rolavel com duas telas: campo e anotacao ocupam cada uma
                    100% da altura visivel (`h-full` resolve contra a altura desta
                    caixa, que e definida pelo flex-1). O padding entra dentro dos
                    100% — box-sizing border-box —, entao cada bloco continua
                    valendo exatamente uma tela. */}
                <div className="flex-1 min-h-0 overflow-y-auto px-4">
                    {/* Tela 1: abas + campo. */}
                    <div className="flex h-full flex-col gap-3 py-3" style={{ minHeight: 360 }}>
                        {/* Abas por fora do campo, como ja e feito no mobile. Dentro
                            do TacticalField elas forcam um pt-12 que comeria a altura
                            da caixa e faria o campo encolher de novo. */}
                        {tabsSlot && <div className="shrink-0">{tabsSlot}</div>}

                        {/* Agora a altura manda: o campo preenche a tela na vertical
                            e o TacticalField preserva a proporcao 105x68, sobrando
                            uma folga nas laterais quando a janela e muito larga. */}
                        <div className="relative min-h-0 w-full flex-1">
                            <TacticalField
                                {...tacticalFieldProps}
                                orientation="horizontal"
                                tabsSlot={undefined}
                            />
                        </div>
                    </div>

                    {/* Tela 2: anotacao unica do time — segue o switcher de posse
                        de bola — com a mesma altura do campo. */}
                    {!hideSidePanels && (
                        <div className="flex h-full w-full flex-col pb-3" style={{ minHeight: 280 }}>
                            <RichTextEditor
                                teamName={possession === 'home' ? homeTeamName : awayTeamName}
                                teamColor={possession === 'home' ? homeTeamColor : awayTeamColor}
                                teamLogo={possession === 'home' ? homeTeamLogo : awayTeamLogo}
                                value={possession === 'home' ? homeNoteHtml : awayNoteHtml}
                                onChange={html => onNoteChange?.(possession, html)}
                                readOnly={readOnly}
                                onError={onNoteError}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT COLUMN: AWAY */}
            {!hideSidePanels && (
            <TeamColumn
                tallies={tallies}
                name={awayTeamName}
                logoUrl={awayTeamLogo}
                players={awayPlayersDef}
                substitutes={awaySubstitutes}
                color={awayTeamColor}
                bgColor={awayTeamBgColor}
                isVisible={showAwayPlayers}
                onToggleVisibility={() => setShowAwayPlayers(!showAwayPlayers)}
                team="away"
                align="right"
                coachName={awayCoachName}
                isExpandedOnMobile={mobileExpandedTeam === 'away'}
                onToggleMobileExpansion={() => toggleMobileExpansion('away')}
                readOnly={readOnly}
                onBenchPlayerClick={onBenchPlayerClick}
                onPlayerDoubleClick={onPlayerDoubleClick}
            />
            )}
        </div>
    );
};
