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
    return (
        <div className="flex items-center gap-4 flex-1 overflow-x-auto">
            {/* Single RESERVAS label */}
            <span className="text-gray-400 text-sm font-medium uppercase tracking-wide whitespace-nowrap">
                Reservas
            </span>

            {/* Players list */}
            <div className="flex items-center gap-3">
                {players.length > 0 ? (
                    players.map(player => (
                        <div
                            key={player.id}
                            onDoubleClick={(e) => {
                                e.stopPropagation();
                                onPlayerDoubleClick(player);
                            }}
                            onClick={() => onPromotePlayer(player)}
                            title={`${player.name} - Clique para promover, duplo clique para editar`}
                            className="flex flex-col items-center cursor-pointer group"
                        >
                            {/* Player circle - proportional to field players (w-9 instead of w-10) */}
                            <div className="w-9 h-9 rounded-full bg-gray-600 border-2 border-gray-500 flex items-center justify-center text-white font-bold text-sm group-hover:border-green-500 group-hover:bg-gray-500 group-hover:scale-105 transition-all shadow-sm">
                                {player.number}
                            </div>
                            {/* Player name */}
                            <span className="text-[10px] text-gray-400 mt-0.5 max-w-[40px] truncate text-center group-hover:text-white transition-colors">
                                {player.name.split(' ').pop()}
                            </span>
                        </div>
                    ))
                ) : (
                    <span className="text-gray-500 text-sm italic">Banco vazio</span>
                )}
            </div>
        </div>
    );
};

export default BenchArea;
