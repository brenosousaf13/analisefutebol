import React, { useState } from 'react';
import type { Player } from '../types/Player';

interface BenchAreaProps {
    players: Player[];
    team: 'home' | 'away';
    onPlayerDrop: (player: Player) => void;
    onPlayerDragStart: (player: Player) => void;
    onPlayerDragEnd?: () => void; // Optional if needed
    onPlayerDoubleClick: (player: Player) => void;
    onMoveToField: (player: Player) => void;
    externalDraggingPlayer?: Player | null; // From field
}

const BenchArea: React.FC<BenchAreaProps> = ({
    players,
    team: _team,
    onPlayerDrop,
    onPlayerDragStart,
    onPlayerDragEnd,
    onPlayerDoubleClick,
    onMoveToField,
    externalDraggingPlayer
}) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const benchRef = React.useRef<HTMLDivElement>(null);

    // --- External Drop Handler (Field -> Bench) ---
    React.useEffect(() => {
        if (!externalDraggingPlayer) {
            setIsDragOver(false);
            return;
        }

        const handleMouseMove = (e: MouseEvent | TouchEvent) => {
            if (!benchRef.current) return;

            const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

            const rect = benchRef.current.getBoundingClientRect();
            const isOver = clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
            setIsDragOver(isOver);
        };

        const handleMouseUp = (e: MouseEvent | TouchEvent) => {
            if (!benchRef.current) return;

            const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : (e as MouseEvent).clientX;
            const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : (e as MouseEvent).clientY;

            const rect = benchRef.current.getBoundingClientRect();
            const isOver = clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;

            if (isOver) {
                onPlayerDrop(externalDraggingPlayer);
            }
            setIsDragOver(false);
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
    }, [externalDraggingPlayer, onPlayerDrop]);

    // --- Internal Drag Handlers (Bench Reordering / Just Drag Start) ---
    const handlePlayerMouseDown = (e: React.MouseEvent, player: Player) => {
        if (e.button !== 0) return;
        e.preventDefault();
        onPlayerDragStart(player);

        // We need to listen for mouseup to trigger onPlayerDragEnd
        const handleGlobalMouseUp = () => {
            if (onPlayerDragEnd) onPlayerDragEnd();
            document.removeEventListener('mouseup', handleGlobalMouseUp);
        };
        document.addEventListener('mouseup', handleGlobalMouseUp);
    };

    return (
        <div
            ref={benchRef}
            // Removed DnD handlers
            className={`
        flex items-center gap-3 p-2 rounded-lg transition-all min-h-[60px] flex-1
        ${isDragOver
                    ? 'bg-amber-500/20 border-2 border-dashed border-amber-400'
                    : 'border-2 border-transparent'
                }
      `}
        >
            {/* Reserves List */}
            <div className="flex items-center gap-3 pb-1 overflow-x-auto w-full">
                {players.map(player => (
                    <div
                        key={player.id}
                        onMouseDown={(e) => handlePlayerMouseDown(e, player)}
                        onClick={() => onMoveToField(player)}
                        onDoubleClick={(e) => {
                            e.stopPropagation();
                            onPlayerDoubleClick(player);
                        }}
                        title={`${player.name} - Clique para mover ao campo, duplo clique para editar`}
                        className="flex flex-col items-center group cursor-pointer"
                    >
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-700 border-2 border-gray-500 flex items-center justify-center text-white font-bold group-hover:border-green-500 group-hover:bg-gray-600 transition-all shadow-sm">
                            {player.number}
                        </div>
                        <span className="text-[10px] text-gray-400 mt-0.5 max-w-[50px] truncate text-center group-hover:text-white transition-colors">
                            {player.name.split(' ').pop()}
                        </span>
                    </div>
                ))}

                {/* Drop Feedback */}
                {isDragOver && players.length === 0 && (
                    <div className="flex-1 flex items-center justify-center">
                        <span className="text-amber-400 text-sm font-medium animate-pulse whitespace-nowrap">
                            Solte aqui
                        </span>
                    </div>
                )}

                {/* Empty State */}
                {players.length === 0 && !isDragOver && (
                    <span className="text-xs text-gray-600 italic whitespace-nowrap">
                        Arraste titulares aqui
                    </span>
                )}
            </div>
        </div>
    );
};

export default BenchArea;
