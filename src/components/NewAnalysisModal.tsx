import { X, Calendar, FileEdit, Upload, PlusCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { analysisService } from '../services/analysisService';
import { useState } from 'react';

interface NewAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface OptionCard {
    type: 'partida_api' | 'prancheta_livre' | 'importar';
    icon: React.ReactNode;
    title: string;
    description: string;
    available: boolean;
    fullWidth?: boolean;
}

export default function NewAnalysisModal({ isOpen, onClose }: NewAnalysisModalProps) {
    const navigate = useNavigate();
    const [isCreating, setIsCreating] = useState(false);
    const [view, setView] = useState<'selection' | 'custom_form'>('selection');

    // Custom Form State
    const [customHome, setCustomHome] = useState('');
    const [customAway, setCustomAway] = useState('');
    const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
    const [customTime, setCustomTime] = useState('16:00');

    if (!isOpen) return null;

    const options: OptionCard[] = [
        {
            type: 'partida_api',
            icon: <Calendar className="w-10 h-10" />,
            title: 'Partida ao Vivo',
            description: 'Selecione uma partida da API para analisar',
            available: true
        },
        {
            type: 'prancheta_livre',
            icon: <FileEdit className="w-10 h-10" />,
            title: 'Prancheta Livre',
            description: 'Campo em branco para criar sua análise',
            available: true
        },
        {
            type: 'importar',
            icon: <Upload className="w-10 h-10" />,
            title: 'Importar Análise',
            description: 'Importe de arquivo ou link compartilhado',
            available: false,
            fullWidth: true
        }
    ];

    const handleSelect = async (type: OptionCard['type']) => {
        if (type === 'partida_api') {
            navigate('/');
            onClose();
            return;
        }

        if (type === 'importar') {
            return;
        }

        if (type === 'prancheta_livre') {
            setView('custom_form');
        }
    };

    const handleCreateCustom = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsCreating(true);
            const analysisId = await analysisService.createBlankAnalysis('partida', {
                homeTeam: customHome,
                awayTeam: customAway,
                titulo: `${customHome} vs ${customAway}`,
                matchDate: customDate,
                matchTime: customTime
            });
            navigate(`/analysis/saved/${analysisId}`);
            onClose();
        } catch (error) {
            console.error('Error creating blank analysis:', error);
        } finally {
            setIsCreating(false);
        }
    };

    const handleBack = () => {
        setView('selection');
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1f2e] rounded-xl w-full max-w-xl border border-gray-700 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700">
                    <div className="flex items-center gap-3">
                        {view === 'custom_form' && (
                            <button onClick={handleBack} className="p-1 hover:bg-gray-700 rounded-full transition">
                                <ArrowLeft className="w-5 h-5 text-gray-400" />
                            </button>
                        )}
                        <h2 className="text-xl font-bold text-white">
                            {view === 'selection' ? 'Criar Nova Análise' : 'Configurar Partida'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {view === 'selection' ? (
                        <>
                            <p className="text-gray-400 mb-6">Escolha como deseja começar:</p>

                            {/* Top row - 2 columns */}
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                {options.filter(o => !o.fullWidth).map((option) => (
                                    <button
                                        key={option.type}
                                        onClick={() => handleSelect(option.type)}
                                        disabled={!option.available || isCreating}
                                        className={`
                                            flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all text-center
                                            ${option.available
                                                ? 'border-gray-700 hover:border-green-500 hover:bg-[#242938] cursor-pointer'
                                                : 'border-gray-800 opacity-50 cursor-not-allowed'
                                            }
                                        `}
                                    >
                                        <div className={`mb-3 ${option.available ? 'text-green-500' : 'text-gray-600'}`}>
                                            {option.icon}
                                        </div>
                                        <h3 className={`font-semibold mb-1 ${option.available ? 'text-white' : 'text-gray-500'}`}>
                                            {option.title}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            {option.description}
                                        </p>
                                    </button>
                                ))}
                            </div>

                            {/* Bottom row - full width */}
                            {options.filter(o => o.fullWidth).map((option) => (
                                <button
                                    key={option.type}
                                    onClick={() => handleSelect(option.type)}
                                    disabled={!option.available || isCreating}
                                    className={`
                                        w-full flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all text-center
                                        ${option.available
                                            ? 'border-gray-700 hover:border-green-500 hover:bg-[#242938] cursor-pointer'
                                            : 'border-gray-800 opacity-50 cursor-not-allowed'
                                        }
                                    `}
                                >
                                    <div className={`mb-3 ${option.available ? 'text-green-500' : 'text-gray-600'}`}>
                                        {option.icon}
                                    </div>
                                    <h3 className={`font-semibold mb-1 ${option.available ? 'text-white' : 'text-gray-500'}`}>
                                        {option.title}
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        {option.description}
                                    </p>
                                    {!option.available && (
                                        <span className="mt-2 text-xs text-gray-600 bg-gray-800 px-2 py-1 rounded">
                                            Em breve
                                        </span>
                                    )}
                                </button>
                            ))}
                        </>
                    ) : (
                        <form onSubmit={handleCreateCustom} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
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

                            <div className="grid grid-cols-2 gap-4">
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
                    )}
                </div>
            </div>
        </div>
    );
}
