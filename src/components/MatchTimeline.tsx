import { Trash2, Plus, Maximize2 } from 'lucide-react';
import type { EventType } from './AddEventModal';
export interface MatchEvent {
    id: string;
    type: EventType;
    minute: number;
    team: 'home' | 'away' | null;
    player_name?: string;
    secondary_player_name?: string;
    details?: { info: string };
    notes?: string;
    analysis_id?: string;
}

interface MatchTimelineProps {
    events: MatchEvent[];
    onAddClick: () => void;
    onDeleteEvent: (id: string) => void;
    onExpand: () => void;
    readOnly?: boolean;
}

const MatchTimeline: React.FC<MatchTimelineProps> = ({ events, onAddClick, onDeleteEvent, onExpand, readOnly = false }) => {

    // ... getIcon and sortedEvents remain ...

    const getIcon = (type: EventType) => {
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

    const sortedEvents = [...events].sort((a, b) => b.minute - a.minute);

    return (
        <div className="flex flex-col h-full bg-[#242938] border border-gray-700 rounded-xl overflow-hidden">
            {/* Header Top Bar */}
            <div className="bg-[#1e2330] px-3 py-3 flex items-center justify-between border-b border-gray-700">
                <div className="w-12"></div> {/* Spacer for centering (approx width of buttons) */}
                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">EVENTOS DA PARTIDA</h3>
                <div className="flex items-center gap-1">
                    <button
                        onClick={onExpand}
                        className="text-gray-400 hover:text-white transition-colors p-1"
                        title="Expandir Eventos"
                    >
                        <Maximize2 size={16} />
                    </button>
                    {!readOnly && (
                        <button
                            onClick={onAddClick}
                            className="text-gray-400 hover:text-accent-green transition-colors p-1"
                            title="Adicionar Evento"
                        >
                            <Plus size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Timeline Area (Content) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {sortedEvents.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-600 italic">
                        Nenhum evento registrado.
                    </div>
                ) : (
                    sortedEvents.map((event, index) => (
                        <div key={event.id} className="relative">
                            {/* Connector Line (except for last) */}
                            {index !== sortedEvents.length - 1 && (
                                <div className="absolute left-[24px] top-8 bottom-[-14px] w-[1px] bg-gray-700 -z-10 opacity-30"></div>
                            )}

                            <div className="group relative flex items-start gap-3 p-3 rounded-lg border border-gray-700/50 bg-[#1f2937]/50 hover:bg-[#1f2937] hover:border-gray-600 transition-all">
                                {/* Actions (Hover) */}
                                {!readOnly && (
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex items-center gap-2 transition-opacity">
                                        <button
                                            onClick={() => window.confirm('Excluir evento?') && onDeleteEvent(event.id)}
                                            className="text-gray-500 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                )}

                                {/* Minute */}
                                <div className="min-w-[25px] text-right font-bold text-accent-green text-xs pt-0.5 font-mono">
                                    {event.minute}'
                                </div>

                                {/* Icon */}
                                <div className="text-base leading-none pt-0.5">
                                    {getIcon(event.type)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 text-xs">
                                    <div className="font-bold text-gray-200 leading-tight">
                                        {event.type === 'goal' && 'GOL!'}
                                        {event.type === 'yellow_card' && 'Cartão Amarelo'}
                                        {event.type === 'red_card' && 'Cartão Vermelho'}
                                        {event.type === 'substitution' && 'Substituição'}
                                        {event.type === 'var' && 'VAR'}
                                        {event.type === 'start' && 'Início de Jogo'}
                                        {event.type === 'end' && 'Fim de Jogo'}
                                        {event.type === 'interval' && 'Intervalo'}
                                        {event.type === 'injury' && 'Lesão'}
                                    </div>

                                    {/* Players */}
                                    {event.player_name && (
                                        <div className="text-gray-400 mt-0.5 font-medium">
                                            {event.player_name}
                                        </div>
                                    )}

                                    {/* Secondary Info */}
                                    {(event.secondary_player_name || event.details?.info) && (
                                        <div className="text-[10px] text-gray-500 mt-1">
                                            {event.type === 'substitution' && (
                                                <div className="flex items-center gap-1">
                                                    <span className="text-red-400">Sai:</span> {event.player_name}
                                                    <span className="text-gray-600">|</span>
                                                    <span className="text-green-400">Entra:</span> {event.secondary_player_name}
                                                </div>
                                            )}
                                            {event.type === 'goal' && event.secondary_player_name && (
                                                <span>Assist: {event.secondary_player_name}</span>
                                            )}
                                            {event.details?.info && (
                                                <span className={event.type === 'substitution' ? 'hidden' : ''}>{event.details.info}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default MatchTimeline;
