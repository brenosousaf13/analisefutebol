import React, { useEffect, useState } from 'react';
import { Calendar, ClipboardList, FolderOpen, LogOut, User } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const Sidebar: React.FC = () => {
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
        <aside className="w-64 bg-nav-dark text-gray-300 flex flex-col h-screen fixed left-0 top-0 border-r border-gray-700 z-50">
            {/* Logo Area */}
            <div className="p-6 flex items-center gap-3">
                <div className="bg-accent-green text-white p-1.5 rounded-lg font-bold text-xl leading-none">
                    TF
                </div>
                <h1 className="text-white font-bold text-lg tracking-wide">TáticaFutebol</h1>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-1">
                {mainMenuItems.map((item) => {
                    const isActive = activePath === item.path || (item.path !== '/' && activePath.startsWith(item.path));
                    return (
                        <a
                            key={item.label}
                            href={item.path}
                            className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors group ${isActive
                                ? 'bg-panel-dark text-white border-l-4 border-accent-green'
                                : 'hover:bg-panel-dark hover:text-white'
                                }`}
                        >
                            <item.icon className={`w-5 h-5 ${isActive ? 'text-accent-green' : 'text-gray-400 group-hover:text-white'}`} />
                            <span className="font-medium text-sm">{item.label}</span>
                        </a>
                    );
                })}
            </nav>

            {/* Footer / User Profile */}
            <div className="p-4 border-t border-gray-700">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white">
                        <User size={20} />
                    </div>
                    <div>
                        <p className="text-white text-sm font-bold">Coach Breno</p>
                        <p className="text-xs text-gray-500">Treinador</p>
                    </div>
                </div>
                <button className="flex items-center gap-2 text-xs text-gray-500 hover:text-red-400 transition-colors w-full px-2">
                    <LogOut size={14} />
                    <span>Sair</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
