'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useHostViewState, UseHostViewStateReturn, UseHostViewStateOptions } from '../hooks/useHostViewState';

/**
 * HostPreGameContext - React Context wrapper for useHostViewState
 *
 * Purpose: Eliminate prop drilling in host components by providing
 * centralized access to all host game state and actions.
 *
 * Usage:
 * 1. Wrap your host component tree with <HostPreGameProvider>
 * 2. Use useHostPreGameContext() in any child component to access state
 *
 * Example:
 * ```tsx
 * // In parent component
 * <HostPreGameProvider roomLanguage={language}>
 *   <HostPreGameView />
 * </HostPreGameProvider>
 *
 * // In any child component
 * const { settings, runtime, players } = useHostPreGameContext();
 * ```
 */

// Create the context with undefined default (we'll throw if used outside provider)
const HostPreGameContext = createContext<UseHostViewStateReturn | undefined>(undefined);

// Provider props
interface HostPreGameProviderProps extends UseHostViewStateOptions {
  children: ReactNode;
}

/**
 * Provider component that wraps the host component tree.
 * Initializes the useHostViewState hook and provides it via context.
 */
export function HostPreGameProvider({
  children,
  initialPlayers,
  roomLanguage,
  defaultLanguage,
}: HostPreGameProviderProps) {
  const hostState = useHostViewState({
    initialPlayers,
    roomLanguage,
    defaultLanguage,
  });

  return (
    <HostPreGameContext.Provider value={hostState}>
      {children}
    </HostPreGameContext.Provider>
  );
}

/**
 * Hook to access HostPreGame context.
 * Must be used within a HostPreGameProvider.
 *
 * @throws Error if used outside of HostPreGameProvider
 */
export function useHostPreGameContext(): UseHostViewStateReturn {
  const context = useContext(HostPreGameContext);

  if (context === undefined) {
    throw new Error('useHostPreGameContext must be used within a HostPreGameProvider');
  }

  return context;
}

/**
 * Optional hook that returns undefined instead of throwing
 * when used outside of provider. Useful for optional context access.
 */
export function useHostPreGameContextSafe(): UseHostViewStateReturn | undefined {
  return useContext(HostPreGameContext);
}

export default HostPreGameContext;
