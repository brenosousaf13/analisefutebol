import React from 'react';

interface NotesPanelProps {
    homeTeamName: string;
    awayTeamName: string;
    gameNotes: string;
    setGameNotes: (note: string) => void;
    homeTeamNotes: string;
    setHomeTeamNotes: (note: string) => void;
    awayTeamNotes: string;
    setAwayTeamNotes: (note: string) => void;
}

const NotesPanel: React.FC<NotesPanelProps> = ({
    homeTeamName,
    awayTeamName,
    gameNotes,
    setGameNotes,
    homeTeamNotes,
    setHomeTeamNotes,
    awayTeamNotes,
    setAwayTeamNotes
}) => {
    return (
        <div className="bg-white shadow-sm rounded-lg p-4 flex flex-col gap-6 h-full">
            {/* Game Notes Section */}
            <div className="flex flex-col gap-2">
                <label className="text-gray-700 font-semibold text-sm">
                    Notas do Jogo
                </label>
                <textarea
                    value={gameNotes}
                    onChange={(e) => setGameNotes(e.target.value)}
                    placeholder="Anotações gerais sobre a partida..."
                    className="w-full min-h-[100px] p-3 border border-gray-300 rounded-md focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none resize-y text-sm text-gray-700"
                />
            </div>

            {/* Home Team Notes Section */}
            <div className="flex flex-col gap-2">
                <label className="text-gray-700 font-semibold text-sm">
                    {homeTeamName}
                </label>
                <textarea
                    value={homeTeamNotes}
                    onChange={(e) => setHomeTeamNotes(e.target.value)}
                    placeholder={`Anotações sobre o ${homeTeamName}...`}
                    className="w-full min-h-[80px] p-3 border border-gray-300 rounded-md focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none resize-y text-sm text-gray-700"
                />
            </div>

            {/* Away Team Notes Section */}
            <div className="flex flex-col gap-2">
                <label className="text-gray-700 font-semibold text-sm">
                    {awayTeamName}
                </label>
                <textarea
                    value={awayTeamNotes}
                    onChange={(e) => setAwayTeamNotes(e.target.value)}
                    placeholder={`Anotações sobre o ${awayTeamName}...`}
                    className="w-full min-h-[80px] p-3 border border-gray-300 rounded-md focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none resize-y text-sm text-gray-700"
                />
            </div>
        </div>
    );
};

export default NotesPanel;
