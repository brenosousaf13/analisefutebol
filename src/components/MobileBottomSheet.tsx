import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { Player } from '../types/Player';
import BenchArea from './BenchArea';
import { ChevronDown } from 'lucide-react';

const PEEK_HEIGHT = 144;

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
    const touchStartY = useRef<number | null>(null);

    useEffect(() => {
        setActiveTab(activePossession);
    }, [activePossession]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartY.current = e.touches[0].clientY;
    }, []);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        if (touchStartY.current === null) return;
        const dy = touchStartY.current - e.changedTouches[0].clientY;
        if (dy > 30) setIsExpanded(true);
        else if (dy < -30) setIsExpanded(false);
        touchStartY.current = null;
    }, []);

    const tabs = [
        { key: 'home' as const, name: homeTeamName, color: homeTeamColor, players: homeSubstitutes },
        { key: 'away' as const, name: awayTeamName, color: awayTeamColor, players: awaySubstitutes },
    ];

    const activeData = tabs.find(t => t.key === activeTab)!;

    return (
        <div
            className="absolute left-0 right-0 bottom-0 flex flex-col bg-[#0a1010] rounded-t-2xl border-t border-gray-700/60 shadow-[0_-8px_32px_rgba(0,0,0,0.6)] transition-transform duration-300 ease-out z-20"
            style={{
                height: '72%',
                transform: isExpanded
                    ? 'translateY(0)'
                    : `translateY(calc(100% - ${PEEK_HEIGHT}px))`,
            }}
        >
            {/* Drag handle — touch here to expand/collapse */}
            <div
                className="flex flex-col items-center justify-center pt-3 pb-2 shrink-0 cursor-pointer select-none"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onClick={() => setIsExpanded(v => !v)}
            >
                <div className="w-10 h-1 bg-gray-600 rounded-full" />
            </div>

            {/* Team tabs + meta */}
            <div className="flex items-center px-4 pb-3 gap-3 shrink-0 border-b border-gray-800/60">
                <div className="flex bg-gray-800/80 rounded-lg p-1 gap-1">
                    {tabs.map(({ key, name, color }) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${activeTab === key ? 'text-white shadow' : 'text-gray-500'}`}
                            style={activeTab === key ? { backgroundColor: color } : {}}
                        >
                            {name}
                        </button>
                    ))}
                </div>

                <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                        {activeData.players.length} reservas
                    </span>
                    {isExpanded && (
                        <button
                            onClick={() => setIsExpanded(false)}
                            className="p-1 text-gray-500 hover:text-white transition-colors"
                        >
                            <ChevronDown size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Bench content */}
            <div className="flex-1 overflow-y-auto min-h-0 px-2 py-1">
                <BenchArea
                    players={activeData.players}
                    team={activeData.key}
                    teamColor={activeData.color}
                    orientation="vertical"
                    onPromotePlayer={readOnly ? () => {} : (p) => onBenchPlayerClick(p, activeData.key)}
                    onPlayerDoubleClick={onPlayerDoubleClick}
                />
            </div>
        </div>
    );
}
