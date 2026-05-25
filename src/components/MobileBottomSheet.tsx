import { useState, useEffect } from 'react';
import type { Player } from '../types/Player';
import BenchArea from './BenchArea';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface MobileBottomSheetProps {
    homeTeamName: string;
    awayTeamName: string;
    homeTeamColor: string;
    awayTeamColor: string;
    homeSubstitutes: Player[];
    awaySubstitutes: Player[];
    activePossession: 'home' | 'away';
    onBenchPlayerClick: (player: Player, team: 'home' | 'away') => void;
    onPlayerDoubleClick: (player: Player) => void;
    readOnly?: boolean;
}

export default function MobileBottomSheet({
    homeTeamName,
    awayTeamName,
    homeTeamColor,
    awayTeamColor,
    homeSubstitutes,
    awaySubstitutes,
    activePossession,
    onBenchPlayerClick,
    onPlayerDoubleClick,
    readOnly = false,
}: MobileBottomSheetProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState<'home' | 'away'>(activePossession);

    useEffect(() => {
        setActiveTab(activePossession);
    }, [activePossession]);

    const tabs = [
        { key: 'home' as const, name: homeTeamName, color: homeTeamColor, players: homeSubstitutes },
        { key: 'away' as const, name: awayTeamName, color: awayTeamColor, players: awaySubstitutes },
    ];

    const activeData = tabs.find(t => t.key === activeTab)!;

    return (
        <div className={`shrink-0 flex flex-col bg-[#0a1010] border-t border-gray-700/60 transition-all duration-300 ease-out overflow-hidden ${isExpanded ? 'h-[42%]' : 'h-11'}`}>
            {/* Header row — always visible, tap to expand/collapse */}
            <div
                className="flex items-center gap-3 px-3 h-11 shrink-0 cursor-pointer select-none"
                onClick={() => setIsExpanded(v => !v)}
            >
                <div className="flex bg-gray-800/80 rounded-lg p-0.5 gap-0.5">
                    {tabs.map(({ key, name, color }) => (
                        <button
                            key={key}
                            onClick={(e) => { e.stopPropagation(); setActiveTab(key); }}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${activeTab === key ? 'text-white shadow' : 'text-gray-500'}`}
                            style={activeTab === key ? { backgroundColor: color } : {}}
                        >
                            {name}
                        </button>
                    ))}
                </div>

                <span className="text-[11px] text-gray-500 ml-auto">
                    {activeData.players.length} reservas
                </span>
                <div className="text-gray-500">
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </div>
            </div>

            {/* Bench content — only mounted when expanded */}
            {isExpanded && (
                <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-1">
                    <BenchArea
                        players={activeData.players}
                        team={activeData.key}
                        teamColor={activeData.color}
                        orientation="vertical"
                        onPromotePlayer={readOnly ? () => {} : (p) => onBenchPlayerClick(p, activeData.key)}
                        onPlayerDoubleClick={onPlayerDoubleClick}
                    />
                </div>
            )}
        </div>
    );
}
