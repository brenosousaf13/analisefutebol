import React, { useState } from 'react';
import { X, Plus, Trash2, BellOff } from 'lucide-react';

interface PlayerLite {
    id: number;
    name: string;
    number: number;
}

interface MatchEvent {
    id: string;
    type: 'goal' | 'yellow_card' | 'red_card' | 'substitution' | 'other';
    minute: number;
    playerName?: string;
    description?: string;
    team: 'home' | 'away';
}

interface EventsSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    events: MatchEvent[];
    onAddEvent: (event: Omit<MatchEvent, 'id'>) => void;
    onRemoveEvent: (eventId: string) => void;
    homeTeam: string;
    awayTeam: string;
    // Player lists for dropdown
    homePlayers?: PlayerLite[];
    awayPlayers?: PlayerLite[];
}

const getEventIcon = (type: MatchEvent['type']) => {
    switch (type) {
        case 'goal': return '⚽';
        case 'yellow_card': return '🟨';
        case 'red_card': return '🟥';
        case 'substitution': return '🔄';
        default: return '📋';
    }
};

const EventCard: React.FC<{ event: MatchEvent; onRemove: () => void }> = ({ event, onRemove }) => (
    <div className="bg-panel-dark rounded-lg p-3 flex items-start gap-3 group border border-gray-700">
        <span className="text-2xl">{getEventIcon(event.type)}</span>
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
                <span className="text-white font-medium">{event.minute}'</span>
                {event.playerName && (
                    <span className="text-gray-400 text-sm truncate">{event.playerName}</span>
                )}
            </div>
            {event.description && (
                <p className="text-gray-500 text-sm mt-1 truncate">{event.description}</p>
            )}
        </div>
        <button
            onClick={onRemove}
            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-400 transition rounded-lg hover:bg-gray-700"
        >
            <Trash2 className="w-4 h-4" />
        </button>
    </div>
);

const EventsSidebar: React.FC<EventsSidebarProps> = ({
    isOpen,
    onClose,
    events,
    onAddEvent,
    onRemoveEvent,
    homeTeam,
    awayTeam,
    homePlayers = [],
    awayPlayers = []
}) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [newEvent, setNewEvent] = useState<Omit<MatchEvent, 'id'>>({
        type: 'goal',
        minute: 0,
        playerName: '',
        description: '',
        team: 'home'
    });
    const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');

    // Get current team players
    const currentTeamPlayers = newEvent.team === 'home' ? homePlayers : awayPlayers;

    const handleAdd = () => {
        if (newEvent.minute > 0) {
            // Get player name from selection if available
            const selectedPlayer = currentTeamPlayers.find(p => p.id.toString() === selectedPlayerId);
            const eventToAdd = {
                ...newEvent,
                playerName: selectedPlayer ? `${selectedPlayer.number} - ${selectedPlayer.name}` : newEvent.playerName
            };
            onAddEvent(eventToAdd);
            setNewEvent({ type: 'goal', minute: 0, playerName: '', description: '', team: 'home' });
            setSelectedPlayerId('');
            setShowAddForm(false);
        }
    };

    const handleTeamChange = (team: 'home' | 'away') => {
        setNewEvent({ ...newEvent, team });
        setSelectedPlayerId(''); // Reset player selection when team changes
    };

    const sortedEvents = [...events].sort((a, b) => a.minute - b.minute);

    return (
        <div className={`fixed inset-0 z-50 ${isOpen ? 'visible' : 'invisible'}`}>
            {/* Overlay */}
            <div
                className={`
                    absolute inset-0 bg-black/50 transition-opacity duration-300 ease-in-out
                    ${isOpen ? 'opacity-100' : 'opacity-0'}
                `}
                onClick={onClose}
            />

            {/* Sidebar Panel */}
            <div className={`
                absolute top-0 left-0 bottom-0 w-full sm:w-[450px] max-w-full sm:max-w-[calc(100vw-64px)] 
                bg-nav-dark shadow-2xl border-r border-gray-700 font-sans cursor-default
                transform transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700 shrink-0">
                    <h2 className="text-white font-bold text-lg uppercase tracking-wide">
                        Eventos da Partida
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-panel-dark text-gray-400 hover:text-white hover:bg-gray-700 flex items-center justify-center transition border border-gray-700"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Events List */}
                <div className="flex-1 overflow-y-auto p-4">
                    {events.length === 0 && !showAddForm ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <BellOff className="w-12 h-12 mb-3 opacity-50" />
                            <p>Sem eventos registrados</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {sortedEvents.map(event => (
                                <EventCard
                                    key={event.id}
                                    event={event}
                                    onRemove={() => onRemoveEvent(event.id)}
                                />
                            ))}
                        </div>
                    )}

                    {/* Add Event Form */}
                    {showAddForm && (
                        <div className="mt-4 bg-panel-dark rounded-lg p-4 border border-gray-700 space-y-4">
                            {/* Event Type */}
                            <div>
                                <label className="text-gray-400 text-xs mb-2 block font-medium">Tipo de Evento</label>
                                <select
                                    value={newEvent.type}
                                    onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as MatchEvent['type'] })}
                                    className="w-full bg-gray-800 text-white px-3 py-2.5 rounded-lg text-sm border border-gray-600 focus:border-green-500 focus:outline-none"
                                >
                                    <option value="goal">⚽ Gol</option>
                                    <option value="yellow_card">🟨 Cartão Amarelo</option>
                                    <option value="red_card">🟥 Cartão Vermelho</option>
                                    <option value="substitution">🔄 Substituição</option>
                                    <option value="other">📋 Outro</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {/* Minute */}
                                <div>
                                    <label className="text-gray-400 text-xs mb-2 block font-medium">Minuto</label>
                                    <input
                                        type="number"
                                        value={newEvent.minute || ''}
                                        onChange={(e) => setNewEvent({ ...newEvent, minute: parseInt(e.target.value) || 0 })}
                                        className="w-full bg-gray-800 text-white px-3 py-2.5 rounded-lg text-sm border border-gray-600 focus:border-green-500 focus:outline-none"
                                        placeholder="45"
                                        min="0"
                                        max="120"
                                    />
                                </div>

                                {/* Team Selection */}
                                <div>
                                    <label className="text-gray-400 text-xs mb-2 block font-medium">Time</label>
                                    <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-600">
                                        <button
                                            type="button"
                                            onClick={() => handleTeamChange('home')}
                                            className={`flex-1 py-1.5 rounded text-xs font-medium transition-all ${newEvent.team === 'home'
                                                ? 'bg-green-600 text-white'
                                                : 'text-gray-400 hover:text-white'
                                                }`}
                                        >
                                            {homeTeam}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleTeamChange('away')}
                                            className={`flex-1 py-1.5 rounded text-xs font-medium transition-all ${newEvent.team === 'away'
                                                ? 'bg-green-600 text-white'
                                                : 'text-gray-400 hover:text-white'
                                                }`}
                                        >
                                            {awayTeam}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Player Selection - DROPDOWN */}
                            <div>
                                <label className="text-gray-400 text-xs mb-2 block font-medium">Jogador</label>
                                {currentTeamPlayers.length > 0 ? (
                                    <select
                                        value={selectedPlayerId}
                                        onChange={(e) => setSelectedPlayerId(e.target.value)}
                                        className="w-full bg-gray-800 text-white px-3 py-2.5 rounded-lg text-sm border border-gray-600 focus:border-green-500 focus:outline-none"
                                    >
                                        <option value="">Selecione um jogador...</option>
                                        {currentTeamPlayers.map(player => (
                                            <option key={player.id} value={player.id}>
                                                #{player.number} - {player.name}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        value={newEvent.playerName || ''}
                                        onChange={(e) => setNewEvent({ ...newEvent, playerName: e.target.value })}
                                        className="w-full bg-gray-800 text-white px-3 py-2.5 rounded-lg text-sm border border-gray-600 focus:border-green-500 focus:outline-none"
                                        placeholder="Nome do jogador"
                                    />
                                )}
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-gray-400 text-xs mb-2 block font-medium">Descrição (opcional)</label>
                                <input
                                    type="text"
                                    value={newEvent.description || ''}
                                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                                    className="w-full bg-gray-800 text-white px-3 py-2.5 rounded-lg text-sm border border-gray-600 focus:border-green-500 focus:outline-none"
                                    placeholder="Ex: Gol de cabeça, Falta..."
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={() => {
                                        setShowAddForm(false);
                                        setSelectedPlayerId('');
                                    }}
                                    className="flex-1 py-2.5 text-gray-400 hover:text-white transition text-sm rounded-lg hover:bg-gray-700"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleAdd}
                                    disabled={newEvent.minute <= 0}
                                    className="flex-1 py-2.5 bg-accent-green text-white rounded-lg hover:bg-green-500 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Adicionar
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Add Button */}
                {!showAddForm && (
                    <div className="p-4 border-t border-gray-700 shrink-0">
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="w-full py-3 bg-accent-green text-white rounded-lg hover:bg-green-500 transition flex items-center justify-center gap-2 font-medium"
                        >
                            <Plus className="w-5 h-5" />
                            Adicionar Evento
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EventsSidebar;
export type { MatchEvent, PlayerLite };
