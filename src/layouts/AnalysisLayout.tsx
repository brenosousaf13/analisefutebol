import React, { type ReactNode } from 'react';
import Header from '../components/Header';

interface MatchInfo {
    homeTeam: string;
    awayTeam: string;
    homeTeamLogo?: string;
    awayTeamLogo?: string;
    competition?: string;
    date?: string;
}

interface AnalysisLayoutProps {
    children: ReactNode;
    matchInfo?: MatchInfo;
    activeTeam?: 'home' | 'away';
    onTeamChange?: (team: 'home' | 'away') => void;
}

const AnalysisLayout: React.FC<AnalysisLayoutProps> = ({
    children,
    matchInfo,
    activeTeam,
    onTeamChange
}) => {
    return (
        <div className="min-h-screen bg-nav-dark flex flex-col text-gray-100 font-sans">
            {/* Global Header */}
            <Header
                matchInfo={matchInfo}
                activeTeam={activeTeam}
                onTeamChange={onTeamChange}
            />

            {/* Main Content Area - Full Width, moved down by header height */}
            <div className="flex-1 flex flex-col pt-16 h-screen overflow-hidden">
                <main className="flex-1 overflow-hidden p-0 relative flex flex-col">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default AnalysisLayout;
