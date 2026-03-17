/**
 * GameStateContext - Context wrapper for Zustand game store
 *
 * This context provides centralized game state management across the application,
 * now powered by Zustand for better performance through selective subscriptions.
 *
 * Architecture Pattern: Zustand Store + Context API (for backward compatibility)
 *
 * MIGRATION NOTES:
 * ================
 * The context maintains the same API as before, so existing code using
 * `useGameStateContext()` will continue to work. However, for BETTER PERFORMANCE,
 * components should migrate to using the Zustand selector hooks directly:
 *
 * BEFORE (causes re-renders on ANY state change):
 * ```tsx
 * const { gameActive, setGameActive } = useGameStateContext();
 * ```
 *
 * AFTER (only re-renders when gameActive changes):
 * ```tsx
 * import { useGameActive, useGameActions } from '@/hooks/gameState/store';
 * const gameActive = useGameActive();
 * const { setGameActive } = useGameActions();
 * ```
 *
 * OR even simpler for actions (since actions never change):
 * ```tsx
 * import { useGameStore, useGameActive } from '@/hooks/gameState/store';
 * const gameActive = useGameActive();
 * const setGameActive = useGameStore.getState().setGameActive;
 * ```
 *
 * Benefits of Zustand:
 * - Components only re-render when the specific state they subscribe to changes
 * - No Provider wrapper needed for new code (just import and use)
 * - Built-in devtools support for debugging
 * - Simpler API without useCallback wrappers
 */

'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { UseGameStateReturn } from '@/hooks/gameState/types';

// ==========================================
// Context Definition
// ==========================================

const GameStateContext = createContext<UseGameStateReturn | null>(null);

// ==========================================
// Provider Component
// ==========================================

interface GameStateProviderProps {
  children: ReactNode;
}

/**
 * GameStateProvider - Deprecated pass-through shell.
 *
 * All consumers have been migrated to Zustand selector hooks directly.
 * This provider no longer subscribes to the store, so it adds zero overhead.
 * It is kept only so any remaining import of <GameStateProvider> compiles without error.
 *
 * @deprecated Remove this from the provider tree. Use Zustand selector hooks directly.
 */
export function GameStateProvider({ children }: GameStateProviderProps) {
  // No store subscription — value is null, provider is a no-op pass-through.
  // useGameStateContext() will throw if called, enforcing the migration.
  return (
    <GameStateContext.Provider value={null}>
      {children}
    </GameStateContext.Provider>
  );
}

// ==========================================
// Custom Hook to Consume Context
// ==========================================

/**
 * @deprecated Use Zustand selector hooks directly for better performance.
 * This context wrapper causes all consumers to re-render on ANY state change.
 *
 * Migration guide:
 * - useGameActive() - only re-renders when gameActive changes
 * - useLeaderboard() - only re-renders when leaderboard changes
 * - useFoundWords() - only re-renders when foundWords changes
 * - useGameActions() - get all action methods (never causes re-renders)
 *
 * @example
 * ```tsx
 * // BEFORE (deprecated - causes excessive re-renders):
 * const { gameActive, setGameActive, foundWords } = useGameStateContext();
 *
 * // AFTER (recommended - selective subscriptions):
 * import { useGameActive, useFoundWords, useGameActions } from '@/hooks/gameState';
 * const gameActive = useGameActive();
 * const foundWords = useFoundWords();
 * const { setGameActive } = useGameActions();
 * ```
 *
 * @throws Error if used outside of GameStateProvider
 * @returns Game state values and action methods
 */
export function useGameStateContext(): UseGameStateReturn {
  const context = useContext(GameStateContext);

  if (!context) {
    throw new Error(
      'useGameStateContext is deprecated and no longer provides state. ' +
      'Migrate to Zustand selector hooks: useGameActive, useFoundWords, useGameActions, etc. ' +
      'from @/hooks/gameState.'
    );
  }

  return context;
}

// ==========================================
// Exports
// ==========================================

export { GameStateContext };

// Re-export Zustand hooks for convenient access
export {
  useGameStore,
  useGameActive,
  useLetterGrid,
  useRemainingTime,
  useGameLanguage,
  useMinWordLength,
  useTotalBoardWords,
  usePlayers,
  useLeaderboard,
  useFoundWords,
  useAchievements,
  useWaitingForResults,
  useShowStartAnimation,
  useShufflingGrid,
  useHighlightedCells,
  useCombo,
  useComboLevel,
  useTournamentData,
  useTournamentStandings,
  useShowTournamentStandings,
  useXpGainedData,
  useLevelUpData,
  useBoardTheme,
  useGameActions,
} from '@/hooks/gameState/store';
