import React, { useState } from 'react';
import { Search, ChevronRight, ChevronLeft, ChevronUp } from 'lucide-react';
import type { Player } from '../types/Player';

interface BenchAreaProps {
    players: Player[];
    team: 'home' | 'away';
    onPromotePlayer: (player: Player) => void;
    onPlayerDoubleClick: (player: Player) => void;
    orientation?: 'horizontal' | 'vertical';
    align?: 'left' | 'center' | 'right';
    teamColor?: string;
    teamBgColor?: string;
}

const BenchArea: React.FC<BenchAreaProps> = ({
    players,
    team,
    onPromotePlayer,
    onPlayerDoubleClick,
    orientation = 'horizontal',
    align = 'center',
    teamColor,
    teamBgColor = '#090909'
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredPlayers = players.filter(player =>
        player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.number.toString().includes(searchTerm)
    );

    return (
        <div className={`flex ${orientation === 'vertical' ? 'flex-col h-full w-full' : 'flex-row items-center w-full px-2'} ${orientation === 'vertical' ? 'gap-2' : 'gap-6'} overflow-auto scrollbar-hide`}>
            {/* Single RESERVAS label */}
            <div className={`flex flex-col items-center justify-center ${orientation === 'vertical' ? 'w-full border-b border-gray-700 pb-2 mb-1 shrink-0' : 'border-r border-gray-700 pr-6 h-full'}`}>
                <span className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">
                    Reservas
                </span>

                {orientation === 'vertical' && (
                    <div className="w-full px-2 mt-2">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded text-xs text-gray-200 pl-7 pr-2 py-1 focus:outline-none focus:border-gray-500 placeholder:text-gray-600 transition-colors"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Players list */}
            <div className={`flex ${orientation === 'vertical' ? 'flex-col w-full gap-1' : 'flex-row items-center gap-3 w-full'}`}>
                {filteredPlayers.length > 0 ? (
                    filteredPlayers.map(player => (
                        <div
                            key={player.id}
                            className={`
                                flex items-center justify-between group rounded transition-colors pr-1
                                ${orientation === 'vertical'
                                    ? `w-full gap-2 ${align === 'right' ? 'flex-row-reverse pl-1 pr-0' : ''}`
                                    : 'flex-col items-center gap-1'
                                }
                            `}
                        >
                            {/* Player Info (Name/Number) */}
                            <div
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onPlayerDoubleClick(player);
                                }}
                                className={`flex items-center cursor-pointer hover:bg-white/5 rounded px-2 py-1 flex-1 gap-3 ${orientation === 'vertical' && align === 'right' ? 'flex-row-reverse' : ''}`}
                                title={`${player.name} - Clique para editar`}
                            >
                                {/* Player circle - Responsive size */}
                                <div
                                    className="w-[27px] h-[27px] rounded-full flex items-center justify-center font-bold text-[10px] group-hover:scale-110 transition-transform shrink-0 drop-shadow-md bg-[#090909]"
                                    style={{
                                        backgroundColor: player.backgroundColor || teamBgColor,
                                        color: player.borderColor || player.color || teamColor || '#9CA3AF',
                                        border: `2px solid ${player.borderColor || player.color || teamColor || '#4B5563'}`
                                    }}
                                >
                                    {player.number}
                                </div>

                                {/* Player name */}
                                <span className={`text-xs text-gray-400 group-hover:text-white font-medium truncate ${orientation === 'horizontal' ? 'max-w-[50px] text-[9px]' : 'flex-1'} ${orientation === 'vertical' && align === 'right' ? 'text-right' : 'text-left'}`}>
                                    {orientation === 'horizontal' ? player.name.split(' ').pop() : player.name}
                                </span>
                            </div>

                            {/* Promote Button (Arrow) */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onPromotePlayer(player);
                                }}
                                title="Mover para o campo"
                                className="p-1.5 text-gray-500 hover:text-accent-green hover:bg-white/10 rounded-full transition-colors cursor-pointer shrink-0"
                            >
                                {orientation === 'horizontal' ? (
                                    <ChevronUp className="w-4 h-4" />
                                ) : team === 'away' || align === 'right' ? (
                                    <ChevronLeft className="w-4 h-4" />
                                ) : (
                                    <ChevronRight className="w-4 h-4" />
                                )}
                            </button>
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
