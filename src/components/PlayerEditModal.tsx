import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Player } from '../types/Player';

interface PlayerEditModalProps {
    player: Player | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedPlayer: Player) => void;
}

const POSITIONS = [
    'Goleiro',
    'Zagueiro',
    'Lateral Direito',
    'Lateral Esquerdo',
    'Volante',
    'Meia',
    'Meia Atacante',
    'Ponta Direita',
    'Ponta Esquerda',
    'Centroavante',
    'Atacante'
];

export default function PlayerEditModal({ player, isOpen, onClose, onSave }: PlayerEditModalProps) {
    const [name, setName] = useState('');
    const [number, setNumber] = useState(1);
    const [positionName, setPositionName] = useState('Meia');

    // Reset values when player changes
    useEffect(() => {
        if (player) {
            setName(player.name);
            setNumber(player.number);
            // Use player name as position if no dedicated field
            setPositionName('Meia');
        }
    }, [player]);

    const handleSave = () => {
        if (!player) return;

        onSave({
            ...player,
            name,
            number
        });
        onClose();
    };

    if (!isOpen || !player) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1f2e] rounded-xl w-full max-w-md border border-gray-700 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">Editar Jogador</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Preview */}
                    <div className="flex justify-center mb-6">
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-full bg-accent-yellow flex items-center justify-center text-gray-900 text-2xl font-bold mx-auto border-2 border-white shadow-lg">
                                {number}
                            </div>
                            <p className="text-white mt-2 font-medium">{name || 'Nome'}</p>
                            <p className="text-gray-400 text-sm">{positionName}</p>
                        </div>
                    </div>

                    {/* Form */}
                    <div className="space-y-4">
                        {/* Name */}
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Nome</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Nome do jogador"
                                className="w-full bg-[#242938] text-white px-4 py-2.5 rounded-lg border border-gray-700 focus:outline-none focus:border-green-500 transition-colors"
                            />
                        </div>

                        {/* Number */}
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Número</label>
                            <input
                                type="number"
                                value={number}
                                onChange={(e) => setNumber(parseInt(e.target.value) || 1)}
                                min={1}
                                max={99}
                                className="w-full bg-[#242938] text-white px-4 py-2.5 rounded-lg border border-gray-700 focus:outline-none focus:border-green-500 transition-colors"
                            />
                        </div>

                        {/* Position */}
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Posição</label>
                            <select
                                value={positionName}
                                onChange={(e) => setPositionName(e.target.value)}
                                className="w-full bg-[#242938] text-white px-4 py-2.5 rounded-lg border border-gray-700 focus:outline-none focus:border-green-500 transition-colors"
                            >
                                {POSITIONS.map(pos => (
                                    <option key={pos} value={pos}>{pos}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex-1 px-4 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                        >
                            Salvar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
