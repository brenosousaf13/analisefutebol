import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FolderOpen, LogOut, User, Menu, X, PlusCircle, Play, Home } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from './ThemeToggle';
import TeamLogoImage from './TeamLogoImage';
import { formatShortDate } from '../utils/formatDate';

interface MatchInfo {
    homeTeam: string;
    awayTeam: string;
    homeTeamLogo?: string;
    awayTeamLogo?: string;
    competition?: string;
    date?: string;
    time?: string;
    homeScore?: number | null;
    awayScore?: number | null;
}

interface HeaderProps {
    matchInfo?: MatchInfo;
    activeTeam?: 'home' | 'away';
    onTeamChange?: (team: 'home' | 'away') => void;
    onHeaderTeamClick?: (team: 'home' | 'away') => void;
    videoUrl?: string | null;
    onHighlightClick?: () => void;
    /** Acoes da analise (baixar, compartilhar, salvar) no canto direito. */
    actions?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ matchInfo, activeTeam, onTeamChange, onHeaderTeamClick, videoUrl, onHighlightClick, actions }) => {
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
        { icon: Home, label: 'Home', path: '/' },
        { icon: PlusCircle, label: 'Nova Análise', path: '/nova-analise' },
        { icon: FolderOpen, label: 'Biblioteca', path: '/biblioteca' },
    ];

    const userName = user?.user_metadata?.full_name || 'Analista';
    const userEmail = user?.email || '';

    // Dynamic Menu Items


    const isAnalysisPage = location.pathname.includes('/analysis') || location.pathname.includes('/analise');

    const hasScore = matchInfo?.homeScore != null && matchInfo?.awayScore != null;

    return (
        <header className="fixed top-0 left-0 right-0 h-10 lg:h-16 bg-nav-dark/50 backdrop-blur-md border-b border-white/5 px-2 lg:px-4 flex items-center justify-between shrink-0 z-50">
            {/* Left: Hamburger Menu */}
            <div className="flex items-center shrink-0">
                <button
                    onClick={() => setIsMenuOpen(true)}
                    className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                    <Menu className="w-5 h-5" />
                </button>
            </div>

            {/* Center: Match Info — campeonato | times + placar | data.
                Grade 1fr/auto/1fr dentro de um bloco centralizado na tela: o
                confronto fica no centro exato e os dois lados nao o empurram. */}
            {matchInfo ? (
                <div className="absolute left-1/2 top-1/2 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 px-2">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center">
                        <span
                            title={matchInfo.competition || undefined}
                            className="hidden lg:block min-w-0 justify-self-end truncate pr-[10%] text-xs text-gray-500 font-medium"
                        >
                            {matchInfo.competition || '—'}
                        </span>

                        <div className="flex items-center justify-center gap-1.5 lg:gap-4 min-w-0">
                            {/* Home Team */}
                            <div
                                className="flex items-center gap-1 lg:gap-3 justify-end min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => onHeaderTeamClick && onHeaderTeamClick('home')}
                            >
                                <span className={`text-xs lg:text-lg font-bold truncate max-w-[72px] lg:max-w-none ${activeTeam === 'home' ? 'text-white' : 'text-gray-500'}`}>
                                    {matchInfo.homeTeam}
                                </span>
                                <TeamLogoImage logoUrl={matchInfo.homeTeamLogo} teamName={matchInfo.homeTeam} className="w-5 h-5 lg:w-8 lg:h-8 shrink-0" />
                            </div>

                            {hasScore ? (
                                <span className="shrink-0 rounded-md bg-white/10 px-2 py-1 text-[10px] lg:text-sm font-bold tabular-nums text-white">
                                    {matchInfo.homeScore}-{matchInfo.awayScore}
                                </span>
                            ) : (
                                <span className="text-gray-600 text-[10px] lg:text-sm font-bold shrink-0">VS</span>
                            )}

                            {/* Away Team */}
                            <div
                                className="flex items-center gap-1 lg:gap-3 justify-start min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => onHeaderTeamClick && onHeaderTeamClick('away')}
                            >
                                <TeamLogoImage logoUrl={matchInfo.awayTeamLogo} teamName={matchInfo.awayTeam} className="w-5 h-5 lg:w-8 lg:h-8 shrink-0" />
                                <span className={`text-xs lg:text-lg font-bold truncate max-w-[72px] lg:max-w-none ${activeTeam === 'away' ? 'text-white' : 'text-gray-500'}`}>
                                    {matchInfo.awayTeam}
                                </span>
                            </div>
                        </div>

                        <span className="hidden lg:flex items-center gap-1.5 justify-self-start whitespace-nowrap pl-[10%] text-xs text-gray-500 font-medium tabular-nums">
                            {matchInfo.date && <span>{formatShortDate(matchInfo.date, '')}</span>}
                            {matchInfo.date && matchInfo.time && <span>•</span>}
                            {matchInfo.time && <span>{matchInfo.time.slice(0, 5)}</span>}
                        </span>
                    </div>
                </div>
            ) : (
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <img src="/zona14-logo-branco.svg" alt="Zona 14" className="h-6 lg:h-8 w-auto object-contain" />
                </div>
            )}

            {/* Right: Team Switcher (desktop) & Theme Toggle (desktop) */}
            <div className="flex items-center justify-end shrink-0 gap-2 lg:gap-4">
                {matchInfo && activeTeam && onTeamChange && (
                    <div className="hidden lg:flex bg-gray-800 rounded-lg p-1 items-center">
                        <button
                            onClick={() => onTeamChange('home')}
                            className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${activeTeam === 'home' ? 'bg-accent-green text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            CASA
                        </button>
                        <button
                            onClick={() => onTeamChange('away')}
                            className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${activeTeam === 'away' ? 'bg-accent-green text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            VISIT
                        </button>
                    </div>
                )}

                {/* Highlights button — desktop only, only when video available */}
                {videoUrl && onHighlightClick && (
                    <button
                        onClick={onHighlightClick}
                        className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border border-gray-700 bg-gray-800/80 text-gray-300 hover:text-white hover:border-gray-600 hover:bg-gray-700"
                    >
                        <Play className="w-3 h-3 fill-current" />
                        Highlights
                    </button>
                )}

                {/* Acoes da analise */}
                {actions && <div className="flex items-center gap-1">{actions}</div>}

                {/* Theme Toggle — desktop only on analysis pages */}
                {isAnalysisPage && <div className="hidden lg:block"><ThemeToggle /></div>}
            </div>

            {/* Sidebar Overlay - Rendered outside the header flow conceptually via fixed positioning */}
            {createPortal(
                <div className={`fixed inset-0 z-[100] ${isMenuOpen ? 'visible' : 'invisible'}`}>
                    {/* Backdrop */}
                    <div
                        className={`
                        absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-in-out
                        ${isMenuOpen ? 'opacity-100' : 'opacity-0'}
                    `}
                        onClick={() => setIsMenuOpen(false)}
                    />

                    {/* Sidebar Drawer */}
                    <div className={`
                    absolute top-0 left-0 bottom-0 w-[280px] sm:w-72 
                    bg-nav-dark border-r border-gray-700 shadow-2xl 
                    flex flex-col 
                    transform transition-transform duration-300 ease-in-out
                    ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
                `}>
                        <div className="p-4 border-b border-gray-700 flex items-center justify-between shrink-0">
                            <h2 className="text-white font-bold text-lg">Menu</h2>
                            <button
                                onClick={() => setIsMenuOpen(false)}
                                className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <nav className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
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

                        <div className="p-4 border-t border-gray-700 bg-gray-800/50 shrink-0">
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
                </div>,
                document.body
            )}
        </header>
    );
};

export default Header;
