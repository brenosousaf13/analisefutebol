import React, { useState } from 'react';
import { Maximize2 } from 'lucide-react';

interface StatsPanelProps {
    homeScore: number;
    awayScore: number;
    possession: number;
    xg: number;
    homeTeamName: string;
    awayTeamName: string;
    homeNotes: string;
    awayNotes: string;
    homeNotesUpdatedAt?: string;
    awayNotesUpdatedAt?: string;
    onExpandNotes: () => void;
    currentViewTeam: 'home' | 'away';
    timelineComponent: React.ReactNode;
}

const StatsPanel: React.FC<StatsPanelProps> = ({
    homeNotes, awayNotes, homeNotesUpdatedAt, awayNotesUpdatedAt,
    onExpandNotes, timelineComponent
}) => {
    // Mini-tabs for Compact Notes Card
    const [notesTab, setNotesTab] = useState<'home' | 'away'>('home');

    const activeNote = notesTab === 'home' ? homeNotes : awayNotes;
    const activeUpdatedAt = notesTab === 'home' ? homeNotesUpdatedAt : awayNotesUpdatedAt;
    const formattedDate = activeUpdatedAt
        ? new Date(activeUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';

    // Strip HTML for preview
    const previewText = activeNote.replace(/<[^>]+>/g, '').trim();

    return (
        <div className="flex flex-col h-full bg-panel-dark text-gray-200 gap-4 p-4">

            {/* --- NOTES CARD (50%) --- */}
            <div className="flex-1 min-h-0 flex flex-col bg-[#242938] border border-gray-700 rounded-xl overflow-hidden">
                {/* Header Top Bar */}
                <div className="bg-[#1e2330] px-4 py-3 flex items-center justify-between border-b border-gray-700">
                    <div className="w-6"></div> {/* Spacer for centering */}
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">NOTAS DE ANÁLISE</h3>
                    <button
                        onClick={onExpandNotes}
                        className="text-gray-400 hover:text-white transition-colors p-1"
                        title="Expandir"
                    >
                        <Maximize2 size={16} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-4 pb-2 flex justify-center">
                    <div className="flex bg-gray-900/50 p-1 rounded-lg">
                        <button
                            onClick={() => setNotesTab('home')}
                            className={`px-6 py-1.5 rounded-md text-xs font-bold uppercase transition-all min-w-[100px] ${notesTab === 'home' ? 'bg-[#374151] text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            Casa
                        </button>
                        <button
                            onClick={() => setNotesTab('away')}
                            className={`px-6 py-1.5 rounded-md text-xs font-bold uppercase transition-all min-w-[100px] ${notesTab === 'away' ? 'bg-[#374151] text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            Visitante
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div
                    onClick={onExpandNotes}
                    className="flex-1 p-4 overflow-y-auto cursor-pointer hover:bg-white/5 transition-colors relative"
                >
                    <div className="text-sm text-gray-400 leading-relaxed font-medium">
                        {previewText ? (
                            <p className="line-clamp-[8]">{previewText}</p>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-600 italic mt-8">
                                Nenhuma nota registrada...
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-gray-700 flex items-center justify-between text-xs bg-[#242938]">
                    <span className="text-gray-500">
                        {activeUpdatedAt ? `Última edição: ${formattedDate}` : 'Sem edições'}
                    </span>
                    <button
                        onClick={onExpandNotes}
                        className="text-accent-green font-bold hover:text-green-400 transition-colors"
                    >
                        [Editar]
                    </button>
                </div>
            </div>

            {/* --- EVENTS CARD (50%) --- */}
            {/* The wrapper here provides the spacing/flex, but MatchTimeline handles the inner look. 
                We need to make sure MatchTimeline matches this exact style. 
            */}
            <div className="flex-1 min-h-0 flex flex-col">
                {timelineComponent}
            </div>

        </div>
    );
};

export default StatsPanel;
