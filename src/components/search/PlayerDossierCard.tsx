import { User, Calendar, FileText, ChevronRight } from 'lucide-react';
import type { PlayerDossier } from '../../types/search';

interface Props {
    dossier: PlayerDossier;
    onEntryClick: (analysisId: string) => void;
}

export function PlayerDossierCard({ dossier, onEntryClick }: Props) {
    // Filtrar apenas entradas COM anotações
    const entriesWithNotes = dossier.entries.filter(e => e.note && e.note.trim() !== '');

    return (
        <div className="bg-[#1a1f2e] rounded-lg border border-gray-800 overflow-hidden mb-4">
            {/* Header do Dossiê */}
            <div className="p-4 border-b border-gray-800 bg-[#242938]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <User className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                        <h3 className="text-white font-semibold">{dossier.player_name}</h3>
                        <p className="text-gray-400 text-sm">
                            {entriesWithNotes.length} anotação(ões) em {dossier.total_appearances} partida(s)
                        </p>
                    </div>
                </div>
            </div>

            {/* Lista de Anotações */}
            <div className="divide-y divide-gray-800">
                {entriesWithNotes.length === 0 ? (
                    <div className="p-4 text-gray-500 text-sm text-center">
                        Nenhuma anotação encontrada para este jogador
                    </div>
                ) : (
                    entriesWithNotes.map((entry, idx) => (
                        <div
                            key={idx}
                            onClick={() => onEntryClick(entry.analysis_id)}
                            className="p-4 hover:bg-[#242938] cursor-pointer transition-colors"
                        >
                            {/* Info da Partida */}
                            <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                                <Calendar className="w-3 h-3" />
                                <span>{formatDate(entry.match_date)}</span>
                                <span className="mx-1">•</span>
                                <span>{entry.match_title}</span>
                                {entry.jersey_number && (
                                    <>
                                        <span className="mx-1">•</span>
                                        <span>#{entry.jersey_number}</span>
                                    </>
                                )}
                            </div>

                            {/* Anotação */}
                            <div className="flex items-start gap-2">
                                <FileText className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                                <p className="text-gray-300 text-sm line-clamp-3">
                                    {entry.note}
                                </p>
                                <ChevronRight className="w-4 h-4 text-gray-600 ml-auto flex-shrink-0" />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}
