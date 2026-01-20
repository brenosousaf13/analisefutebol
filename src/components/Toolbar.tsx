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
    Loader2,
    UserPlus
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
    onAddPlayer: () => void;
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
            relative w-9 h-9 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center transition-all
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
    onAddPlayer,
    isSaving = false,
    hasUnsavedChanges = false
}) => {
    return (
        <div className={`
            fixed z-30
            /* Mobile: Bottom bar horizontal */
            bottom-0 left-0 right-0 h-14
            flex flex-row items-center justify-start sm:justify-around
            bg-nav-dark border-t border-gray-700
            px-2 pb-safe
            overflow-x-auto no-scrollbar
            
            /* Desktop: Sidebar lateral esquerda vertical */
            lg:bottom-auto lg:left-4 lg:right-auto lg:top-1/2 lg:-translate-y-1/2
            lg:h-auto lg:w-auto
            lg:flex-col lg:gap-2 lg:p-2 lg:rounded-xl lg:border lg:border-gray-700
            lg:shadow-2xl
            lg:overflow-visible
        `}>

            {/* Drawing Tools */}
            <div className="flex flex-row lg:flex-col gap-1 items-center shrink-0">
                <ToolButton
                    icon={<MousePointer2 className="w-5 h-5" />}
                    label="Seleção"
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
                    label="Área"
                    isActive={activeTool === 'rectangle'}
                    onClick={() => onToolChange('rectangle')}
                />
            </div>

            <div className="h-4 w-px bg-gray-700 mx-1 lg:hidden shrink-0" />
            <div className="hidden lg:block h-px w-8 bg-gray-700 my-1" />

            {/* Colors & Eraser */}
            <div className="flex flex-row lg:flex-col gap-1 items-center shrink-0">
                <ToolButton
                    icon={<Palette className="w-5 h-5" />}
                    label="Cores"
                    onClick={onOpenColorPicker}
                />
                <ToolButton
                    icon={<Eraser className="w-5 h-5" />}
                    label="Apagar"
                    isActive={activeTool === 'eraser'}
                    onClick={() => onToolChange('eraser')}
                />
            </div>

            <div className="h-4 w-px bg-gray-700 mx-1 lg:hidden shrink-0" />
            <div className="hidden lg:block h-px bg-gray-700 my-1" />

            {/* Analysis & Events */}
            <div className="flex flex-row lg:flex-col gap-1 items-center shrink-0">
                <ToolButton
                    icon={<UserPlus className="w-5 h-5" />}
                    label="Add Jogador"
                    onClick={onAddPlayer}
                />
                <ToolButton
                    icon={<FileText className="w-5 h-5" />}
                    label="Análise"
                    onClick={onOpenAnalysis}
                />
                <ToolButton
                    icon={<Zap className="w-5 h-5" />}
                    label="Eventos"
                    onClick={onOpenEvents}
                />
            </div>

            <div className="hidden lg:block h-px bg-gray-700 my-1" />

            {/* Actions - Desktop mostly, on mobile Save is critical */}
            <div className="flex flex-row lg:flex-col gap-1 items-center">
                <div className="hidden lg:block">
                    <ToolButton
                        icon={<Download className="w-5 h-5" />}
                        label="Exportar"
                        onClick={onExport}
                    />
                </div>
                <ToolButton
                    icon={<Save className="w-5 h-5" />}
                    label="Salvar"
                    onClick={onSave}
                    isLoading={isSaving}
                    badge={hasUnsavedChanges}
                />
            </div>

            {/* Mobile Menu for hidden items? Or keep simple? keeping simple for now based on request */}
        </div>
    );
};

export default Toolbar;
