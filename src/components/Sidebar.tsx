import React, { useEffect, useState } from 'react';
import { Calendar, ClipboardList, FolderOpen, LogOut, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
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
            <div className={`p-4 flex items-center ${collapsed ? 'justify-center' : 'justify-between'} h-16 border-b border-gray-700`}>
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
            </div>

            <button
                onClick={onToggle}
                className="absolute -right-3 top-20 bg-panel-dark border border-gray-600 rounded-full p-1 text-gray-400 hover:text-white hover:border-gray-400 transition-colors z-50"
            >
                {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>


            {/* Navigation */}
            <nav className="flex-1 py-4 flex flex-col gap-1 px-2">
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

            {/* Footer / User Profile */}
            <div className="p-4 border-t border-gray-700">
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
