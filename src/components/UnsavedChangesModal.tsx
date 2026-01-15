import { X, Save, Trash2 } from 'lucide-react';

interface UnsavedChangesModalProps {
    isOpen: boolean;
    onDiscard: () => void;
    onCancel: () => void;
    onSave: () => void;
    isSaving?: boolean;
}

export default function UnsavedChangesModal({
    isOpen,
    onDiscard,
    onCancel,
    onSave,
    isSaving = false
}: UnsavedChangesModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1f2e] rounded-xl w-full max-w-md border border-gray-700 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
                            <span className="text-xl">⚠️</span>
                        </div>
                        <h2 className="text-xl font-bold text-white">Alterações não salvas</h2>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="text-gray-400 mb-6">
                        Você tem alterações que não foram salvas. Deseja salvar antes de sair?
                    </p>

                    {/* Actions */}
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={onDiscard}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Descartar
                        </button>
                        <button
                            onClick={onCancel}
                            disabled={isSaving}
                            className="px-4 py-2 text-gray-400 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={onSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            {isSaving ? 'Salvando...' : 'Salvar e Sair'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
