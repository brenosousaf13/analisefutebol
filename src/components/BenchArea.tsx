import React from 'react';
import type { Player } from '../types/Player';

interface BenchAreaProps {
    players: Player[];
    team: 'home' | 'away';
    onPromotePlayer: (player: Player) => void;
    onPlayerDoubleClick: (player: Player) => void;
    orientation?: 'horizontal' | 'vertical';
}

const BenchArea: React.FC<BenchAreaProps> = ({
    players,
    team: _team,
    onPromotePlayer,
    onPlayerDoubleClick,
    orientation = 'horizontal'
}) => {
    return (
        <div className={`flex ${orientation === 'vertical' ? 'flex-col h-full w-full' : 'flex-row items-center w-full px-2'} ${orientation === 'vertical' ? 'gap-2' : 'gap-6'} overflow-auto scrollbar-hide`}>
            {/* Single RESERVAS label */}
            <div className={`flex items-center justify-center ${orientation === 'vertical' ? 'w-full border-b border-gray-700 pb-2 mb-1' : 'border-r border-gray-700 pr-6 h-full'}`}>
                <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                    Reservas
                </span>
            </div>

            {/* Players list */}
            <div className={`flex ${orientation === 'vertical' ? 'flex-col w-full items-center gap-2' : 'flex-row items-center gap-3 w-full'}`}>
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
                            className="flex flex-col items-center cursor-pointer group shrink-0"
                        >
                            {/* Player circle - Responsive size */}
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-600 border-2 border-gray-500 flex items-center justify-center text-white font-bold text-xs md:text-sm group-hover:border-green-500 group-hover:bg-gray-500 group-hover:scale-110 transition-all shadow-md">
                                {player.number}
                            </div>
                            {/* Player name */}
                            <span className="text-[9px] md:text-[10px] text-gray-400 mt-1 max-w-[50px] truncate text-center group-hover:text-white transition-colors font-medium">
                                {player.name.split(' ').pop()}
                            </span>
                        </div>
                    ))
                ) : (
                    <span className="text-gray-500 text-sm italic w-full text-center">Banco vazio</span>
                )}
            </div>
        </div>
    );
};

export default BenchArea;
