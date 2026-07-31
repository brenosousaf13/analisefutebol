import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    PanelLeft,
    PlusCircle,
    LayoutGrid,
    Library,
    Settings,
    HelpCircle,
    LogOut,
    ChevronsUpDown,
    User as UserIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export interface NavItem {
    label: string;
    path: string;
    icon: LucideIcon;
    /**
     * Item sem destino construido ainda. Renderiza desabilitado em vez de navegar,
     * porque cair no catch-all e voltar para a home seria confuso.
     */
    soon?: boolean;
}

const MAIN_NAV: NavItem[] = [
    { label: 'Nova análise', path: '/nova-analise', icon: PlusCircle },
    { label: 'Campinho', path: '/campinho', icon: LayoutGrid },
    { label: 'Biblioteca', path: '/biblioteca', icon: Library },
];

const FOOTER_NAV: NavItem[] = [
    { label: 'Configurações', path: '/configuracoes', icon: Settings, soon: true },
    { label: 'Ajuda', path: '/ajuda', icon: HelpCircle, soon: true },
];

interface SidebarLinkProps {
    item: NavItem;
    collapsed: boolean;
    active: boolean;
    onNavigate?: () => void;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ item, collapsed, active, onNavigate }) => {
    const Icon = item.icon;

    const shape = `
        group relative flex w-full items-center rounded-control
        transition-colors duration-150 outline-none
        focus-visible:ring-2 focus-visible:ring-brand-primary/60
        ${collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'}
    `;

    const body = (
        <>
            <Icon size={18} className="shrink-0" />
            {!collapsed && (
                <>
                    <span className="truncate text-sm font-medium">{item.label}</span>
                    {item.soon && (
                        <span className="ml-auto shrink-0 rounded-full border border-line px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-content-muted">
                            em breve
                        </span>
                    )}
                </>
            )}
        </>
    );

    if (item.soon) {
        return (
            <button
                type="button"
                disabled
                title={`${item.label} — em breve`}
                className={`${shape} cursor-not-allowed text-content-muted/70`}
            >
                {body}
            </button>
        );
    }

    return (
        <Link
            to={item.path}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            title={collapsed ? item.label : undefined}
            className={`
                ${shape}
                ${active
                    ? 'bg-surface-hover text-content-primary'
                    : 'text-content-secondary hover:bg-surface-overlay hover:text-content-primary'
                }
            `}
        >
            {body}
        </Link>
    );
};

interface SidebarProps {
    /** Colapso vive no AppLayout para que o conteudo acompanhe a largura. */
    collapsed: boolean;
    onToggleCollapse: () => void;
    /** Em telas pequenas a sidebar vira drawer, controlado pelo AppLayout. */
    mobileOpen: boolean;
    onMobileClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggleCollapse, mobileOpen, onMobileClose }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, signOut } = useAuth();

    const [accountOpen, setAccountOpen] = useState(false);
    const accountRef = useRef<HTMLDivElement>(null);

    // Fecha o popover de conta ao clicar fora ou apertar Esc.
    useEffect(() => {
        if (!accountOpen) return;

        const onPointerDown = (e: MouseEvent) => {
            if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
                setAccountOpen(false);
            }
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setAccountOpen(false);
        };

        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [accountOpen]);

    // No mobile a sidebar sempre aparece expandida — colapsar so faz sentido no desktop.
    const isCollapsed = collapsed && !mobileOpen;

    const isActive = (path: string) =>
        location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

    const userName = user?.user_metadata?.full_name || 'Analista';
    const userEmail = user?.email || '';
    const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    return (
        <aside
            className={`
                fixed inset-y-0 left-0 z-50 flex flex-col
                border-r border-line bg-surface-sunken
                transition-[width,transform] duration-sidebar ease-out
                ${isCollapsed ? 'w-[68px]' : 'w-[232px]'}
                ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
            `}
        >
            {/* Marca + toggle */}
            <div className={`flex h-16 shrink-0 items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
                {!isCollapsed && (
                    <Link
                        to="/"
                        onClick={onMobileClose}
                        className="text-lg font-extrabold tracking-tight text-content-primary"
                    >
                        ZONA<span className="text-brand-primary">14</span>
                    </Link>
                )}
                <button
                    onClick={() => (mobileOpen ? onMobileClose() : onToggleCollapse())}
                    aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
                    className="rounded-control p-2 text-content-muted transition-colors hover:bg-surface-overlay hover:text-content-primary"
                >
                    <PanelLeft size={18} />
                </button>
            </div>

            {/* Navegacao principal */}
            <nav className={`flex flex-col gap-1 ${isCollapsed ? 'px-2' : 'px-3'}`}>
                {MAIN_NAV.map(item => (
                    <SidebarLink
                        key={item.path}
                        item={item}
                        collapsed={isCollapsed}
                        active={isActive(item.path)}
                        onNavigate={onMobileClose}
                    />
                ))}
            </nav>

            <div className="flex-1" />

            {/* Rodape: preferencias + conta */}
            <div className={`flex flex-col gap-1 ${isCollapsed ? 'px-2' : 'px-3'}`}>
                {FOOTER_NAV.map(item => (
                    <SidebarLink
                        key={item.path}
                        item={item}
                        collapsed={isCollapsed}
                        active={isActive(item.path)}
                        onNavigate={onMobileClose}
                    />
                ))}
            </div>

            <div ref={accountRef} className="relative mt-2 border-t border-line p-3">
                {accountOpen && (
                    <div className="absolute bottom-[calc(100%+8px)] left-3 right-3 z-10 overflow-hidden rounded-control border border-line bg-surface-raised shadow-pop">
                        {!isCollapsed && (
                            <div className="border-b border-line-subtle px-3 py-2.5">
                                <p className="truncate text-sm font-semibold text-content-primary">{userName}</p>
                                <p className="truncate text-xs text-content-muted">{userEmail}</p>
                            </div>
                        )}
                        <button
                            onClick={handleSignOut}
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-content-secondary transition-colors hover:bg-surface-hover hover:text-content-primary"
                        >
                            <LogOut size={16} />
                            Sair
                        </button>
                    </div>
                )}

                <button
                    onClick={() => setAccountOpen(v => !v)}
                    aria-expanded={accountOpen}
                    title={isCollapsed ? userName : undefined}
                    className={`
                        flex w-full items-center rounded-control transition-colors
                        hover:bg-surface-overlay
                        ${isCollapsed ? 'justify-center p-1.5' : 'gap-2.5 p-1.5'}
                    `}
                >
                    <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-surface-overlay text-content-secondary">
                        {avatarUrl
                            ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                            : <UserIcon size={16} />
                        }
                    </span>
                    {!isCollapsed && (
                        <>
                            <span className="min-w-0 flex-1 text-left">
                                <span className="block truncate text-sm font-semibold text-content-primary">{userName}</span>
                                <span className="block truncate text-xs text-content-muted">{userEmail}</span>
                            </span>
                            <ChevronsUpDown size={14} className="shrink-0 text-content-muted" />
                        </>
                    )}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
