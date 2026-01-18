import React, { type ReactNode, useState } from 'react';
import Sidebar from '../components/Sidebar';

interface AnalysisLayoutProps {
    children: ReactNode;
    tools?: ReactNode;
}

const AnalysisLayout: React.FC<AnalysisLayoutProps> = ({
    children,
    tools
}) => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

    return (
        <div className="min-h-screen bg-nav-dark flex text-gray-100 font-sans">
            {/* Left Sidebar */}
            <Sidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                tools={tools}
            />

            {/* Main Content Area - Now takes full remaining width */}
            <div className={`flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
                <main className="flex-1 overflow-hidden p-0 relative flex flex-col">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default AnalysisLayout;
