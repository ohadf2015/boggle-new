'use client';

import { createContext, useContext, useState, useMemo, useEffect, useCallback, type ReactNode } from 'react';

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
  /** True when a visible screen header already hosts its own audio/mute control,
   *  so the global floating in-game audio FAB should stand down to avoid a
   *  duplicate control (e.g. the MP lobby header). */
  headerAudioControlActive: boolean;
  /** Register an in-header audio control; returns an unregister cleanup.
   *  Ref-counted so StrictMode double-mounts and multiple screens stay correct. */
  registerHeaderAudioControl: () => () => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

interface NavigationProviderProps {
  children: ReactNode;
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  const [isInGame, setIsInGame] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'brain' | 'profile'>('home');
  const [headerAudioControlCount, setHeaderAudioControlCount] = useState(0);

  const registerHeaderAudioControl = useCallback(() => {
    setHeaderAudioControlCount(c => c + 1);
    return () => setHeaderAudioControlCount(c => Math.max(0, c - 1));
  }, []);

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
    headerAudioControlActive: headerAudioControlCount > 0,
    registerHeaderAudioControl,
  }), [isInGame, activeTab, headerAudioControlCount, registerHeaderAudioControl]);

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

/**
 * Declare that the current screen renders its own audio/mute control in a
 * visible header, so the global in-game audio FAB stands down while `active`.
 *
 * Degrades to a no-op outside a NavigationProvider (isolated component tests) —
 * worst case the global FAB simply stays visible.
 */
export function useRegisterHeaderAudioControl(active = true) {
  const context = useContext(NavigationContext);
  const register = context?.registerHeaderAudioControl;
  useEffect(() => {
    if (!active || !register) return;
    return register();
  }, [active, register]);
}

export default NavigationContext;
