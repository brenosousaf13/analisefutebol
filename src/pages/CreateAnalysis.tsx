import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PlusCircle } from 'lucide-react';
import Header from '../components/Header';
import MatchBuilder from '../components/MatchBuilder';
import { analysisService } from '../services/analysisService';
import { apiFootballService } from '../services/apiFootballService';
import type { ApiSquadPlayer } from '../types/api-football';

// Images
import montagemTaticaBg from '../assets/montagem-tatica.avif';
import partidaPersonalizadaBg from '../assets/partida-personalizada.avif';

interface OptionCard {
    type: 'partida_api' | 'analise_personalizada';
    title: string;
    description: string;
    available: boolean;
    fullWidth?: boolean;
    bgImage: string;
}

const CreateAnalysisLinesPage: React.FC = () => {
    const navigate = useNavigate();
    const [isCreating, setIsCreating] = useState(false);
    const [view, setView] = useState<'selection' | 'custom_form' | 'match_builder'>('selection');

    // Custom Form State
    const [customHome, setCustomHome] = useState('');
    const [customAway, setCustomAway] = useState('');
    const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
    const [customTime, setCustomTime] = useState('16:00');

    const options: OptionCard[] = [
        {
            type: 'partida_api',
            title: 'Montar Partida',
            description: 'Selecione a liga e os times com elencos reais para analisar',
            available: true,
            bgImage: montagemTaticaBg
        },
        {
            type: 'analise_personalizada',
            title: 'Análise Personalizada',
            description: 'Crie times manuais e personalize como quiser',
            available: true,
            bgImage: partidaPersonalizadaBg
        }
    ];

    const handleSelect = async (type: OptionCard['type']) => {
        if (type === 'partida_api') {
            setView('match_builder');
            return;
        }

        if (type === 'analise_personalizada') {
            setView('custom_form');
        }
    };

    const handleBack = () => {
        setView('selection');
    };

    // --- LOGIC FROM NEW ANALYSIS MODAL ---

    const handleMatchBuilderCreate = async (data: any) => {
        setIsCreating(true);
        try {
            const { homeTeam, awayTeam, matchDate, matchTime } = data;

            // Prepare Initial Data Structure
            const initialData: any = {
                matchId: null,
                matchDate: matchDate,
                matchTime: matchTime,
                titulo: `${homeTeam.team.name} vs ${awayTeam.team.name}`,
                homeTeam: homeTeam.team.name,
                awayTeam: awayTeam.team.name,
                homeTeamLogo: homeTeam.team.logo,
                awayTeamLogo: awayTeam.team.logo,
                homeScore: 0,
                awayScore: 0
            };

            // Fetch Squads
            try {
                console.log(`[UI] Fetching squads for Home: ${homeTeam.team.id}, Away: ${awayTeam.team.id}`);
                const homeSquad = await apiFootballService.getSquad(homeTeam.team.id);
                const awaySquad = await apiFootballService.getSquad(awayTeam.team.id);

                if (homeSquad.length > 0) {
                    const mapped = mapSquadToApp(homeSquad, true);
                    initialData.homePlayersDef = mapped.starters;
                    initialData.homePlayersOff = mapped.starters.map(p => ({ ...p }));
                    initialData.homeSubstitutes = mapped.subs;
                } else {
                    alert(`Atenção: Elenco do time mandante (${homeTeam.team.name}) não encontrado. Serão usados jogadores genéricos.`);
                }

                if (awaySquad.length > 0) {
                    const mapped = mapSquadToApp(awaySquad, false);
                    initialData.awayPlayersDef = mapped.starters;
                    initialData.awayPlayersOff = mapped.starters.map(p => ({ ...p }));
                    initialData.awaySubstitutes = mapped.subs;
                } else {
                    alert(`Atenção: Elenco do time visitante (${awayTeam.team.name}) não encontrado. Serão usados jogadores genéricos.`);
                }

            } catch (err) {
                console.error('[UI] Error fetching squads:', err);
                alert('Erro ao buscar elencos. Jogadores genéricos serão utilizados.');
            }

            // Always create as 'analise_completa' (which is the FullAnalysisMode)
            const analysisId = await analysisService.createBlankAnalysis('analise_completa', initialData);
            navigate(`/analysis-complete/saved/${analysisId}`);

        } catch (error) {
            console.error('Error creating analysis:', error);
            alert('Erro ao criar análise.');
        } finally {
            setIsCreating(false);
        }
    };

    // Helper to map API Squad to Players
    const mapSquadToApp = (squad: ApiSquadPlayer[], isHome: boolean) => {
        const baseId = isHome ? 1000 : 2000;
        const defaultPositions = analysisService.generateFullModePlayers(isHome);

        const goalkeepers = squad.filter(p => p.position === 'Goalkeeper');
        const outfielders = squad.filter(p => p.position !== 'Goalkeeper');

        const likelyStarters = [
            ...(goalkeepers[0] ? [goalkeepers[0]] : []),
            ...outfielders.slice(0, 10 + (goalkeepers[0] ? 0 : 1))
        ].slice(0, 11);

        const remainingSquad = squad.filter(p => !likelyStarters.includes(p));

        const starters = likelyStarters.map((item, index) => {
            const pos = defaultPositions[index] || { position: { x: 50, y: 50 } };
            return {
                id: item.id || (baseId + index),
                name: item.name,
                number: item.number || 0,
                position: pos.position,
                photo: item.photo
            };
        });

        const subs = remainingSquad.map((item, index) => ({
            id: item.id || (baseId + 100 + index),
            name: item.name,
            number: item.number || 0,
            position: { x: 0, y: 0 },
            photo: item.photo
        }));

        return { starters, subs };
    };

    const handleCreateCustom = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsCreating(true);

            // 'analise_completa' is the new standard, but we call it 'Análise Personalizada' in UI
            const analysisId = await analysisService.createBlankAnalysis('analise_completa', {
                homeTeam: customHome,
                awayTeam: customAway,
                titulo: `${customHome} vs ${customAway}`,
                matchDate: customDate,
                matchTime: customTime
            });

            navigate(`/analysis-complete/saved/${analysisId}`);
        } catch (error) {
            console.error('Error creating blank analysis:', error);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="h-screen overflow-y-auto bg-gray-900 text-white flex flex-col">
            <Header />

            <div className="pt-24 px-4 sm:px-8 pb-8 flex-1 flex flex-col items-center justify-start">

                {/* Page Title */}
                <div className="w-full max-w-5xl mb-8 flex items-center gap-4">
                    {(view === 'custom_form' || view === 'match_builder') && (
                        <button onClick={handleBack} className="p-2 hover:bg-gray-800 rounded-full transition border border-gray-700">
                            <ArrowLeft className="w-5 h-5 text-gray-400" />
                        </button>
                    )}
                    <div>
                        <h1 className="text-3xl font-bold text-white">
                            {view === 'selection' ? 'Criar Análise' :
                                view === 'match_builder' ? 'Montar Partida' : 'Análise Personalizada'}
                        </h1>
                        <p className="text-gray-400 mt-1">
                            {view === 'selection' ? 'Escolha como deseja iniciar seu trabalho' :
                                view === 'match_builder' ? 'Selecione competição e times' : 'Defina os detalhes manualmente'}
                        </p>
                    </div>
                </div>

                {/* Content Area */}
                <div className="w-full max-w-5xl">
                    {view === 'selection' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {options.map((option) => (
                                <button
                                    key={option.type}
                                    onClick={() => handleSelect(option.type)}
                                    disabled={!option.available || isCreating}
                                    className={`
                                        relative group overflow-hidden rounded-2xl h-[500px] w-full border-2 border-transparent transition-all
                                        ${option.available
                                            ? 'cursor-pointer hover:border-accent-green hover:shadow-2xl hover:scale-[1.01]'
                                            : 'cursor-not-allowed opacity-60 grayscale'
                                        }
                                    `}
                                >
                                    {/* Background Image */}
                                    <div className="absolute inset-0 bg-gray-900">
                                        <img
                                            src={option.bgImage}
                                            alt={option.title}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-80"
                                        />
                                    </div>

                                    {/* Overlay Gradient */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90 group-hover:opacity-80 transition-opacity duration-300" />

                                    {/* Content - Bottom Left */}
                                    <div className="absolute bottom-0 left-0 w-full p-8 text-left translate-y-2 group-hover:translate-y-0 transition-transform duration-300">

                                        <h3 className="text-3xl font-bold text-white mb-2 uppercase tracking-wide">
                                            {option.title}
                                        </h3>
                                        <p className="text-gray-300 text-lg max-w-md leading-relaxed">
                                            {option.description}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : view === 'match_builder' ? (
                        <div className="bg-panel-dark rounded-xl border border-gray-700 p-6 md:p-8">
                            <MatchBuilder
                                onCreate={handleMatchBuilderCreate}
                                onCancel={handleBack}
                                isCreating={isCreating}
                            />
                        </div>
                    ) : (
                        <div className="bg-panel-dark rounded-xl border border-gray-700 p-6 md:p-8 max-w-2xl mx-auto">
                            <form onSubmit={handleCreateCustom} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-300">Time da Casa</label>
                                        <input
                                            type="text"
                                            value={customHome}
                                            onChange={(e) => setCustomHome(e.target.value)}
                                            placeholder="Ex: Brasil"
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent-green focus:ring-1 focus:ring-accent-green transition"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-300">Time Visitante</label>
                                        <input
                                            type="text"
                                            value={customAway}
                                            onChange={(e) => setCustomAway(e.target.value)}
                                            placeholder="Ex: Argentina"
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent-green focus:ring-1 focus:ring-accent-green transition"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-300">Data da Partida</label>
                                        <input
                                            type="date"
                                            value={customDate}
                                            onChange={(e) => setCustomDate(e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent-green focus:ring-1 focus:ring-accent-green transition"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-300">Horário</label>
                                        <input
                                            type="time"
                                            value={customTime}
                                            onChange={(e) => setCustomTime(e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent-green focus:ring-1 focus:ring-accent-green transition"
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-green-900/20 transition flex items-center justify-center gap-3 transform hover:scale-[1.02] active:scale-[0.98] mt-4"
                                >
                                    {isCreating ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Criando...
                                        </>
                                    ) : (
                                        <>
                                            <PlusCircle className="w-6 h-6" />
                                            Iniciar Análise
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreateAnalysisLinesPage;
