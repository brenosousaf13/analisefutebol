import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analysisService, type SavedAnalysisSummary } from '../services/analysisService';
import { Loader2, Trash2, Calendar, FileText } from 'lucide-react';
import Header from '../components/Header';

const MyAnalyses = () => {
    const navigate = useNavigate();
    const [analyses, setAnalyses] = useState<SavedAnalysisSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAnalyses();
    }, []);

    async function loadAnalyses() {
        setLoading(true);
        try {
            const data = await analysisService.getMyAnalyses();
            console.log('[MyAnalyses] Loaded:', data);
            setAnalyses(data);
        } catch (err) {
            console.error('[MyAnalyses] Error loading:', err);
        } finally {
            setLoading(false);
        }
    }

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!window.confirm('Tem certeza que deseja excluir esta análise?')) return;

        try {
            await analysisService.deleteAnalysis(id);
            setAnalyses(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            console.error('Error deleting:', err);
            alert('Erro ao excluir análise');
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Header onReset={() => window.location.reload()} />
            <div className="p-6 md:p-8 max-w-6xl mx-auto">
                <header className="mb-8 flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-800">Minhas Análises</h1>
                </header>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="animate-spin text-green-600" size={48} />
                    </div>
                ) : analyses.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
                        <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-800 mb-2">Nenhuma análise encontrada</h3>
                        <p className="text-gray-500 mb-6">Crie sua primeira análise tática agora mesmo!</p>
                        <button
                            onClick={() => window.location.href = '/'}
                            className="px-6 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 transition-colors"
                        >
                            Criar Nova Análise
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {analyses.map((analysis) => (
                            <div
                                key={analysis.id}
                                onClick={() => navigate(`/analysis/saved/${analysis.id}`)}
                                className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group overflow-hidden"
                            >
                                <div className="p-5">
                                    {/* Header: Date */}
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-2 text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                                            <Calendar size={12} />
                                            {formatDate(analysis.created_at)}
                                        </div>
                                        <button
                                            onClick={(e) => handleDelete(e, analysis.id)}
                                            className="text-gray-300 hover:text-red-500 transition-colors p-1"
                                            title="Excluir análise"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    {/* Teams & Score */}
                                    <div className="flex items-center justify-center gap-4 mb-6">
                                        <div className="flex flex-col items-center gap-2 w-1/3 text-center">
                                            {analysis.home_team_logo ? (
                                                <img src={analysis.home_team_logo} alt={analysis.home_team_name} className="w-12 h-12 object-contain" />
                                            ) : (
                                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-xs text-gray-400">?</div>
                                            )}
                                            <span className="text-xs font-bold text-gray-700 line-clamp-2 md:line-clamp-1 h-8 md:h-auto flex items-center justify-center">
                                                {analysis.home_team_name}
                                            </span>
                                        </div>

                                        <div className="text-2xl font-bold text-gray-800 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
                                            {analysis.home_score} - {analysis.away_score}
                                        </div>

                                        <div className="flex flex-col items-center gap-2 w-1/3 text-center">
                                            {analysis.away_team_logo ? (
                                                <img src={analysis.away_team_logo} alt={analysis.away_team_name} className="w-12 h-12 object-contain" />
                                            ) : (
                                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-xs text-gray-400">?</div>
                                            )}
                                            <span className="text-xs font-bold text-gray-700 line-clamp-2 md:line-clamp-1 h-8 md:h-auto flex items-center justify-center">
                                                {analysis.away_team_name}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Preview Notes */}
                                    {analysis.notes_preview && (
                                        <div className="mt-4 pt-4 border-t border-gray-50">
                                            <p className="text-xs text-gray-500 italic line-clamp-2">
                                                "{analysis.notes_preview}"
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyAnalyses;
