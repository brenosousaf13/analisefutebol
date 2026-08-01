import React from 'react';
import {
    Hand,
    MoveRight,
    Square,
    Palette,
    Eraser,
    FileText,
    Zap,
    UserPlus,
    Type,
    Circle,
    CircleOff,
    Tag,
} from 'lucide-react';
import { type ToolType } from './Toolbar';
import IconButton from './analysis/IconButton';

interface FullAnalysisToolbarProps {
    activeTool: ToolType;
    onToolChange: (tool: ToolType) => void;
    onOpenColorPicker: () => void;
    onOpenAnalysis: () => void;
    onOpenEvents: () => void;
    onAddPlayer: () => void;

    /** Nomes dos jogadores no campo. */
    showLabels?: boolean;
    onToggleLabels?: () => void;
    /** Bola no campo — toggle independente dos nomes. */
    showBall?: boolean;
    onToggleBall?: () => void;
}

const Divider = () => <div className="mx-1 h-8 w-px shrink-0 bg-white/10" />;

/**
 * Barra de ferramentas de edicao do campinho.
 *
 * As acoes de sistema (exportar, compartilhar, salvar) NAO ficam mais aqui —
 * subiram para o cabecalho da analise.
 */
export const FullAnalysisToolbar: React.FC<FullAnalysisToolbarProps> = ({
    activeTool,
    onToolChange,
    onOpenColorPicker,
    onOpenAnalysis,
    onOpenEvents,
    onAddPlayer,
    showLabels = true,
    onToggleLabels,
    showBall = true,
    onToggleBall,
}) => (
    <div className="
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
        <IconButton
            icon={<Tag className={`h-5 w-5 ${showLabels ? '' : 'opacity-50'}`} />}
            label={showLabels ? 'Ocultar nome dos jogadores' : 'Mostrar nome dos jogadores'}
            isActive={!showLabels}
            onClick={() => onToggleLabels?.()}
            tooltipSide="up"
        />

        <Divider />

        {/* Estes quatro nao aparecem no wireframe, mas sao funcionalidades ativas
            hoje — mantidos ate haver uma decisao explicita sobre onde devem morar. */}
        <IconButton
            icon={<Palette className="h-5 w-5" />}
            label="Cores"
            onClick={onOpenColorPicker}
            tooltipSide="up"
        />
        <IconButton
            icon={<UserPlus className="h-5 w-5" />}
            label="Adicionar jogador"
            onClick={onAddPlayer}
            tooltipSide="up"
        />
        <IconButton
            icon={<FileText className="h-5 w-5" />}
            label="Análise"
            onClick={onOpenAnalysis}
            tooltipSide="up"
        />
        <IconButton
            icon={<Zap className="h-5 w-5" />}
            label="Eventos"
            onClick={onOpenEvents}
            tooltipSide="up"
        />
    </div>
);
