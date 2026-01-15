import React from 'react';
import type { Fixture } from '../services/apiFootball';
import { Menu, Save, Check, Loader2 } from 'lucide-react';
import { useSidebar } from '../contexts/SidebarContext';

interface HeaderProps {
    onReset?: () => void;
    mode?: 'move' | 'draw';
    onModeChange?: (mode: 'move' | 'draw') => void;
    onClearArrows?: () => void;
    onSave?: () => void;
    saveStatus?: 'idle' | 'loading' | 'success';
    match?: Fixture | null;
}

const Header: React.FC<HeaderProps> = ({
    onReset,
    mode = 'move',
    onModeChange,
    onClearArrows,
    onSave,
    saveStatus = 'idle',
    match
}) => {
    const { toggle } = useSidebar();


    return (
        <header className="sticky top-0 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm z-50">
            <div className="flex items-center gap-4">
                <button
                    onClick={toggle}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-700"
                >
                    <Menu size={24} />
                </button>

                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-lg cursor-pointer" onClick={() => window.location.href = '/'}>
                    TF
                </div>

                {match ? (
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800 text-sm md:text-base">
                            {match.teams.home.name} vs {match.teams.away.name}
                        </span>
                    </div>
                ) : (
                    <h1 className="text-lg font-bold text-gray-800 tracking-tight">Tática Futebol</h1>
                )}
            </div>

            {/* Analysis Controls - Only show if callbacks are provided */}
            {onModeChange && onSave && onReset && (
                <div className="flex items-center gap-4">
                    {/* Mode Toggle */}
                    <div className="bg-gray-100 p-1 rounded-lg flex gap-1">
                        <button
                            onClick={() => onModeChange('move')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'move'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Mover
                        </button>
                        <button
                            onClick={() => onModeChange('draw')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'draw'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Desenhar
                        </button>
                    </div>

                    <div className="h-6 w-px bg-gray-200 mx-2 hidden md:block"></div>

                    {onClearArrows && (
                        <button
                            onClick={onClearArrows}
                            className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors hidden md:block"
                            title="Limpar todas as setas"
                        >
                            Limpar Setas
                        </button>
                    )}

                    <button
                        onClick={onSave}
                        disabled={saveStatus === 'loading' || saveStatus === 'success'}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-md transition-all shadow-sm ${saveStatus === 'success'
                            ? 'bg-green-600 cursor-default'
                            : 'bg-green-600 hover:bg-green-700'
                            }`}
                    >
                        {saveStatus === 'loading' ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Salvando...
                            </>
                        ) : saveStatus === 'success' ? (
                            <>
                                <Check size={18} />
                                Salvo!
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                Salvar
                            </>
                        )}
                    </button>

                    <button
                        onClick={onReset}
                        className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-md transition-colors shadow-sm"
                    >
                        Resetar
                    </button>
                </div>
            )}
        </header>
    );
};

export default Header;
