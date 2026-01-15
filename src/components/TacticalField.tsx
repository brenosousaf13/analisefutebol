import React, { useState } from 'react';
import type { Player } from '../types/Player';
import type { Arrow } from '../types/Arrow';
import PlayerMarker from './PlayerMarker';
import { useFieldDimensions } from '../hooks/useFieldDimensions';
import { getPlayerSize, getFontSize } from '../utils/playerCoordinates';

interface TacticalFieldProps {
    players: Player[];
    onPlayerMove: (id: number, pos: { x: number, y: number }) => void;
    onPlayerClick?: (player: Player) => void;
    selectedPlayerId?: number | null;
    playerNotes?: { [key: number]: string };

    // New Props
    mode?: 'move' | 'draw';
    arrows?: Arrow[];
    onAddArrow?: (arrow: Omit<Arrow, 'id'>) => void;
    onRemoveArrow?: (id: string) => void;
}

const TacticalField: React.FC<TacticalFieldProps> = ({
    players,
    onPlayerMove,
    onPlayerClick,
    selectedPlayerId,
    playerNotes = {},
    mode = 'move',
    arrows = [],
    onAddArrow,
    onRemoveArrow
}) => {
    // Responsive Field Dimensions
    const { dimensions, containerRef } = useFieldDimensions(1.54);
    const { width: fieldWidth, height: fieldHeight } = dimensions;

    const playerSize = getPlayerSize(fieldWidth);
    const fontSize = getFontSize(playerSize);

    const [draggingId, setDraggingId] = useState<number | null>(null);

    // Drawing State
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentArrow, setCurrentArrow] = useState<Partial<Arrow> | null>(null);


    // --- Helpers ---
    const getFieldPercentage = (clientX: number, clientY: number) => {
        if (!containerRef.current) return { x: 0, y: 0 };
        const rect = containerRef.current.children[0].getBoundingClientRect(); // Use the inner field div
        return {
            x: ((clientX - rect.left) / rect.width) * 100,
            y: ((clientY - rect.top) / rect.height) * 100
        };
    };

    // --- Handlers ---

    // Drawing
    const handleDrawStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (mode !== 'draw') return;
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        const { x, y } = getFieldPercentage(clientX, clientY);
        setIsDrawing(true);
        setCurrentArrow({ startX: x, startY: y, endX: x, endY: y });
    };

    // Movement (Player + Drawing)
    const handleMove = (clientX: number, clientY: number) => {
        // Player Dragging
        if (mode === 'move' && draggingId !== null && containerRef.current) {
            const rect = containerRef.current.children[0].getBoundingClientRect(); // Use the inner field div
            // Calculate percentage directly
            const xPercent = ((clientX - rect.left) / rect.width) * 100;
            const yPercent = ((clientY - rect.top) / rect.height) * 100;

            // Clamp values (keeping players inside field with small margin)
            const newX = Math.max(0, Math.min(100, xPercent));
            const newY = Math.max(0, Math.min(100, yPercent));

            onPlayerMove(draggingId, { x: newX, y: newY });
        }

        // Drawing Arrow
        if (mode === 'draw' && isDrawing && currentArrow) {
            const { x, y } = getFieldPercentage(clientX, clientY);
            setCurrentArrow(prev => ({ ...prev, endX: x, endY: y }));
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => handleMove(e.clientX, e.clientY);
    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length > 0) handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    const handleUp = () => {
        // Finish Drawing
        if (mode === 'draw' && isDrawing && currentArrow && onAddArrow) {
            const dist = Math.sqrt(
                Math.pow((currentArrow.endX || 0) - (currentArrow.startX || 0), 2) +
                Math.pow((currentArrow.endY || 0) - (currentArrow.startY || 0), 2)
            );

            if (dist > 1) { // Min length check
                onAddArrow({
                    startX: currentArrow.startX!,
                    startY: currentArrow.startY!,
                    endX: currentArrow.endX!,
                    endY: currentArrow.endY!,
                    color: 'white' // default color
                });
            }
            setIsDrawing(false);
            setCurrentArrow(null);
        }

        setDraggingId(null);
    };

    return (
        <div
            ref={containerRef}
            className="w-full h-full flex items-center justify-center p-2 sm:p-4"
            onMouseUp={handleUp}
            onMouseLeave={handleUp}
            onTouchEnd={handleUp}
        >
            {/* The Field Container */}
            <div
                className={`
                    relative box-border
                    bg-gradient-to-b from-field-green to-[#3d6a4d] 
                    rounded-lg shadow-2xl border-4 border-[#3d6a4d] overflow-hidden select-none
                    ${mode === 'draw' ? 'cursor-crosshair' : 'cursor-default'}
                `}
                style={{
                    width: fieldWidth || '100%',
                    height: fieldHeight || 'auto',
                    // Only show field if dimensions are calculated, prevents jump
                    opacity: fieldWidth ? 1 : 0
                }}
                onMouseMove={handleMouseMove}
                onTouchMove={handleTouchMove}
                onMouseDown={mode === 'draw' ? handleDrawStart : undefined}
                onTouchStart={mode === 'draw' ? handleDrawStart : undefined}
            >
                {/* Field Markings MSG */}
                <svg
                    viewBox="0 0 68 105"
                    className="absolute inset-0 w-full h-full pointer-events-none opacity-40 z-0"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <rect x="0" y="0" width="68" height="105" fill="none" stroke="white" strokeWidth="0.5" />
                    <line x1="0" y1="52.5" x2="68" y2="52.5" stroke="white" strokeWidth="0.5" />
                    <circle cx="34" cy="52.5" r="9.15" fill="none" stroke="white" strokeWidth="0.5" />
                    <circle cx="34" cy="52.5" r="0.5" fill="white" />
                    <rect x="13.84" y="0" width="40.32" height="16.5" fill="none" stroke="white" strokeWidth="0.5" />
                    <rect x="24.84" y="0" width="18.32" height="5.5" fill="none" stroke="white" strokeWidth="0.5" />
                    <circle cx="34" cy="11" r="0.5" fill="white" />
                    <path d="M 26.5 16.5 A 9.15 9.15 0 0 0 41.5 16.5" fill="none" stroke="white" strokeWidth="0.5" />
                    <rect x="13.84" y="88.5" width="40.32" height="16.5" fill="none" stroke="white" strokeWidth="0.5" />
                    <rect x="24.84" y="99.5" width="18.32" height="5.5" fill="none" stroke="white" strokeWidth="0.5" />
                    <circle cx="34" cy="94" r="0.5" fill="white" />
                    <path d="M 26.5 88.5 A 9.15 9.15 0 0 1 41.5 88.5" fill="none" stroke="white" strokeWidth="0.5" />
                    <path d="M 0 2 A 2 2 0 0 0 2 0" fill="none" stroke="white" strokeWidth="0.5" />
                    <path d="M 66 0 A 2 2 0 0 0 68 2" fill="none" stroke="white" strokeWidth="0.5" />
                    <path d="M 68 103 A 2 2 0 0 0 66 105" fill="none" stroke="white" strokeWidth="0.5" />
                    <path d="M 2 105 A 2 2 0 0 0 0 103" fill="none" stroke="white" strokeWidth="0.5" />
                </svg>

                {/* Arrows Layer */}
                <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none">
                    <defs>
                        <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                            <polygon points="0 0, 6 2, 0 4" fill="white" fillOpacity="0.9" />
                        </marker>
                    </defs>
                    {arrows.map(arrow => (
                        <g
                            key={arrow.id}
                            onClick={mode === 'draw' ? (e) => { e.stopPropagation(); onRemoveArrow?.(arrow.id); } : undefined}
                            className={mode === 'draw' ? 'cursor-pointer pointer-events-auto hover:opacity-75' : ''}
                        >
                            {/* Hit Target for easier clicking */}
                            {mode === 'draw' && (<line x1={`${arrow.startX}%`} y1={`${arrow.startY}%`} x2={`${arrow.endX}%`} y2={`${arrow.endY}%`} stroke="transparent" strokeWidth="15" />)}
                            {/* Dashed line for movement arrows */}
                            <line
                                x1={`${arrow.startX}%`} y1={`${arrow.startY}%`}
                                x2={`${arrow.endX}%`} y2={`${arrow.endY}%`}
                                stroke="white" strokeWidth="3" strokeOpacity="0.9"
                                strokeDasharray="5,5"
                                markerEnd="url(#arrowhead)" strokeLinecap="round"
                            />
                        </g>
                    ))}
                    {/* Preview Arrow */}
                    {isDrawing && currentArrow && currentArrow.startX !== undefined && (
                        <line
                            x1={`${currentArrow.startX}%`} y1={`${currentArrow.startY}%`}
                            x2={`${currentArrow.endX}%`} y2={`${currentArrow.endY}%`}
                            stroke="white" strokeWidth="3" strokeOpacity="0.6"
                            strokeDasharray="5,5"
                            markerEnd="url(#arrowhead)"
                        />
                    )}
                </svg>

                {/* Players Layer */}
                <div className={`absolute inset-0 z-20 ${mode === 'draw' ? 'pointer-events-none' : ''}`}>
                    {players.map(player => (
                        <PlayerMarker
                            key={player.id}
                            player={player}
                            teamColor="yellow"
                            isDragging={draggingId === player.id}
                            onMouseDown={() => {
                                if (mode === 'move') {
                                    setDraggingId(player.id);
                                    if (onPlayerClick) onPlayerClick(player);
                                }
                            }}
                            hasNote={!!playerNotes[player.id]}
                            isSelected={selectedPlayerId === player.id}
                            playerSize={playerSize}
                            fontSize={fontSize}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TacticalField;
