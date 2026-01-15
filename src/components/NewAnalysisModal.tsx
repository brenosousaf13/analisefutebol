import { X, Calendar, FileEdit, Upload } from 'lucide-react';
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
            try {
                setIsCreating(true);
                const analysisId = await analysisService.createBlankAnalysis('partida');
                navigate(`/analysis/saved/${analysisId}`);
                onClose();
            } catch (error) {
                console.error('Error creating blank analysis:', error);
            } finally {
                setIsCreating(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1f2e] rounded-xl w-full max-w-xl border border-gray-700 shadow-2xl">
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
                </div>
            </div>
        </div>
    );
}
