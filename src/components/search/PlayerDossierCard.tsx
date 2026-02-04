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
        <div className="bg-[#161618] rounded-lg border border-transparent overflow-hidden mb-4 shadow-sm hover:shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all">
            {/* Header do Dossiê */}
            <div className="p-4 border-b border-gray-800 bg-[#1f2425]">
                <div className="flex flex-col items-start gap-1">
                    <h3 className="text-white font-bold text-lg">{dossier.player_name}</h3>
                    <p className="text-gray-400 text-sm">
                        {entriesWithNotes.length} anotação(ões) em {dossier.total_appearances} partida(s)
                    </p>
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
                            className="p-4 hover:bg-[#242938]/50 cursor-pointer transition-colors"
                        >
                            {/* Info da Partida */}
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2 font-mono">
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
                                <FileText className="w-4 h-4 text-[#27D888] mt-0.5 flex-shrink-0" />
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
