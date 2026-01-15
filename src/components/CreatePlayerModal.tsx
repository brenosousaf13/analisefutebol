import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Player } from '../types/Player';


interface CreatePlayerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: { name: string; number: number; position: string; target: 'field' | 'bench' }) => void;
    existingNumbers: number[];
}

const POSITIONS = [
    { label: 'Goleiro', value: 'GOL' },
    { label: 'Zagueiro', value: 'ZAG' },
    { label: 'Lateral Direito', value: 'LD' },
    { label: 'Lateral Esquerdo', value: 'LE' },
    { label: 'Volante', value: 'VOL' },
    { label: 'Meia', value: 'MEI' },
    { label: 'Atacante', value: 'ATA' },
    { label: 'Ponta Direita', value: 'PD' },
    { label: 'Ponta Esquerda', value: 'PE' },
];

const CreatePlayerModal: React.FC<CreatePlayerModalProps> = ({ isOpen, onClose, onConfirm, existingNumbers }) => {
    const [name, setName] = useState('');
    const [number, setNumber] = useState<string>('');
    const [position, setPosition] = useState('ATA'); // Default
    const [target, setTarget] = useState<'field' | 'bench'>('bench');

    // Validation State
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            // Reset state when opening
            setName('');
            setNumber('');
            setPosition('ATA');
            setTarget('bench');
            setError(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        const num = parseInt(number);

        // Validations
        if (!name || name.length < 2) {
            setError('Nome deve ter pelo menos 2 caracteres');
            return;
        }
        if (isNaN(num) || num < 1 || num > 99) {
            setError('Número inválido (1-99)');
            return;
        }
        if (existingNumbers.includes(num)) {
            setError(`O número ${num} já está em uso`);
            return;
        }

        onConfirm({ name, number: num, position, target });
        onClose();
    };

    const previewPlayer: Player = {
        id: 0,
        name: name || 'Nome',
        number: parseInt(number) || 0,
        position: { x: 50, y: 50 }, // Irrelevant for preview

    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#242938] border border-gray-700 rounded-xl w-full max-w-md shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-[#1f2430]">
                    <div>
                        <h2 className="text-white font-bold text-lg">Novo Jogador</h2>
                        <p className="text-gray-400 text-xs mt-0.5">Adicione um jogador personalizado à análise</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white hover:bg-gray-700 p-2 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">

                    {/* Live Preview Area */}
                    <div className="flex flex-col items-center justify-center py-4 bg-[#1a1f2e] rounded-lg border border-gray-700 border-dashed relative">
                        <span className="absolute top-2 left-2 text-[10px] text-gray-500 uppercase font-bold tracking-wider">Preview</span>
                        <div className="transform scale-125 mb-2">
                            {/* Manually rendering marker style for preview to ensure it looks exactly like the field ones */}
                            <div className="flex flex-col items-center gap-1">
                                <div className="w-10 h-10 rounded-full bg-accent-yellow text-gray-900 border-2 border-white shadow-lg flex items-center justify-center font-bold text-sm transition-transform duration-300">
                                    {previewPlayer.number || '?'}
                                </div>
                                <span className="text-white text-xs font-semibold px-2 py-0.5 bg-black/50 rounded-full backdrop-blur-sm">
                                    {previewPlayer.name}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-4">
                        {/* Name */}
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Nome do Jogador</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => { setError(null); setName(e.target.value); }}
                                className="w-full bg-[#1a1f2e] border border-gray-700 rounded-lg text-white px-4 py-3 focus:border-accent-green focus:outline-none focus:ring-1 focus:ring-accent-green/20 placeholder-gray-600 transition-all text-sm"
                                placeholder="Ex: Neymar"
                                autoFocus
                            />
                        </div>

                        {/* Number & Position Row */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Número</label>
                                <input
                                    type="number"
                                    value={number}
                                    onChange={(e) => { setError(null); setNumber(e.target.value); }}
                                    className="w-full bg-[#1a1f2e] border border-gray-700 rounded-lg text-white px-4 py-3 focus:border-accent-green focus:outline-none focus:ring-1 focus:ring-accent-green/20 text-center font-mono font-bold text-sm"
                                    placeholder="10"
                                    min="1"
                                    max="99"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Posição</label>
                                <div className="relative">
                                    <select
                                        value={position}
                                        onChange={(e) => setPosition(e.target.value)}
                                        className="w-full bg-[#1a1f2e] border border-gray-700 rounded-lg text-white px-4 py-3 appearance-none focus:border-accent-green focus:outline-none focus:ring-1 focus:ring-accent-green/20 text-sm"
                                    >
                                        {POSITIONS.map(pos => <option key={pos.value} value={pos.value}>{pos.label}</option>)}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                        ▼
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Target Radio */}
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Adicionar em</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${target === 'field' ? 'border-accent-green' : 'border-gray-500 group-hover:border-white'}`}>
                                        {target === 'field' && <div className="w-2 h-2 rounded-full bg-accent-green" />}
                                    </div>
                                    <input type="radio" className="hidden" checked={target === 'field'} onChange={() => setTarget('field')} />
                                    <span className={`text-sm ${target === 'field' ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>Campo</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${target === 'bench' ? 'border-accent-green' : 'border-gray-500 group-hover:border-white'}`}>
                                        {target === 'bench' && <div className="w-2 h-2 rounded-full bg-accent-green" />}
                                    </div>
                                    <input type="radio" className="hidden" checked={target === 'bench'} onChange={() => setTarget('bench')} />
                                    <span className={`text-sm ${target === 'bench' ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>Reservas</span>
                                </label>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="text-red-400 text-xs bg-red-400/10 p-2 rounded border border-red-400/20 flex items-center gap-2">
                                <span>⚠️</span> {error}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-[#1f2430] border-t border-gray-700 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-400 hover:text-white text-sm font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!name || !number}
                        className="px-6 py-2 bg-accent-green hover:bg-green-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-green-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                    >
                        Adicionar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreatePlayerModal;
