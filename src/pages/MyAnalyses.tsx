import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analysisService, type SavedAnalysisSummary, type AnalysisFilters } from '../services/analysisService';
import {
    Loader2, Trash2, Calendar, FileText, Plus, Search,
    ExternalLink, Copy, Clock, Grid, List, ChevronDown
} from 'lucide-react';
import Header from '../components/Header';
import NewAnalysisModal from '../components/NewAnalysisModal';

const MyAnalyses = () => {
    const navigate = useNavigate();
    const [analyses, setAnalyses] = useState<SavedAnalysisSummary[]>([]);
    const [loading, setLoading] = useState(true);
    // const [activeTab, setActiveTab] = useState<StatusFilter>('todas'); // Removed
    const [searchQuery, setSearchQuery] = useState('');
    const [orderBy, setOrderBy] = useState<'created_at' | 'updated_at' | 'titulo'>('created_at');
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);
    type SearchType = 'all' | 'team' | 'match' | 'player' | 'coach';
    const [searchType, setSearchType] = useState<SearchType>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const getSearchPlaceholder = (type: SearchType): string => {
        const placeholders: Record<SearchType, string> = {
            all: 'Buscar análise...',
            team: 'Buscar por time...',
            match: 'Buscar por partida...',
            player: 'Buscar por jogador...',
            coach: 'Buscar por técnico...'
        };
        return placeholders[type];
    };

    useEffect(() => {
        loadAnalyses();
    }, [searchQuery, orderBy, searchType]);

    async function loadAnalyses() {
        setLoading(true);
        try {
            const filters: AnalysisFilters = {
                status: 'todas',
                search: searchQuery || undefined,
                searchType,
                orderBy,
                orderDirection: 'desc'
            };
            const data = await analysisService.getMyAnalyses(filters);
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

    const handleDuplicate = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            await analysisService.duplicateAnalysis(id);
            // We should check type, but duplicate usually keeps type.
            // Ideally we'd know the type to redirect correctly or just fetch it.
            // For now, let's assume it routes to standard, but if we want perfection we need to know type.
            // A simple fix is just to reload or let user click. 
            // But let's try to be smart.
            // Actually, `duplicateAnalysis` returns ID. We might not know type without fetching.
            // Let's just navigate to generic and let a redirect handler handle it? 
            // Or better: Navigate to /minhas-analises triggers reload.
            // But user wants to go to analysis.
            // Let's use a helper or just check the *current* analysis type if we had it.
            // We have it in the list! We can pass type to handleDuplicate.
            alert('Análise duplicada! Encontre-a na lista.');
            loadAnalyses(); // Reload list
        } catch (err) {
            console.error('Error duplicating:', err);
            alert('Erro ao duplicar análise');
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatRelativeTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins}min atrás`;
        if (diffHours < 24) return `${diffHours}h atrás`;
        if (diffDays < 7) return `${diffDays}d atrás`;
        return formatDate(dateString);
    };

    // const tabs removed

    return (
        <div className="min-h-screen bg-[#0d1117] flex flex-col">
            <Header />
            <div className="pt-20 p-6 md:p-8 max-w-7xl mx-auto w-full flex-1 mt-16">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Minhas Análises</h1>
                        <p className="text-gray-400 text-sm mt-1">Gerencie todas as suas análises táticas</p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Search */}
                        <div className="flex items-center gap-2">
                            {/* Dropdown de tipo de busca */}
                            <select
                                value={searchType}
                                onChange={(e) => setSearchType(e.target.value as SearchType)}
                                className="px-3 py-2 bg-[#242938] border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
                            >
                                <option value="all">Todos</option>
                                <option value="team">Time</option>
                                <option value="match">Partida</option>
                                <option value="player">Jogador</option>
                                <option value="coach">Técnico</option>
                            </select>

                            {/* Input de busca */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder={getSearchPlaceholder(searchType)}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 pr-4 py-2 bg-[#242938] border border-gray-700 rounded-lg text-white placeholder-gray-500 w-64 focus:border-green-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* New Analysis Button */}
                        <button
                            onClick={() => setIsNewModalOpen(true)}
                            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            Nova Análise
                        </button>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex items-center justify-between mb-6 bg-[#1a1f2e] rounded-xl p-2">
                    {/* Status Tabs - Changed to just static 'Todas' label as requested */}
                    <div className="flex gap-1">
                        <span className="px-4 py-2 rounded-lg text-sm font-medium bg-green-500 text-white cursor-default">
                            Todas
                        </span>
                    </div>

                    {/* Order & View Toggle */}
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <select
                                value={orderBy}
                                onChange={(e) => setOrderBy(e.target.value as typeof orderBy)}
                                className="appearance-none bg-[#242938] border border-gray-700 rounded-lg px-3 py-2 pr-8 text-sm text-gray-300 cursor-pointer"
                            >
                                <option value="created_at">Mais recentes</option>
                                <option value="updated_at">Última edição</option>
                                <option value="titulo">Alfabética (A-Z)</option>
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>

                        <div className="flex bg-[#242938] rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                <Grid className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                <List className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Results Count */}
                <p className="text-sm text-gray-500 mb-4">
                    📊 {analyses.length} análise{analyses.length !== 1 ? 's' : ''} encontrada{analyses.length !== 1 ? 's' : ''}
                </p>

                {/* Content */}
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="animate-spin text-green-500" size={48} />
                    </div>
                ) : analyses.length === 0 ? (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center py-20 bg-[#1a1f2e] rounded-xl border border-gray-700">
                        <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-6">
                            <FileText className="w-10 h-10 text-gray-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">Nenhuma análise encontrada</h3>
                        <p className="text-gray-400 mb-6 text-center max-w-md">
                            Comece criando sua primeira análise tática. Você pode analisar partidas ao vivo,
                            criar modelos táticos ou estudar adversários.
                        </p>
                        <button
                            onClick={() => setIsNewModalOpen(true)}
                            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            Criar Primeira Análise
                        </button>
                    </div>
                ) : (
                    /* Grid View */
                    <div className={viewMode === 'grid'
                        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                        : "flex flex-col gap-4"
                    }>
                        {analyses.map((analysis) => (
                            <div
                                key={analysis.id}
                                onClick={() => {
                                    const route = analysis.tipo === 'analise_completa'
                                        ? `/analysis-complete/saved/${analysis.id}`
                                        : `/analysis/saved/${analysis.id}`;
                                    navigate(route);
                                }}
                                className="bg-[#1a1f2e] rounded-xl overflow-hidden border border-gray-700 hover:border-green-500/50 transition-all group cursor-pointer"
                            >
                                {/* Thumbnail */}
                                <div className="relative h-40 bg-[#2d5a3d] overflow-hidden">
                                    {analysis.thumbnail_url ? (
                                        <img src={analysis.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#2d5a3d] to-[#1a3a2a]">
                                            <FileText className="w-12 h-12 text-green-500/30" />
                                        </div>
                                    )}

                                    {/* Status Badge Removed */}

                                    {/* Hover Actions */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                        <button
                                            className="p-3 bg-green-500 rounded-full hover:bg-green-600 transition-colors"
                                            title="Abrir"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const route = analysis.tipo === 'analise_completa'
                                                    ? `/analysis-complete/saved/${analysis.id}`
                                                    : `/analysis/saved/${analysis.id}`;
                                                navigate(route);
                                            }}
                                        >
                                            <ExternalLink className="w-5 h-5 text-white" />
                                        </button>
                                        <button
                                            className="p-3 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors"
                                            title="Duplicar"
                                            onClick={(e) => handleDuplicate(e, analysis.id)}
                                        >
                                            <Copy className="w-5 h-5 text-white" />
                                        </button>
                                        <button
                                            className="p-3 bg-red-500/80 rounded-full hover:bg-red-500 transition-colors"
                                            title="Excluir"
                                            onClick={(e) => handleDelete(e, analysis.id)}
                                        >
                                            <Trash2 className="w-5 h-5 text-white" />
                                        </button>
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="p-4">
                                    {/* Title */}
                                    <h3 className="font-semibold text-white truncate">{analysis.titulo}</h3>

                                    {/* Teams */}
                                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-400">
                                        <span>{analysis.home_team_name}</span>
                                        <span className="text-gray-600">vs</span>
                                        <span>{analysis.away_team_name}</span>
                                    </div>

                                    {/* Meta info */}
                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700">
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span>{formatDate(analysis.created_at)}</span>
                                        </div>

                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>{formatRelativeTime(analysis.updated_at)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <NewAnalysisModal
                    isOpen={isNewModalOpen}
                    onClose={() => setIsNewModalOpen(false)}
                />
            </div>
        </div>
    );
};

export default MyAnalyses;
