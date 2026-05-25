import React from 'react';
import TeamLogoImage from './TeamLogoImage';

interface MatchHeaderProps {
    homeTeam: string;
    awayTeam: string;
    homeTeamLogo?: string;
    awayTeamLogo?: string;
    competition?: string;
    date?: string;
    activeTeam: 'home' | 'away';
    onTeamChange: (team: 'home' | 'away') => void;
}

const MatchHeader: React.FC<MatchHeaderProps> = ({
    homeTeam,
    awayTeam,
    homeTeamLogo,
    awayTeamLogo,
    competition,
    date,
    activeTeam,
    onTeamChange
}) => {
    return (
        <header className="h-16 bg-nav-dark border-b border-gray-700 flex items-center justify-between px-6 shrink-0">
            {/* Left spacer for balance */}
            <div className="w-48" />

            {/* Center - Match Info */}
            <div className="text-center">
                <div className="flex items-center gap-3 justify-center">
                    <TeamLogoImage logoUrl={homeTeamLogo} teamName={homeTeam} className="w-6 h-6" />
                    <span className="text-white font-bold text-lg uppercase">{homeTeam}</span>
                    <span className="text-gray-500 text-sm">vs</span>
                    <span className="text-white font-bold text-lg uppercase">{awayTeam}</span>
                    <TeamLogoImage logoUrl={awayTeamLogo} teamName={awayTeam} className="w-6 h-6" />
                </div>
                {(competition || date) && (
                    <p className="text-gray-500 text-xs uppercase tracking-wider">
                        {competition}{competition && date && ' • '}{date}
                    </p>
                )}
            </div>

            {/* Right - Team Switch */}
            <div className="flex bg-panel-dark rounded-lg p-1 border border-gray-700">
                <button
                    onClick={() => onTeamChange('home')}
                    className={`
                        px-4 py-2 rounded-md text-sm font-medium transition-all
                        ${activeTeam === 'home'
                            ? 'bg-accent-green text-white shadow-sm'
                            : 'text-gray-400 hover:text-white'
                        }
                    `}
                >
                    {homeTeam}
                </button>
                <button
                    onClick={() => onTeamChange('away')}
                    className={`
                        px-4 py-2 rounded-md text-sm font-medium transition-all
                        ${activeTeam === 'away'
                            ? 'bg-accent-green text-white shadow-sm'
                            : 'text-gray-400 hover:text-white'
                        }
                    `}
                >
                    {awayTeam}
                </button>
            </div>
        </header>
    );
};

export default MatchHeader;
