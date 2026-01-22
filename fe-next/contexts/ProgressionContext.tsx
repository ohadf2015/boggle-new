/**
 * ProgressionContext
 *
 * Global state management for Adventure Mode progression.
 * Provides player progression data, level completion tracking,
 * and helper functions for unlock status.
 */

'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { PlayerProgression, LevelCompletion } from '@/types/adventure';
import {
  isWorldUnlocked as checkWorldUnlocked,
  isLevelUnlocked as checkLevelUnlocked,
} from '@/lib/adventure';

// ==============================================
// TYPES
// ==============================================

interface ProgressionContextType {
  /** Current player progression data */
  progression: PlayerProgression | null;
  /** Loading state for initial fetch */
  isLoading: boolean;
  /** Error from fetch or update operations */
  error: Error | null;
  /** Refresh progression data from API */
  refreshProgression: () => Promise<void>;
  /** Complete a level and update progression */
  completeLevel: (
    world: number,
    level: number,
    stars: 0 | 1 | 2 | 3,
    score: number,
    words: number
  ) => Promise<void>;
  /** Check if a world is unlocked */
  isWorldUnlocked: (worldId: number) => boolean;
  /** Check if a level is unlocked */
  isLevelUnlocked: (worldId: number, levelId: number) => boolean;
  /** Get total stars for a specific world */
  getWorldStars: (worldId: number) => number;
  /** Get completion data for a specific level */
  getLevelCompletion: (worldId: number, levelId: number) => LevelCompletion | undefined;
}

// ==============================================
// CONTEXT
// ==============================================

const ProgressionContext = createContext<ProgressionContextType | null>(null);

// ==============================================
// PROVIDER
// ==============================================

interface ProgressionProviderProps {
  children: ReactNode;
}

export function ProgressionProvider({ children }: ProgressionProviderProps) {
  const { user, loading: authLoading } = useAuth();
  const [progression, setProgression] = useState<PlayerProgression | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch progression from API
  const fetchProgression = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await fetch('/api/adventure/progress', {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      // Handle auth failures silently - user's session may have expired
      // This is an expected state, not an error that should be logged
      if (response.status === 401) {
        setProgression(null);
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch progression: ${response.status}`);
      }

      const data = await response.json();
      setProgression(data);
    } catch (err) {
      // Only log non-network errors to avoid Sentry noise
      // Network errors during navigation are expected on mobile
      const isNetworkError = err instanceof TypeError && err.message === 'Failed to fetch';
      if (!isNetworkError) {
        console.error('[ProgressionContext] Fetch error:', err);
      }
      setError(err instanceof Error ? err : new Error('Failed to fetch progression'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Refresh progression (exposed to consumers)
  const refreshProgression = useCallback(async () => {
    setIsLoading(true);
    await fetchProgression();
  }, [fetchProgression]);

  // Complete a level
  const completeLevel = useCallback(
    async (
      world: number,
      level: number,
      stars: 0 | 1 | 2 | 3,
      score: number,
      words: number
    ) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      try {
        const response = await fetch('/api/adventure/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            world,
            level,
            stars,
            score,
            words,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to complete level: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.progression) {
          setProgression(data.progression);
        }
      } catch (err) {
        console.error('[ProgressionContext] Complete level error:', err);
        throw err;
      }
    },
    [user?.id]
  );

  // Helper: Check if world is unlocked
  const isWorldUnlocked = useCallback(
    (worldId: number): boolean => {
      if (!progression) return worldId === 1;
      return checkWorldUnlocked(worldId, progression.totalStars);
    },
    [progression]
  );

  // Helper: Check if level is unlocked
  const isLevelUnlocked = useCallback(
    (worldId: number, levelId: number): boolean => {
      if (!progression) return worldId === 1 && levelId === 1;
      return checkLevelUnlocked(worldId, levelId, progression.completions);
    },
    [progression]
  );

  // Helper: Get total stars for a world
  const getWorldStars = useCallback(
    (worldId: number): number => {
      if (!progression) return 0;
      return progression.completions
        .filter((c) => c.world === worldId)
        .reduce((sum, c) => sum + c.stars, 0);
    },
    [progression]
  );

  // Helper: Get completion for a specific level
  const getLevelCompletion = useCallback(
    (worldId: number, levelId: number): LevelCompletion | undefined => {
      if (!progression) return undefined;
      return progression.completions.find(
        (c) => c.world === worldId && c.level === levelId
      );
    },
    [progression]
  );

  // Initial fetch on mount (when auth is ready)
  useEffect(() => {
    if (!authLoading) {
      fetchProgression();
    }
  }, [authLoading, fetchProgression]);

  // Memoize context value
  const contextValue = useMemo<ProgressionContextType>(
    () => ({
      progression,
      isLoading,
      error,
      refreshProgression,
      completeLevel,
      isWorldUnlocked,
      isLevelUnlocked,
      getWorldStars,
      getLevelCompletion,
    }),
    [
      progression,
      isLoading,
      error,
      refreshProgression,
      completeLevel,
      isWorldUnlocked,
      isLevelUnlocked,
      getWorldStars,
      getLevelCompletion,
    ]
  );

  return (
    <ProgressionContext.Provider value={contextValue}>
      {children}
    </ProgressionContext.Provider>
  );
}

// ==============================================
// HOOK
// ==============================================

/**
 * Hook to access adventure progression context
 * Must be used within ProgressionProvider
 */
export function useProgression(): ProgressionContextType {
  const context = useContext(ProgressionContext);
  if (!context) {
    throw new Error('useProgression must be used within ProgressionProvider');
  }
  return context;
}

// ==============================================
// EXPORTS
// ==============================================

export { ProgressionContext };
export type { ProgressionContextType };
