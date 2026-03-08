'use client';

import { createContext, useContext, useState, useMemo, type ReactNode } from 'react';

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

  const value = useMemo(() => ({
    isInGame,
    setIsInGame,
    activeTab,
    setActiveTab,
  }), [isInGame, activeTab]);

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    const errorMessage = 'useNavigation must be used within a NavigationProvider';
    if (process.env.NODE_ENV === 'development') {
      console.error(errorMessage);
    }
    throw new Error(errorMessage);
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
