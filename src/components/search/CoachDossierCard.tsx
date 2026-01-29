import { UserCheck, Calendar, ChevronRight } from 'lucide-react';
import type { CoachDossier } from '../../types/search';

interface Props {
    dossier: CoachDossier;
    onEntryClick: (analysisId: string) => void;
}

export function CoachDossierCard({ dossier, onEntryClick }: Props) {
    // Filtrar entradas com alguma anotação
    const entriesWithNotes = dossier.entries.filter(e =>
        e.defensive_notes || e.offensive_notes
    );

    return (
        <div className="bg-[#1a1f2e] rounded-lg border border-gray-800 overflow-hidden mb-4">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 bg-[#242938]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <UserCheck className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                        <h3 className="text-white font-semibold">{dossier.coach_name}</h3>
                        <p className="text-gray-400 text-sm">
                            {entriesWithNotes.length} partida(s) com anotações táticas
                        </p>
                    </div>
                </div>
            </div>

            {/* Lista */}
            <div className="divide-y divide-gray-800">
                {entriesWithNotes.length === 0 ? (
                    <div className="p-4 text-gray-500 text-sm text-center">
                        Nenhuma anotação encontrada sob este comando técnico.
                    </div>
                ) : (
                    entriesWithNotes.map((entry, idx) => (
                        <div
                            key={idx}
                            onClick={() => onEntryClick(entry.analysis_id)}
                            className="p-4 hover:bg-[#242938] cursor-pointer transition-colors relative"
                        >
                            <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                                <Calendar className="w-3 h-3" />
                                <span>{formatDate(entry.match_date)}</span>
                                <span className="mx-1">•</span>
                                <span>{entry.team_coached} vs {entry.opponent}</span>
                            </div>

                            {/* Preview das notas */}
                            <div className="space-y-1 pr-6">
                                {entry.defensive_notes && (
                                    <p className="text-gray-400 text-xs">
                                        <span className="text-orange-400 font-medium">Defensivo:</span> {truncate(entry.defensive_notes, 80)}
                                    </p>
                                )}
                                {entry.offensive_notes && (
                                    <p className="text-gray-400 text-xs">
                                        <span className="text-green-400 font-medium">Ofensivo:</span> {truncate(entry.offensive_notes, 80)}
                                    </p>
                                )}
                            </div>

                            <ChevronRight className="w-4 h-4 text-gray-600 absolute right-4 top-1/2 -translate-y-1/2" />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}
