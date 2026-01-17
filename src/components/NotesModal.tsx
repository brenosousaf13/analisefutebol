import React, { useState, useEffect, useRef } from 'react';
import {
    X, Home, Users, Bold, Italic, Underline,
    List, Undo, Redo, AlertTriangle, CheckCircle, Loader2
} from 'lucide-react';

interface NotesModalProps {
    isOpen: boolean;
    onClose: () => void;
    homeTeamName: string;
    awayTeamName: string;
    homeNotes: string;
    awayNotes: string;
    homeUpdatedAt?: string;
    awayUpdatedAt?: string;
    onSave: (team: 'home' | 'away', content: string) => void;
    saveStatus: 'saved' | 'saving' | 'error';
}

const NotesModal: React.FC<NotesModalProps> = ({
    isOpen,
    onClose,
    homeTeamName,
    awayTeamName,
    homeNotes,
    awayNotes,
    homeUpdatedAt,
    awayUpdatedAt,
    onSave,
    saveStatus
}) => {
    const [activeTab, setActiveTab] = useState<'home' | 'away'>('home');
    const [localContent, setLocalContent] = useState('');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);

    const editorRef = useRef<HTMLDivElement>(null);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Initialize content when modal opens or tab changes
    useEffect(() => {
        if (isOpen) {
            const content = activeTab === 'home' ? homeNotes : awayNotes;
            setLocalContent(content);
            if (editorRef.current) {
                editorRef.current.innerHTML = content;
            }
            setHasUnsavedChanges(false);
        }
    }, [isOpen, activeTab, homeNotes, awayNotes]);

    // Handle Tab Switch with Auto-Save
    const handleTabSwitch = (newTab: 'home' | 'away') => {
        if (newTab === activeTab) return;

        // Force save current before switching
        if (hasUnsavedChanges) {
            onSave(activeTab, localContent);
        }

        setActiveTab(newTab);
    };

    // Auto-Save Logic
    const handleContentChange = () => {
        if (!editorRef.current) return;

        const newContent = editorRef.current.innerHTML;
        setLocalContent(newContent);
        setHasUnsavedChanges(true);

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            onSave(activeTab, newContent);
            setHasUnsavedChanges(false); // Optimistic
        }, 2000);
    };

    const handleFormat = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
    };

    const handleClose = () => {
        if (hasUnsavedChanges) {
            setShowCloseConfirmation(true);
        } else {
            onClose();
        }
    };

    const confirmClose = () => {
        onClose();
        setShowCloseConfirmation(false);
    };

    if (!isOpen) return null;

    // Last Updated Display
    const currentUpdatedAt = activeTab === 'home' ? homeUpdatedAt : awayUpdatedAt;
    const formattedDate = currentUpdatedAt
        ? new Date(currentUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-200">
            {/* Modal Container - Full width */}
            <div className="bg-[#1a1f2e] w-[98%] h-[90vh] max-h-[850px] rounded-2xl border border-gray-700 shadow-2xl flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-200">

                {/* Confirmation Overlay */}
                {showCloseConfirmation && (
                    <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center">
                        <div className="bg-[#242938] p-6 rounded-xl border border-gray-600 max-w-sm text-center">
                            <h3 className="text-white font-bold text-lg mb-2">Alterações não salvas</h3>
                            <p className="text-gray-400 text-sm mb-6">Você tem alterações que ainda não foram salvas. Deseja sair mesmo assim?</p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setShowCloseConfirmation(false)}
                                    className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 text-xs font-bold"
                                >
                                    Continuar Editando
                                </button>
                                <button
                                    onClick={confirmClose}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 text-xs font-bold"
                                >
                                    Sair sem Salvar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between bg-[#1f2430]">
                    <div className="flex-1"></div>
                    <h2 className="text-white font-semibold text-lg tracking-wide">NOTAS DE ANÁLISE</h2>
                    <div className="flex-1 flex justify-end">
                        <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 p-6 justify-center bg-[#1f2430]">
                    {/* Home Tab */}
                    <button
                        onClick={() => handleTabSwitch('home')}
                        className={`w-48 p-4 rounded-xl border transition-all relative group flex flex-col items-center gap-2
                            ${activeTab === 'home'
                                ? 'bg-[#242938] border-green-500 shadow-lg shadow-green-900/10'
                                : 'bg-transparent border-gray-700 hover:border-gray-600 text-gray-500 hover:text-gray-400'
                            }`}
                    >
                        <Home size={20} className={activeTab === 'home' ? 'text-green-500' : ''} />
                        <div className="text-center">
                            <span className={`text-[10px] font-bold uppercase tracking-wider block ${activeTab === 'home' ? 'text-green-500' : ''}`}>CASA</span>
                            <span className={`text-sm font-bold block mt-0.5 ${activeTab === 'home' ? 'text-white' : ''}`}>{homeTeamName}</span>
                        </div>
                        {homeNotes && <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-green-500"></div>}
                    </button>

                    {/* Away Tab */}
                    <button
                        onClick={() => handleTabSwitch('away')}
                        className={`w-48 p-4 rounded-xl border transition-all relative group flex flex-col items-center gap-2
                            ${activeTab === 'away'
                                ? 'bg-[#242938] border-green-500 shadow-lg shadow-green-900/10'
                                : 'bg-transparent border-gray-700 hover:border-gray-600 text-gray-500 hover:text-gray-400'
                            }`}
                    >
                        <Users size={20} className={activeTab === 'away' ? 'text-green-500' : ''} />
                        <div className="text-center">
                            <span className={`text-[10px] font-bold uppercase tracking-wider block ${activeTab === 'away' ? 'text-green-500' : ''}`}>VISITANTE</span>
                            <span className={`text-sm font-bold block mt-0.5 ${activeTab === 'away' ? 'text-white' : ''}`}>{awayTeamName}</span>
                        </div>
                        {awayNotes && <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-green-500"></div>}
                    </button>
                </div>

                {/* Toolbar */}
                <div className="px-8 pb-4 bg-[#1f2430] flex justify-center">
                    <div className="bg-[#242938] border border-gray-700 rounded-lg p-1 flex items-center gap-1">
                        <ToolbarBtn icon={<Bold size={16} />} onClick={() => handleFormat('bold')} title="Negrito (Ctrl+B)" />
                        <ToolbarBtn icon={<Italic size={16} />} onClick={() => handleFormat('italic')} title="Itálico (Ctrl+I)" />
                        <ToolbarBtn icon={<Underline size={16} />} onClick={() => handleFormat('underline')} title="Sublinhado (Ctrl+U)" />
                        <div className="w-px h-6 bg-gray-700 mx-1"></div>
                        <ToolbarBtn label="H1" onClick={() => handleFormat('formatBlock', 'H3')} title="Título" />
                        <ToolbarBtn icon={<List size={16} />} onClick={() => handleFormat('insertUnorderedList')} title="Lista" />
                        <div className="w-px h-6 bg-gray-700 mx-1"></div>
                        <ToolbarBtn icon={<Undo size={16} />} onClick={() => handleFormat('undo')} title="Desfazer" />
                        <ToolbarBtn icon={<Redo size={16} />} onClick={() => handleFormat('redo')} title="Refazer" />
                    </div>
                </div>

                {/* Editor Area */}
                <div className="flex-1 bg-[#1f2430] px-8 pb-6 overflow-hidden flex flex-col">
                    <div
                        className="flex-1 bg-[#0d1117] border border-gray-700 rounded-xl p-6 overflow-y-auto cursor-text focus-within:ring-1 focus-within:ring-green-500/30 transition-shadow"
                        onClick={() => editorRef.current?.focus()}
                    >
                        <div
                            ref={editorRef}
                            contentEditable
                            className="outline-none text-gray-200 leading-relaxed min-h-full whitespace-pre-wrap empty:before:content-[attr(placeholder)] empty:before:text-gray-600 empty:before:italic"
                            onInput={handleContentChange}
                            // placeholder={`Digite sua análise detalhada sobre o ${activeTab === 'home' ? homeTeamName : awayTeamName} aqui...`}
                            // Note: placeholder attribute is not standard on div, utilized CSS empty:before trick
                            data-placeholder={`Digite sua análise detalhada sobre o ${activeTab === 'home' ? homeTeamName : awayTeamName} aqui...`}
                            onKeyDown={(e) => {
                                if (e.key === 'b' && (e.ctrlKey || e.metaKey)) {
                                    e.preventDefault(); handleFormat('bold');
                                }
                                if (e.key === 'i' && (e.ctrlKey || e.metaKey)) {
                                    e.preventDefault(); handleFormat('italic');
                                }
                                if (e.key === 'u' && (e.ctrlKey || e.metaKey)) {
                                    e.preventDefault(); handleFormat('underline');
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-[#1f2430] border-t border-gray-700 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {saveStatus === 'saving' && (
                            <span className="flex items-center gap-2 text-yellow-500 text-xs font-medium">
                                <Loader2 size={14} className="animate-spin" /> Salvando...
                            </span>
                        )}
                        {saveStatus === 'saved' && (
                            <span className="flex items-center gap-2 text-green-500 text-xs font-medium">
                                <CheckCircle size={14} /> Salvo automaticamente
                                {formattedDate && <span className="text-gray-500 font-normal">· {formattedDate}</span>}
                            </span>
                        )}
                        {saveStatus === 'error' && (
                            <span className="flex items-center gap-2 text-red-500 text-xs font-medium">
                                <AlertTriangle size={14} /> Erro ao salvar
                            </span>
                        )}
                    </div>

                    <button
                        onClick={handleClose}
                        className="px-6 py-2 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white text-xs font-bold transition-colors"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

const ToolbarBtn = ({ icon, label, onClick, title }: any) => (
    <button
        onClick={onClick}
        title={title}
        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors text-xs font-bold min-w-[28px]"
    >
        {icon || label}
    </button>
);

export default NotesModal;
