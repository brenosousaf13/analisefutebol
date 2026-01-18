import React, { useEffect, useState } from 'react';
import { X, Plus, FileText, Calendar, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Fixture } from '../services/apiFootball';
import { analysisService, type SavedAnalysisSummary } from '../services/analysisService';

interface MatchDetailsModalProps {
    match: Fixture;
    onClose: () => void;
}

const MatchDetailsModal: React.FC<MatchDetailsModalProps> = ({ match, onClose }) => {
    const navigate = useNavigate();
    const [analyses, setAnalyses] = useState<SavedAnalysisSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalyses = async () => {
            try {
                const data = await analysisService.getMyAnalyses({
                    fixtureId: match.fixture.id,
                    status: 'todas'
                });
                setAnalyses(data);
            } catch (error) {
                console.error('Error fetching analyses for match:', error);
            } finally {
                setLoading(false);
            }
        };

        if (match?.fixture?.id) {
            fetchAnalyses();
        }
    }, [match]);

    const handleCreateNew = () => {
        navigate('/analise', {
            state: {
                matchId: match.fixture.id,
                homeTeam: match.teams.home,
                awayTeam: match.teams.away,
                competition: match.league,
                date: match.fixture.date,
                score: match.goals
            }
        });
    };

    const handleOpenAnalysis = (id: string) => {
        navigate(`/analise/${id}`);
    };

    const formatDate = (dateUnparsed: string) => {
        return new Date(dateUnparsed).toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    if (!match) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-panel-dark rounded-xl w-[500px] max-w-full border border-gray-700 shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 text-center border-b border-gray-700 relative">
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-center justify-center gap-2 text-yellow-500 text-sm font-medium mb-4 uppercase tracking-wider">
                        <Trophy className="w-4 h-4" />
                        <span>{match.league.name}</span>
                    </div>

                    <div className="flex items-center justify-between px-4 mb-4">
                        <div className="flex flex-col items-center w-1/3">
                            <img src={match.teams.home.logo} alt={match.teams.home.name} className="w-16 h-16 object-contain mb-2" />
                            <span className="text-white font-bold text-lg leading-tight">{match.teams.home.name}</span>
                        </div>

                        <div className="flex flex-col items-center w-1/3">
                            <div className="text-3xl font-bold text-white mb-1">
                                {match.goals.home ?? 0} - {match.goals.away ?? 0}
                            </div>
                            <div className="px-3 py-1 bg-gray-700 rounded-full text-xs text-gray-300 whitespace-nowrap">
                                {match.fixture.status.long}
                            </div>
                        </div>

                        <div className="flex flex-col items-center w-1/3">
                            <img src={match.teams.away.logo} alt={match.teams.away.name} className="w-16 h-16 object-contain mb-2" />
                            <span className="text-white font-bold text-lg leading-tight">{match.teams.away.name}</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(match.fixture.date)}</span>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    <button
                        onClick={handleCreateNew}
                        className="w-full py-4 bg-accent-green text-white rounded-xl hover:bg-green-600 transition flex items-center justify-center gap-3 font-bold text-lg shadow-lg hover:shadow-green-900/20 mb-6"
                    >
                        <Plus className="w-6 h-6" />
                        Criar Nova Análise
                    </button>

                    <div className="space-y-4">
                        <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Análises Salvas ({analyses.length})
                        </h3>

                        {loading ? (
                            <div className="text-center py-8 text-gray-500">Carregando análises...</div>
                        ) : analyses.length > 0 ? (
                            <div className="space-y-3">
                                {analyses.map(analysis => (
                                    <button
                                        key={analysis.id}
                                        onClick={() => handleOpenAnalysis(analysis.id)}
                                        className="w-full p-4 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-xl transition text-left group"
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-white font-semibold group-hover:text-accent-green transition-colors line-clamp-1">
                                                {analysis.titulo}
                                            </span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${analysis.status === 'finalizada' ? 'bg-green-900/40 text-green-400' : 'bg-yellow-900/40 text-yellow-400'
                                                }`}>
                                                {analysis.status === 'finalizada' ? 'Finalizada' : 'Rascunho'}
                                            </span>
                                        </div>
                                        <div className="text-gray-500 text-xs">
                                            Editado em {formatDate(analysis.updated_at)}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-gray-800/30 rounded-xl border border-gray-700 border-dashed">
                                <p className="text-gray-500 text-sm">Nenhuma análise encontrada para esta partida.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700 bg-gray-800/50 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 text-gray-400 hover:text-white transition font-medium"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MatchDetailsModal;
