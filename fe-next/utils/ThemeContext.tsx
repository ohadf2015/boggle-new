'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

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
    // Initialize theme with a safe default, then sync with localStorage on mount
    // This prevents hydration mismatches by ensuring server and client render the same initially
    const [theme, setTheme] = useState<Theme>('dark');
    const [isClient, setIsClient] = useState(false);

    // Handle initial theme setup - runs only once on mount
    useEffect(() => {
        setIsClient(true);
        
        // Check if theme was already set by the blocking script (if it existed)
        const root = window.document.documentElement;
        const hasThemeClass = root.classList.contains('light') || root.classList.contains('dark');
        
        try {
            const savedTheme = localStorage.getItem('boggle_theme');
            if (savedTheme === 'light' || savedTheme === 'dark') {
                setTheme(savedTheme);
                // Only update DOM if theme wasn't already set by blocking script
                if (!hasThemeClass) {
                    root.classList.remove('light', 'dark');
                    root.classList.add(savedTheme);
                }
            } else if (!hasThemeClass) {
                // No saved theme and no theme class - set default
                root.classList.add('dark');
            }
        } catch (e) {
            // localStorage access failed, use default if no theme class exists
            if (!hasThemeClass) {
                root.classList.add('dark');
            }
        }
    }, []);

    // Sync theme class with state changes - only after client-side hydration is complete
    useEffect(() => {
        if (!isClient) return; // Don't modify DOM during hydration
        
        const root = window.document.documentElement;
        // Preserve existing classes (like font variables) and only update theme
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        
        try {
            localStorage.setItem('boggle_theme', theme);
        } catch (e) {
            // localStorage might not be available
        }
    }, [theme, isClient]);

    const toggleTheme = React.useCallback((): void => {
        setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
    }, []);

    // Memoize the context value to prevent unnecessary re-renders of all consumers
    const value = useMemo<ThemeContextValue>(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

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
