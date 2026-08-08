import React, { useEffect, useRef, useState } from 'react';
import { Menu, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';

interface AppLayoutProps {
    children: React.ReactNode;
    /** Quando definido, a topbar mostra o campo de busca. */
    search?: {
        value: string;
        onChange: (value: string) => void;
        placeholder?: string;
        /** Painel de resultados, renderizado ancorado ao campo. */
        dropdown?: React.ReactNode;
        onFocus?: () => void;
    };
    /** Esconde a topbar — telas que trazem o proprio cabecalho. */
    bare?: boolean;
    /**
     * Botao de recolher grudado na borda esquerda do conteudo, para ganhar
     * largura em telas densas como a de visualizacao de analise.
     */
    edgeToggle?: boolean;
}

/**
 * Casca das telas internas: sidebar fixa a esquerda + topbar com busca.
 * A sidebar vira drawer abaixo de lg.
 */
const COLLAPSE_KEY = 'zona14_sidebar_collapsed';

function readCollapsed(): boolean {
    try {
        return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
        return false;
    }
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, search, bare = false, edgeToggle = false }) => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState<boolean>(readCollapsed);
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        try {
            localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
        } catch { /* storage indisponivel */ }
    }, [collapsed]);

    // Atalho de busca, como na referencia (Cmd/Ctrl + K).
    useEffect(() => {
        if (!search) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                searchRef.current?.focus();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [search]);

    return (
        <div className="min-h-screen bg-surface-base">
            <Sidebar
                collapsed={collapsed}
                onToggleCollapse={() => setCollapsed(v => !v)}
                mobileOpen={mobileOpen}
                onMobileClose={() => setMobileOpen(false)}
            />

            {/* Backdrop do drawer no mobile */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Recolher grudado na borda do conteudo, alinhado com a sidebar. */}
            {edgeToggle && (
                <button
                    onClick={() => setCollapsed(v => !v)}
                    aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
                    style={{ left: collapsed ? 68 : 232 }}
                    className="
                        fixed top-24 z-50 hidden -translate-x-1/2 rounded-full
                        border border-line bg-surface-raised p-1.5 text-content-secondary shadow-pop
                        transition-[left,colors] duration-sidebar ease-out
                        hover:text-content-primary lg:block
                    "
                >
                    {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
            )}

            {/* A sidebar e fixed, entao o conteudo compensa a largura dela no desktop. */}
            <div
                className={`transition-[padding] duration-sidebar ease-out ${collapsed ? 'lg:pl-[68px]' : 'lg:pl-[232px]'}`}
            >
                <header className={`sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface-base/85 px-4 backdrop-blur lg:px-8 ${bare ? 'lg:hidden' : ''}`}>
                    <button
                        onClick={() => setMobileOpen(true)}
                        aria-label="Abrir menu"
                        className="rounded-control p-2 text-content-secondary transition-colors hover:bg-surface-overlay hover:text-content-primary lg:hidden"
                    >
                        <Menu size={20} />
                    </button>

                    {search ? (
                        // min-w-0 + flex-1 em vez de w-full: como irmao do botao de
                        // menu num flex, w-full soma mais que 100% e alarga a pagina
                        // inteira no mobile.
                        <div data-search-box className="relative min-w-0 flex-1 max-w-xl">
                            <Search
                                size={16}
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-muted"
                            />
                            <input
                                ref={searchRef}
                                type="text"
                                value={search.value}
                                onChange={e => search.onChange(e.target.value)}
                                onFocus={search.onFocus}
                                placeholder={search.placeholder ?? 'Pesquise por times, jogadores, técnicos ou partidas'}
                                className="
                                    w-full rounded-control border border-line bg-surface-raised
                                    py-2.5 pl-9 pr-14 text-sm text-content-primary
                                    placeholder:text-content-muted
                                    outline-none transition-colors
                                    focus:border-line-strong focus:ring-2 focus:ring-brand-primary/25
                                "
                            />
                            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-line px-1.5 py-0.5 text-[10px] font-medium text-content-muted sm:block">
                                ⌘K
                            </kbd>

                            {search.dropdown}
                        </div>
                    ) : (
                        <div className="flex-1" />
                    )}
                </header>

                <main className={bare ? 'p-0' : 'px-4 py-6 lg:px-8 lg:py-8'}>{children}</main>
            </div>
        </div>
    );
};

export default AppLayout;
