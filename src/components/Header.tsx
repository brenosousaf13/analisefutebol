import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Calendar, FolderOpen, LogOut, User, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface MatchInfo {
    homeTeam: string;
    awayTeam: string;
    homeTeamLogo?: string;
    awayTeamLogo?: string;
    competition?: string;
    date?: string;
}

interface HeaderProps {
    matchInfo?: MatchInfo;
    activeTeam?: 'home' | 'away';
    onTeamChange?: (team: 'home' | 'away') => void;
}

const Header: React.FC<HeaderProps> = ({ matchInfo, activeTeam, onTeamChange }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const [activePath, setActivePath] = useState(location.pathname);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        setActivePath(location.pathname);
    }, [location]);

    const handleSignOut = async () => {
        await signOut();
        setIsMenuOpen(false);
        navigate('/login');
    };

    const menuItems = [
        { icon: Calendar, label: 'Partidas', path: '/' },
        { icon: FolderOpen, label: 'Minhas Análises', path: '/minhas-analises' },
    ];

    const userName = user?.user_metadata?.full_name || 'Analista';
    const userEmail = user?.email || '';

    return (
        <header className="fixed top-0 left-0 right-0 h-16 bg-nav-dark border-b border-gray-700 flex items-center justify-between px-6 z-50 shadow-md">
            {/* Left: Hamburger Menu */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => setIsMenuOpen(true)}
                    className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                    <Menu size={24} />
                </button>
            </div>

            {/* Center: Match Info (Team Names) */}
            {matchInfo ? (
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-6">
                    {/* Home Team */}
                    <div className="flex items-center gap-3">
                        <span className={`text-lg font-bold ${activeTeam === 'home' ? 'text-white' : 'text-gray-500'}`}>
                            {matchInfo.homeTeam}
                        </span>
                        {matchInfo.homeTeamLogo && (
                            <img src={matchInfo.homeTeamLogo} alt={matchInfo.homeTeam} className="w-8 h-8 object-contain" />
                        )}
                    </div>

                    <span className="text-gray-600 text-sm font-bold">VS</span>

                    {/* Away Team */}
                    <div className="flex items-center gap-3">
                        {matchInfo.awayTeamLogo && (
                            <img src={matchInfo.awayTeamLogo} alt={matchInfo.awayTeam} className="w-8 h-8 object-contain" />
                        )}
                        <span className={`text-lg font-bold ${activeTeam === 'away' ? 'text-white' : 'text-gray-500'}`}>
                            {matchInfo.awayTeam}
                        </span>
                    </div>
                </div>
            ) : (
                <h1 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white font-bold text-lg tracking-wide opacity-50">
                    TactiQ
                </h1>
            )}

            {/* Right: Team Switcher or Empty */}
            <div className="flex items-center justify-end w-48">
                {matchInfo && activeTeam && onTeamChange && (
                    <div className="bg-gray-800 rounded-lg p-1 flex items-center">
                        <button
                            onClick={() => onTeamChange('home')}
                            className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${activeTeam === 'home'
                                ? 'bg-accent-green text-white shadow'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            CASA
                        </button>
                        <button
                            onClick={() => onTeamChange('away')}
                            className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${activeTeam === 'away'
                                ? 'bg-accent-green text-white shadow'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            VISITANTE
                        </button>
                    </div>
                )}
            </div>

            {/* Sidebar Overlay */}
            {isMenuOpen && (
                <div className="fixed inset-0 z-[60]">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setIsMenuOpen(false)}
                    />

                    {/* Sidebar Drawer */}
                    <div className="absolute top-0 left-0 bottom-0 w-72 bg-panel-dark border-r border-gray-700 shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
                        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                            <h2 className="text-white font-bold text-lg">Menu</h2>
                            <button
                                onClick={() => setIsMenuOpen(false)}
                                className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <nav className="flex-1 p-4 flex flex-col gap-2">
                            {menuItems.map((item) => {
                                const isActive = activePath === item.path || (item.path !== '/' && activePath.startsWith(item.path));
                                return (
                                    <Link
                                        key={item.label}
                                        to={item.path}
                                        onClick={() => setIsMenuOpen(false)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${isActive
                                            ? 'bg-accent-green text-white shadow-lg shadow-green-900/20'
                                            : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                            }`}
                                    >
                                        <item.icon size={20} />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="p-4 border-t border-gray-700 bg-gray-800/50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white border border-gray-600 shrink-0">
                                        <User size={20} />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-white text-sm font-bold truncate">{userName}</p>
                                        <p className="text-xs text-gray-400 truncate">{userEmail}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleSignOut}
                                    className="p-2 text-gray-400 hover:text-red-400 transition-colors bg-gray-800 hover:bg-gray-700 rounded-lg"
                                    title="Sair"
                                >
                                    <LogOut size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;
