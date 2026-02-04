import React, { useState } from 'react';
import { X, Shield, Swords, Tag } from 'lucide-react';
import { TagInput } from './TagInput';

interface AnalysisSidebarProps {
    isOpen: boolean;
    onClose: () => void;

    // Team Info
    homeTeamName: string;
    awayTeamName: string;

    // Home Notes
    homeDefensiveNotes: string;
    homeOffensiveNotes: string;
    onHomeDefensiveNotesChange: (notes: string) => void;
    onHomeOffensiveNotesChange: (notes: string) => void;

    // Away Notes
    awayDefensiveNotes: string;
    awayOffensiveNotes: string;
    onAwayDefensiveNotesChange: (notes: string) => void;
    onAwayOffensiveNotesChange: (notes: string) => void;

    autoSaveStatus?: 'idle' | 'saving' | 'saved' | 'error';
    readOnly?: boolean;

    // Tags
    tags: string[];
    onTagsChange: (tags: string[]) => void;
}

const AnalysisSidebar: React.FC<AnalysisSidebarProps> = ({
    isOpen,
    onClose,
    homeTeamName,
    awayTeamName,

    homeDefensiveNotes,
    homeOffensiveNotes,
    onHomeDefensiveNotesChange,
    onHomeOffensiveNotesChange,

    awayDefensiveNotes,
    awayOffensiveNotes,
    onAwayDefensiveNotesChange,
    onAwayOffensiveNotesChange,



    autoSaveStatus = 'idle',
    readOnly = false,

    tags,
    onTagsChange
}: AnalysisSidebarProps) => {
    const [activeTab, setActiveTab] = useState<'home' | 'away'>('home');

    const getStatusText = () => {
        switch (autoSaveStatus) {
            case 'saving': return 'Salvando...';
            case 'saved': return 'Salvo automaticamente';
            case 'error': return 'Erro ao salvar';
            default: return 'Salvamento automático ativado';
        }
    };

    const isHome = activeTab === 'home';

    return (
        <div className={`fixed inset-0 z-50 ${isOpen ? 'visible' : 'invisible'}`}>
            {/* Overlay/Backdrop */}
            <div
                className={`
                    absolute inset-0 bg-black/50 transition-opacity duration-300 ease-in-out
                    ${isOpen ? 'opacity-100' : 'opacity-0'}
                `}
                onClick={onClose}
            />

            {/* Sidebar Panel */}
            <div className={`
                absolute top-0 left-0 bottom-0 w-full sm:w-[600px] lg:w-[800px] xl:w-[1100px] max-w-full sm:max-w-[calc(100vw-64px)]
                bg-nav-dark shadow-2xl border-r border-gray-700 font-sans cursor-default
                transform transition-transform duration-300 ease-in-out
                flex flex-col
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700 shrink-0">
                    <h2 className="text-white font-bold text-xl uppercase tracking-wide">
                        Análise Tática
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-lg bg-panel-dark text-gray-400 hover:text-white hover:bg-gray-700 flex items-center justify-center transition border border-gray-700"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tags Section */}
                <div className="px-6 py-4 border-b border-gray-700 bg-panel-dark/50">
                    <h3 className="text-gray-400 font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Tag className="w-3 h-3" />
                        Tags da Análise
                    </h3>
                    <TagInput
                        tags={tags}
                        onTagsChange={onTagsChange}
                        placeholder="Adicionar tag (ex: Pressão Alta)..."
                        readOnly={readOnly}
                    />
                </div>

                {/* Team Switcher Tabs */}
                <div className="px-6 pt-4 pb-0 flex gap-2 border-b border-gray-700">
                    <button
                        onClick={() => setActiveTab('home')}
                        className={`flex-1 py-3 px-6 text-sm font-bold uppercase tracking-wide rounded-t-lg transition-colors border-t border-l border-r ${activeTab === 'home'
                            ? 'bg-panel-dark text-white border-gray-700 border-b-panel-dark'
                            : 'bg-transparent text-gray-500 border-transparent hover:text-gray-300'
                            } `}
                        style={{ marginBottom: '-1px' }}
                    >
                        {homeTeamName}
                    </button>
                    <button
                        onClick={() => setActiveTab('away')}
                        className={`flex-1 py-3 px-6 text-sm font-bold uppercase tracking-wide rounded-t-lg transition-colors border-t border-l border-r ${activeTab === 'away'
                            ? 'bg-panel-dark text-white border-gray-700 border-b-panel-dark'
                            : 'bg-transparent text-gray-500 border-transparent hover:text-gray-300'
                            } `}
                        style={{ marginBottom: '-1px' }}
                    >
                        {awayTeamName}
                    </button>
                </div>

                {/* Content with scroll */}
                <div className="flex-1 overflow-y-auto p-6 bg-panel-dark min-h-0">
                    <div className="grid grid-cols-2 gap-6 h-full min-h-[600px]">

                        {/* Column 1: Defensive */}
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col h-full">
                                <h3 className="text-green-400 font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Shield className="w-4 h-4" />
                                    Fase Defensiva
                                </h3>
                                <textarea
                                    value={isHome ? homeDefensiveNotes : awayDefensiveNotes}
                                    onChange={(e) => isHome ? onHomeDefensiveNotesChange(e.target.value) : onAwayDefensiveNotesChange(e.target.value)}
                                    placeholder={`Padrões defensivos do ${isHome ? homeTeamName : awayTeamName}...`}
                                    className="flex-1 min-h-[400px] bg-nav-dark text-white p-4 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-green-500/50 placeholder-gray-500 border border-gray-700 disabled:opacity-70 disabled:cursor-default"
                                    readOnly={readOnly}
                                    disabled={readOnly}
                                />
                            </div>
                        </div>

                        {/* Column 2: Offensive */}
                        <div className="flex flex-col gap-6">

                            {/* Offensive */}
                            <div className="flex flex-col h-full">
                                <h3 className="text-orange-400 font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Swords className="w-4 h-4" />
                                    Fase Ofensiva
                                </h3>
                                <textarea
                                    value={isHome ? homeOffensiveNotes : awayOffensiveNotes}
                                    onChange={(e) => isHome ? onHomeOffensiveNotesChange(e.target.value) : onAwayOffensiveNotesChange(e.target.value)}
                                    placeholder={`Padrões ofensivos do ${isHome ? homeTeamName : awayTeamName}...`}
                                    className="flex-1 min-h-[400px] bg-nav-dark text-white p-4 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-gray-500 border border-gray-700 disabled:opacity-70 disabled:cursor-default"
                                    readOnly={readOnly}
                                    disabled={readOnly}
                                />
                            </div>

                        </div>
                    </div>
                </div>

                {/* Footer with save status - COMACTO */}
                <div className="py-2 px-4 border-t border-gray-700 text-center shrink-0 bg-nav-dark">
                    <span className="text-xs text-gray-500">
                        {readOnly ? 'Modo de Visualização (Somente Leitura)' : getStatusText()}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default AnalysisSidebar;
