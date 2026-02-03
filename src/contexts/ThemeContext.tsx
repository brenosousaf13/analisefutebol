import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'default' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(
        () => (localStorage.getItem('analysis_theme') as Theme) || 'default'
    );

    useEffect(() => {
        localStorage.setItem('analysis_theme', theme);
        // We can add a class to the body if we want global dark mode styles, 
        // but for now the requirement is specific to the field and header.
        if (theme === 'dark') {
            document.documentElement.classList.add('dark-mode-field'); // Custom class if needed
        } else {
            document.documentElement.classList.remove('dark-mode-field');
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => (prev === 'default' ? 'dark' : 'default'));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
