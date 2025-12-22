/**
 * GameStateContext - Context wrapper for useGameState hook
 *
 * This context provides centralized game state management across the application,
 * eliminating the need to pass state setters as props through multiple layers.
 *
 * Architecture Pattern: Context API + useReducer
 *
 * Usage:
 * 1. Wrap your app with <GameStateProvider>
 * 2. Access state and actions via useGameStateContext() in any child component
 *
 * Benefits:
 * - Eliminates prop drilling (no need to pass 20+ setters)
 * - Single source of truth for game state
 * - Predictable state updates via reducer pattern
 * - Better testability (mock context instead of 100+ props)
 */

'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useGameState, type UseGameStateReturn } from '@/hooks/useGameState';

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

export function GameStateProvider({ children }: GameStateProviderProps) {
  const gameState = useGameState();

  return (
    <GameStateContext.Provider value={gameState}>
      {children}
    </GameStateContext.Provider>
  );
}

// ==========================================
// Custom Hook to Consume Context
// ==========================================

/**
 * Custom hook to access game state and actions
 *
 * @throws Error if used outside of GameStateProvider
 * @returns Game state values and action methods
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { gameActive, setGameActive, addFoundWord } = useGameStateContext();
 *
 *   const handleStart = () => {
 *     setGameActive(true);
 *   };
 *
 *   return <button onClick={handleStart}>Start Game</button>;
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
