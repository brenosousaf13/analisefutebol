import { Shield, Calendar, ChevronRight } from 'lucide-react';
import type { TeamDossier } from '../../types/search';

interface Props {
    dossier: TeamDossier;
    onEntryClick: (analysisId: string) => void;
}

export function TeamDossierCard({ dossier, onEntryClick }: Props) {
    // Filtrar entradas com alguma anotação
    const entriesWithNotes = dossier.entries.filter(e =>
        e.defensive_notes || e.offensive_notes || e.bench_notes || e.general_notes
    );

    return (
        <div className="bg-[#1a1f2e] rounded-lg border border-gray-800 overflow-hidden mb-4">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 bg-[#242938]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                        <h3 className="text-white font-semibold">{dossier.team_name}</h3>
                        <p className="text-gray-400 text-sm">
                            {entriesWithNotes.length} análise(s) com anotações
                        </p>
                    </div>
                </div>
            </div>

            {/* Lista */}
            <div className="divide-y divide-gray-800">
                {entriesWithNotes.length === 0 ? (
                    <div className="p-4 text-gray-500 text-sm text-center">
                        Nenhuma anotação encontrada para este time.
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
                                <span>vs {entry.opponent}</span>
                                <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${entry.was_home ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                                    }`}>
                                    {entry.was_home ? 'Casa' : 'Fora'}
                                </span>
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
                                {entry.bench_notes && (
                                    <p className="text-gray-400 text-xs">
                                        <span className="text-yellow-400 font-medium">Banco:</span> {truncate(entry.bench_notes, 80)}
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
