import React from 'react';
import type { Player } from '../types/Player';

interface PlayerMarkerProps {
    player: Player;
    teamColor: 'blue' | 'red' | 'yellow';
    onMouseDown: (e: React.MouseEvent | React.TouchEvent) => void;
    onDoubleClick?: () => void;
    isDragging: boolean;
    hasNote?: boolean;
    isSelected?: boolean;
    shortName?: string;
    // Drag and Drop removed
    // New Props for Responsiveness
    playerSize?: number;
    fontSize?: { number: number; name: number };
}

const PlayerMarker: React.FC<PlayerMarkerProps> = ({
    player,
    teamColor,
    onMouseDown,
    onDoubleClick,
    isDragging,
    hasNote,
    isSelected,
    shortName,
    playerSize = 36, // Default fallback
    fontSize = { number: 14, name: 10 }
}) => {

    // Fallback if shortName is not provided
    const labelName = shortName || player.name.split(' ').pop();

    return (
        <div
            className={`absolute flex flex-col items-center justify-center cursor-grab active:cursor-grabbing transition-transform
                ${isDragging ? 'scale-110 z-50' : 'z-20 hover:z-30 hover:scale-105'}
            `}
            style={{
                left: `${player.position.x}%`,
                top: `${player.position.y}%`,
                width: playerSize, // Ensure container has width for centering
                transform: 'translate(-50%, -50%)',
                touchAction: 'none'
            }}
            onMouseDown={onMouseDown}
            onTouchStart={onMouseDown}
            onDoubleClick={onDoubleClick}
        >
            {/* Player Circle */}
            <div
                className={`
                    rounded-full flex items-center justify-center shadow-lg border-2
                    font-bold select-none transition-colors
                    ${isSelected
                        ? 'bg-accent-green border-green-300 text-white'
                        : (teamColor === 'red' ? 'bg-red-600 border-white text-white' : 'bg-accent-yellow border-white text-gray-900')
                    }
                `}
                style={{
                    width: playerSize,
                    height: playerSize,
                    fontSize: fontSize.number
                }}
            >
                {player.number}
            </div>

            {/* Player Name */}
            <span
                className={`
                    mt-1 bg-black/50 px-1.5 py-0.5 rounded text-white font-medium
                    whitespace-nowrap truncate text-center
                    backdrop-blur-sm
                `}
                style={{
                    fontSize: fontSize.name,
                    maxWidth: playerSize * 2.5 // proportional max width
                }}
            >
                {labelName}
            </span>

            {/* Note Indicator */}
            {hasNote && (
                <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full translate-x-1" />
            )}
        </div>
    );
};

export default PlayerMarker;
