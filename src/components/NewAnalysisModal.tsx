import { X, Calendar, FileEdit, Target, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { analysisService, type AnalysisType } from '../services/analysisService';
import { useState } from 'react';

interface NewAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface OptionCard {
    type: AnalysisType | 'partida_api' | 'importar';
    icon: React.ReactNode;
    title: string;
    description: string;
    available: boolean;
}

export default function NewAnalysisModal({ isOpen, onClose }: NewAnalysisModalProps) {
    const navigate = useNavigate();
    const [isCreating, setIsCreating] = useState(false);

    if (!isOpen) return null;

    const options: OptionCard[] = [
        {
            type: 'partida_api',
            icon: <Calendar className="w-8 h-8" />,
            title: 'Partida ao Vivo',
            description: 'Selecione uma partida da API para analisar',
            available: true
        },
        {
            type: 'partida',
            icon: <FileEdit className="w-8 h-8" />,
            title: 'Prancheta Livre',
            description: 'Campo em branco para criar sua análise',
            available: true
        },
        {
            type: 'adversario',
            icon: <Target className="w-8 h-8" />,
            title: 'Análise Adversário',
            description: 'Estude o próximo adversário',
            available: true
        },
        {
            type: 'importar',
            icon: <Upload className="w-8 h-8" />,
            title: 'Importar Análise',
            description: 'Importe de arquivo ou link compartilhado',
            available: false
        }
    ];

    const handleSelect = async (type: OptionCard['type']) => {
        if (type === 'partida_api') {
            // Navigate to match selection page
            navigate('/');
            onClose();
            return;
        }

        if (type === 'importar') {
            // Not implemented yet
            return;
        }

        try {
            setIsCreating(true);
            const analysisId = await analysisService.createBlankAnalysis(type as AnalysisType);
            navigate(`/analysis/${analysisId}`);
            onClose();
        } catch (error) {
            console.error('Error creating analysis:', error);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1f2e] rounded-xl w-full max-w-2xl border border-gray-700 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">Criar Nova Análise</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="text-gray-400 mb-6">Escolha como deseja começar:</p>

                    <div className="grid grid-cols-2 gap-4">
                        {options.map((option) => (
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
                                <div className={`mb-4 ${option.available ? 'text-green-500' : 'text-gray-600'}`}>
                                    {option.icon}
                                </div>
                                <h3 className={`font-semibold mb-2 ${option.available ? 'text-white' : 'text-gray-500'}`}>
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
                    </div>
                </div>
            </div>
        </div>
    );
}
