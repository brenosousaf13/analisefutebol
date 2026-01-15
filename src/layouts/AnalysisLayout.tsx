import React, { type ReactNode, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { ChevronLeft, ChevronRight, FileText, Zap } from 'lucide-react';

interface AnalysisLayoutProps {
    children: ReactNode;
    rightPanel?: ReactNode;
    title?: string;
    onOpenNotes?: () => void;
    onOpenEvents?: () => void;
    tools?: ReactNode;
}

const AnalysisLayout: React.FC<AnalysisLayoutProps> = ({
    children,
    rightPanel,
    onOpenNotes,
    onOpenEvents,
    tools
}) => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

    return (
        <div className="min-h-screen bg-nav-dark flex text-gray-100 font-sans">
            {/* Left Sidebar */}
            <Sidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                tools={tools}
            />

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
                {/* Top Header - contextual to the analysis can go here or inside the page */}
                <main className="flex-1 overflow-hidden p-0 relative flex flex-col">
                    {children}
                </main>
            </div>

            {/* Right Panel (Optional) */}
            {rightPanel && (
                <aside
                    className={`${rightPanelCollapsed ? 'w-12' : 'w-80'} bg-panel-dark border-l border-gray-700 h-screen hidden xl:flex flex-col shadow-xl z-40 transition-all duration-300 ease-in-out relative`}
                >
                    {rightPanelCollapsed ? (
                        // Collapsed State
                        <div className="flex flex-col items-center py-4 gap-4">
                            <button
                                onClick={() => setRightPanelCollapsed(false)}
                                className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white mb-4"
                                title="Expandir painel"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>

                            <button
                                onClick={onOpenNotes}
                                className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white"
                                title="Notas de Análise"
                            >
                                <FileText className="w-5 h-5" />
                            </button>

                            <button
                                onClick={onOpenEvents}
                                className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white"
                                title="Eventos da Partida"
                            >
                                <Zap className="w-5 h-5" />
                            </button>
                        </div>
                    ) : (
                        // Expanded State
                        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                            <button
                                onClick={() => setRightPanelCollapsed(true)}
                                className="absolute right-full top-4 mr-0 bg-panel-dark border border-r-0 border-gray-700 rounded-l-lg p-1 text-gray-400 hover:text-white hover:border-gray-500 z-50 shadow-[-4px_0_10px_-2px_rgba(0,0,0,0.1)]"
                                title="Colapsar painel"
                            >
                                <ChevronRight size={14} />
                            </button>
                            {rightPanel}
                        </div>
                    )}
                </aside>
            )}
        </div>
    );
};

export default AnalysisLayout;
