import React, { useState, useEffect } from 'react';
import type { Player } from '../types/Player';

interface PlayerNotesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (playerId: number, note: string) => void;
    player: Player | null;
    teamColor: 'blue' | 'red';
    initialNote: string;
    onRemove?: (id: number) => void;
}

const PlayerNotesModal: React.FC<PlayerNotesModalProps> = ({
    isOpen,
    onClose,
    onSave,
    player,
    teamColor,
    initialNote,
    onRemove
}) => {
    const [note, setNote] = useState(initialNote);

    // Reset note when modal opens with new data
    useEffect(() => {
        setNote(initialNote);
    }, [initialNote, isOpen]);

    if (!isOpen || !player) return null;

    const bgColor = teamColor === 'blue' ? 'bg-[#3b82f6]' : 'bg-[#ef4444]';
    const teamNameDisplay = teamColor === 'blue' ? 'Time da Casa' : 'Time Visitante';
    const tagColor = teamColor === 'blue' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800';

    const handleSave = () => {
        onSave(player.id, note);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Card */}
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-[400px] p-6 transform transition-all">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>

                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <div className={`w-12 h-12 ${bgColor} rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md border-2 border-white`}>
                        {player.number}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">{player.name}</h3>
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${tagColor}`}>
                            {teamNameDisplay}
                        </span>
                    </div>
                </div>

                {/* Body */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Anotações do Jogador
                    </label>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Escreva observações táticas, físicas ou técnicas sobre este jogador..."
                        className="w-full min-h-[150px] p-3 border border-gray-300 rounded-md focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none resize-none text-sm text-gray-700"
                        autoFocus
                    />
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center gap-3">
                    {/* Remove Action (Only for manual players) */}
                    <div>
                        {player.isManual && onRemove && (
                            <button
                                onClick={() => {
                                    if (window.confirm('Tem certeza que deseja remover este jogador?')) {
                                        onRemove(player.id);
                                        onClose();
                                    }
                                }}
                                className="text-sm font-medium text-red-500 hover:text-red-700 transition-colors"
                            >
                                Remover Jogador
                            </button>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-md transition-colors shadow-sm"
                        >
                            Salvar Anotação
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayerNotesModal;
