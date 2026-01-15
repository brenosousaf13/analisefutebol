import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

export type EventType = 'goal' | 'yellow_card' | 'red_card' | 'substitution' | 'interval' | 'start' | 'end' | 'var' | 'injury';

interface PlayerLite {
    id: number;
    name: string;
    number: number;
}

interface AddEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (event: any) => void;
    homeTeamName: string;
    awayTeamName: string;
    homePlayers: PlayerLite[];
    awayPlayers: PlayerLite[];
    homeSubstitutes: PlayerLite[];
    awaySubstitutes: PlayerLite[];
    initialData?: any; // For editing
}

const EVENT_TYPES: { type: EventType; label: string; icon: string }[] = [
    { type: 'goal', label: 'Gol', icon: '⚽' },
    { type: 'yellow_card', label: 'Cartão Amarelo', icon: '🟨' },
    { type: 'red_card', label: 'Cartão Vermelho', icon: '🟥' },
    { type: 'substitution', label: 'Substituição', icon: '🔄' },
    { type: 'interval', label: 'Intervalo / Fim Tempo', icon: '⏱️' },
    { type: 'start', label: 'Início de Jogo', icon: '🏁' },
    { type: 'end', label: 'Fim de Jogo', icon: '🏁' },
    { type: 'var', label: 'VAR', icon: '📺' },
    { type: 'injury', label: 'Lesão', icon: '🏥' },
];

const AddEventModal: React.FC<AddEventModalProps> = ({
    isOpen, onClose, onSave,
    // homeTeamName, awayTeamName, // Unused
    homePlayers, awayPlayers,
    homeSubstitutes, awaySubstitutes,
    initialData
}) => {
    // Initial State
    const [eventType, setEventType] = useState<EventType>('goal');
    const [minute, setMinute] = useState<string>('');
    const [team, setTeam] = useState<'home' | 'away'>('home');
    const [playerId, setPlayerId] = useState<string>('');
    const [secondaryPlayerId, setSecondaryPlayerId] = useState<string>(''); // Assist or Player IN
    const [details, setDetails] = useState<string>('');
    const [notes, setNotes] = useState<string>('');

    // Reset or Fill when opening
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setEventType(initialData.type || 'goal');
                setMinute(initialData.minute?.toString() || '');
                setTeam(initialData.team || 'home');
                setPlayerId(initialData.player_id?.toString() || '');
                setSecondaryPlayerId(initialData.secondary_player_id?.toString() || '');
                setDetails(initialData.details?.info || '');
                setNotes(initialData.notes || '');
            } else {
                // Reset for new event
                setEventType('goal');
                setMinute('');
                setTeam('home');
                setPlayerId('');
                setSecondaryPlayerId('');
                setDetails('');
                setNotes('');
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const currentTeamPlayers = team === 'home' ? homePlayers : awayPlayers;
    const currentTeamSubs = team === 'home' ? homeSubstitutes : awaySubstitutes;
    const allTeamPlayers = [...currentTeamPlayers, ...currentTeamSubs];

    const handleSubmit = () => {
        if (!minute && !['start', 'end', 'interval'].includes(eventType)) {
            alert('Por favor, informe o minuto.');
            return;
        }

        const eventData = {
            type: eventType,
            minute: parseInt(minute) || 0,
            team: ['start', 'end', 'interval'].includes(eventType) ? null : team,
            player_id: playerId ? parseInt(playerId) : null,
            player_name: playerId ? allTeamPlayers.find(p => p.id === parseInt(playerId))?.name : null,
            secondary_player_id: secondaryPlayerId ? parseInt(secondaryPlayerId) : null,
            secondary_player_name: secondaryPlayerId ? allTeamPlayers.find(p => p.id === parseInt(secondaryPlayerId))?.name : null,
            details: { info: details },
            notes
        };

        onSave(eventData);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm md:p-4 animate-in fade-in duration-200">
            <div className="bg-panel-dark border border-gray-700 w-full md:max-w-lg rounded-t-3xl md:rounded-xl shadow-2xl overflow-hidden flex flex-col h-[85vh] md:h-auto md:max-h-[90vh] animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300">

                {/* Mobile Handle */}
                <div className="md:hidden flex justify-center py-3 bg-panel-dark border-b border-gray-700/50 shrink-0">
                    <div className="w-12 h-1.5 bg-gray-600 rounded-full" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-black/20 shrink-0">
                    <h2 className="text-white font-bold text-lg flex items-center gap-2">
                        <span className="text-accent-green">{initialData ? '✏️' : '+'}</span> {initialData ? 'Editar Evento' : 'Adicionar Evento'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar">

                    {/* Event Type */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tipo de Evento</label>
                        <select
                            value={eventType}
                            onChange={(e) => setEventType(e.target.value as EventType)}
                            className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-3 outline-none focus:border-accent-green"
                        >
                            {EVENT_TYPES.map(t => (
                                <option key={t.type} value={t.type}>{t.icon} {t.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Minute */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Minuto</label>
                            <input
                                type="number"
                                value={minute}
                                onChange={(e) => setMinute(e.target.value)}
                                placeholder="ex: 45"
                                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-3 outline-none focus:border-accent-green placeholder-gray-600"
                            />
                        </div>

                        {/* Team Selection (if applicable) */}
                        {!['start', 'end', 'interval'].includes(eventType) && (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Time</label>
                                <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
                                    <button
                                        onClick={() => setTeam('home')}
                                        className={`flex-1 py-2 rounded text-xs font-bold transition-all ${team === 'home' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        Casa
                                    </button>
                                    <button
                                        onClick={() => setTeam('away')}
                                        className={`flex-1 py-2 rounded text-xs font-bold transition-all ${team === 'away' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        Visitante
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Dynamic Fields */}

                    {/* Player Selection */}
                    {['goal', 'yellow_card', 'red_card', 'substitution', 'injury'].includes(eventType) && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                                {eventType === 'substitution' ? 'Jogador que SAI' : 'Jogador Principal'}
                            </label>
                            <select
                                value={playerId}
                                onChange={(e) => setPlayerId(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-3 outline-none focus:border-accent-green"
                            >
                                <option value="">Selecione...</option>
                                {allTeamPlayers.map(p => (
                                    <option key={p.id} value={p.id}>#{p.number} - {p.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Secondary Player (Assist or Sub IN) */}
                    {(eventType === 'goal' || eventType === 'substitution') && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                                {eventType === 'substitution' ? 'Jogador que ENTRA' : 'Assistência (Opcional)'}
                            </label>
                            <select
                                value={secondaryPlayerId}
                                onChange={(e) => setSecondaryPlayerId(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-3 outline-none focus:border-accent-green"
                            >
                                <option value="">{eventType === 'substitution' ? 'Selecione...' : 'Sem assistência'}</option>
                                {eventType === 'substitution'
                                    ? currentTeamSubs.map(p => ( // Ideally restrict to subs, but simplifiying to all available
                                        <option key={p.id} value={p.id}>#{p.number} - {p.name}</option>
                                    ))
                                    : allTeamPlayers.map(p => (
                                        <option key={p.id} value={p.id}>#{p.number} - {p.name}</option>
                                    ))
                                }
                            </select>
                        </div>
                    )}

                    {/* Specific Details Selects */}
                    {eventType === 'goal' && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tipo de Gol</label>
                            <select
                                value={details}
                                onChange={(e) => setDetails(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-3 outline-none focus:border-accent-green"
                            >
                                <option value="Normal">Normal</option>
                                <option value="Pênalti">Pênalti</option>
                                <option value="Falta">Falta</option>
                                <option value="Cabeça">Cabeça</option>
                                <option value="Contra">Gol Contra</option>
                            </select>
                        </div>
                    )}

                    {eventType === 'yellow_card' && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Motivo</label>
                            <select
                                value={details}
                                onChange={(e) => setDetails(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-3 outline-none focus:border-accent-green"
                            >
                                <option value="Falta">Falta</option>
                                <option value="Reclamação">Reclamação</option>
                                <option value="Anti-jogo">Anti-jogo</option>
                                <option value="Mão na bola">Mão na bola</option>
                                <option value="Outro">Outro</option>
                            </select>
                        </div>
                    )}

                    {/* Notes */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Observação (Opcional)</label>
                        <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-3 outline-none focus:border-accent-green placeholder-gray-600"
                            placeholder="Detalhes adicionais..."
                        />
                    </div>

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700 bg-black/20 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-gray-400 hover:text-white transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={(!minute && !['start', 'end', 'interval'].includes(eventType))}
                        className="bg-accent-green hover:bg-green-500 text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <Save size={16} />
                        Salvar Evento
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddEventModal;
