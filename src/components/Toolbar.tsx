import React from 'react';
import {
    MousePointer2,
    MoveRight,
    Square,
    Palette,
    Eraser,
    FileText,
    Zap,
    Download,
    Save,
    Loader2
} from 'lucide-react';

export type ToolType = 'select' | 'arrow' | 'rectangle' | 'line' | 'eraser';

interface ToolbarProps {
    activeTool: ToolType;
    onToolChange: (tool: ToolType) => void;
    onOpenColorPicker: () => void;
    onOpenAnalysis: () => void;
    onOpenEvents: () => void;
    onSave: () => void;
    onExport: () => void;
    isSaving?: boolean;
    hasUnsavedChanges?: boolean;
}

interface ToolButtonProps {
    icon: React.ReactNode;
    label: string;
    isActive?: boolean;
    onClick: () => void;
    isLoading?: boolean;
    badge?: boolean;
}

const ToolButton: React.FC<ToolButtonProps> = ({
    icon,
    label,
    isActive = false,
    onClick,
    isLoading = false,
    badge = false
}) => (
    <button
        onClick={onClick}
        disabled={isLoading}
        className={`
            relative w-10 h-10 rounded-lg flex items-center justify-center transition-all
            ${isActive
                ? 'bg-accent-green text-white shadow-lg'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }
            ${isLoading ? 'opacity-50 cursor-wait' : ''}
        `}
        title={label}
    >
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : icon}

        {/* Unsaved changes badge */}
        {badge && !isLoading && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
        )}
    </button>
);

const Toolbar: React.FC<ToolbarProps> = ({
    activeTool,
    onToolChange,
    onOpenColorPicker,
    onOpenAnalysis,
    onOpenEvents,
    onSave,
    onExport,
    isSaving = false,
    hasUnsavedChanges = false
}) => {
    return (
        <div className="fixed left-20 top-1/2 -translate-y-1/2 flex flex-col gap-2 bg-nav-dark rounded-xl p-2 shadow-2xl border border-gray-700 z-30">

            {/* Drawing Tools */}
            <div className="flex flex-col gap-1">
                <ToolButton
                    icon={<MousePointer2 className="w-5 h-5" />}
                    label="Seleção (mover jogadores)"
                    isActive={activeTool === 'select'}
                    onClick={() => onToolChange('select')}
                />
                <ToolButton
                    icon={<MoveRight className="w-5 h-5" />}
                    label="Seta"
                    isActive={activeTool === 'arrow'}
                    onClick={() => onToolChange('arrow')}
                />
                <ToolButton
                    icon={<Square className="w-5 h-5" />}
                    label="Área/Retângulo"
                    isActive={activeTool === 'rectangle'}
                    onClick={() => onToolChange('rectangle')}
                />
            </div>

            <div className="h-px bg-gray-700 my-1" />

            {/* Colors & Eraser */}
            <div className="flex flex-col gap-1">
                <ToolButton
                    icon={<Palette className="w-5 h-5" />}
                    label="Cores dos Times"
                    onClick={onOpenColorPicker}
                />
                <ToolButton
                    icon={<Eraser className="w-5 h-5" />}
                    label="Apagar elementos"
                    isActive={activeTool === 'eraser'}
                    onClick={() => onToolChange('eraser')}
                />
            </div>

            <div className="h-px bg-gray-700 my-1" />

            {/* Analysis & Events */}
            <div className="flex flex-col gap-1">
                <ToolButton
                    icon={<FileText className="w-5 h-5" />}
                    label="Análise Tática"
                    onClick={onOpenAnalysis}
                />
                <ToolButton
                    icon={<Zap className="w-5 h-5" />}
                    label="Eventos da Partida"
                    onClick={onOpenEvents}
                />
            </div>

            <div className="h-px bg-gray-700 my-1" />

            {/* Actions */}
            <div className="flex flex-col gap-1">
                <ToolButton
                    icon={<Download className="w-5 h-5" />}
                    label="Exportar Análise"
                    onClick={onExport}
                />
                <ToolButton
                    icon={<Save className="w-5 h-5" />}
                    label="Salvar Análise"
                    onClick={onSave}
                    isLoading={isSaving}
                    badge={hasUnsavedChanges}
                />
            </div>
        </div>
    );
};

export default Toolbar;
