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

import React, { createContext, useContext, ReactNode, useMemo, useRef } from 'react';
import { useGameStore } from '@/hooks/gameState/store';
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
 * GameStateProvider - Provides game state to child components
 *
 * This provider bridges the Zustand store with React Context for backward compatibility.
 * New code should prefer using Zustand hooks directly (useGameActive, useGameActions, etc.)
 * for better performance.
 */
export function GameStateProvider({ children }: GameStateProviderProps) {
  // Get entire store state (for backward compatibility)
  const storeState = useGameStore();

  // Create stable refs for combo system (maintaining previous API)
  const comboLevelRef = useRef(0);
  const lastWordTimeRef = useRef<number | null>(null);
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep refs in sync with store state
  comboLevelRef.current = storeState.combo.level;
  lastWordTimeRef.current = storeState.combo.lastWordTime;
  comboTimeoutRef.current = storeState._comboTimeoutId;

  // Memoize context value to reduce unnecessary re-renders
  // Note: This still re-renders all consumers when any state changes.
  // For better performance, use Zustand selector hooks directly.
  const value = useMemo<UseGameStateReturn>(() => ({
    // State values
    gameActive: storeState.gameActive,
    letterGrid: storeState.letterGrid,
    remainingTime: storeState.remainingTime,
    gameLanguage: storeState.gameLanguage,
    minWordLength: storeState.minWordLength,
    totalBoardWords: storeState.totalBoardWords,
    players: storeState.players,
    leaderboard: storeState.leaderboard,
    foundWords: storeState.foundWords,
    achievements: storeState.achievements,
    waitingForResults: storeState.waitingForResults,
    showStartAnimation: storeState.showStartAnimation,
    shufflingGrid: storeState.shufflingGrid,
    highlightedCells: storeState.highlightedCells,
    combo: storeState.combo,
    tournamentData: storeState.tournamentData,
    tournamentStandings: storeState.tournamentStandings,
    showTournamentStandings: storeState.showTournamentStandings,
    xpGainedData: storeState.xpGainedData,
    levelUpData: storeState.levelUpData,
    boardTheme: storeState.boardTheme,

    // Actions
    setGameActive: storeState.setGameActive,
    setLetterGrid: storeState.setLetterGrid,
    setRemainingTime: storeState.setRemainingTime,
    setGameLanguage: storeState.setGameLanguage,
    setMinWordLength: storeState.setMinWordLength,
    setTotalBoardWords: storeState.setTotalBoardWords,
    setPlayers: storeState.setPlayers,
    updatePlayer: storeState.updatePlayer,
    addPlayer: storeState.addPlayer,
    removePlayer: storeState.removePlayer,
    setLeaderboard: storeState.setLeaderboard,
    addFoundWord: storeState.addFoundWord,
    setFoundWords: storeState.setFoundWords,
    addAchievement: storeState.addAchievement,
    setAchievements: storeState.setAchievements,
    setWaitingForResults: storeState.setWaitingForResults,
    setShowStartAnimation: storeState.setShowStartAnimation,
    setShufflingGrid: storeState.setShufflingGrid,
    setHighlightedCells: storeState.setHighlightedCells,
    incrementCombo: storeState.incrementCombo,
    resetCombo: storeState.resetCombo,
    useComboShield: storeState.useComboShield,
    updateLastWordTime: storeState.updateLastWordTime,
    setTournamentData: storeState.setTournamentData,
    setTournamentStandings: storeState.setTournamentStandings,
    setShowTournamentStandings: storeState.setShowTournamentStandings,
    setXpGainedData: storeState.setXpGainedData,
    setLevelUpData: storeState.setLevelUpData,
    setBoardTheme: storeState.setBoardTheme,
    resetForNewRound: storeState.resetForNewRound,
    resetAll: storeState.resetAll,

    // Refs for callback stability
    refs: {
      comboLevel: comboLevelRef,
      lastWordTime: lastWordTimeRef,
      comboTimeout: comboTimeoutRef,
    },
  }), [storeState]);

  return (
    <GameStateContext.Provider value={value}>
      {children}
    </GameStateContext.Provider>
  );
}

// ==========================================
// Custom Hook to Consume Context
// ==========================================

/**
 * Custom hook to access game state and actions via Context
 *
 * NOTE: For better performance, consider using Zustand hooks directly:
 * - useGameActive() - only re-renders when gameActive changes
 * - useLeaderboard() - only re-renders when leaderboard changes
 * - useGameActions() - get all action methods (never causes re-renders)
 *
 * @throws Error if used outside of GameStateProvider
 * @returns Game state values and action methods
 *
 * @example
 * ```tsx
 * // Legacy approach (works but causes more re-renders)
 * function MyComponent() {
 *   const { gameActive, setGameActive } = useGameStateContext();
 *   return <button onClick={() => setGameActive(true)}>Start</button>;
 * }
 *
 * // Recommended approach (better performance)
 * function MyComponent() {
 *   const gameActive = useGameActive();
 *   const { setGameActive } = useGameActions();
 *   return <button onClick={() => setGameActive(true)}>Start</button>;
 * }
 * ```
 */
export function useGameStateContext(): UseGameStateReturn {
  const context = useContext(GameStateContext);

  if (!context) {
    throw new Error(
      'useGameStateContext must be used within a GameStateProvider. ' +
      'Make sure your component is wrapped in <GameStateProvider>.'
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
