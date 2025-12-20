'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { usePlayerViewState, UsePlayerViewStateReturn } from '../hooks/usePlayerViewState';
import type { Player } from '../hooks/usePlayerViewState';

/**
 * PlayerGameContext - React Context wrapper for usePlayerViewState
 *
 * Purpose: Eliminate prop drilling in player components by providing
 * centralized access to all player game state and actions.
 *
 * Usage:
 * 1. Wrap your player component tree with <PlayerGameProvider>
 * 2. Use usePlayerGameContext() in any child component to access state
 *
 * Example:
 * ```tsx
 * // In parent component
 * <PlayerGameProvider>
 *   <PlayerInGameView />
 * </PlayerGameProvider>
 *
 * // In any child component
 * const { gameState, foundWords, playerActions } = usePlayerGameContext();
 * ```
 */

// Create the context with undefined default (we'll throw if used outside provider)
const PlayerGameContext = createContext<UsePlayerViewStateReturn | undefined>(undefined);

// Provider props
interface PlayerGameProviderProps {
  children: ReactNode;
  initialPlayers?: Player[];
}

/**
 * Provider component that wraps the player component tree.
 * Initializes the usePlayerViewState hook and provides it via context.
 */
export function PlayerGameProvider({
  children,
  initialPlayers,
}: PlayerGameProviderProps) {
  const playerState = usePlayerViewState({
    initialPlayers,
  });

  return (
    <PlayerGameContext.Provider value={playerState}>
      {children}
    </PlayerGameContext.Provider>
  );
}

/**
 * Hook to access PlayerGame context.
 * Must be used within a PlayerGameProvider.
 *
 * @throws Error if used outside of PlayerGameProvider
 */
export function usePlayerGameContext(): UsePlayerViewStateReturn {
  const context = useContext(PlayerGameContext);

  if (context === undefined) {
    throw new Error('usePlayerGameContext must be used within a PlayerGameProvider');
  }

  return context;
}

/**
 * Optional hook that returns undefined instead of throwing
 * when used outside of provider. Useful for optional context access.
 */
export function usePlayerGameContextSafe(): UsePlayerViewStateReturn | undefined {
  return useContext(PlayerGameContext);
}

export default PlayerGameContext;
