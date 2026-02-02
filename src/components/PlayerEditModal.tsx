import { useState, useEffect } from 'react';
import { X, ArrowRightLeft, LogOut, StickyNote } from 'lucide-react';
import type { Player } from '../types/Player';

interface PlayerEditModalProps {
    player: Player | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedPlayer: Player) => void;
    benchPlayers: Player[];
    onSubstitute: (starter: Player, benchPlayer: Player) => void;
    onSendToBench?: (player: Player) => void;
    onPromoteToStarter?: (player: Player) => void;
    substituteListTitle?: string;
}

export default function PlayerEditModal({
    player,
    isOpen,
    onClose,
    onSave,
    benchPlayers,
    onSubstitute,
    onSendToBench,
    onPromoteToStarter,
    substituteListTitle = 'Substituir por um Reserva'
}: PlayerEditModalProps) {
    const [name, setName] = useState('');
    const [number, setNumber] = useState(1);
    const [note, setNote] = useState('');
    const [positionName, setPositionName] = useState('Meia');
    const [activeTab, setActiveTab] = useState<'edit' | 'substitute' | 'notes'>('notes');

    // Reset values when player changes
    useEffect(() => {
        if (player) {
            setName(player.name);
            setNumber(player.number);
            setNote(player.note || '');
            // Use player name as position if no dedicated field (adjust if you add 'position' field to Player)
            setPositionName('Meia');
            setActiveTab('notes'); // Always start on notes
        }
    }, [player]);

    const handleSave = () => {
        if (!player) return;

        onSave({
            ...player,
            name,
            number,
            note
        });
        onClose();
    };

    const handleSubClick = (benchPlayer: Player) => {
        if (!player) return;
        onSubstitute(player, benchPlayer);
        onClose();
    };

    const handleSendToBenchClick = () => {
        if (!player || !onSendToBench) return;
        onSendToBench(player);
        onClose();
    };

    const handlePromoteToStarterClick = () => {
        if (!player || !onPromoteToStarter) return;
        onPromoteToStarter(player);
        onClose();
    };

    if (!isOpen || !player) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1f2e] rounded-xl w-full max-w-md border border-gray-700 shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700 pb-2">
                    <h2 className="text-xl font-bold text-white">Gerenciar Jogador</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-700 px-6">
                    <button
                        onClick={() => setActiveTab('notes')}
                        className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'notes'
                            ? 'border-green-500 text-green-500'
                            : 'border-transparent text-gray-400 hover:text-white'
                            }`}
                    >
                        <StickyNote size={16} />
                        Anotações
                    </button>
                    <button
                        onClick={() => setActiveTab('substitute')}
                        className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'substitute'
                            ? 'border-green-500 text-green-500'
                            : 'border-transparent text-gray-400 hover:text-white'
                            }`}
                    >
                        Substituição
                    </button>
                    <button
                        onClick={() => setActiveTab('edit')}
                        className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'edit'
                            ? 'border-green-500 text-green-500'
                            : 'border-transparent text-gray-400 hover:text-white'
                            }`}
                    >
                        Editar Informações
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="p-6 overflow-y-auto">
                    {activeTab === 'edit' && (
                        <>
                            {/* Preview */}
                            <div className="flex justify-center mb-6">
                                <div className="text-center">
                                    <div className="relative w-16 h-16 rounded-full bg-accent-yellow flex items-center justify-center text-gray-900 text-2xl font-bold mx-auto border-2 border-white shadow-lg">
                                        {number}
                                        {note.trim() && (
                                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border border-white" />
                                        )}
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
                                        onChange={(e) => setNumber(parseInt(e.target.value) || 0)}
                                        className="w-full bg-[#242938] text-white px-4 py-2.5 rounded-lg border border-gray-700 focus:outline-none focus:border-green-500 transition-colors"
                                    />
                                </div>

                                <div className="pt-4">
                                    <button
                                        onClick={handleSave}
                                        className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-green-900/20"
                                    >
                                        Salvar Alterações
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'notes' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Anotações do Jogador</label>
                                <textarea
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="Adicione observações táticas, físicas ou técnicas sobre este jogador..."
                                    className="w-full h-40 bg-[#242938] text-white px-4 py-3 rounded-lg border border-gray-700 focus:outline-none focus:border-green-500 transition-colors resize-none"
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    Estas anotações são salvas com a análise e ficam visíveis apenas para você.
                                </p>
                            </div>

                            <div className="pt-4">
                                <button
                                    onClick={handleSave}
                                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-green-900/20"
                                >
                                    Salvar Anotação
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'substitute' && (
                        <div className="space-y-6">
                            {/* Send to Bench / Field Actions */}
                            <div className="bg-[#242938] p-4 rounded-lg border border-gray-700">
                                <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">Ações Rápidas</h3>
                                {onSendToBench && (
                                    <>
                                        <button
                                            onClick={handleSendToBenchClick}
                                            className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 font-medium py-3 rounded-lg transition-colors"
                                        >
                                            <LogOut size={16} />
                                            Enviar para o Banco
                                        </button>
                                        <p className="text-xs text-gray-500 mt-2 text-center">
                                            O jogador sairá do campo sem ser substituído por ninguém.
                                        </p>
                                    </>
                                )}
                                {onPromoteToStarter && (
                                    <>
                                        <button
                                            onClick={handlePromoteToStarterClick}
                                            className="w-full flex items-center justify-center gap-2 bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/30 font-medium py-3 rounded-lg transition-colors"
                                        >
                                            <ArrowRightLeft size={16} />
                                            Enviar para o Campo
                                        </button>
                                        <p className="text-xs text-gray-500 mt-2 text-center">
                                            O jogador entrará em campo sem substituir ninguém.
                                        </p>
                                    </>
                                )}
                            </div>

                            {/* Bench List */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">
                                    {substituteListTitle}
                                </h3>

                                {benchPlayers.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500 italic bg-[#242938] rounded-lg border border-gray-700">
                                        Banco de reservas vazio
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                        {benchPlayers.map(benchPlayer => (
                                            <button
                                                key={benchPlayer.id}
                                                onClick={() => handleSubClick(benchPlayer)}
                                                className="w-full flex items-center justify-between p-3 bg-[#242938] hover:bg-gray-700 border border-gray-700 rounded-lg transition-all group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold text-sm">
                                                        {benchPlayer.number}
                                                    </div>
                                                    <span className="text-gray-200 group-hover:text-white font-medium">
                                                        {benchPlayer.name}
                                                    </span>
                                                </div>
                                                <ArrowRightLeft className="text-gray-500 group-hover:text-green-400 w-4 h-4" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
