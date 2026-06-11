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
    // Degrade gracefully outside a provider rather than crashing the subtree.
    // The theme is dark-only and toggle is a noop, so this default is identical
    // to the provider's value (which only adds a DOM-class side-effect). Keeps
    // theme-aware leaf components (e.g. lobby reward buttons) from hard-failing
    // when rendered in a context that hasn't mounted ThemeProvider.
    return context ?? { theme: 'dark', toggleTheme: noop };
};
