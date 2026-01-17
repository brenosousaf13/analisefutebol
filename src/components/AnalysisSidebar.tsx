import React from 'react';
import { X, Shield, Swords } from 'lucide-react';

interface AnalysisSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    defensiveNotes: string;
    offensiveNotes: string;
    onDefensiveNotesChange: (notes: string) => void;
    onOffensiveNotesChange: (notes: string) => void;
    autoSaveStatus?: 'idle' | 'saving' | 'saved' | 'error';
}

const AnalysisSidebar: React.FC<AnalysisSidebarProps> = ({
    isOpen,
    onClose,
    defensiveNotes,
    offensiveNotes,
    onDefensiveNotesChange,
    onOffensiveNotesChange,
    autoSaveStatus = 'idle'
}) => {
    if (!isOpen) return null;

    const getStatusText = () => {
        switch (autoSaveStatus) {
            case 'saving': return 'Salvando...';
            case 'saved': return 'Salvo automaticamente';
            case 'error': return 'Erro ao salvar';
            default: return 'Salvamento automático ativado';
        }
    };

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/40 z-40"
                onClick={onClose}
            />

            {/* Sidebar - Full height on left */}
            <div className="fixed left-16 top-0 bottom-0 w-[700px] max-w-[calc(100vw-80px)] bg-nav-dark z-50 flex flex-col shadow-2xl border-r border-gray-700">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700 shrink-0">
                    <h2 className="text-white font-bold text-xl uppercase tracking-wide">
                        Análise Tática por Fase
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-lg bg-panel-dark text-gray-400 hover:text-white hover:bg-gray-700 flex items-center justify-center transition border border-gray-700"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content with scroll */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-2 gap-6 h-full min-h-[500px]">

                        {/* Defensive Phase */}
                        <div className="flex flex-col">
                            <h3 className="text-green-400 font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Shield className="w-4 h-4" />
                                Fase Defensiva
                            </h3>

                            <textarea
                                value={defensiveNotes}
                                onChange={(e) => onDefensiveNotesChange(e.target.value)}
                                placeholder="Estratégias de marcação, posicionamento defensivo, coberturas..."
                                className="flex-1 min-h-[400px] bg-panel-dark text-white p-4 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-green-500/50 placeholder-gray-500 border border-gray-700"
                            />
                        </div>

                        {/* Offensive Phase */}
                        <div className="flex flex-col">
                            <h3 className="text-orange-400 font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Swords className="w-4 h-4" />
                                Fase Ofensiva
                            </h3>

                            <textarea
                                value={offensiveNotes}
                                onChange={(e) => onOffensiveNotesChange(e.target.value)}
                                placeholder="Estratégias de ataque, movimentações, jogadas ensaiadas..."
                                className="flex-1 min-h-[400px] bg-panel-dark text-white p-4 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-gray-500 border border-gray-700"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer with save status */}
                <div className="p-4 border-t border-gray-700 text-center shrink-0">
                    <span className={`text-sm ${autoSaveStatus === 'error' ? 'text-red-400' :
                            autoSaveStatus === 'saved' ? 'text-green-400' :
                                'text-gray-500'
                        }`}>
                        {getStatusText()}
                    </span>
                </div>
            </div>
        </>
    );
};

export default AnalysisSidebar;
