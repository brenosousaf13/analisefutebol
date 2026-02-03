import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            title={theme === 'default' ? "Ativar Modo Escuro" : "Ativar Modo Padrão"}
        >
            {/* If theme is default (light/green), show Moon to switch to Dark. 
                If theme is dark, show Sun to switch to Default. */}
            {theme === 'default' ? (
                <Moon size={20} />
            ) : (
                <Sun size={20} />
            )}
        </button>
    );
};

export default ThemeToggle;
