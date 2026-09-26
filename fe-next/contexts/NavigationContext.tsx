'use client';

import { createContext, useContext, useState, useMemo, useEffect, useCallback, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { isInAppPreviousPath } from '@/lib/multiplayer/exitDestination';
import { syncMpChromeSession } from '@/components/multiplayer/entry/mpChromeSession';

/**
 * A tiny client-side history of in-app routes, for "go back where I came from"
 * exits (the multiplayer entry's home button → `mpExit('back-from-entry')`).
 *
 * `document.referrer` only reflects the initial document load: after any SPA
 * hop (home → daily → multiplayer) it still names the first page, or nothing,
 * so Back from the MP entry dumped players on the homepage. NavigationProvider
 * records every route change here instead.
 *
 * Only NON-multiplayer routes are remembered as "previous": a language switch
 * or a room join inside /multiplayer must not overwrite the page the player
 * actually came from (that would make Back a loop into MP).
 *
 * Module state, not React state: it is read imperatively at exit time and must
 * survive the MP screens remounting. `resetInAppPathHistory` is for tests.
 */

let current: string | null = null;
let previous: string | null = null;

function isRecordable(path: string): boolean {
  return !!path && path.startsWith('/') && !path.startsWith('//');
}

/** Record the route now on screen (pathname + search). Idempotent per route. */
export function recordInAppPath(path: string): void {
  if (!isRecordable(path) || path === current) return;
  if (isInAppPreviousPath(current)) previous = current;
  current = path;
}

/** The last non-multiplayer route visited before the current one, if any. */
export function getTrackedPreviousPath(): string | null {
  return previous;
}

export function resetInAppPathHistory(): void {
  current = null;
  previous = null;
}

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

  // In-app route history for "back to where I came from" exits (the MP entry's
  // home button). `document.referrer` never updates on client-side navigation,
  // so record every route change here. Read from window.location so the query
  // string of the route is kept (usePathname drops it).
  const pathname = usePathname();
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const path = `${window.location.pathname}${window.location.search}`;
    recordInAppPath(path);
    syncMpChromeSession(path);
  }, [pathname]);

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
