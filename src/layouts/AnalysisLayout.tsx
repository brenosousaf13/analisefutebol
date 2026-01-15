import React, { type ReactNode } from 'react';
import Sidebar from '../components/Sidebar';

interface AnalysisLayoutProps {
    children: ReactNode;
    rightPanel?: ReactNode;
}

const AnalysisLayout: React.FC<AnalysisLayoutProps> = ({ children, rightPanel }) => {
    return (
        <div className="min-h-screen bg-nav-dark flex text-gray-100 font-sans">
            {/* Left Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex-1 ml-64 flex flex-col h-screen overflow-hidden">
                {/* Top Header - contextual to the analysis can go here or inside the page */}
                <main className="flex-1 overflow-y-auto p-0 relative">
                    {children}
                </main>
            </div>

            {/* Right Panel (Optional) */}
            {rightPanel && (
                <aside className="w-80 bg-panel-dark border-l border-gray-700 h-screen overflow-y-auto hidden xl:block shadow-xl z-40">
                    {rightPanel}
                </aside>
            )}
        </div>
    );
};

export default AnalysisLayout;
