import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FolderOpen, LogOut, User, Menu, X, PlusCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface MatchInfo {
    homeTeam: string;
    awayTeam: string;
    homeTeamLogo?: string;
    awayTeamLogo?: string;
    competition?: string;
    date?: string;
    time?: string;
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
        { icon: PlusCircle, label: 'Criar Análise', path: '/' },
        { icon: FolderOpen, label: 'Minhas Análises', path: '/minhas-analises' },
    ];

    const userName = user?.user_metadata?.full_name || 'Analista';
    const userEmail = user?.email || '';

    // Dynamic Menu Items


    return (
        <header className="fixed top-0 left-0 right-0 h-14 sm:h-16 bg-nav-dark border-b border-gray-700 flex items-center justify-between px-2 sm:px-6 z-50 shadow-md">
            {/* Left: Hamburger Menu */}
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                <button
                    onClick={() => setIsMenuOpen(true)}
                    className="p-1.5 sm:p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                    <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
            </div>

            {/* Center: Match Info (Team Names) */}
            {matchInfo ? (
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center max-w-[50%] sm:max-w-none">
                    <div className="flex items-center gap-2 sm:gap-6">
                        {/* Home Team */}
                        <div className="flex items-center gap-1 sm:gap-3 justify-end min-w-0">
                            <span className={`text-sm sm:text-lg font-bold truncate max-w-[80px] sm:max-w-none ${activeTeam === 'home' ? 'text-white' : 'text-gray-500'}`}>
                                {matchInfo.homeTeam}
                            </span>
                            {matchInfo.homeTeamLogo && (
                                <img src={matchInfo.homeTeamLogo} alt={matchInfo.homeTeam} className="w-5 h-5 sm:w-8 sm:h-8 object-contain shrink-0" />
                            )}
                        </div>

                        <span className="text-gray-600 text-xs sm:text-sm font-bold shrink-0">VS</span>

                        {/* Away Team */}
                        <div className="flex items-center gap-1 sm:gap-3 justify-start min-w-0">
                            {matchInfo.awayTeamLogo && (
                                <img src={matchInfo.awayTeamLogo} alt={matchInfo.awayTeam} className="w-5 h-5 sm:w-8 sm:h-8 object-contain shrink-0" />
                            )}
                            <span className={`text-sm sm:text-lg font-bold truncate max-w-[80px] sm:max-w-none ${activeTeam === 'away' ? 'text-white' : 'text-gray-500'}`}>
                                {matchInfo.awayTeam}
                            </span>
                        </div>
                    </div>

                    {/* Date & Time */}
                    {(matchInfo.date || matchInfo.time) && (
                        <div className="hidden sm:flex items-center gap-2 mt-1 text-xs text-gray-500 font-medium tracking-wide">
                            {matchInfo.date && (
                                <span>
                                    {new Date(matchInfo.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })}
                                </span>
                            )}
                            {matchInfo.date && matchInfo.time && <span>•</span>}
                            {matchInfo.time && (
                                <span className="flex items-center gap-1">
                                    {matchInfo.time.slice(0, 5)}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3 opacity-50">
                    <img src="/ZonaLogoOficial.png" alt="Zona 14" className="h-6 w-auto object-contain" />
                    <h1 className="text-white font-bold text-base sm:text-lg tracking-wide">
                        Zona 14
                    </h1>
                </div>
            )}

            {/* Right: Team Switcher or Empty */}
            <div className="flex items-center justify-end w-auto sm:w-48 shrink-0">
                {matchInfo && activeTeam && onTeamChange && (
                    <div className="bg-gray-800/50 sm:bg-gray-800 rounded-lg p-0.5 sm:p-1 flex items-center">
                        <button
                            onClick={() => onTeamChange('home')}
                            className={`px-2 sm:px-4 py-1 sm:py-1.5 rounded text-[10px] sm:text-xs font-bold transition-all ${activeTeam === 'home'
                                ? 'bg-accent-green text-white shadow'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            CASA
                        </button>
                        <button
                            onClick={() => onTeamChange('away')}
                            className={`px-2 sm:px-4 py-1 sm:py-1.5 rounded text-[10px] sm:text-xs font-bold transition-all ${activeTeam === 'away'
                                ? 'bg-accent-green text-white shadow'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            VISIT
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
                    <div className="absolute top-0 left-0 bottom-0 w-[280px] sm:w-72 bg-panel-dark border-r border-gray-700 shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
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
                                        <p className="text-white text-sm font-bold truncate max-w-[120px]">{userName}</p>
                                        <p className="text-xs text-gray-400 truncate max-w-[120px]">{userEmail}</p>
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
