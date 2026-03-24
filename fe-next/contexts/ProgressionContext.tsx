/**
 * ProgressionContext
 *
 * Global state management for Adventure Mode progression.
 * Provides player progression data, level completion tracking,
 * and helper functions for unlock status.
 */

'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import logger from '@/utils/logger';
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
  /** Complete a level and update progression. Returns true if saved, false if save failed (guest/network/auth). */
  completeLevel: (
    world: number,
    level: number,
    stars: 0 | 1 | 2 | 3,
    score: number,
    words: number,
    goldEarned?: number,
    longWords?: number
  ) => Promise<boolean>;
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
  /** Purchase upgrade by ID — server validates cost, optimistic + reconcile */
  updateCurrency: (upgradeId: string, optimisticGold: number, optimisticUpgrades: Record<string, number>) => Promise<void>;
  /** Update chapter quest progress — persists to server */
  updateChapterQuestProgress: (questType: string, amount: number, questIds: string[]) => void;
  /** Add words to the word album — deduplicates and persists */
  updateWordAlbum: (newWords: string[]) => void;
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

  // Fetch progression and attempts from combined API endpoint
  // Uses /api/adventure/state which returns both in one request (~50-100ms faster)
  const fetchProgression = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);

      // Single API call for both progression and attempts
      const response = await fetch('/api/adventure/state', {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      // Handle auth failures silently - user's session may have expired
      if (response.status === 401) {
        setProgression(null);
        setAttempts([]);
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch adventure state: ${response.status}`);
      }

      const data = await response.json();
      setProgression(data.progression);
      setAttempts(data.attempts || []);
    } catch (err) {
      // Only log non-network errors to avoid Sentry noise
      // Network errors during navigation are expected on mobile
      const isNetworkError = err instanceof TypeError && err.message === 'Failed to fetch';
      if (!isNetworkError) {
        logger.warn('[ProgressionContext] Fetch error:', err instanceof Error ? err.message : err);
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

  // In-flight dedup: store the key AND the promise so subsequent callers
  // await the same result instead of being rejected with `false`.
  const completeLevelInFlightRef = useRef<string | null>(null);
  const completeLevelPromiseRef = useRef<Promise<boolean> | null>(null);

  // Complete a level
  const completeLevel = useCallback(
    async (
      world: number,
      level: number,
      stars: 0 | 1 | 2 | 3,
      score: number,
      words: number,
      goldEarned?: number,
      longWords?: number
    ) => {
      if (!user?.id) {
        // Guest users can't save progress
        return false;
      }

      // If an identical save is already in-flight, piggyback on it
      const levelKey = `${world}-${level}`;
      if (completeLevelInFlightRef.current === levelKey && completeLevelPromiseRef.current) {
        logger.info('[ProgressionContext] Piggy-backing on in-flight completeLevel for', levelKey);
        return completeLevelPromiseRef.current;
      }
      completeLevelInFlightRef.current = levelKey;

      const promise = (async (): Promise<boolean> => {
      try {
        const requestBody = JSON.stringify({
          world,
          level,
          stars,
          score,
          words,
          ...(goldEarned !== undefined && { goldEarned }),
          ...(longWords !== undefined && { longWords }),
        });

        let response = await fetch('/api/adventure/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: requestBody,
        });

        // Retry on transient errors: 429 (rate limit) with backoff, 500/503 (cold start)
        if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
          const retryAfter = response.status === 429
            ? Math.max(2000, Number(response.headers.get('Retry-After') || '3') * 1000)
            : 1000;
          logger.warn('[ProgressionContext] Retrying completeLevel after', response.status);
          await new Promise(r => setTimeout(r, retryAfter));
          response = await fetch('/api/adventure/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: requestBody,
          });
        }

        if (!response.ok) {
          const errorBody = await response.text().catch(() => 'no body');
          throw new Error(`Failed to complete level: ${response.status}${errorBody && errorBody !== 'no body' ? ` - ${errorBody}` : ''}`);
        }

        const data = await response.json();

        if (!data.success || !data.progression || !data.completion) {
          logger.warn('[ProgressionContext] Server returned unexpected response for completeLevel');
          return false;
        }

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
                gold: data.progression.gold ?? 0,
                upgrades: data.progression.upgrades ?? {},
                skillPoints: data.progression.skillPoints ?? 0,
                skillTree: data.progression.skillTree ?? {},
                runeFragments: data.progression.runeFragments ?? 0,
                runes: data.progression.runes ?? [],
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
              gold: data.progression.gold ?? prev.gold,
              upgrades: data.progression.upgrades ?? prev.upgrades,
              completions: updatedCompletions,
              updatedAt: new Date().toISOString(),
            };
          });

        return true;
      } catch (err) {
        logger.warn('[ProgressionContext] Complete level error:', err instanceof Error ? err.message : err);
        return false;
      } finally {
        completeLevelInFlightRef.current = null;
        completeLevelPromiseRef.current = null;
      }
      })();

      completeLevelPromiseRef.current = promise;
      return promise;
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
        const requestBody = JSON.stringify({
          world,
          level,
          words,
          score,
          timeRemaining,
          objectiveProgress,
          isCompletion,
        });

        let response = await fetch('/api/adventure/attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: requestBody,
        });

        // Retry on 429 (rate limit) or 5xx (transient server errors)
        if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
          const retryAfter = response.status === 429
            ? Math.max(2000, Number(response.headers.get('Retry-After') || '3') * 1000)
            : 1000;
          logger.warn('[ProgressionContext] Retrying recordAttempt after', response.status);
          await new Promise(r => setTimeout(r, retryAfter));
          response = await fetch('/api/adventure/attempt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: requestBody,
          });
        }

        if (!response.ok) {
          logger.warn('[ProgressionContext] Record attempt failed:', response.status);
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
        logger.warn('[ProgressionContext] Record attempt error:', err instanceof Error ? err.message : err);
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

  // Pre-compute completions map for O(1) level completion lookups
  // Key format: "world:level" -> LevelCompletion
  const completionsMap = useMemo(() => {
    if (!progression) return new Map<string, LevelCompletion>();
    const map = new Map<string, LevelCompletion>();
    for (const completion of progression.completions) {
      map.set(`${completion.world}:${completion.level}`, completion);
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

  // Helper: Get completion for a specific level (O(1) lookup from pre-computed map)
  const getLevelCompletion = useCallback(
    (worldId: number, levelId: number): LevelCompletion | undefined => {
      return completionsMap.get(`${worldId}:${levelId}`);
    },
    [completionsMap]
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

  // Update chapter quest progress — optimistic local update + debounced server persist
  const updateChapterQuestProgress = useCallback(
    (_questType: string, amount: number, questIds: string[]) => {
      setProgression((prev) => {
        if (!prev) return prev;
        const current = prev.chapterQuestProgress ?? {};
        const updated = { ...current };
        // Increment matching quest IDs (the hook passes the relevant quest IDs)
        for (const id of questIds) {
          updated[id] = (updated[id] ?? 0) + amount;
        }
        // Persist to server (fire-and-forget)
        if (user?.id) {
          fetch('/api/adventure/quest-progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ chapterQuestProgress: updated }),
          }).catch((err) => {
            logger.warn('[ProgressionContext] Quest progress persist error:', err instanceof Error ? err.message : err);
          });
        }
        return { ...prev, chapterQuestProgress: updated };
      });
    },
    [user?.id]
  );

  // Add words to the word album — dedup + persist
  const updateWordAlbum = useCallback(
    (newWords: string[]) => {
      if (newWords.length === 0) return;
      setProgression((prev) => {
        if (!prev) return prev;
        const existing = new Set((prev.wordAlbum ?? []).map(w => w.toUpperCase()));
        let added = false;
        for (const word of newWords) {
          const upper = word.toUpperCase();
          if (!existing.has(upper)) {
            existing.add(upper);
            added = true;
          }
        }
        if (!added) return prev;
        const updatedAlbum = Array.from(existing);
        // Fire-and-forget persist
        if (user?.id) {
          fetch('/api/adventure/quest-progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ wordAlbum: updatedAlbum }),
          }).catch(() => {});
        }
        return { ...prev, wordAlbum: updatedAlbum };
      });
    },
    [user?.id]
  );

  // Purchase upgrade by ID — server validates cost and deducts gold
  const updateCurrency = useCallback(
    async (upgradeId: string, optimisticGold: number, optimisticUpgrades: Record<string, number>) => {
      // Optimistic update for instant UI feedback
      setProgression((prev) => {
        if (!prev) return prev;
        return { ...prev, gold: optimisticGold, upgrades: optimisticUpgrades };
      });

      // Server-side validation and persistence
      if (user?.id) {
        try {
          const res = await fetch('/api/adventure/purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ upgradeId }),
          });
          if (res.ok) {
            const data = await res.json();
            // Reconcile with server-authoritative values
            setProgression((prev) => {
              if (!prev) return prev;
              return { ...prev, gold: data.gold, upgrades: data.upgrades };
            });
          } else {
            // Revert optimistic update on failure
            fetchProgression();
          }
        } catch (err) {
          logger.warn('[ProgressionContext] Purchase persist error:', err instanceof Error ? err.message : err);
          fetchProgression();
        }
      }
    },
    [user?.id, fetchProgression]
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
      updateCurrency,
      updateChapterQuestProgress,
      updateWordAlbum,
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
      updateCurrency,
      updateChapterQuestProgress,
      updateWordAlbum,
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
