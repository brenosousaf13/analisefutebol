import React from 'react';
import type { Player } from '../types/Player';

interface BenchAreaProps {
    players: Player[];
    team: 'home' | 'away';
    onPromotePlayer: (player: Player) => void;
    onPlayerDoubleClick: (player: Player) => void;
}

const BenchArea: React.FC<BenchAreaProps> = ({
    players,
    team: _team,
    onPromotePlayer,
    onPlayerDoubleClick
}) => {
    // DnD Logic Removed
    // No drag handlers or effects needed


    return (
        <div
            // ref={benchRef} // Not needed
            className="flex items-center gap-3 p-4 rounded-lg bg-gray-800/50 min-h-[60px] flex-1"
        >
            <span className="text-gray-400 text-sm font-medium mr-2">RESERVAS</span>

            {/* Reserves List */}
            <div className="flex items-center gap-3 pb-1 overflow-x-auto w-full">
                {players.map(player => (
                    <div
                        key={player.id}
                        className="group relative"
                    >
                        {/* Player Circle */}
                        <div
                            onDoubleClick={(e) => {
                                e.stopPropagation();
                                onPlayerDoubleClick(player);
                            }}
                            title={`${player.name} - Duplo clique para editar`}
                            className="flex flex-col items-center cursor-pointer"
                        >
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-700 border-2 border-gray-500 flex items-center justify-center text-white font-bold group-hover:border-green-500 group-hover:bg-gray-600 transition-all shadow-sm">
                                {player.number}
                            </div>
                            <span className="text-[10px] text-gray-400 mt-0.5 max-w-[50px] truncate text-center group-hover:text-white transition-colors">
                                {player.name.split(' ').pop()}
                            </span>
                        </div>

                        {/* Promote Button (Hover) */}
                        <button
                            onClick={() => onPromotePlayer(player)}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-green-600 rounded-full text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-green-500 shadow-sm z-10"
                            title="Colocar em campo"
                        >
                            ↑
                        </button>
                    </div>
                ))}

                {/* Empty State */}
                {players.length === 0 && (
                    <span className="text-xs text-gray-600 italic whitespace-nowrap">
                        Banco vazio
                    </span>
                )}
            </div>
        </div>
    );
};

export default BenchArea;
