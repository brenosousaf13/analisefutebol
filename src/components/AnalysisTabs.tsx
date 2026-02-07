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
}

export const AnalysisTabs: React.FC<AnalysisTabsProps> = ({
    boards,
    activeBoardId,
    onSwitchBoard,
    onAddBoard,
    onUpdateBoardTitle,
    onDeleteBoard
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
        <div className="flex items-center gap-1 overflow-x-auto bg-gray-900 p-1 rounded-t-lg border-b border-gray-700 select-none">
            {/* Default Tab (Legacy/Root) */}
            <div
                onClick={() => onSwitchBoard(null)}
                className={`
                    group relative flex items-center gap-2 px-4 py-2 rounded-t-md text-sm font-medium transition-colors cursor-pointer border-t-2
                    ${activeBoardId === null
                        ? 'bg-gray-800 text-white border-green-500'
                        : 'bg-gray-800/50 text-gray-400 border-transparent hover:bg-gray-800 hover:text-gray-200'}
                `}
            >
                <span>Principal</span>
            </div>

            {/* Dynamic Boards */}
            {boards.map(board => (
                <div
                    key={board.id}
                    onClick={() => onSwitchBoard(board.id)}
                    onDoubleClick={(e) => {
                        e.stopPropagation();
                        startEditing(board);
                    }}
                    className={`
                        group relative flex items-center gap-2 px-4 py-2 rounded-t-md text-sm font-medium transition-colors cursor-pointer border-t-2 min-w-[120px] justify-between
                        ${activeBoardId === board.id
                            ? 'bg-gray-800 text-white border-green-500 z-10'
                            : 'bg-gray-800/50 text-gray-400 border-transparent hover:bg-gray-800 hover:text-gray-200'}
                    `}
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
                            <span className="truncate max-w-[150px]">{board.title}</span>
                            <div className={`flex items-center gap-1 ${activeBoardId === board.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        startEditing(board);
                                    }}
                                    className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
                                    title="Renomear"
                                >
                                    <Edit2 size={12} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm('Tem certeza que deseja excluir esta aba?')) onDeleteBoard(board.id);
                                    }}
                                    className="p-1 hover:bg-red-900/50 rounded text-gray-500 hover:text-red-400"
                                    title="Excluir"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            ))}

            {/* Add Tab Button */}
            <button
                onClick={onAddBoard}
                className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-700 text-gray-400 hover:text-green-400 transition-colors ml-1"
                title="Nova Aba"
            >
                <Plus size={18} />
            </button>
        </div>
    );
};
