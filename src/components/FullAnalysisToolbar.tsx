import React from 'react';
import {
    Hand,
    MoveRight,
    Square,
    Palette,
    Eraser,
    FileText,
    Zap,
    Download,
    Save,
    Loader2,
    UserPlus,
    Share2
} from 'lucide-react';
import { type ToolType } from './Toolbar';

interface FullAnalysisToolbarProps {
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
    isExporting?: boolean;
    onShare?: () => void;
}

const ToolButton: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive?: boolean;
    onClick: () => void;
    isLoading?: boolean;
    badge?: boolean;
}> = ({
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
            relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200
            ${isActive
                    ? 'bg-accent-green text-white shadow-lg scale-110'
                    : 'text-gray-400 hover:bg-white/10 hover:text-white'
                }
            ${isLoading ? 'opacity-50 cursor-wait' : ''}
        `}
            title={label}
        >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : icon}
            {badge && !isLoading && (
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse border-2 border-nav-dark" />
            )}
        </button>
    );

const Divider = () => <div className="w-px h-8 bg-white/10 mx-1" />;

export const FullAnalysisToolbar: React.FC<FullAnalysisToolbarProps> = ({
    activeTool,
    onToolChange,
    onOpenColorPicker,
    onOpenAnalysis,
    onOpenEvents,
    onSave,
    onExport,
    onAddPlayer,
    isSaving = false,
    hasUnsavedChanges = false,
    isExporting = false,
    onShare
}) => {
    return (
        <div className="
            flex flex-row items-center gap-1 
            bg-nav-dark/90 backdrop-blur-md 
            border border-white/10 rounded-full 
            px-4 py-2 shadow-2xl
        ">
            {/* Drawing Tools */}
            <ToolButton
                icon={<Hand className="w-5 h-5" />}
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

            <Divider />

            {/* Colors & Eraser */}
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

            <Divider />

            {/* Analysis & Events */}
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

            <Divider />

            {/* System Actions */}
            <ToolButton
                icon={<Download className="w-5 h-5" />}
                label="Exportar"
                onClick={onExport}
                isLoading={isExporting}
            />
            <ToolButton
                icon={<Share2 className="w-5 h-5" />}
                label="Compartilhar"
                onClick={onShare || (() => { })}
            />
            <ToolButton
                icon={<Save className="w-5 h-5" />}
                label="Salvar"
                onClick={onSave}
                isLoading={isSaving}
                badge={hasUnsavedChanges}
            />
        </div>
    );
};
