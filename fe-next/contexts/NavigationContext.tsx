'use client';

import { createContext, useContext, useState, useMemo, useEffect, type ReactNode } from 'react';

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

  // Lock body scroll during gameplay to prevent content from scrolling behind sticky headers
  useEffect(() => {
    if (isInGame) {
      document.body.classList.add('screen-fit-locked');
      document.body.classList.remove('screen-fit');
    } else {
      document.body.classList.remove('screen-fit-locked');
      document.body.classList.add('screen-fit');
    }
  }, [isInGame]);

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

const NOOP_SET_IN_GAME = (_value: boolean) => {};

/**
 * Hook to hide/show the bottom navigation during gameplay.
 * Call setIsInGame(true) when entering a game, and setIsInGame(false) when exiting.
 *
 * Degrades to a no-op when used outside a NavigationProvider (e.g. isolated
 * component tests) instead of throwing — the worst case is the nav simply
 * doesn't auto-hide. In the app the provider is always mounted by the layout.
 */
export function useHideNavigation() {
  const context = useContext(NavigationContext);
  return context?.setIsInGame ?? NOOP_SET_IN_GAME;
}

export default NavigationContext;
