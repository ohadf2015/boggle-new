'use client';

/**
 * InGameContext - Provides game state to child components
 *
 * Reduces prop drilling by consolidating commonly used game props into a context.
 * Child components can use useInGameContext() instead of receiving individual props.
 *
 * @module contexts/InGameContext
 */

import React, { createContext, useContext, type ReactNode } from 'react';
import type { Socket } from 'socket.io-client';
import type { LetterGrid, Language } from '@/shared/types/game';
import type { FoundWord, ExtendedLeaderboardPlayer as LeaderboardPlayer } from '@/shared/types/view';

// ==================== Types ====================

export interface InGameContextValue {
  // Core identity
  username: string;
  gameCode: string;
  isHost: boolean;
  isPlaying: boolean;
  socket: Socket | null;

  // Localization
  t: (path: string, params?: Record<string, string | number>) => string;
  dir: 'rtl' | 'ltr';

  // Game state
  letterGrid: LetterGrid;
  remainingTime: number | null;
  timerValue: number;
  gameActive: boolean;
  gameLanguage: Language | null;
  minWordLength: number;

  // Combo state
  comboLevel: number;
  comboTimeRemaining: number | null;
  comboDanger: boolean;

  // Player data
  foundWords: FoundWord[] | string[];
  leaderboard: LeaderboardPlayer[];
  totalBoardWords: number | null;

  // Callbacks
  onExitRoom?: () => void;
  onWordSubmit?: (word: string) => void;
  onResetCombo?: () => void;

  // Fire round
  fireRoundActive: boolean;
  fireRoundRemaining: number;
}

// ==================== Context ====================

const InGameContext = createContext<InGameContextValue | null>(null);

// ==================== Provider ====================

export interface InGameProviderProps {
  children: ReactNode;
  value: InGameContextValue;
}

/**
 * Provider component for InGameContext
 * Wrap InGameScreen content with this to provide game state to children
 *
 * Note: The parent component should memoize the value object to prevent
 * unnecessary re-renders. Use useMemo when constructing the value prop.
 */
export function InGameProvider({ children, value }: InGameProviderProps) {
  return (
    <InGameContext.Provider value={value}>
      {children}
    </InGameContext.Provider>
  );
}

// ==================== Hook ====================

/**
 * Hook to access InGameContext values
 * Must be used within an InGameProvider
 *
 * @throws Error if used outside of InGameProvider
 *
 * @example
 * function ChildComponent() {
 *   const { username, letterGrid, onWordSubmit } = useInGameContext();
 *   // use context values...
 * }
 */
export function useInGameContext(): InGameContextValue {
  const context = useContext(InGameContext);

  if (!context) {
    throw new Error('useInGameContext must be used within an InGameProvider');
  }

  return context;
}

/**
 * Hook to access InGameContext values with optional fallback
 * Returns null if used outside of InGameProvider (doesn't throw)
 *
 * Useful for components that can work both inside and outside the context
 */
export function useInGameContextOptional(): InGameContextValue | null {
  return useContext(InGameContext);
}

// ==================== Exports ====================

export { InGameContext };
export default InGameProvider;
