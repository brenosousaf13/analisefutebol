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
    sidebar?: ReactNode;
    matchInfo?: MatchInfo;
    activeTeam?: 'home' | 'away';
    onTeamChange?: (team: 'home' | 'away') => void;
}

const AnalysisLayout: React.FC<AnalysisLayoutProps> = ({
    children,
    sidebar,
    matchInfo,
    activeTeam,
    onTeamChange
}) => {
    return (
        <div className="flex h-screen w-screen overflow-hidden bg-nav-dark text-gray-100 font-sans">
            {/* Sidebar Area */}
            {sidebar && (
                <aside className="h-full shrink-0 bg-nav-dark flex flex-col z-20 border-r border-gray-800">
                    {sidebar}
                </aside>
            )}

            {/* Main Content Area */}
            <main className="flex-1 h-full flex flex-col bg-panel-dark overflow-hidden">
                {/* Header */}
                <Header
                    matchInfo={matchInfo}
                    activeTeam={activeTeam}
                    onTeamChange={onTeamChange}
                />

                {/* Page Content */}
                <div className="flex-1 overflow-hidden relative flex flex-col pt-16">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default AnalysisLayout;
