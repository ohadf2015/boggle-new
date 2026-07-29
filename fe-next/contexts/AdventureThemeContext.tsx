/**
 * AdventureThemeContext
 *
 * Provides world theming for Adventure Mode components.
 * Manages current theme state, theme transitions, and exposes
 * theme getters for tiles, backgrounds, and animations.
 */

'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import {
  DEFAULT_HUD_THEME,
  DEFAULT_TIMER_THEME,
  DEFAULT_BOSS_FIGHT_THEME,
  type WorldTheme,
  type TileVisualConfig,
  type ChapterConfig,
  type HUDTheme,
  type TimerUrgencyTheme,
  type BossFightTheme,
} from '@/lib/adventure/themes/types';
import type { TileType } from '@/types/adventure';
import {
  getWorldTheme,
  getTileVisualConfig,
  getChapterForLevel,
  getChapterNumber,
  getLevelInChapter,
  isBossLevel,
  isThemeImplemented,
} from '@/lib/adventure/themes';

// ==============================================
// TYPES
// ==============================================

interface AdventureThemeContextType {
  /** Current world theme */
  theme: WorldTheme;
  /** Current world ID */
  worldId: number;
  /** Current level number within world */
  currentLevel: number;
  /** Current chapter (1-3) */
  currentChapter: 1 | 2 | 3;
  /** Whether theme is transitioning */
  isTransitioning: boolean;
  /** Whether current theme is fully implemented (vs placeholder) */
  isFullyImplemented: boolean;
  /** Set the current world (triggers theme change) */
  setWorld: (worldId: number) => void;
  /** Set the current level within world */
  setLevel: (level: number) => void;
  /** Get tile visual config for a specific tile type */
  getTileConfig: (tileType: TileType) => TileVisualConfig;
  /** Get chapter config for current level */
  getChapter: () => ChapterConfig;
  /** Check if current level is boss level */
  isBoss: () => boolean;
  /** Get level position within chapter (1-3) */
  getLevelPosition: () => 1 | 2 | 3;
}

// ==============================================
// CONTEXT
// ==============================================

const AdventureThemeContext = createContext<AdventureThemeContextType | null>(null);

/** Safe fallback for components rendering outside the provider (e.g. exit animations) */
const FALLBACK_THEME_CONTEXT: AdventureThemeContextType = {
  theme: getWorldTheme(1),
  worldId: 1,
  currentLevel: 1,
  currentChapter: 1,
  isTransitioning: false,
  isFullyImplemented: false,
  setWorld: () => {},
  setLevel: () => {},
  getTileConfig: (tileType: TileType) => getTileVisualConfig(1, tileType),
  getChapter: () => getChapterForLevel(1, 1),
  isBoss: () => false,
  getLevelPosition: () => 1,
};

// ==============================================
// PROVIDER
// ==============================================

interface AdventureThemeProviderProps {
  children: ReactNode;
  /** Initial world ID (defaults to 1) */
  initialWorldId?: number;
  /** Initial level number (defaults to 1) */
  initialLevel?: number;
}

export function AdventureThemeProvider({
  children,
  initialWorldId = 1,
  initialLevel = 1,
}: AdventureThemeProviderProps) {
  const [worldId, setWorldId] = useState(initialWorldId);
  const [currentLevel, setCurrentLevel] = useState(initialLevel);
  const [previousWorldId, setPreviousWorldId] = useState<number | null>(null);

  // Use ref to avoid stale closure in callbacks
  const worldIdRef = useRef(worldId);
  worldIdRef.current = worldId;

  // Track if transitioning (previous world exists and differs from current)
  const isTransitioning = previousWorldId !== null && previousWorldId !== worldId;

  // Get the current theme based on worldId
  const theme = useMemo(() => getWorldTheme(worldId), [worldId]);

  // Check if theme is fully implemented
  const isFullyImplemented = useMemo(() => isThemeImplemented(worldId), [worldId]);

  // Current chapter based on level
  const currentChapter = useMemo(() => getChapterNumber(currentLevel), [currentLevel]);

  // Set world - immediate state change, CSS handles transition
  const setWorld = useCallback((newWorldId: number) => {
    // Use ref to get current value and avoid stale closure
    if (newWorldId === worldIdRef.current) return;

    setPreviousWorldId(worldIdRef.current);
    setWorldId(newWorldId);
    setCurrentLevel(1); // Reset to level 1 when changing worlds

    // Clear transition state after a short delay (let CSS animation complete)
    // This is non-blocking and purely visual
    requestAnimationFrame(() => {
      setPreviousWorldId(null);
    });
  }, []);

  // Set level within current world
  const setLevel = useCallback((level: number) => {
    setCurrentLevel(level);
  }, []);

  // Get tile visual config
  const getTileConfig = useCallback(
    (tileType: TileType): TileVisualConfig => {
      return getTileVisualConfig(worldId, tileType);
    },
    [worldId]
  );

  // Get chapter config for current level
  const getChapter = useCallback((): ChapterConfig => {
    return getChapterForLevel(worldId, currentLevel);
  }, [worldId, currentLevel]);

  // Check if current level is boss
  const isBoss = useCallback((): boolean => {
    return isBossLevel(currentLevel);
  }, [currentLevel]);

  // Get level position within chapter
  const getLevelPosition = useCallback((): 1 | 2 | 3 => {
    return getLevelInChapter(currentLevel);
  }, [currentLevel]);

  // Track previous initial values to detect external prop changes
  const prevInitialWorldIdRef = useRef(initialWorldId);
  const prevInitialLevelRef = useRef(initialLevel);

  // Sync state when initial props change from parent (not on every render)
  useEffect(() => {
    if (prevInitialWorldIdRef.current !== initialWorldId) {
      prevInitialWorldIdRef.current = initialWorldId;
      setWorldId(initialWorldId);
    }
  }, [initialWorldId]);

  useEffect(() => {
    if (prevInitialLevelRef.current !== initialLevel) {
      prevInitialLevelRef.current = initialLevel;
      setCurrentLevel(initialLevel);
    }
  }, [initialLevel]);

  // Memoize context value
  const contextValue = useMemo<AdventureThemeContextType>(
    () => ({
      theme,
      worldId,
      currentLevel,
      currentChapter,
      isTransitioning,
      isFullyImplemented,
      setWorld,
      setLevel,
      getTileConfig,
      getChapter,
      isBoss,
      getLevelPosition,
    }),
    [
      theme,
      worldId,
      currentLevel,
      currentChapter,
      isTransitioning,
      isFullyImplemented,
      setWorld,
      setLevel,
      getTileConfig,
      getChapter,
      isBoss,
      getLevelPosition,
    ]
  );

  return (
    <AdventureThemeContext.Provider value={contextValue}>
      {children}
    </AdventureThemeContext.Provider>
  );
}

// ==============================================
// HOOKS
// ==============================================

/**
 * Hook to access adventure theme context
 * Must be used within AdventureThemeProvider
 */
export function useAdventureTheme(): AdventureThemeContextType {
  const context = useContext(AdventureThemeContext);
  if (!context) {
    // During AnimatePresence exit animations, components may briefly render
    // after their AdventureThemeProvider has unmounted. Return a safe fallback
    // instead of throwing so exit animations complete gracefully.
    return FALLBACK_THEME_CONTEXT;
  }
  return context;
}

/**
 * Hook to get just the current world theme
 * Useful for components that only need theme data
 */
export function useWorldTheme(): WorldTheme {
  const { theme } = useAdventureTheme();
  return theme;
}

/**
 * Hook to get tile visual config for a specific tile type
 * @param tileType - The type of tile to get config for
 */
export function useTileConfig(tileType: TileType): TileVisualConfig {
  const { getTileConfig } = useAdventureTheme();
  return getTileConfig(tileType);
}

/**
 * Hook to get current chapter information
 */
export function useCurrentChapter(): ChapterConfig {
  const { getChapter } = useAdventureTheme();
  return getChapter();
}

/**
 * Hook to get HUD theme for current world
 */
export function useHUDTheme(): HUDTheme {
  const { theme } = useAdventureTheme();
  return useMemo(() => theme.hud ?? DEFAULT_HUD_THEME, [theme.hud]);
}

/**
 * Hook to get timer urgency theme for current world
 */
export function useTimerTheme(): TimerUrgencyTheme {
  const { theme } = useAdventureTheme();
  return useMemo(() => theme.timerTheme ?? DEFAULT_TIMER_THEME, [theme.timerTheme]);
}

/**
 * Hook to get boss fight theme for current world
 */
export function useBossFightTheme(): BossFightTheme {
  const { theme } = useAdventureTheme();
  return useMemo(() => theme.bossFight ?? DEFAULT_BOSS_FIGHT_THEME, [theme.bossFight]);
}

// ==============================================
// EXPORTS
// ==============================================

export { AdventureThemeContext };
export type { AdventureThemeContextType };
