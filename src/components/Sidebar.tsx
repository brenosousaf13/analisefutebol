import React, { useEffect, useState } from 'react';
import { Calendar, ClipboardList, FolderOpen, LogOut, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
    tools?: React.ReactNode;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle, tools }) => {
    const location = useLocation();
    const [activePath, setActivePath] = useState(location.pathname);

    useEffect(() => {
        setActivePath(location.pathname);
    }, [location]);

    const mainMenuItems = [
        { icon: Calendar, label: 'Todas as Partidas', path: '/' },
        { icon: ClipboardList, label: 'Análise de Partida', path: '/analise' },
        { icon: FolderOpen, label: 'Minhas Análises', path: '/minhas-analises' },
    ];

    return (
        <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-nav-dark text-gray-300 flex flex-col h-screen fixed left-0 top-0 border-r border-gray-700 z-50 transition-all duration-300 ease-in-out`}>
            {/* Logo Area */}
            <div className={`p-4 flex items-center ${collapsed ? 'justify-center' : 'justify-between'} h-16 border-b border-gray-700 relative`}>
                {!collapsed && (
                    <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
                        <div className="bg-accent-green text-white p-1 rounded font-bold text-lg leading-none shrink-0">
                            TF
                        </div>
                        <h1 className="text-white font-bold text-base tracking-wide truncate">TáticaFutebol</h1>
                    </div>
                )}
                {collapsed && (
                    <div className="bg-accent-green text-white p-1 rounded font-bold text-lg leading-none shrink-0">
                        TF
                    </div>
                )}
                <button
                    onClick={onToggle}
                    className={`absolute ${collapsed ? '-right-3 top-12' : 'right-4 top-1/2 -translate-y-1/2'} bg-panel-dark border border-gray-600 rounded-full p-1 text-gray-400 hover:text-white hover:border-gray-400 transition-colors z-[60]`}
                >
                    {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={16} />}
                </button>
            </div>

            {/* Navigation */}
            <nav className="py-4 flex flex-col gap-1 px-2 border-b border-gray-700">
                {mainMenuItems.map((item) => {
                    const isActive = activePath === item.path || (item.path !== '/' && activePath.startsWith(item.path));
                    return (
                        <a
                            key={item.label}
                            href={item.path}
                            title={collapsed ? item.label : undefined}
                            className={`flex items-center gap-3 p-3 rounded-lg transition-colors group ${isActive
                                ? 'bg-panel-dark text-white'
                                : 'hover:bg-panel-dark hover:text-white'
                                } ${collapsed ? 'justify-center' : ''}`}
                        >
                            <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-accent-green' : 'text-gray-400 group-hover:text-white'}`} />
                            {!collapsed && <span className="font-medium text-sm truncate">{item.label}</span>}
                        </a>
                    );
                })}
            </nav>

            {/* Tools Section */}
            {tools && (
                <div className={`flex-1 overflow-y-auto py-4 px-2 flex flex-col gap-2 ${collapsed ? 'items-center' : ''}`}>
                    {!collapsed && <div className="text-xs font-bold text-gray-500 uppercase px-2 mb-2">Ferramentas</div>}
                    {tools}
                </div>
            )}

            {/* Spacer if no tools, to push user profile down */}
            {!tools && <div className="flex-1" />}

            {/* Footer / User Profile */}
            <div className="p-4 border-t border-gray-700 mt-auto">
                <div className={`flex items-center gap-3 mb-4 ${collapsed ? 'justify-center' : ''}`}>
                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white shrink-0">
                        <User size={16} />
                    </div>
                    {!collapsed && (
                        <div className="overflow-hidden">
                            <p className="text-white text-sm font-bold truncate">Coach Breno</p>
                            <p className="text-xs text-gray-500 truncate">Treinador</p>
                        </div>
                    )}
                </div>
                <button
                    className={`flex items-center gap-2 text-xs text-gray-500 hover:text-red-400 transition-colors w-full px-2 ${collapsed ? 'justify-center' : ''}`}
                    title={collapsed ? "Sair" : undefined}
                >
                    <LogOut size={16} />
                    {!collapsed && <span>Sair</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
