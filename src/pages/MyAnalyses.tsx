import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analysisService, type SavedAnalysisSummary, type AnalysisFilters } from '../services/analysisService';
import {
    Loader2, Trash2, Calendar, FileText, Plus, Search,
    ExternalLink, Copy, Clock, Grid, List, ChevronDown
} from 'lucide-react';
import Header from '../components/Header';
import NewAnalysisModal from '../components/NewAnalysisModal';
import { useAuth } from '../contexts/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import { searchAnalyses } from '../services/searchService';
import type { SearchResult } from '../types/search';
import { PlayerDossierCard } from '../components/search/PlayerDossierCard';
import { TeamDossierCard } from '../components/search/TeamDossierCard';
import { CoachDossierCard } from '../components/search/CoachDossierCard';

const MyAnalyses = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    // Data State
    const [analyses, setAnalyses] = useState<SavedAnalysisSummary[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [orderBy, setOrderBy] = useState<'created_at' | 'updated_at' | 'titulo'>('created_at');
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);

    type SearchType = 'all' | 'team' | 'match' | 'player' | 'coach' | 'tag';
    const [searchType, setSearchType] = useState<SearchType>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Modular Search State
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const debouncedSearch = useDebounce(searchQuery, 500);

    const getSearchPlaceholder = (type: SearchType): string => {
        const placeholders: Record<SearchType, string> = {
            all: 'Buscar análise...',
            team: 'Buscar por time...',
            match: 'Buscar por partida...',
            player: 'Buscar por jogador...',
            coach: 'Buscar por técnico...',
            tag: 'Buscar por tag...'
        };
        return placeholders[type];
    };

    // Main Load Effect (Standard List)
    useEffect(() => {
        if (!debouncedSearch) {
            loadAnalyses();
        }
    }, [orderBy, debouncedSearch]); // Reload when search is cleared

    // Search Effect (Modular Search)
    useEffect(() => {
        if (!debouncedSearch || debouncedSearch.length < 2) {
            setSearchResults([]);
            return;
        }

        async function performSearch() {
            if (!user) return;
            setLoading(true);
            try {
                const results = await searchAnalyses(searchType, debouncedSearch, user.id);
                setSearchResults(results);
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setLoading(false);
            }
        }

        performSearch();
    }, [debouncedSearch, searchType, user]);

    async function loadAnalyses() {
        setLoading(true);
        try {
            const filters: AnalysisFilters = {
                status: 'todas',
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
            // Also update search results if present
            setSearchResults(prev => prev.filter(r => r.type !== 'match' || r.analysis.id !== id));
        } catch (err) {
            console.error('Error deleting:', err);
            alert('Erro ao excluir análise');
        }
    };

    const handleDuplicate = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            await analysisService.duplicateAnalysis(id);
            alert('Análise duplicada! Encontre-a na lista.');
            loadAnalyses();
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

    const navigateToAnalysis = (id: string, type?: string) => {
        const route = type === 'analise_completa'
            ? `/analysis-complete/saved/${id}`
            : `/analysis/saved/${id}`;
        navigate(route);
    };

    // Helper to render a single analysis card (reused for both list and search results)
    const renderAnalysisCard = (analysis: SavedAnalysisSummary) => (
        <div
            key={analysis.id}
            onClick={() => navigateToAnalysis(analysis.id, analysis.tipo)}
            className="group bg-dashboard-card rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-2xl hover:shadow-black/50 border border-transparent hover:border-gray-700/50 flex flex-col"
        >
            {/* Top Section: Gradient & Logos */}
            <div className={`relative h-40 w-full overflow-hidden ${analysis.thumbnail_url ? '' : 'bg-gradient-to-br from-[#1e293b] to-[#0f172a]'}`}>
                {analysis.thumbnail_url ? (
                    <div className="absolute inset-0">
                        <img
                            src={analysis.thumbnail_url}
                            alt={analysis.titulo}
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-dashboard-card via-transparent to-transparent opacity-90" />
                    </div>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center p-6">
                        {/* Logos Container */}
                        <div className="flex items-center justify-center gap-6 w-full transform transition-transform duration-300 group-hover:scale-105">
                            {/* Home Team */}
                            <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                                {analysis.home_team_logo ? (
                                    <img
                                        src={analysis.home_team_logo}
                                        className="w-16 h-16 object-contain drop-shadow-lg"
                                        alt={analysis.home_team_name}
                                    />
                                ) : (
                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                                        <div className="h-8 w-8 rounded bg-red-500/80" />
                                    </div>
                                )}
                            </div>

                            {/* VS */}
                            <span className="text-2xl font-black text-white/90 italic tracking-wider drop-shadow-md">VS</span>

                            {/* Away Team */}
                            <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                                {analysis.away_team_logo ? (
                                    <img
                                        src={analysis.away_team_logo}
                                        className="w-16 h-16 object-contain drop-shadow-lg"
                                        alt={analysis.away_team_name}
                                    />
                                ) : (
                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                                        <div className="h-8 w-8 rounded bg-blue-500/80" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Section: Info & Actions */}
            <div className="p-5 flex flex-col gap-3 flex-1 relative bg-dashboard-card">
                <div className="flex-1 space-y-1">
                    <h3 className="text-xl font-bold text-white group-hover:text-brand-primary transition-colors line-clamp-1 leading-tight">
                        {analysis.titulo}
                    </h3>

                    <div className="flex items-center gap-3 text-sm text-gray-500 font-medium">
                        <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-gray-600" />
                            {formatDate(analysis.created_at)}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-gray-600" />
                            {formatRelativeTime(analysis.updated_at)}
                        </div>
                    </div>
                </div>

                {/* Actions Row */}
                <div className="flex items-center justify-end gap-2 mt-2 pt-2">
                    <button
                        onClick={(e) => handleDuplicate(e, analysis.id)}
                        title="Duplicar"
                        className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-all border border-gray-700 hover:border-gray-600 shadow-sm"
                    >
                        <Copy className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => handleDelete(e, analysis.id)}
                        title="Excluir"
                        className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all border border-gray-700 hover:border-red-900/30 shadow-sm"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-dashboard-page flex flex-col">
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
                                className="px-3 py-2 bg-dashboard-card border border-gray-700 rounded-lg text-white focus:border-[#27D888] focus:outline-none"
                            >
                                <option value="all">Todos</option>
                                <option value="team">Time</option>
                                <option value="match">Partida</option>
                                <option value="player">Jogador</option>
                                <option value="coach">Técnico</option>
                                <option value="tag">Tag</option>
                            </select>

                            {/* Input de busca */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder={getSearchPlaceholder(searchType)}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 pr-4 py-2 bg-dashboard-card border border-gray-700 rounded-lg text-white placeholder-gray-500 w-64 focus:border-[#27D888] focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* New Analysis Button */}
                        <button
                            onClick={() => setIsNewModalOpen(true)}
                            className="flex items-center gap-2 bg-gradient-to-r from-[#27D888] to-[#ACFA70] text-[#0D0D0D] hover:shadow-[0_0_20px_rgba(39,216,136,0.3)] px-4 py-2 rounded-lg font-bold transition-all shadow-lg shadow-emerald-900/20"
                        >
                            <Plus className="w-5 h-5" />
                            Nova Análise
                        </button>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex items-center justify-between mb-6 bg-dashboard-card/50 rounded-xl p-2">
                    <div className="flex gap-1">
                        <span className="px-4 py-2 rounded-lg text-sm font-medium bg-green-500 text-white cursor-default">
                            Todas
                        </span>
                    </div>

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

                {/* Results Count & Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-4 text-green-500" />
                        <p>Carregando análises...</p>
                    </div>
                ) : debouncedSearch && searchQuery.length >= 2 ? (
                    /* Search Results View */
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Search className="w-5 h-5 text-green-500" />
                            <h2 className="text-xl font-bold text-white">
                                Resultados para "{searchQuery}"
                            </h2>
                            <span className="text-gray-500 text-sm ml-2">({searchResults.length} encontrados)</span>
                        </div>

                        {searchResults.length === 0 ? (
                            <div className="text-center py-20 bg-dashboard-card rounded-xl border border-gray-700">
                                <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-white mb-2">Nenhum resultado encontrado</h3>
                                <p className="text-gray-400">
                                    Não encontramos nada para "{searchQuery}" com o filtro selecionado.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {searchResults.map((result, idx) => {
                                    if (result.type === 'player') {
                                        return (
                                            <PlayerDossierCard
                                                key={`player-${idx}`}
                                                dossier={result}
                                                onEntryClick={(id) => navigateToAnalysis(id, 'analise_completa')}
                                            />
                                        );
                                    }
                                    if (result.type === 'team') {
                                        return (
                                            <TeamDossierCard
                                                key={`team-${idx}`}
                                                dossier={result}
                                                onEntryClick={(id) => navigateToAnalysis(id, 'analise_completa')}
                                            />
                                        );
                                    }
                                    if (result.type === 'coach') {
                                        return (
                                            <CoachDossierCard
                                                key={`coach-${idx}`}
                                                dossier={result}
                                                onEntryClick={(id) => navigateToAnalysis(id, 'analise_completa')}
                                            />
                                        );
                                    }
                                    // Match Type
                                    return renderAnalysisCard(result.analysis);
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    /* Default All My Analyses View */
                    <>
                        <p className="text-sm text-gray-500 mb-4">
                            📊 {analyses.length} análise{analyses.length !== 1 ? 's' : ''} encontrada{analyses.length !== 1 ? 's' : ''}
                        </p>

                        {analyses.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-dashboard-card rounded-xl border border-gray-700">
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
                            <div className={viewMode === 'grid'
                                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                                : "flex flex-col gap-4"
                            }>
                                {analyses.map(renderAnalysisCard)}
                            </div>
                        )}
                    </>
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
