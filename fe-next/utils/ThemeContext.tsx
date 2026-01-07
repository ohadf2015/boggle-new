'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
    theme: Theme;
    toggleTheme: () => void;
}

interface ThemeProviderProps {
    children: React.ReactNode;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider = ({ children }: ThemeProviderProps): React.ReactElement => {
    // Initialize theme synchronously from localStorage or default to 'dark'
    // The blocking script in layout.tsx already sets the class, so we just sync state
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window !== 'undefined') {
            try {
                const savedTheme = localStorage.getItem('boggle_theme');
                if (savedTheme === 'light' || savedTheme === 'dark') {
                    return savedTheme;
                }
            } catch (e) {
                // localStorage access failed, use default
            }
        }
        return 'dark';
    });

    // Sync theme class with state changes (but don't wait for mount since script already set it)
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        localStorage.setItem('boggle_theme', theme);
    }, [theme]);

    const toggleTheme = (): void => {
        setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextValue => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
