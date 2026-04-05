'use client';

import React, { createContext, useContext, useEffect, useMemo } from 'react';

type Theme = 'dark';

interface ThemeContextValue {
    theme: Theme;
    toggleTheme: () => void;
}

interface ThemeProviderProps {
    children: React.ReactNode;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const noop = () => {};

export const ThemeProvider = ({ children }: ThemeProviderProps): React.ReactElement => {
    // Dark-only theme — ensure the class is always set
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light');
        root.classList.add('dark');
    }, []);

    const value = useMemo<ThemeContextValue>(() => ({ theme: 'dark', toggleTheme: noop }), []);

    return (
        <ThemeContext.Provider value={value}>
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
