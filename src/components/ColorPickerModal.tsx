import React from 'react';
import { X } from 'lucide-react';

const PRESET_COLORS = [
    '#EF4444', // Red
    '#F97316', // Orange
    '#EAB308', // Yellow
    '#22C55E', // Green
    '#14B8A6', // Teal
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#FFFFFF', // White
    '#374151', // Gray
];

interface ColorPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    homeTeamName: string;
    awayTeamName: string;
    homeTeamColor: string;
    awayTeamColor: string;
    onHomeColorChange: (color: string) => void;
    onAwayColorChange: (color: string) => void;
}

const ColorPickerModal: React.FC<ColorPickerModalProps> = ({
    isOpen,
    onClose,
    homeTeamName,
    awayTeamName,
    homeTeamColor,
    awayTeamColor,
    onHomeColorChange,
    onAwayColorChange
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/60 z-0" onClick={onClose} />

            {/* Modal - z-10 to be above overlay */}
            <div className="relative z-10 bg-panel-dark rounded-xl p-6 w-96 shadow-2xl border border-gray-700">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-white font-bold text-lg">Cores dos Times</h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Home Team Color */}
                <div className="mb-6">
                    <label className="text-gray-400 text-sm mb-3 block font-medium">
                        {homeTeamName} (Casa)
                    </label>
                    <div className="flex items-center gap-3">
                        <div
                            className="w-12 h-12 rounded-lg border-2 border-gray-600 shadow-lg"
                            style={{ backgroundColor: homeTeamColor }}
                        />
                        <div className="flex flex-wrap gap-2 flex-1">
                            {PRESET_COLORS.map(color => (
                                <button
                                    key={`home-${color}`}
                                    onClick={() => onHomeColorChange(color)}
                                    className={`w-7 h-7 rounded-full border-2 transition-all ${homeTeamColor === color
                                        ? 'border-white scale-110 shadow-lg'
                                        : 'border-transparent hover:border-gray-400 hover:scale-105'
                                        }`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Away Team Color */}
                <div className="mb-6">
                    <label className="text-gray-400 text-sm mb-3 block font-medium">
                        {awayTeamName} (Visitante)
                    </label>
                    <div className="flex items-center gap-3">
                        <div
                            className="w-12 h-12 rounded-lg border-2 border-gray-600 shadow-lg"
                            style={{ backgroundColor: awayTeamColor }}
                        />
                        <div className="flex flex-wrap gap-2 flex-1">
                            {PRESET_COLORS.map(color => (
                                <button
                                    key={`away-${color}`}
                                    onClick={() => onAwayColorChange(color)}
                                    className={`w-7 h-7 rounded-full border-2 transition-all ${awayTeamColor === color
                                        ? 'border-white scale-110 shadow-lg'
                                        : 'border-transparent hover:border-gray-400 hover:scale-105'
                                        }`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="w-full py-2.5 bg-accent-green text-white rounded-lg hover:bg-green-500 transition font-medium"
                >
                    Aplicar
                </button>
            </div>
        </div>
    );
};

export default ColorPickerModal;
