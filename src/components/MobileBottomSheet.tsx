import { useState, useRef, useCallback, useEffect } from 'react';
import type { Player } from '../types/Player';
import BenchArea from './BenchArea';
import { X } from 'lucide-react';

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
    onClose: () => void;
    readOnly?: boolean;
}

export default function MobileBottomSheet({
    homeTeamName, awayTeamName,
    homeTeamColor, awayTeamColor,
    homeSubstitutes, awaySubstitutes,
    activePossession,
    onBenchPlayerClick, onPlayerDoubleClick,
    onClose,
    readOnly = false,
}: MobileBottomSheetProps) {
    const [activeTab, setActiveTab] = useState<'home' | 'away'>(activePossession);
    const touchStartY = useRef<number | null>(null);
    const sheetRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setActiveTab(activePossession);
    }, [activePossession]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartY.current = e.touches[0].clientY;
    }, []);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        if (touchStartY.current === null) return;
        const dy = e.changedTouches[0].clientY - touchStartY.current;
        if (dy > 60) onClose();
        touchStartY.current = null;
    }, [onClose]);

    const tabs = [
        { key: 'home' as const, name: homeTeamName, color: homeTeamColor, players: homeSubstitutes },
        { key: 'away' as const, name: awayTeamName, color: awayTeamColor, players: awaySubstitutes },
    ];
    const activeData = tabs.find(t => t.key === activeTab)!;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[75] bg-black/50 backdrop-blur-[1px]"
                onClick={onClose}
            />

            {/* Sheet */}
            <div
                ref={sheetRef}
                className="fixed bottom-0 left-0 right-0 z-[80] flex flex-col bg-[#0d1414] rounded-t-2xl border-t border-gray-700/50"
                style={{
                    height: '55%',
                    maxHeight: '75dvh',
                    boxShadow: '0 -8px 40px rgba(0,0,0,0.7)',
                }}
            >
                {/* Drag handle */}
                <div
                    className="flex justify-center pt-3 pb-2 shrink-0 cursor-grab active:cursor-grabbing"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                >
                    <div className="w-10 h-1 bg-gray-600 rounded-full" />
                </div>

                {/* Header: team tabs + close */}
                <div className="flex items-center px-4 pb-2 gap-3 shrink-0">
                    <div className="flex bg-gray-800/80 rounded-xl p-0.5 gap-0.5">
                        {tabs.map(({ key, name, color }) => (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === key ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                                style={activeTab === key ? { backgroundColor: color } : {}}
                            >
                                {name}
                            </button>
                        ))}
                    </div>
                    <span className="text-xs text-gray-500 ml-auto">
                        {activeData.players.length} reservas
                    </span>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Player list */}
                <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-4">
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
        </>
    );
}
