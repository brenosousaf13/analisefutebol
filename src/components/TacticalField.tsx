import React, { useState, useRef, useEffect } from 'react';
import type { Player } from '../types/Player';
import type { Arrow } from '../types/Arrow';
import { getPlayerSize, getFontSize } from '../utils/playerCoordinates';

interface TacticalFieldProps {
    players: Player[];
    onPlayerMove: (id: number, pos: { x: number, y: number }) => void;
    onPlayerClick?: (player: Player) => void;
    onPlayerDoubleClick?: (player: Player) => void;
    selectedPlayerId?: number | null;
    playerNotes?: { [key: number]: string };
    mode?: 'move' | 'draw';
    arrows?: Arrow[];
    onAddArrow?: (arrow: Omit<Arrow, 'id'>) => void;
    onRemoveArrow?: (id: string) => void;
}

// Field Lines Component - Using CSS for reliability
const FieldLines: React.FC = () => (
    <div className="absolute inset-0 pointer-events-none">
        {/* Outer Border */}
        <div className="absolute inset-[3%] border-2 border-white/40 rounded-sm" />

        {/* Center Line */}
        <div className="absolute left-[3%] right-[3%] top-1/2 h-0.5 bg-white/40 -translate-y-1/2" />

        {/* Center Circle */}
        <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-2 border-white/40 rounded-full"
            style={{ width: '20%', height: '13%' }}
        />

        {/* Center Dot */}
        <div className="absolute left-1/2 top-1/2 w-1.5 h-1.5 bg-white/40 rounded-full -translate-x-1/2 -translate-y-1/2" />

        {/* Top Penalty Area */}
        <div
            className="absolute left-1/2 -translate-x-1/2 border-2 border-white/40 border-t-0"
            style={{ top: '3%', width: '60%', height: '15%' }}
        />

        {/* Top Goal Area */}
        <div
            className="absolute left-1/2 -translate-x-1/2 border-2 border-white/40 border-t-0"
            style={{ top: '3%', width: '30%', height: '6%' }}
        />

        {/* Bottom Penalty Area */}
        <div
            className="absolute left-1/2 -translate-x-1/2 border-2 border-white/40 border-b-0"
            style={{ bottom: '3%', width: '60%', height: '15%' }}
        />

        {/* Bottom Goal Area */}
        <div
            className="absolute left-1/2 -translate-x-1/2 border-2 border-white/40 border-b-0"
            style={{ bottom: '3%', width: '30%', height: '6%' }}
        />
    </div>
);

// Arrow Component - Using CSS for exact rendering
const ArrowLine: React.FC<{
    arrow: Arrow;
    isTemp?: boolean;
    onRemove?: () => void;
    isDrawMode?: boolean;
}> = ({ arrow, isTemp = false, onRemove, isDrawMode }) => {
    const { startX, startY, endX, endY } = arrow;

    // Calculate length and angle
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    if (length < 1) return null;

    return (
        <div
            className={`absolute origin-left ${isDrawMode && !isTemp ? 'cursor-pointer hover:opacity-70' : ''}`}
            style={{
                left: `${startX}%`,
                top: `${startY}%`,
                width: `${length}%`,
                height: '2px',
                transform: `rotate(${angle}deg)`,
                transformOrigin: '0 50%',
                opacity: isTemp ? 0.6 : 0.9,
                zIndex: isTemp ? 15 : 10
            }}
            onClick={isDrawMode && !isTemp ? (e) => { e.stopPropagation(); onRemove?.(); } : undefined}
        >
            {/* Dashed Line */}
            <div
                className="absolute inset-0"
                style={{
                    background: 'repeating-linear-gradient(90deg, white 0px, white 6px, transparent 6px, transparent 10px)'
                }}
            />
            {/* Arrow Head */}
            <div
                className="absolute right-0 top-1/2 -translate-y-1/2"
                style={{
                    width: 0,
                    height: 0,
                    borderTop: '5px solid transparent',
                    borderBottom: '5px solid transparent',
                    borderLeft: '8px solid white'
                }}
            />
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
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [draggingPlayer, setDraggingPlayer] = useState<Player | null>(null);
    const [tempPosition, setTempPosition] = useState<{ x: number; y: number } | null>(null);

    // Drawing State
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentArrow, setCurrentArrow] = useState<Partial<Arrow> | null>(null);

    // Get field position as percentage
    const getFieldPosition = (clientX: number, clientY: number) => {
        if (!containerRef.current) return null;
        const rect = containerRef.current.getBoundingClientRect();
        return {
            x: ((clientX - rect.left) / rect.width) * 100,
            y: ((clientY - rect.top) / rect.height) * 100
        };
    };

    // Player Mouse Down
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

        const handleMouseMove = (e: MouseEvent | TouchEvent) => {
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
            const pos = getFieldPosition(clientX, clientY);
            if (pos) {
                // Clamp within 3-97% to keep player visible
                setTempPosition({
                    x: Math.max(3, Math.min(97, pos.x)),
                    y: Math.max(3, Math.min(97, pos.y))
                });
            }
        };

        const handleMouseUp = (e: MouseEvent | TouchEvent) => {
            const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : (e as MouseEvent).clientX;
            const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : (e as MouseEvent).clientY;
            const pos = getFieldPosition(clientX, clientY);

            if (pos && draggingPlayer) {
                onPlayerMove(draggingPlayer.id, {
                    x: Math.max(3, Math.min(97, pos.x)),
                    y: Math.max(3, Math.min(97, pos.y))
                });
            }

            setDraggingPlayer(null);
            setTempPosition(null);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('touchmove', handleMouseMove);
        document.addEventListener('touchend', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchmove', handleMouseMove);
            document.removeEventListener('touchend', handleMouseUp);
        };
    }, [draggingPlayer, onPlayerMove]);

    // Drawing Handlers
    const handleFieldMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        if (mode !== 'draw') return;

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const pos = getFieldPosition(clientX, clientY);

        if (pos) {
            setIsDrawing(true);
            setCurrentArrow({ startX: pos.x, startY: pos.y, endX: pos.x, endY: pos.y });
        }
    };

    const handleFieldMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (mode !== 'draw' || !isDrawing || !currentArrow) return;

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const pos = getFieldPosition(clientX, clientY);

        if (pos) {
            setCurrentArrow(prev => prev ? { ...prev, endX: pos.x, endY: pos.y } : null);
        }
    };

    const handleFieldMouseUp = () => {
        if (mode !== 'draw' || !isDrawing || !currentArrow) return;

        const dx = (currentArrow.endX ?? 0) - (currentArrow.startX ?? 0);
        const dy = (currentArrow.endY ?? 0) - (currentArrow.startY ?? 0);
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 2 && onAddArrow) {
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

    return (
        <div className="w-full h-full flex items-center justify-center p-2">
            <div
                ref={containerRef}
                className={`
                    relative 
                    bg-gradient-to-b from-field-green to-[#3d6a4d] 
                    rounded-lg shadow-2xl overflow-hidden select-none
                    ${mode === 'draw' ? 'cursor-crosshair' : 'cursor-default'}
                `}
                style={{
                    aspectRatio: '68 / 105',
                    width: '100%',
                    maxWidth: '450px'
                }}
                onMouseDown={handleFieldMouseDown}
                onMouseMove={handleFieldMouseMove}
                onMouseUp={handleFieldMouseUp}
                onMouseLeave={handleFieldMouseUp}
                onTouchStart={handleFieldMouseDown}
                onTouchMove={handleFieldMouseMove}
                onTouchEnd={handleFieldMouseUp}
            >
                {/* Field Lines */}
                <FieldLines />

                {/* Arrows Layer */}
                <div className="absolute inset-0 z-10 pointer-events-none">
                    {arrows.map(arrow => (
                        <ArrowLine
                            key={arrow.id}
                            arrow={arrow}
                            onRemove={() => onRemoveArrow?.(arrow.id)}
                            isDrawMode={mode === 'draw'}
                        />
                    ))}
                    {isDrawing && currentArrow && currentArrow.startX !== undefined && (
                        <ArrowLine
                            arrow={currentArrow as Arrow}
                            isTemp
                        />
                    )}
                </div>

                {/* Players Layer */}
                <div className={`absolute inset-0 z-20 ${mode === 'draw' ? 'pointer-events-none' : ''}`}>
                    {players.map(player => {
                        const isDragging = draggingPlayer?.id === player.id;
                        const position = isDragging && tempPosition ? tempPosition : player.position;

                        return (
                            <div
                                key={player.id}
                                className={`
                                    absolute select-none
                                    ${isDragging ? 'z-50' : 'z-10'}
                                    ${mode === 'draw' ? '' : 'cursor-grab active:cursor-grabbing'}
                                `}
                                style={{
                                    left: `${position.x}%`,
                                    top: `${position.y}%`,
                                    transform: 'translate(-50%, -50%)'
                                }}
                                onMouseDown={(e) => handlePlayerMouseDown(e, player)}
                                onTouchStart={(e) => handlePlayerMouseDown(e, player)}
                                onDoubleClick={() => onPlayerDoubleClick?.(player)}
                            >
                                <div
                                    className={`
                                        rounded-full bg-accent-yellow 
                                        flex items-center justify-center text-gray-900 font-bold
                                        shadow-lg transition-transform duration-75
                                        ${isDragging ? 'scale-110 ring-2 ring-white' : 'hover:scale-105'}
                                        ${selectedPlayerId === player.id ? 'ring-2 ring-green-400' : ''}
                                    `}
                                    style={{
                                        width: playerSize,
                                        height: playerSize,
                                        fontSize: fontSizes.number
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
