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
import type { PlayerProgression, LevelCompletion, LevelAttempt } from '@/types/adventure';
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
  /** Level attempts (including failed attempts) */
  attempts: LevelAttempt[];
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
  /** Record a level attempt (including failures) */
  recordAttempt: (
    world: number,
    level: number,
    words: number,
    score: number,
    timeRemaining: number,
    objectiveProgress: Record<string, number>,
    isCompletion: boolean
  ) => Promise<LevelAttempt | null>;
  /** Check if a world is unlocked */
  isWorldUnlocked: (worldId: number) => boolean;
  /** Check if a level is unlocked */
  isLevelUnlocked: (worldId: number, levelId: number) => boolean;
  /** Get total stars for a specific world */
  getWorldStars: (worldId: number) => number;
  /** Get completion data for a specific level */
  getLevelCompletion: (worldId: number, levelId: number) => LevelCompletion | undefined;
  /** Get attempt data for a specific level (includes failed attempts) */
  getLevelAttempt: (worldId: number, levelId: number) => LevelAttempt | undefined;
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
  const [attempts, setAttempts] = useState<LevelAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch progression and attempts from API
  const fetchProgression = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);

      // Fetch both progression and attempts in parallel
      const [progressResponse, attemptsResponse] = await Promise.all([
        fetch('/api/adventure/progress', {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        }),
        fetch('/api/adventure/attempt', {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        }),
      ]);

      // Handle auth failures silently - user's session may have expired
      if (progressResponse.status === 401) {
        setProgression(null);
        setAttempts([]);
        setIsLoading(false);
        return;
      }

      if (!progressResponse.ok) {
        throw new Error(`Failed to fetch progression: ${progressResponse.status}`);
      }

      const progressData = await progressResponse.json();
      setProgression(progressData);

      // Attempts are optional - don't fail if unavailable
      if (attemptsResponse.ok) {
        const attemptsData = await attemptsResponse.json();
        if (attemptsData.success && attemptsData.attempts) {
          setAttempts(attemptsData.attempts);
        }
      }
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

        if (data.success && data.progression && data.completion) {
          // Merge progression data with existing completions
          setProgression((prev) => {
            if (!prev) {
              // No previous progression - create new one with the completion
              return {
                userId: user.id,
                playerLevel: data.progression.playerLevel,
                xp: data.progression.xp,
                currentWorld: data.progression.currentWorld,
                currentLevel: data.progression.currentLevel,
                totalStars: data.progression.totalStars,
                completions: [
                  {
                    world: data.completion.world,
                    level: data.completion.level,
                    stars: data.completion.stars,
                    bestScore: data.completion.bestScore,
                    bestWords: data.completion.bestWords,
                    completedAt: data.completion.completedAt,
                  },
                ],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
            }

            // Update existing completion or add new one
            const existingCompletionIndex = prev.completions.findIndex(
              (c) => c.world === world && c.level === level
            );

            const updatedCompletion = {
              world: data.completion.world,
              level: data.completion.level,
              stars: data.completion.stars,
              bestScore: data.completion.bestScore,
              bestWords: data.completion.bestWords,
              completedAt: data.completion.completedAt,
            };

            let updatedCompletions: typeof prev.completions;
            if (existingCompletionIndex >= 0) {
              // Update existing completion
              updatedCompletions = [...prev.completions];
              updatedCompletions[existingCompletionIndex] = updatedCompletion;
            } else {
              // Add new completion
              updatedCompletions = [...prev.completions, updatedCompletion];
            }

            return {
              ...prev,
              playerLevel: data.progression.playerLevel,
              xp: data.progression.xp,
              currentWorld: data.progression.currentWorld,
              currentLevel: data.progression.currentLevel,
              totalStars: data.progression.totalStars,
              completions: updatedCompletions,
              updatedAt: new Date().toISOString(),
            };
          });
        }
      } catch (err) {
        console.error('[ProgressionContext] Complete level error:', err);
        throw err;
      }
    },
    [user?.id]
  );

  // Record a level attempt (including failed attempts)
  const recordAttempt = useCallback(
    async (
      world: number,
      level: number,
      words: number,
      score: number,
      timeRemaining: number,
      objectiveProgress: Record<string, number>,
      isCompletion: boolean
    ): Promise<LevelAttempt | null> => {
      if (!user?.id) {
        return null;
      }

      try {
        const response = await fetch('/api/adventure/attempt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            world,
            level,
            words,
            score,
            timeRemaining,
            objectiveProgress,
            isCompletion,
          }),
        });

        if (!response.ok) {
          console.error('[ProgressionContext] Record attempt failed:', response.status);
          return null;
        }

        const data = await response.json();

        if (data.success && data.attempt) {
          const newAttempt: LevelAttempt = data.attempt;

          // Update local attempts state
          setAttempts((prev) => {
            const existingIndex = prev.findIndex(
              (a) => a.world === world && a.level === level
            );

            if (existingIndex >= 0) {
              // Update existing attempt
              const updated = [...prev];
              updated[existingIndex] = newAttempt;
              return updated;
            } else {
              // Add new attempt
              return [...prev, newAttempt];
            }
          });

          return newAttempt;
        }

        return null;
      } catch (err) {
        console.error('[ProgressionContext] Record attempt error:', err);
        return null;
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

  // Pre-compute world stars map for O(1) lookups instead of O(n) filter/reduce
  const worldStarsMap = useMemo(() => {
    if (!progression) return new Map<number, number>();
    const map = new Map<number, number>();
    for (const completion of progression.completions) {
      const current = map.get(completion.world) || 0;
      map.set(completion.world, current + completion.stars);
    }
    return map;
  }, [progression]);

  // Helper: Get total stars for a world (O(1) lookup from pre-computed map)
  const getWorldStars = useCallback(
    (worldId: number): number => {
      return worldStarsMap.get(worldId) || 0;
    },
    [worldStarsMap]
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

  // Helper: Get attempt for a specific level (includes failed attempts)
  const getLevelAttempt = useCallback(
    (worldId: number, levelId: number): LevelAttempt | undefined => {
      return attempts.find(
        (a) => a.world === worldId && a.level === levelId
      );
    },
    [attempts]
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
      attempts,
      isLoading,
      error,
      refreshProgression,
      completeLevel,
      recordAttempt,
      isWorldUnlocked,
      isLevelUnlocked,
      getWorldStars,
      getLevelCompletion,
      getLevelAttempt,
    }),
    [
      progression,
      attempts,
      isLoading,
      error,
      refreshProgression,
      completeLevel,
      recordAttempt,
      isWorldUnlocked,
      isLevelUnlocked,
      getWorldStars,
      getLevelCompletion,
      getLevelAttempt,
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
