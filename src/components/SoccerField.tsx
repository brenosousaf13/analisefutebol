import React, { useRef, useState } from 'react';

import type { Player } from '../types/Player';
import type { Arrow } from '../types/Arrow';
import PlayerMarker from './PlayerMarker';

interface SoccerFieldProps {
    title: string;
    teamName: string;
    players?: Player[];
    teamColor?: 'blue' | 'red';
    onPlayerMove?: (playerId: number, newPosition: { x: number, y: number }) => void;
    onPlayerClick?: (player: Player) => void;
    playerNotes?: Record<number, string>;
    mode?: 'move' | 'draw';
    arrows?: Arrow[];
    onAddArrow?: (arrow: Omit<Arrow, 'id'>) => void;
    onRemoveArrow?: (id: string) => void;
    substitutes?: Player[];
    onTransfer?: (
        from: 'field' | 'bench',
        to: 'field' | 'bench',
        playerId: number,
        position?: { x: number, y: number }
    ) => void;
    onAddPlayer?: () => void;
    onAddSubstitute?: () => void;
    onSwap?: (benchPlayerId: number, fieldPlayerId: number) => void;
}

const SoccerField: React.FC<SoccerFieldProps> = ({
    title,
    teamName,
    players = [],
    teamColor = 'blue',
    onPlayerMove,
    onPlayerClick,
    playerNotes = {},
    mode = 'move',
    arrows = [],
    onAddArrow,
    onRemoveArrow,
    substitutes = [],
    onTransfer,
    onAddPlayer,
    onAddSubstitute,
    onSwap
}) => {
    const fieldRef = useRef<HTMLDivElement>(null);
    const benchRef = useRef<HTMLDivElement>(null);
    const [draggingPlayerId, setDraggingPlayerId] = useState<number | null>(null);
    const [dragSource, setDragSource] = useState<'field' | 'bench' | null>(null);
    const dragStartPos = useRef<{ x: number, y: number } | null>(null);

    // Drawing State
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentArrow, setCurrentArrow] = useState<Partial<Arrow> | null>(null);

    // --- Player Drag Logic ---
    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, playerId: number, source: 'field' | 'bench') => {
        if (mode !== 'move') return;

        // Stop bubbling
        e.stopPropagation();
        setDraggingPlayerId(playerId);
        setDragSource(source);

        // Store start position
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        dragStartPos.current = { x: clientX, y: clientY };
    };

    // --- Drawing Logic ---
    const getFieldPercentage = (clientX: number, clientY: number) => {
        if (!fieldRef.current) return { x: 0, y: 0 };
        const rect = fieldRef.current.getBoundingClientRect();
        return {
            x: ((clientX - rect.left) / rect.width) * 100,
            y: ((clientY - rect.top) / rect.height) * 100
        };
    };

    const handleDrawStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (mode !== 'draw') return;

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        const { x, y } = getFieldPercentage(clientX, clientY);
        setIsDrawing(true);
        setCurrentArrow({ startX: x, startY: y, endX: x, endY: y });
    };

    const handleMove = (clientX: number, clientY: number) => {
        // Player Moving - Only visually update if dragging specifically within field boundaries for FIELD players
        // For cross-zone, we might want to carry a ghost image or just rely on cursor, 
        // but existing logic updates position via onPlayerMove.
        // IF dragging from Bench -> Field, we don't have a "position" in players array to update yet.
        // IF dragging from Field -> Field, we update onPlayerMove.

        if (mode === 'move' && draggingPlayerId !== null && fieldRef.current && onPlayerMove) {
            // Only live-update position if source is 'field'. 
            // Bench players don't have (x,y) to update until dropped.
            if (dragSource === 'field') {
                const fieldRect = fieldRef.current.getBoundingClientRect();
                const xPercent = ((clientX - fieldRect.left) / fieldRect.width) * 100;
                const yPercent = ((clientY - fieldRect.top) / fieldRect.height) * 100;

                // If outside field (dragging to bench), maybe we stop clamping or hide marker?
                // For now, let's keep it clamped so it stays inside field while dragging
                // UNLESS we want to visualize it leaving.
                // Given the implementation of PlayerMarker uses absolute positioning % inside field, 
                // we can't easily "drag it out" visually without changing parent.
                // Let's keep clamping for Field->Field, and handle "Drop on Bench" logic in handleUp.

                const newX = Math.max(2, Math.min(98, xPercent));
                const newY = Math.max(2, Math.min(98, yPercent));
                onPlayerMove(draggingPlayerId, { x: newX, y: newY });
            }
        }

        // Arrow Drawing
        if (mode === 'draw' && isDrawing && currentArrow) {
            const { x, y } = getFieldPercentage(clientX, clientY);
            setCurrentArrow(prev => ({ ...prev, endX: x, endY: y }));
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        handleMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length > 0) {
            handleMove(e.touches[0].clientX, e.touches[0].clientY);
        }
    };

    const handleUp = (e: React.MouseEvent | React.TouchEvent) => {
        // Finish Drawing
        if (mode === 'draw' && isDrawing && currentArrow && onAddArrow) {
            const dist = Math.sqrt(
                Math.pow((currentArrow.endX || 0) - (currentArrow.startX || 0), 2) +
                Math.pow((currentArrow.endY || 0) - (currentArrow.startY || 0), 2)
            );

            if (dist > 1) {
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
            return;
        }

        // Finish Player Drag
        if (mode === 'move' && draggingPlayerId !== null && onTransfer) {
            const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : (e as React.MouseEvent).clientX;
            const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : (e as React.MouseEvent).clientY;

            // Check where we dropped
            const isOverField = fieldRef.current?.getBoundingClientRect();
            const isOverBench = benchRef.current?.getBoundingClientRect();

            const droppedOnField = isOverField &&
                clientX >= isOverField.left && clientX <= isOverField.right &&
                clientY >= isOverField.top && clientY <= isOverField.bottom;

            const droppedOnBench = isOverBench &&
                clientX >= isOverBench.left && clientX <= isOverBench.right &&
                clientY >= isOverBench.top && clientY <= isOverBench.bottom;

            if (dragSource === 'bench' && droppedOnField) {
                // Check if dropped ON another player (Swap)
                const { x, y } = getFieldPercentage(clientX, clientY);

                // Find closest player
                const closestPlayer = players.find(p => {
                    const dx = Math.abs(p.position.x - x);
                    const dy = Math.abs(p.position.y - y);
                    return dx < 5 && dy < 5; // Tolerance 5%
                });

                if (closestPlayer && onSwap) {
                    onSwap(draggingPlayerId, closestPlayer.id);
                } else {
                    // Just move to field
                    onTransfer('bench', 'field', draggingPlayerId, { x, y });
                }

            } else if (dragSource === 'field' && droppedOnBench) {
                // Transfer Field -> Bench
                onTransfer('field', 'bench', draggingPlayerId);
            }

            // Handle Click (if didn't move much)
            if (dragStartPos.current) {
                const deltaX = Math.abs(clientX - dragStartPos.current.x);
                const deltaY = Math.abs(clientY - dragStartPos.current.y);
                if (deltaX < 5 && deltaY < 5 && onPlayerClick && dragSource === 'field') {
                    const player = players.find(p => p.id === draggingPlayerId) || substitutes.find(p => p.id === draggingPlayerId);
                    if (player) onPlayerClick(player);
                }
            }
        }

        setDraggingPlayerId(null);
        setDragSource(null);
        dragStartPos.current = null;
    };


    return (
        <div
            className="flex flex-col items-center w-full max-w-[500px] select-none"
            onMouseMove={handleMouseMove}
            onMouseUp={handleUp}
            onMouseLeave={handleUp}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleUp}
            onTouchCancel={handleUp}
        >
            <h2 className="text-xl font-bold text-gray-800 mb-2">{title}</h2>
            <div className={`text-sm font-semibold mb-4 px-3 py-1 rounded-full ${teamColor === 'blue' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                {teamName}
            </div>

            {/* FIELD */}
            <div
                ref={fieldRef}
                className={`relative w-full aspect-[2/3] bg-green-600 rounded-lg shadow-xl overflow-hidden border-4 border-white z-10 ${mode === 'draw' ? 'cursor-crosshair' : 'cursor-default'
                    }`}
                onMouseDown={mode === 'draw' ? handleDrawStart : undefined}
                onTouchStart={mode === 'draw' ? handleDrawStart : undefined}
            >
                {/* Field Markings & Arrows (SVG layers) - same as before */}
                <svg
                    viewBox="0 0 68 105"
                    className="absolute inset-0 w-full h-full z-0 pointer-events-none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <rect x="0" y="0" width="68" height="105" fill="none" stroke="white" strokeWidth="0.5" strokeOpacity="0.8" />
                    <line x1="0" y1="52.5" x2="68" y2="52.5" stroke="white" strokeWidth="0.5" strokeOpacity="0.8" />
                    <circle cx="34" cy="52.5" r="9.15" fill="none" stroke="white" strokeWidth="0.5" strokeOpacity="0.8" />
                    <circle cx="34" cy="52.5" r="0.5" fill="white" fillOpacity="0.8" />
                    <rect x="13.84" y="0" width="40.32" height="16.5" fill="none" stroke="white" strokeWidth="0.5" strokeOpacity="0.8" />
                    <rect x="24.84" y="0" width="18.32" height="5.5" fill="none" stroke="white" strokeWidth="0.5" strokeOpacity="0.8" />
                    <circle cx="34" cy="11" r="0.5" fill="white" fillOpacity="0.8" />
                    <path d="M 26.5 16.5 A 9.15 9.15 0 0 0 41.5 16.5" fill="none" stroke="white" strokeWidth="0.5" strokeOpacity="0.8" />
                    <rect x="13.84" y="88.5" width="40.32" height="16.5" fill="none" stroke="white" strokeWidth="0.5" strokeOpacity="0.8" />
                    <rect x="24.84" y="99.5" width="18.32" height="5.5" fill="none" stroke="white" strokeWidth="0.5" strokeOpacity="0.8" />
                    <circle cx="34" cy="94" r="0.5" fill="white" fillOpacity="0.8" />
                    <path d="M 26.5 88.5 A 9.15 9.15 0 0 1 41.5 88.5" fill="none" stroke="white" strokeWidth="0.5" strokeOpacity="0.8" />
                    <path d="M 0 2 A 2 2 0 0 0 2 0" fill="none" stroke="white" strokeWidth="0.5" strokeOpacity="0.8" />
                    <path d="M 66 0 A 2 2 0 0 0 68 2" fill="none" stroke="white" strokeWidth="0.5" strokeOpacity="0.8" />
                    <path d="M 68 103 A 2 2 0 0 0 66 105" fill="none" stroke="white" strokeWidth="0.5" strokeOpacity="0.8" />
                    <path d="M 2 105 A 2 2 0 0 0 0 103" fill="none" stroke="white" strokeWidth="0.5" strokeOpacity="0.8" />
                </svg>

                {/* Arrows Layer */}
                <svg className="absolute inset-0 w-full h-full z-20 pointer-events-none">
                    <defs>
                        <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                            <polygon points="0 0, 6 2, 0 4" fill="white" fillOpacity="0.9" />
                        </marker>
                    </defs>
                    {arrows.map(arrow => (
                        <g key={arrow.id} onClick={mode === 'draw' ? (e) => { e.stopPropagation(); onRemoveArrow?.(arrow.id); } : undefined} className={mode === 'draw' ? 'cursor-pointer pointer-events-auto hover:opacity-75' : ''}>
                            {mode === 'draw' && (<line x1={`${arrow.startX}%`} y1={`${arrow.startY}%`} x2={`${arrow.endX}%`} y2={`${arrow.endY}%`} stroke="transparent" strokeWidth="15" />)}
                            <line x1={`${arrow.startX}%`} y1={`${arrow.startY}%`} x2={`${arrow.endX}%`} y2={`${arrow.endY}%`} stroke="white" strokeWidth="3" strokeOpacity="0.9" markerEnd="url(#arrowhead)" strokeLinecap="round" />
                        </g>
                    ))}
                    {isDrawing && currentArrow && currentArrow.startX !== undefined && (
                        <line x1={`${currentArrow.startX}%`} y1={`${currentArrow.startY}%`} x2={`${currentArrow.endX}%`} y2={`${currentArrow.endY}%`} stroke="white" strokeWidth="3" strokeOpacity="0.6" strokeDasharray="5,5" markerEnd="url(#arrowhead)" />
                    )}
                </svg>

                {/* Players Layer */}
                <div className={`absolute inset-0 z-10 ${mode === 'draw' ? 'pointer-events-none' : ''}`}>
                    {players.map((player) => (
                        <PlayerMarker
                            key={player.id}
                            player={player}
                            teamColor={teamColor}
                            isDragging={draggingPlayerId === player.id}
                            onMouseDown={(e) => handleMouseDown(e, player.id, 'field')}
                            hasNote={!!playerNotes[player.id]}
                        />
                    ))}
                </div>

                {/* Add Player (Field) Overlay - only if empty */}
                {players.length === 0 && onAddPlayer && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <button
                            onClick={(e) => { e.stopPropagation(); onAddPlayer(); }}
                            className="pointer-events-auto bg-white/90 hover:bg-white text-gray-800 px-4 py-2 rounded-full shadow-lg font-medium text-sm transition-all transform hover:scale-105"
                        >
                            + Adicionar Jogador
                        </button>
                    </div>
                )}
            </div>

            {/* RESERVE BENCH */}
            <div
                ref={benchRef}
                className={`mt-4 w-full bg-gray-100 rounded-lg border border-gray-200 p-2 flex flex-col transition-colors
                    ${dragSource === 'field' ? 'ring-2 ring-blue-400 bg-blue-50' : ''}
                `}
                style={{ minHeight: '80px' }}
            >
                <div className="flex justify-between items-center mb-2 px-1">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Reservas ({substitutes.length})
                    </span>
                    {onAddSubstitute && (
                        <button
                            onClick={onAddSubstitute}
                            className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded transition-colors"
                        >
                            + Add
                        </button>
                    )}
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 min-h-[40px] items-center custom-scrollbar">
                    {substitutes.length === 0 && (
                        <div className="text-xs text-center w-full text-gray-400 italic py-2">
                            Banco vazio
                        </div>
                    )}
                    {substitutes.map(sub => (
                        <div
                            key={sub.id}
                            className="flex-shrink-0 cursor-grab active:cursor-grabbing transition-transform hover:-translate-y-1"
                            onMouseDown={(e) => handleMouseDown(e, sub.id, 'bench')}
                        >
                            {/* Reusing PlayerMarker style but static/smaller */}
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm
                                    ${teamColor === 'blue'
                                        ? 'bg-blue-600 border-2 border-white'
                                        : 'bg-red-600 border-2 border-white'
                                    }
                                    ${draggingPlayerId === sub.id ? 'opacity-50' : ''}
                                `}
                            >
                                {sub.number}
                            </div>
                            <div className="text-[10px] text-gray-600 text-center mt-1 w-12 truncate leading-tight">
                                {sub.name.split(' ').pop()}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SoccerField;

