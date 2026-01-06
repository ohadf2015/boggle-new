'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';

/**
 * Navigation Context
 * Controls global bottom navigation visibility and active state.
 * Hide the nav during gameplay to avoid accidental taps.
 */

interface NavigationContextValue {
  /** Whether the user is currently in an active game session */
  isInGame: boolean;
  /** Set the in-game state (hides bottom nav when true) */
  setIsInGame: (value: boolean) => void;
  /** Currently active tab in the bottom nav */
  activeTab: 'home' | 'brain' | 'profile';
  /** Set the active tab */
  setActiveTab: (tab: 'home' | 'brain' | 'profile') => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

interface NavigationProviderProps {
  children: ReactNode;
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  const [isInGame, setIsInGame] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'brain' | 'profile'>('home');

  const handleSetIsInGame = useCallback((value: boolean) => {
    setIsInGame(value);
  }, []);

  const handleSetActiveTab = useCallback((tab: 'home' | 'brain' | 'profile') => {
    setActiveTab(tab);
  }, []);

  const value = useMemo(() => ({
    isInGame,
    setIsInGame: handleSetIsInGame,
    activeTab,
    setActiveTab: handleSetActiveTab,
  }), [isInGame, handleSetIsInGame, activeTab, handleSetActiveTab]);

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}

/**
 * Hook to hide/show the bottom navigation during gameplay.
 * Call setIsInGame(true) when entering a game, and setIsInGame(false) when exiting.
 */
export function useHideNavigation() {
  const { setIsInGame } = useNavigation();
  return setIsInGame;
}

export default NavigationContext;
