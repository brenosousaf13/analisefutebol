import React, { useState } from 'react';
import { Plus, X, Edit2, Check } from 'lucide-react';
import type { AnalysisBoard } from '../services/analysisService';

interface AnalysisTabsProps {
    boards: AnalysisBoard[];
    activeBoardId: string | null;
    onSwitchBoard: (boardId: string | null) => void;
    onAddBoard: () => void;
    onUpdateBoardTitle: (boardId: string, newTitle: string) => void;
    onDeleteBoard: (boardId: string) => void;
    readOnly?: boolean;
}

export const AnalysisTabs: React.FC<AnalysisTabsProps> = ({
    boards,
    activeBoardId,
    onSwitchBoard,
    onAddBoard,
    onUpdateBoardTitle,
    onDeleteBoard,
    readOnly = false
}) => {
    const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');

    const startEditing = (board: AnalysisBoard) => {
        setEditingBoardId(board.id);
        setEditTitle(board.title);
    };

    const saveEditing = () => {
        if (editingBoardId && editTitle.trim()) {
            onUpdateBoardTitle(editingBoardId, editTitle.trim());
        }
        setEditingBoardId(null);
        setEditTitle('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            saveEditing();
        } else if (e.key === 'Escape') {
            setEditingBoardId(null);
            setEditTitle('');
        }
    };

    return (
        <div className="flex items-end gap-0.5 overflow-x-auto pt-0.5 lg:pt-2 px-1 lg:px-2 select-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <style>
                {`
                .flex::-webkit-scrollbar {
                    display: none;
                }
                `}
            </style>
            {/* Default Tab (Legacy/Root) */}
            <div
                onClick={() => onSwitchBoard(null)}
                className={`
                    group relative flex items-center gap-1 px-2.5 py-1 lg:px-4 lg:py-2 rounded-t-lg text-xs lg:text-sm font-medium transition-colors cursor-pointer min-w-[72px] lg:min-w-[120px] justify-center
                    ${activeBoardId === null
                        ? 'bg-[#1a1a1a] text-white'
                        : 'bg-black/60 text-gray-500 hover:text-gray-300 hover:bg-black/80'}
                `}
                style={{
                    zIndex: activeBoardId === null ? 10 : 1
                }}
            >
                <span>Principal</span>
                {/* Active Indicator Line on Top */}
                {activeBoardId === null && (
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-brand-primary rounded-t-lg" />
                )}
            </div>

            {/* Dynamic Boards */}
            {boards.map(board => (
                <div
                    key={board.id}
                    onClick={() => onSwitchBoard(board.id)}
                    onDoubleClick={(e) => {
                        if (readOnly) return;
                        e.stopPropagation();
                        startEditing(board);
                    }}
                    className={`
                        group relative flex items-center gap-1 px-2.5 py-1 lg:px-4 lg:py-2 rounded-t-lg text-xs lg:text-sm font-medium transition-colors cursor-pointer min-w-[72px] lg:min-w-[120px] justify-center
                        ${activeBoardId === board.id
                            ? 'bg-[#1a1a1a] text-white'
                            : 'bg-black/60 text-gray-500 hover:text-gray-300 hover:bg-black/80'}
                    `}
                    style={{
                        zIndex: activeBoardId === board.id ? 10 : 1
                    }}
                >
                    {editingBoardId === board.id ? (
                        <div className="flex items-center gap-1 w-full" onClick={e => e.stopPropagation()}>
                            <input
                                autoFocus
                                type="text"
                                value={editTitle}
                                onChange={e => setEditTitle(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onBlur={saveEditing}
                                className="w-full bg-gray-900 border border-gray-600 rounded px-1 py-0.5 text-xs text-white focus:outline-none focus:border-green-500"
                            />
                            <button onClick={saveEditing} className="text-green-500 hover:text-green-400">
                                <Check size={14} />
                            </button>
                        </div>
                    ) : (
                        <>
                            <span className="truncate max-w-[80px] lg:max-w-[120px]">{board.title}</span>
                            {!readOnly && (
                                <div className={`absolute right-1 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-0.5 ${activeBoardId === board.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            startEditing(board);
                                        }}
                                        className="p-0.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
                                        title="Renomear"
                                    >
                                        <Edit2 size={10} />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm('Tem certeza que deseja excluir esta aba?')) onDeleteBoard(board.id);
                                        }}
                                        className="p-0.5 hover:bg-red-900/50 rounded text-gray-500 hover:text-red-400"
                                        title="Excluir"
                                    >
                                        <X size={10} />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                    {/* Active Indicator Line */}
                    {activeBoardId === board.id && (
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-brand-primary rounded-t-lg" />
                    )}
                </div>
            ))}

            {/* Add Tab Button */}
            {!readOnly && (
                <button
                    onClick={onAddBoard}
                    className="flex items-center justify-center w-5 h-5 lg:w-8 lg:h-8 rounded-full bg-black/40 hover:bg-black/60 text-gray-400 hover:text-white transition-colors ml-1 lg:ml-2 mb-0.5 lg:mb-1 shrink-0"
                    title="Nova Aba"
                >
                    <Plus size={11} className="lg:hidden" />
                    <Plus size={16} className="hidden lg:block" />
                </button>
            )}
        </div>
    );
};
