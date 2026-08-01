import React, { type ReactNode, useEffect } from 'react';
import Header from '../components/Header';

interface MatchInfo {
    homeTeam: string;
    awayTeam: string;
    homeTeamLogo?: string;
    awayTeamLogo?: string;
    competition?: string;
    date?: string;
    time?: string;
}

interface AnalysisLayoutProps {
    children: ReactNode;
    sidebar?: ReactNode;
    matchInfo?: MatchInfo;
    activeTeam?: 'home' | 'away';
    onTeamChange?: (team: 'home' | 'away') => void;
    onHeaderTeamClick?: (team: 'home' | 'away') => void;
    videoUrl?: string | null;
    onHighlightClick?: () => void;
    /** Acoes da analise renderizadas no canto direito do Header. */
    actions?: ReactNode;
}

const AnalysisLayout: React.FC<AnalysisLayoutProps> = ({
    children,
    sidebar,
    matchInfo,
    activeTeam,
    onTeamChange,
    onHeaderTeamClick,
    videoUrl,
    onHighlightClick,
    actions,
}) => {
    useEffect(() => {
        // Lock html/body scroll so the field handles all touch without page scroll.
        // 100dvh on the container ensures the layout always matches the visible viewport,
        // but the browser still scrolls the body unless we lock it here.
        const html = document.documentElement;
        const body = document.body;
        const prevHtml = html.style.overflow;
        const prevBody = body.style.overflow;
        html.style.overflow = 'hidden';
        body.style.overflow = 'hidden';
        return () => {
            html.style.overflow = prevHtml;
            body.style.overflow = prevBody;
        };
    }, []);

    return (
        <div className="flex w-screen overflow-hidden bg-nav-dark text-gray-100 font-sans" style={{ height: '100dvh' }}>
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
                    onHeaderTeamClick={onHeaderTeamClick}
                    videoUrl={videoUrl}
                    onHighlightClick={onHighlightClick}
                    actions={actions}
                />

                {/* Page Content */}
                <div className="flex-1 overflow-hidden relative flex flex-col pt-10 lg:pt-16">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default AnalysisLayout;
