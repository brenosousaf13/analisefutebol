import { useState } from 'react';
import TeamSelection from './TeamSelection';
import type { ApiTeam } from '../types/api-football';
import { Calendar, Clock, PlusCircle } from 'lucide-react';

interface MatchBuilderProps {
    onCreate: (data: any) => void;
    onCancel: () => void;
    isCreating: boolean;
}

export default function MatchBuilder({ onCreate, onCancel, isCreating }: MatchBuilderProps) {
    const [homeTeam, setHomeTeam] = useState<ApiTeam | null>(null);
    const [awayTeam, setAwayTeam] = useState<ApiTeam | null>(null);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState('16:00');

    const handleCreate = () => {
        if (!homeTeam || !awayTeam) return;

        onCreate({
            homeTeam,
            awayTeam,
            matchDate: date,
            matchTime: time
        });
    };

    const isValid = homeTeam && awayTeam && date && time;

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <TeamSelection
                        label="Time Mandante"
                        onSelect={setHomeTeam}
                    />
                    <TeamSelection
                        label="Time Visitante"
                        onSelect={setAwayTeam}
                    />
                </div>

                <div className="bg-[#242938] rounded-xl p-4 border border-gray-700 mb-6">
                    <h3 className="text-sm font-bold text-gray-300 mb-4 uppercase tracking-wider">Dados da Partida</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500">Data</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full bg-[#1a1f2e] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:border-green-500 focus:outline-none"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500">Horário</label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="time"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    className="w-full bg-[#1a1f2e] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:border-green-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t border-gray-700 flex gap-3 shrink-0 mt-auto">
                <button
                    onClick={onCancel}
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white transition font-medium"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleCreate}
                    disabled={!isValid || isCreating}
                    className={`
                        flex-[2] bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg 
                        transition flex items-center justify-center gap-2
                        ${(!isValid || isCreating) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}
                    `}
                >
                    {isCreating ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Criando Análise...
                        </>
                    ) : (
                        <>
                            <PlusCircle className="w-5 h-5" />
                            Criar Partida
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
