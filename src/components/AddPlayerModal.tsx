import React, { useState, useEffect } from 'react';

interface AddPlayerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (name: string, number: number, team: 'home' | 'away') => void;
    defaultTeam?: 'home' | 'away';
}

const AddPlayerModal: React.FC<AddPlayerModalProps> = ({
    isOpen,
    onClose,
    onAdd,
    defaultTeam = 'home'
}) => {
    const [name, setName] = useState('');
    const [number, setNumber] = useState('');
    const [team, setTeam] = useState<'home' | 'away'>(defaultTeam);

    useEffect(() => {
        if (isOpen) {
            setTeam(defaultTeam);
            setName('');
            setNumber('');
        }
    }, [isOpen, defaultTeam]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !number) return;

        onAdd(name, parseInt(number), team);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm p-6 transform transition-all">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>

                <h3 className="text-xl font-bold text-gray-800 mb-6">Adicionar Jogador</h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Jogador</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 rounded-md p-2 focus:ring-emerald-500 focus:border-emerald-500"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Neymar Jr"
                            required
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                        <input
                            type="number"
                            className="w-full border border-gray-300 rounded-md p-2 focus:ring-emerald-500 focus:border-emerald-500"
                            value={number}
                            onChange={(e) => setNumber(e.target.value)}
                            placeholder="Ex: 10"
                            min="1"
                            max="99"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                        <select
                            className="w-full border border-gray-300 rounded-md p-2 focus:ring-emerald-500 focus:border-emerald-500"
                            value={team}
                            onChange={(e) => setTeam(e.target.value as 'home' | 'away')}
                        >
                            <option value="home">Time da Casa</option>
                            <option value="away">Time Visitante</option>
                        </select>
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors shadow-sm"
                        >
                            Adicionar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddPlayerModal;
