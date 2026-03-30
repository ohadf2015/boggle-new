import { useState, useCallback, useEffect, useRef } from 'react';

// View state type for navigation — hub is the initial entry point
export type ViewState = 'hub' | 'worldMap' | 'levelGrid' | 'playing' | 'weeklyChallenge' | 'bossRush';

// History state interface for browser back button support
interface AdventureHistoryState {
  adventureView: ViewState;
  worldId?: number | null;
  levelId?: number | null;
}

/**
 * Manages adventure view navigation with browser history (back button) support.
 */
export function useAdventureHistory(initialView: ViewState, initialWorldId: number | null = null) {
  const [viewState, setViewState] = useState<ViewState>(initialView);
  const [selectedWorld, setSelectedWorld] = useState<number | null>(initialWorldId);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

  // Track if we're handling a popstate event to avoid pushing state during back nav
  const isHandlingPopstateRef = useRef(false);
  const historyInitializedRef = useRef(false);
  const popstateFlagTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialViewRef = useRef(initialView);

  // Push initial history state on mount
  useEffect(() => {
    if (typeof window === 'undefined' || historyInitializedRef.current) return;
    const initialState: AdventureHistoryState = {
      adventureView: initialViewRef.current,
      worldId: null,
      levelId: null,
    };
    window.history.replaceState(initialState, '');
    historyInitializedRef.current = true;
  }, []);

  // Handle browser back button (popstate event)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopstate = (event: PopStateEvent) => {
      const state = event.state as AdventureHistoryState | null;
      if (!state || !state.adventureView) return;

      isHandlingPopstateRef.current = true;
      setViewState(state.adventureView);
      setSelectedWorld(state.worldId ?? null);
      setSelectedLevel(state.levelId ?? null);

      if (popstateFlagTimeoutRef.current) {
        clearTimeout(popstateFlagTimeoutRef.current);
      }
      popstateFlagTimeoutRef.current = setTimeout(() => {
        isHandlingPopstateRef.current = false;
        popstateFlagTimeoutRef.current = null;
      }, 0);
    };

    window.addEventListener('popstate', handlePopstate);
    return () => {
      window.removeEventListener('popstate', handlePopstate);
      if (popstateFlagTimeoutRef.current) {
        clearTimeout(popstateFlagTimeoutRef.current);
        popstateFlagTimeoutRef.current = null;
      }
    };
  }, []);

  // Push history state when view changes (forward navigation only)
  const pushHistoryState = useCallback((newView: ViewState, worldId: number | null, levelId: number | null) => {
    if (typeof window === 'undefined' || isHandlingPopstateRef.current) return;
    const state: AdventureHistoryState = {
      adventureView: newView,
      worldId,
      levelId,
    };
    window.history.pushState(state, '');
  }, []);

  // Navigation helpers
  const navigateToWorldMap = useCallback(() => {
    setViewState('worldMap');
    setSelectedWorld(null);
    setSelectedLevel(null);
    pushHistoryState('worldMap', null, null);
  }, [pushHistoryState]);

  const selectWorld = useCallback((worldId: number) => {
    setSelectedWorld(worldId);
    setViewState('levelGrid');
    pushHistoryState('levelGrid', worldId, null);
  }, [pushHistoryState]);

  const selectLevel = useCallback((worldId: number, levelId: number) => {
    setSelectedWorld(worldId);
    setSelectedLevel(levelId);
    setViewState('playing');
    pushHistoryState('playing', worldId, levelId);
  }, [pushHistoryState]);

  const openWorldMapFromHub = useCallback(() => {
    setViewState('worldMap');
    pushHistoryState('worldMap', null, null);
  }, [pushHistoryState]);

  const historyBack = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.history.back();
    } else {
      // Fallback for SSR
      if (viewState === 'playing') {
        setViewState('levelGrid');
        setSelectedLevel(null);
      } else if (viewState === 'levelGrid') {
        setViewState('worldMap');
        setSelectedWorld(null);
      } else if (viewState === 'worldMap') {
        setViewState('hub');
      }
    }
  }, [viewState]);

  return {
    viewState,
    setViewState,
    selectedWorld,
    selectedLevel,
    setSelectedLevel,
    navigateToWorldMap,
    selectWorld,
    selectLevel,
    openWorldMapFromHub,
    historyBack,
  };
}
