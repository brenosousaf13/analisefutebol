import { useState } from 'react';
import { X, Copy, Check, Globe, Link as LinkIcon, Lock } from 'lucide-react';
import { analysisService } from '../services/analysisService';
import toast from 'react-hot-toast';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    analysisId: string;
    existingShareToken?: string;
    analysisTitle: string;
}

export default function ShareModal({
    isOpen,
    onClose,
    analysisId,
    existingShareToken,
    analysisTitle
}: ShareModalProps) {
    const [shareToken, setShareToken] = useState<string | undefined>(existingShareToken);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const shareUrl = shareToken
        ? `${window.location.origin}/s/${shareToken}`
        : '';

    const handleGenerateLink = async () => {
        setLoading(true);
        try {
            const token = await analysisService.generateShareLink(analysisId);
            setShareToken(token);
            toast.success('Link gerado com sucesso!');
        } catch (error) {
            console.error('Error generating link:', error);
            toast.error('Erro ao gerar link de compartilhamento');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLink = () => {
        if (!shareUrl) return;
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        toast.success('Link copiado!');
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-[#1a1f2e] rounded-xl w-full max-w-md border border-gray-700 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-[#151925]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                            <Globe className="w-5 h-5 text-emerald-500" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Compartilhar Análise</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <div>
                        <h3 className="text-gray-300 font-medium mb-1 line-clamp-1">{analysisTitle}</h3>
                        <p className="text-sm text-gray-500">
                            Qualquer pessoa com o link poderá visualizar esta análise em modo leitura.
                        </p>
                    </div>

                    {!shareToken ? (
                        <div className="bg-[#242938] border border-gray-700 rounded-lg p-6 text-center space-y-4">
                            <div className="w-12 h-12 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-2">
                                <Lock className="w-6 h-6 text-gray-400" />
                            </div>
                            <p className="text-gray-400 text-sm">
                                Esta análise ainda não possui um link público.
                            </p>
                            <button
                                onClick={handleGenerateLink}
                                disabled={loading}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>Gerando...</>
                                ) : (
                                    <>
                                        <LinkIcon className="w-4 h-4" />
                                        Gerar Link Compartilhável
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-[#242938] border border-gray-700 rounded-lg p-3 flex items-center gap-3">
                                <input
                                    type="text"
                                    readOnly
                                    value={shareUrl}
                                    className="bg-transparent border-none text-gray-300 text-sm w-full focus:ring-0 px-0"
                                />
                                <button
                                    onClick={handleCopyLink}
                                    className={`p-2 rounded-lg transition-all ${copied
                                        ? 'bg-green-500/20 text-green-500'
                                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                                        }`}
                                    title="Copiar Link"
                                >
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>

                            <div className="flex items-start gap-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                <Globe className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                                <p className="text-xs text-blue-300 leading-relaxed">
                                    O link é público, mas apenas leitura. Ninguém poderá editar sua análise, apenas visualizar.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
