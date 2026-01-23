import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Player } from '../types/Player';
import type { Arrow } from '../types/Arrow';
import type { Rectangle } from '../types/Rectangle';
import { getPlayerSize, getFontSize } from '../utils/playerCoordinates';

interface TacticalFieldProps {
    players: Player[];
    onPlayerMove: (id: number, pos: { x: number, y: number }) => void;
    onPlayerClick?: (player: Player) => void;
    onPlayerDoubleClick?: (player: Player) => void;
    selectedPlayerId?: number | null;
    playerNotes?: { [key: number]: string };
    mode?: 'move' | 'draw' | 'rectangle';
    arrows?: Arrow[];
    onAddArrow?: (arrow: Omit<Arrow, 'id'>) => void;
    onRemoveArrow?: (id: string) => void;
    onMoveArrow?: (id: string, deltaX: number, deltaY: number) => void;
    // Rectangle support
    rectangles?: Rectangle[];
    onAddRectangle?: (rect: Omit<Rectangle, 'id'>) => void;
    onRemoveRectangle?: (id: string) => void;
    onMoveRectangle?: (id: string, deltaX: number, deltaY: number) => void;
    // Eraser mode
    isEraserMode?: boolean;
    rectangleColor?: string;
    // Player color
    playerColor?: string;

    // Export modes
    compact?: boolean;

    readOnly?: boolean;
    orientation?: 'vertical' | 'horizontal';
}

// ... (FieldLines component logic was updated in previous step via overwrite, but we need to match the previous tool call's expectation or just strictly follow the lines here)
// Actually the previous tool call updated the component definition `const FieldLines...`.
// Now we need to update the usage inside `return`.

// Wait, the previous replacement replaced the *entire* FieldLines definition AND the start of TacticalField.
// So `orientation` is already destructured in `TacticalField`.
// We just need to update the interface (if it wasn't valid TS before, but I can't update interface in previous call easily if line numbers gap).
// Ah, the previous call started at line 36 and went to ~100.
// Interface is at lines 7-33. I need to update interface separately.

// Let's first update the interface (lines 7-33).
// Then update the usage of FieldLines and aspect ratio (lines 479-488).

// This step: Update Interface.


// Field Lines Component
const FieldLines: React.FC<{ orientation: 'vertical' | 'horizontal' }> = ({ orientation }) => {
    const isVertical = orientation === 'vertical';

    return (
        <div className="absolute inset-0 pointer-events-none">
            {/* Outer Border */}
            <div className="absolute inset-[3%] border-2 border-white/40 rounded-sm" />

            {/* Center Line */}
            <div className={`absolute bg-white/40 ${isVertical
                ? 'left-[3%] right-[3%] top-1/2 h-0.5 -translate-y-1/2'
                : 'top-[3%] bottom-[3%] left-1/2 w-0.5 -translate-x-1/2'
                }`} />

            {/* Center Circle */}
            <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-2 border-white/40 rounded-full"
                style={isVertical ? { width: '22%', height: '14%' } : { width: '14%', height: '22%' }}
            />

            {/* Center Dot */}
            <div className="absolute left-1/2 top-1/2 w-2 h-2 bg-white/40 rounded-full -translate-x-1/2 -translate-y-1/2" />

            {/* Areas - Vertical Logic */}
            {isVertical && (
                <>
                    {/* Top Penalty */}
                    <div className="absolute left-1/2 -translate-x-1/2 border-2 border-white/40 border-t-0"
                        style={{ top: '3%', width: '58%', height: '16%' }} />
                    {/* Top Goal */}
                    <div className="absolute left-1/2 -translate-x-1/2 border-2 border-white/40 border-t-0"
                        style={{ top: '3%', width: '28%', height: '6%' }} />
                    {/* Bottom Penalty */}
                    <div className="absolute left-1/2 -translate-x-1/2 border-2 border-white/40 border-b-0"
                        style={{ bottom: '3%', width: '58%', height: '16%' }} />
                    {/* Bottom Goal */}
                    <div className="absolute left-1/2 -translate-x-1/2 border-2 border-white/40 border-b-0"
                        style={{ bottom: '3%', width: '28%', height: '6%' }} />
                </>
            )}

            {/* Areas - Horizontal Logic */}
            {!isVertical && (
                <>
                    {/* Left Penalty */}
                    <div className="absolute top-1/2 -translate-y-1/2 border-2 border-white/40 border-l-0"
                        style={{ left: '3%', height: '58%', width: '16%' }} />
                    {/* Left Goal */}
                    <div className="absolute top-1/2 -translate-y-1/2 border-2 border-white/40 border-l-0"
                        style={{ left: '3%', height: '28%', width: '6%' }} />
                    {/* Right Penalty */}
                    <div className="absolute top-1/2 -translate-y-1/2 border-2 border-white/40 border-r-0"
                        style={{ right: '3%', height: '58%', width: '16%' }} />
                    {/* Right Goal */}
                    <div className="absolute top-1/2 -translate-y-1/2 border-2 border-white/40 border-r-0"
                        style={{ right: '3%', height: '28%', width: '6%' }} />
                </>
            )}
        </div>
    );
};

const TacticalField: React.FC<TacticalFieldProps> = ({
    players,
    onPlayerMove,
    onPlayerClick: _onPlayerClick,
    onPlayerDoubleClick,
    selectedPlayerId,
    playerNotes = {},
    mode = 'move',
    arrows = [],
    onAddArrow,
    onRemoveArrow,
    onMoveArrow,
    rectangles = [],
    onAddRectangle,
    onRemoveRectangle,
    onMoveRectangle,
    isEraserMode = false,
    rectangleColor = 'rgba(255, 200, 50, 0.3)',
    playerColor = '#EAB308', // Default yellow
    compact = false,
    readOnly = false,
    orientation = 'vertical'
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [draggingPlayer, setDraggingPlayer] = useState<Player | null>(null);
    const [tempPosition, setTempPosition] = useState<{ x: number; y: number } | null>(null);

    // Arrow Drawing State
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentArrow, setCurrentArrow] = useState<Partial<Arrow> | null>(null);

    // Rectangle Drawing State
    const [isDrawingRect, setIsDrawingRect] = useState(false);
    const [currentRect, setCurrentRect] = useState<Partial<Rectangle> | null>(null);

    // Element Dragging State (for arrows and rectangles in move mode)
    const [draggingElement, setDraggingElement] = useState<{ type: 'arrow' | 'rectangle'; id: string; startX: number; startY: number } | null>(null);

    // Get field position as percentage - CORRECT: X uses width, Y uses height
    const getFieldPosition = useCallback((clientX: number, clientY: number) => {
        if (!containerRef.current) return null;
        const rect = containerRef.current.getBoundingClientRect();

        // CRITICAL: Each axis uses its OWN dimension
        const x = ((clientX - rect.left) / rect.width) * 100;
        const y = ((clientY - rect.top) / rect.height) * 100;

        return { x, y };
    }, []);

    // Extract coordinates from mouse or touch event
    const getEventCoords = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
        if ('touches' in e && e.touches.length > 0) {
            return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
        }
        if ('changedTouches' in e && e.changedTouches.length > 0) {
            return { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY };
        }
        if ('clientX' in e) {
            return { clientX: e.clientX, clientY: e.clientY };
        }
        return null;
    };

    // === PLAYER DRAGGING ===
    const handlePlayerMouseDown = (e: React.MouseEvent | React.TouchEvent, player: Player) => {
        if (mode === 'draw') return;
        if ('button' in e && e.button !== 0) return;

        e.preventDefault();
        e.stopPropagation();
        setDraggingPlayer(player);
    };

    // Global listeners for player dragging
    useEffect(() => {
        if (!draggingPlayer) return;

        const handleMove = (e: MouseEvent | TouchEvent) => {
            e.preventDefault();
            const coords = getEventCoords(e);
            if (!coords) return;

            const pos = getFieldPosition(coords.clientX, coords.clientY);
            if (pos) {
                // Clamp within 3-97% to keep player visible
                setTempPosition({
                    x: Math.max(3, Math.min(97, pos.x)),
                    y: Math.max(3, Math.min(97, pos.y))
                });
            }
        };

        const handleEnd = (e: MouseEvent | TouchEvent) => {
            const coords = getEventCoords(e);
            if (coords && draggingPlayer) {
                const pos = getFieldPosition(coords.clientX, coords.clientY);
                if (pos) {
                    onPlayerMove(draggingPlayer.id, {
                        x: Math.max(3, Math.min(97, pos.x)),
                        y: Math.max(3, Math.min(97, pos.y))
                    });
                }
            }

            setDraggingPlayer(null);
            setTempPosition(null);
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('touchend', handleEnd);
        document.addEventListener('touchcancel', handleEnd);

        return () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleEnd);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('touchend', handleEnd);
            document.removeEventListener('touchcancel', handleEnd);
        };
    }, [draggingPlayer, onPlayerMove, getFieldPosition]);

    // === ARROW DRAWING ===
    const handleDrawStart = useCallback((clientX: number, clientY: number) => {
        if (mode !== 'draw') return;

        const pos = getFieldPosition(clientX, clientY);
        if (pos) {
            setIsDrawing(true);
            setCurrentArrow({ startX: pos.x, startY: pos.y, endX: pos.x, endY: pos.y });
        }
    }, [mode, getFieldPosition]);

    const handleDrawMove = useCallback((clientX: number, clientY: number) => {
        if (!isDrawing || !currentArrow) return;

        const pos = getFieldPosition(clientX, clientY);
        if (pos) {
            setCurrentArrow(prev => prev ? { ...prev, endX: pos.x, endY: pos.y } : null);
        }
    }, [isDrawing, currentArrow, getFieldPosition]);

    const handleDrawEnd = useCallback(() => {
        if (!isDrawing || !currentArrow) {
            setIsDrawing(false);
            setCurrentArrow(null);
            return;
        }

        const dx = Math.abs((currentArrow.endX ?? 0) - (currentArrow.startX ?? 0));
        const dy = Math.abs((currentArrow.endY ?? 0) - (currentArrow.startY ?? 0));

        if ((dx > 2 || dy > 2) && onAddArrow) {
            onAddArrow({
                startX: currentArrow.startX!,
                startY: currentArrow.startY!,
                endX: currentArrow.endX!,
                endY: currentArrow.endY!,
                color: 'white'
            });
        }

        setIsDrawing(false);
        setCurrentArrow(null);
    }, [isDrawing, currentArrow, onAddArrow]);

    // === RECTANGLE DRAWING ===
    const handleRectStart = useCallback((clientX: number, clientY: number) => {
        if (mode !== 'rectangle') return;

        const pos = getFieldPosition(clientX, clientY);
        if (pos) {
            setIsDrawingRect(true);
            setCurrentRect({ startX: pos.x, startY: pos.y, endX: pos.x, endY: pos.y });
        }
    }, [mode, getFieldPosition]);

    const handleRectMove = useCallback((clientX: number, clientY: number) => {
        if (!isDrawingRect || !currentRect) return;

        const pos = getFieldPosition(clientX, clientY);
        if (pos) {
            setCurrentRect(prev => prev ? { ...prev, endX: pos.x, endY: pos.y } : null);
        }
    }, [isDrawingRect, currentRect, getFieldPosition]);

    const handleRectEnd = useCallback(() => {
        if (!isDrawingRect || !currentRect) {
            setIsDrawingRect(false);
            setCurrentRect(null);
            return;
        }

        const width = Math.abs((currentRect.endX ?? 0) - (currentRect.startX ?? 0));
        const height = Math.abs((currentRect.endY ?? 0) - (currentRect.startY ?? 0));

        // Only create rectangle if it has sufficient size
        if ((width > 3 || height > 3) && onAddRectangle) {
            onAddRectangle({
                startX: Math.min(currentRect.startX!, currentRect.endX!),
                startY: Math.min(currentRect.startY!, currentRect.endY!),
                endX: Math.max(currentRect.startX!, currentRect.endX!),
                endY: Math.max(currentRect.startY!, currentRect.endY!),
                color: rectangleColor,
                opacity: 0.3
            });
        }

        setIsDrawingRect(false);
        setCurrentRect(null);
    }, [isDrawingRect, currentRect, onAddRectangle, rectangleColor]);

    // Global listeners for rectangle drawing
    useEffect(() => {
        if (!isDrawingRect) return;

        const handleMove = (e: MouseEvent | TouchEvent) => {
            e.preventDefault();
            const coords = getEventCoords(e);
            if (coords) handleRectMove(coords.clientX, coords.clientY);
        };

        const handleEnd = () => {
            handleRectEnd();
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('touchend', handleEnd);

        return () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleEnd);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('touchend', handleEnd);
        };
    }, [isDrawingRect, handleRectMove, handleRectEnd]);

    // === ELEMENT DRAGGING (arrows and rectangles in move mode) ===
    const handleElementDragStart = useCallback((type: 'arrow' | 'rectangle', id: string, clientX: number, clientY: number) => {
        if (mode !== 'move' || isEraserMode) return;
        const pos = getFieldPosition(clientX, clientY);
        if (pos) {
            setDraggingElement({ type, id, startX: pos.x, startY: pos.y });
        }
    }, [mode, isEraserMode, getFieldPosition]);

    const handleElementDragMove = useCallback((clientX: number, clientY: number) => {
        if (!draggingElement) return;
        const pos = getFieldPosition(clientX, clientY);
        if (!pos) return;

        const deltaX = pos.x - draggingElement.startX;
        const deltaY = pos.y - draggingElement.startY;

        if (draggingElement.type === 'arrow' && onMoveArrow) {
            onMoveArrow(draggingElement.id, deltaX, deltaY);
        } else if (draggingElement.type === 'rectangle' && onMoveRectangle) {
            onMoveRectangle(draggingElement.id, deltaX, deltaY);
        }

        // Update start position for next delta calculation
        setDraggingElement({ ...draggingElement, startX: pos.x, startY: pos.y });
    }, [draggingElement, getFieldPosition, onMoveArrow, onMoveRectangle]);

    const handleElementDragEnd = useCallback(() => {
        setDraggingElement(null);
    }, []);

    // Global listeners for element dragging
    useEffect(() => {
        if (!draggingElement) return;

        const handleMove = (e: MouseEvent | TouchEvent) => {
            e.preventDefault();
            const coords = getEventCoords(e);
            if (coords) handleElementDragMove(coords.clientX, coords.clientY);
        };

        const handleEnd = () => {
            handleElementDragEnd();
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('touchend', handleEnd);

        return () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleEnd);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('touchend', handleEnd);
        };
    }, [draggingElement, handleElementDragMove, handleElementDragEnd]);

    // Global listeners for arrow drawing (to capture movement outside element)
    useEffect(() => {
        if (!isDrawing) return;

        const handleMove = (e: MouseEvent | TouchEvent) => {
            e.preventDefault();
            const coords = getEventCoords(e);
            if (coords) handleDrawMove(coords.clientX, coords.clientY);
        };

        const handleEnd = () => {
            handleDrawEnd();
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('touchend', handleEnd);

        return () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleEnd);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('touchend', handleEnd);
        };
    }, [isDrawing, handleDrawMove, handleDrawEnd]);

    // Field event handlers
    const handleFieldMouseDown = (e: React.MouseEvent) => {
        if (mode === 'draw') {
            e.preventDefault();
            handleDrawStart(e.clientX, e.clientY);
        } else if (mode === 'rectangle') {
            e.preventDefault();
            handleRectStart(e.clientX, e.clientY);
        }
    };

    const handleFieldTouchStart = (e: React.TouchEvent) => {
        const coords = getEventCoords(e);
        if (!coords) return;

        if (mode === 'draw') {
            e.preventDefault();
            handleDrawStart(coords.clientX, coords.clientY);
        } else if (mode === 'rectangle') {
            e.preventDefault();
            handleRectStart(coords.clientX, coords.clientY);
        }
    };

    // Calculate player size based on field width (responsive)
    const [fieldWidth, setFieldWidth] = useState(0);
    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                setFieldWidth(containerRef.current.offsetWidth);
            }
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    const playerSize = getPlayerSize(fieldWidth);
    const fontSizes = getFontSize(playerSize);



    // Double tap detection for touch
    const lastTapRef = useRef<{ time: number; playerId: number | null }>({ time: 0, playerId: null });

    const handlePlayerTouchEnd = (e: React.TouchEvent, player: Player) => {
        // Only handle tap if not dragging
        if (draggingPlayer) return;

        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;

        if (lastTapRef.current.playerId === player.id && now - lastTapRef.current.time < DOUBLE_TAP_DELAY) {
            // Double tap detected
            e.preventDefault();
            onPlayerDoubleClick?.(player);
            lastTapRef.current = { time: 0, playerId: null };
        } else {
            lastTapRef.current = { time: now, playerId: player.id };
        }
    };

    return (
        <div className="w-full h-full flex items-center justify-center p-2">
            <div
                ref={containerRef}
                className={`
                    relative 
                    bg-gradient-to-b from-field-green to-[#3d6a4d] 
                    rounded-lg shadow-2xl overflow-hidden select-none
                    ${mode === 'draw' || mode === 'rectangle' ? 'cursor-crosshair' : ''}
                    ${isEraserMode ? 'cursor-pointer' : ''}
                    ${mode === 'move' && !isEraserMode ? 'cursor-default' : ''}
                `}
                style={{
                    aspectRatio: orientation === 'vertical' ? '68 / 105' : '105 / 68',
                    width: '100%',
                    maxWidth: orientation === 'vertical' ? '450px' : '900px', // Allow wider for horizontal
                    touchAction: 'none' // CRITICAL: Prevents browser gestures during interaction
                }}
                onMouseDown={handleFieldMouseDown}
                onTouchStart={handleFieldTouchStart}
            >
                {/* Field Lines */}
                <FieldLines orientation={orientation} />

                {/* Arrows and Rectangles Layer - Using SVG */}
                {/* SVG itself has pointer-events: none to allow clicks to pass through to players */}
                {/* Individual elements (arrows/rectangles) have pointer-events: auto when interactive */}
                <svg
                    className={`absolute inset-0 w-full h-full overflow-visible ${(isEraserMode || mode === 'move') ? 'z-30' : 'z-10'}`}
                    style={{ pointerEvents: 'none' }}
                    preserveAspectRatio="none"
                >
                    {/* Arrow head marker definitions */}
                    <defs>
                        <marker
                            id="arrowhead"
                            markerWidth="10"
                            markerHeight="10"
                            refX="9"
                            refY="5"
                            orient="auto"
                            markerUnits="userSpaceOnUse"
                        >
                            <polygon points="0,0 10,5 0,10 2,5" fill="white" />
                        </marker>
                        <marker
                            id="arrowhead-temp"
                            markerWidth="10"
                            markerHeight="10"
                            refX="9"
                            refY="5"
                            orient="auto"
                            markerUnits="userSpaceOnUse"
                        >
                            <polygon points="0,0 10,5 0,10 2,5" fill="rgba(255,255,255,0.6)" />
                        </marker>
                    </defs>

                    {/* Saved arrows */}
                    {arrows.map(arrow => (
                        <line
                            key={arrow.id}
                            x1={`${arrow.startX}%`}
                            y1={`${arrow.startY}%`}
                            x2={`${arrow.endX}%`}
                            y2={`${arrow.endY}%`}
                            stroke="white"
                            strokeWidth={compact ? "1.5" : (isEraserMode ? "4" : "2")}
                            strokeDasharray="8,5"
                            strokeLinecap="round"
                            markerEnd="url(#arrowhead)"
                            opacity="0.85"
                            onClick={isEraserMode ? () => onRemoveArrow?.(arrow.id) : undefined}
                            style={{
                                cursor: isEraserMode ? 'pointer' : 'default',
                                pointerEvents: isEraserMode ? 'auto' : 'none' // readOnly is handled by parent container pointer-events-none? No, arrows usually ignore readOnly except for eraser. 
                            }}
                            className={isEraserMode ? 'hover:stroke-red-400 transition-colors' : ''}
                        />
                    ))}

                    {/* Saved rectangles */}
                    {rectangles.map(rect => (
                        <rect
                            key={rect.id}
                            x={`${rect.startX}%`}
                            y={`${rect.startY}%`}
                            width={`${rect.endX - rect.startX}%`}
                            height={`${rect.endY - rect.startY}%`}
                            fill={rect.color}
                            opacity={rect.opacity}
                            stroke={isEraserMode ? 'rgba(255,100,100,0.8)' : (mode === 'move' ? 'rgba(255,255,100,0.8)' : 'rgba(255,255,255,0.5)')}
                            strokeWidth={isEraserMode ? "3" : (mode === 'move' ? "2" : "1")}
                            rx="2"
                            onClick={isEraserMode ? () => onRemoveRectangle?.(rect.id) : undefined}
                            onMouseDown={mode === 'move' && !isEraserMode ? (e) => {
                                e.stopPropagation();
                                handleElementDragStart('rectangle', rect.id, e.clientX, e.clientY);
                            } : undefined}
                            style={{
                                cursor: isEraserMode ? 'pointer' : (mode === 'move' ? 'grab' : 'default'),
                                pointerEvents: (isEraserMode || mode === 'move') ? 'auto' : 'none'
                            }}
                            className={isEraserMode ? 'hover:opacity-60 transition-opacity' : ''}
                        />
                    ))}

                    {/* Arrow being drawn */}
                    {isDrawing && currentArrow && currentArrow.startX !== undefined && (
                        <line
                            x1={`${currentArrow.startX}%`}
                            y1={`${currentArrow.startY}%`}
                            x2={`${currentArrow.endX}%`}
                            y2={`${currentArrow.endY}%`}
                            stroke="white"
                            strokeWidth="2"
                            strokeDasharray="8,5"
                            strokeLinecap="round"
                            markerEnd="url(#arrowhead-temp)"
                            opacity="0.6"
                        />
                    )}

                    {/* Rectangle being drawn */}
                    {isDrawingRect && currentRect && currentRect.startX !== undefined && (
                        <rect
                            x={`${Math.min(currentRect.startX, currentRect.endX ?? 0)}%`}
                            y={`${Math.min(currentRect.startY!, currentRect.endY ?? 0)}%`}
                            width={`${Math.abs((currentRect.endX ?? 0) - (currentRect.startX ?? 0))}%`}
                            height={`${Math.abs((currentRect.endY ?? 0) - (currentRect.startY ?? 0))}%`}
                            fill={rectangleColor}
                            opacity="0.4"
                            stroke="rgba(255,255,255,0.7)"
                            strokeWidth="2"
                            strokeDasharray="5,5"
                            rx="2"
                        />
                    )}
                </svg>

                {/* Players Layer */}
                <div className="absolute inset-0 z-40 pointer-events-none">
                    {players.map(player => {
                        const isDragging = draggingPlayer?.id === player.id;
                        const position = isDragging && tempPosition ? tempPosition : player.position;

                        return (
                            <div
                                key={player.id}
                                className={`
                                    absolute select-none
                                    ${isDragging ? 'z-50' : 'z-10'}
                                    ${(mode === 'draw' || mode === 'rectangle' || readOnly) ? '' : 'cursor-grab active:cursor-grabbing pointer-events-auto'}
                                `}
                                style={{
                                    left: `${position.x}%`,
                                    top: `${position.y}%`,
                                    transform: 'translate(-50%, -50%)',
                                    touchAction: 'none'
                                }}
                                onMouseDown={(e) => !readOnly && handlePlayerMouseDown(e, player)}
                                onTouchStart={(e) => !readOnly && handlePlayerMouseDown(e, player)}
                                onTouchEnd={(e) => handlePlayerTouchEnd(e, player)}
                                onDoubleClick={() => !readOnly && onPlayerDoubleClick?.(player)}
                            >
                                <div
                                    className={`
                                        rounded-full 
                                        flex items-center justify-center text-gray-900 font-bold
                                        shadow-lg transition-transform duration-75
                                        ${isDragging ? 'scale-110 ring-2 ring-white' : (readOnly ? '' : 'hover:scale-105')}
                                        ${selectedPlayerId === player.id ? 'ring-2 ring-green-400' : ''}
                                    `}
                                    style={{
                                        width: compact ? 24 : playerSize,
                                        height: compact ? 24 : playerSize,
                                        fontSize: compact ? 10 : fontSizes.number,
                                        backgroundColor: player.color || playerColor
                                    }}
                                >
                                    {player.number}
                                </div>
                                <div
                                    className="text-white text-center mt-0.5 whitespace-nowrap font-medium drop-shadow-md pointer-events-none"
                                    style={{ fontSize: Math.max(8, fontSizes.name) }}
                                >
                                    {player.name}
                                </div>
                                {/* Note Indicator */}
                                {playerNotes[player.id] && (
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border border-white" />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default TacticalField;
