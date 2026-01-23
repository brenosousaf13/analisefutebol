import React from 'react';
import type { Player } from '../types/Player';

interface BenchAreaProps {
    players: Player[];
    team: 'home' | 'away';
    onPromotePlayer: (player: Player) => void;
    onPlayerDoubleClick: (player: Player) => void;
    orientation?: 'horizontal' | 'vertical';
    align?: 'left' | 'center' | 'right';
}

const BenchArea: React.FC<BenchAreaProps> = ({
    players,
    team: _team,
    onPromotePlayer,
    onPlayerDoubleClick,
    orientation = 'horizontal',
    align = 'center'
}) => {
    return (
        <div className={`flex ${orientation === 'vertical' ? 'flex-col h-full w-full' : 'flex-row items-center w-full px-2'} ${orientation === 'vertical' ? 'gap-2' : 'gap-6'} overflow-auto scrollbar-hide`}>
            {/* Single RESERVAS label */}
            <div className={`flex items-center justify-center ${orientation === 'vertical' ? 'w-full border-b border-gray-700 pb-2 mb-1 shrink-0' : 'border-r border-gray-700 pr-6 h-full'}`}>
                <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                    Reservas
                </span>
            </div>

            {/* Players list */}
            <div className={`flex ${orientation === 'vertical' ? 'flex-col w-full gap-1' : 'flex-row items-center gap-3 w-full'}`}>
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
                            className={`
                                flex items-center cursor-pointer group shrink-0 hover:bg-white/5 rounded px-2 py-1 transition-colors
                                ${orientation === 'vertical'
                                    ? `w-full gap-3 ${align === 'right' ? 'flex-row-reverse text-right' : 'flex-row text-left'}`
                                    : 'flex-col items-center'
                                }
                            `}
                        >
                            {/* Player circle - Responsive size */}
                            <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center text-gray-300 font-bold text-xs group-hover:border-white group-hover:text-white transition-all">
                                {player.number}
                            </div>

                            {/* Player name */}
                            <span className={`text-sm text-gray-400 group-hover:text-white font-medium truncate ${orientation === 'horizontal' ? 'max-w-[50px] text-[10px]' : 'flex-1'}`}>
                                {orientation === 'horizontal' ? player.name.split(' ').pop() : player.name}
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
