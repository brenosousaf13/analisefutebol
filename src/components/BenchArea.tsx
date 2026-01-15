import React, { useState } from 'react';
import type { Player } from '../types/Player';

interface BenchAreaProps {
    players: Player[];
    team: 'home' | 'away';
    onPlayerDrop: (player: Player) => void;
    onPlayerDragStart: (player: Player) => void;
    onPlayerDoubleClick: (player: Player) => void;
    onMoveToField: (player: Player) => void; // New prop for click interaction
}

const BenchArea: React.FC<BenchAreaProps> = ({
    players,
    team,
    onPlayerDrop,
    onPlayerDragStart,
    onPlayerDoubleClick,
    onMoveToField
}) => {
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // ESSENTIAL to allow drop
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        const playerData = e.dataTransfer.getData('player');
        const sourceTeam = e.dataTransfer.getData('team');
        const source = e.dataTransfer.getData('source'); // 'field' or 'bench'

        // Only accept players from the same team
        if (playerData && sourceTeam === team) {
            const player = JSON.parse(playerData);

            // Accept from 'field' mainly, but 'bench' could be used for reordering if implemented
            if (source === 'field') {
                onPlayerDrop(player);
            }
        }
    };

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
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
                        draggable
                        onDragStart={(e) => {
                            e.dataTransfer.setData('player', JSON.stringify(player));
                            e.dataTransfer.setData('source', 'bench');
                            e.dataTransfer.setData('team', team);
                            onPlayerDragStart(player);
                        }}
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
