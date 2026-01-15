import React from 'react';
import { X, Trash2, Edit2, Plus } from 'lucide-react';
import type { MatchEvent } from './MatchTimeline';

interface EventsExpansionModalProps {
    isOpen: boolean;
    onClose: () => void;
    events: MatchEvent[];
    onAddEvent: () => void;
    onEditEvent: (event: MatchEvent) => void;
    onDeleteEvent: (id: string) => void;
}

const EventsExpansionModal: React.FC<EventsExpansionModalProps> = ({
    isOpen, onClose, events, onAddEvent, onEditEvent, onDeleteEvent
}) => {
    if (!isOpen) return null;

    const sortedEvents = [...events].sort((a, b) => b.minute - a.minute);

    const getIcon = (type: string) => {
        switch (type) {
            case 'goal': return '⚽';
            case 'yellow_card': return '🟨';
            case 'red_card': return '🟥';
            case 'substitution': return '🔄';
            case 'var': return '📺';
            case 'injury': return '🏥';
            case 'interval': return '⏱️';
            case 'start': case 'end': return '🏁';
            default: return '•';
        }
    };

    const getLabel = (type: string) => {
        switch (type) {
            case 'goal': return 'GOL!';
            case 'yellow_card': return 'Cartão Amarelo';
            case 'red_card': return 'Cartão Vermelho';
            case 'substitution': return 'Substituição';
            case 'var': return 'VAR';
            case 'start': return 'Início de Jogo';
            case 'end': return 'Fim de Jogo';
            case 'interval': return 'Intervalo';
            case 'injury': return 'Lesão';
            default: return 'Evento';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#1a1f2e] border border-gray-700 w-full max-w-[700px] h-[80vh] max-h-[600px] rounded-2xl shadow-2xl overflow-hidden flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-black/20">
                    <div className="w-8"></div> {/* Spacer for centering */}
                    <h2 className="text-white font-bold text-lg uppercase tracking-wider">EVENTOS DA PARTIDA</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-[#1a1f2e]">
                    {sortedEvents.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 italic">
                            Nenhum evento registrado.
                        </div>
                    ) : (
                        sortedEvents.map((event, index) => (
                            <div key={event.id}>
                                {/* Connector Line */}
                                {index !== sortedEvents.length - 1 && (
                                    <div className="hidden absolute ml-6 w-[2px] bg-gray-700 h-8 -mb-4 z-0"></div>
                                )}

                                <div className="bg-[#242938] border border-gray-700 rounded-xl p-4 flex gap-4 hover:border-gray-500 transition-colors group relative">

                                    {/* Minute */}
                                    <div className="flex flex-col items-center min-w-[50px] border-r border-gray-700 pr-4 justify-center">
                                        <div className="text-2xl font-bold text-accent-green font-mono">{event.minute}'</div>
                                        <div className="text-3xl mt-1">{getIcon(event.type)}</div>
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 flex flex-col justify-center">
                                        <div className="text-lg font-bold text-white uppercase tracking-wide flex items-center gap-2">
                                            {getLabel(event.type)}
                                            {event.team && (
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase ${event.team === 'home' ? 'bg-blue-500/20 text-blue-300' : 'bg-red-500/20 text-red-300'}`}>
                                                    {event.team === 'home' ? 'Casa' : 'Visitante'}
                                                </span>
                                            )}
                                        </div>

                                        {event.player_name && (
                                            <div className="text-gray-300 font-medium text-base mt-1">
                                                {event.player_name}
                                            </div>
                                        )}

                                        {(event.secondary_player_name || event.details?.info) && (
                                            <div className="text-sm text-gray-500 mt-1">
                                                {event.type === 'substitution' && (
                                                    <div className="flex flex-col">
                                                        <span className="text-red-400">Sai: {event.player_name}</span>
                                                        <span className="text-green-400">Entra: {event.secondary_player_name}</span>
                                                    </div>
                                                )}
                                                {event.type === 'goal' && event.secondary_player_name && (
                                                    <span>Assistência: {event.secondary_player_name}</span>
                                                )}
                                                {event.details?.info && event.type !== 'substitution' && (
                                                    <span>Obs: {event.details.info}</span>
                                                )}
                                            </div>
                                        )}

                                        {event.notes && (
                                            <div className="text-xs text-gray-500 italic mt-2 border-t border-gray-700/50 pt-1">
                                                Nota: {event.notes}
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col gap-2 justify-center border-l border-gray-700 pl-4 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => onEditEvent(event)}
                                            className="p-2 bg-gray-700 rounded hover:bg-blue-600 hover:text-white text-gray-400 transition-colors"
                                            title="Editar Evento"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => window.confirm('Excluir este evento?') && onDeleteEvent(event.id)}
                                            className="p-2 bg-gray-700 rounded hover:bg-red-600 hover:text-white text-gray-400 transition-colors"
                                            title="Excluir Evento"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700 bg-black/20 flex items-center justify-between">
                    <span className="text-gray-500 font-bold text-sm">
                        Total: {events.length} eventos
                    </span>
                    <button
                        onClick={onAddEvent}
                        className="bg-accent-green hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                    >
                        <Plus size={16} />
                        Adicionar Evento
                    </button>
                </div>

            </div>
        </div>
    );
};

export default EventsExpansionModal;
