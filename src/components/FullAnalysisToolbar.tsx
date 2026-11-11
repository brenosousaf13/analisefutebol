import React from 'react';
import {
    Hand,
    MoveRight,
    Square,
    Eraser,
    Type,
    Circle,
    CircleOff,
    Download,
    Share2,
    Save,
    Palette,
} from 'lucide-react';
import { type ToolType } from './Toolbar';
import IconButton from './analysis/IconButton';

interface FullAnalysisToolbarProps {
    activeTool: ToolType;
    onToolChange: (tool: ToolType) => void;
    onOpenColorPicker: () => void;
    onExport: () => void;
    onShare: () => void;
    onSave: () => void;
    isSaving: boolean;
    isDownloading: boolean;
    hasUnsavedChanges: boolean;
    /** Bola no campo — toggle independente dos nomes. */
    showBall?: boolean;
    onToggleBall?: () => void;
}

const Divider = () => <div className="mx-1 h-8 w-px shrink-0 bg-white/10" />;

/**
 * Barra de ferramentas de edicao do campinho.
 *
 * Desenho, visibilidade da bola e acoes da analise no mesmo lugar.
 */
export const FullAnalysisToolbar: React.FC<FullAnalysisToolbarProps> = ({
    activeTool,
    onToolChange,
    onOpenColorPicker,
    onExport, onShare, onSave, isSaving, isDownloading, hasUnsavedChanges,
    showBall = true,
    onToggleBall,
}) => (
    <div role="toolbar" aria-label="Ferramentas da análise" className="
        flex w-max flex-row items-center gap-0.5
        rounded-full border border-white/10 bg-nav-dark/90
        px-2 py-1 shadow-lg backdrop-blur-md
    ">
        <IconButton
            icon={<Hand className="h-5 w-5" />}
            label="Mover jogadores"
            isActive={activeTool === 'select'}
            onClick={() => onToolChange('select')}
            tooltipSide="up"
        />
        <IconButton
            icon={<MoveRight className="h-5 w-5" />}
            label="Desenhar seta"
            isActive={activeTool === 'arrow'}
            onClick={() => onToolChange('arrow')}
            tooltipSide="up"
        />
        <IconButton
            icon={<Square className="h-5 w-5" />}
            label="Desenhar retângulo"
            isActive={activeTool === 'rectangle'}
            onClick={() => onToolChange('rectangle')}
            tooltipSide="up"
        />
        <IconButton
            icon={<Type className="h-5 w-5" />}
            label="Adicionar texto no campo"
            isActive={activeTool === 'text'}
            onClick={() => onToolChange('text')}
            tooltipSide="up"
        />
        <IconButton
            icon={<Eraser className="h-5 w-5" />}
            label="Apagar seta, retângulo ou texto"
            isActive={activeTool === 'eraser'}
            onClick={() => onToolChange('eraser')}
            tooltipSide="up"
        />

        <Divider />

        <IconButton
            icon={showBall ? <Circle className="h-5 w-5" /> : <CircleOff className="h-5 w-5" />}
            label={showBall ? 'Ocultar bola' : 'Mostrar bola'}
            isActive={!showBall}
            onClick={() => onToggleBall?.()}
            tooltipSide="up"
        />

        <Divider />

        <IconButton
            icon={<Palette className="h-5 w-5" />}
            label="Editar cores dos times"
            onClick={onOpenColorPicker}
            tooltipSide="up"
        />

        <IconButton
            icon={<Download className="h-5 w-5" />}
            label="Baixar imagem do campinho"
            onClick={onExport}
            isLoading={isDownloading}
            tooltipSide="up"
        />
        <IconButton
            icon={<Share2 className="h-5 w-5" />}
            label="Compartilhar análise"
            onClick={onShare}
            tooltipSide="up"
        />
        <IconButton
            icon={<Save className="h-5 w-5" />}
            label="Salvar análise"
            onClick={onSave}
            isLoading={isSaving}
            badge={hasUnsavedChanges}
            tooltipSide="up"
        />
    </div>
);
