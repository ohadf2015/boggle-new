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
import { saveToCloud, loadFromCloud } from '@/utils/crazygames/cloudSave';
import type { PlayerProgression, LevelCompletion, LevelAttempt } from '@/types/adventure';
import {
  isWorldUnlocked as checkWorldUnlocked,
  isLevelUnlocked as checkLevelUnlocked,
} from '@/lib/adventure';
import {
  enqueueCompletion,
  dequeueCompletion,
  peekQueue,
} from '@/lib/adventure/offlineCompletionQueue';
import { buildCompleteLevelBody } from './progressionRequestBody';

// ==============================================
// LOCAL STORAGE CACHE
// ==============================================

const PROGRESSION_CACHE_KEY = 'lexiclash_adventure_progression';

function cacheProgression(data: PlayerProgression): void {
  try {
    localStorage.setItem(PROGRESSION_CACHE_KEY, JSON.stringify(data));
  } catch { /* quota exceeded or SSR — ignore */ }
}

function loadCachedProgression(userId: string): PlayerProgression | null {
  try {
    const raw = localStorage.getItem(PROGRESSION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlayerProgression;
    // Only use cache if it belongs to the current user
    if (parsed.userId !== userId) return null;
    return parsed;
  } catch { return null; }
}

function clearCachedProgression(): void {
  try { localStorage.removeItem(PROGRESSION_CACHE_KEY); } catch { /* ignore */ }
}

// ==============================================
// HELPERS
// ==============================================

/**
 * Fire-and-forget fetch with retry for background saves.
 * Retries on 5xx and network errors (not 429 — retrying rate limits makes it worse).
 */
function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 2,
  baseDelay = 1000,
): void {
  async function attempt(retryCount: number): Promise<void> {
    try {
      const res = await fetch(url, options);
      if (res.ok) return;
      if (retryCount < maxRetries && res.status >= 500) {
        await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, retryCount)));
        return attempt(retryCount + 1);
      }
      logger.debug(`[ProgressionContext] ${url} failed:`, res.status);
    } catch (err) {
      if (retryCount < maxRetries) {
        await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, retryCount)));
        return attempt(retryCount + 1);
      }
      logger.debug(`[ProgressionContext] ${url} error after ${maxRetries} retries:`, err instanceof Error ? err.message : err);
    }
  }
  attempt(0);
}

/** POST JSON with one transient-error retry. Returns the Response. */
async function fetchWithTransientRetry(
  url: string,
  body: string,
): Promise<Response> {
  const options: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body,
  };
  let response = await fetch(url, options);
  if (response.status === 429 || response.status >= 500) {
    const retryAfter = response.status === 429
      ? Math.max(2000, Number(response.headers.get('Retry-After') || '3') * 1000)
      : 1000;
    logger.info(`[ProgressionContext] Retrying ${url} after`, response.status);
    await new Promise(r => setTimeout(r, retryAfter));
    response = await fetch(url, options);
  }
  return response;
}

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
  /** True when error was caused by expired/missing auth session */
  isAuthError: boolean;
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
    longWords?: number,
    wordsFound?: string[],
    flashChallengeGold?: number,
    timePlayed?: number
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
  /** Update rune inventory (forge/equip/unequip) — optimistic local update */
  updateRunes: (runes: import('@/types/adventure').PlayerRune[], fragments: number) => void;
}

// ==============================================
// SPLIT CONTEXTS (perf optimization)
// ==============================================

// Data context: progression, attempts, loading/error state — changes frequently.
// Only components that read data subscribe here.
interface ProgressionDataContextType {
  progression: PlayerProgression | null;
  attempts: LevelAttempt[];
  isLoading: boolean;
  error: Error | null;
  isAuthError: boolean;
}

// Actions context: stable function references — rarely (if ever) recreated.
// Components that only call actions (e.g., completeLevel) don't re-render on data changes.
interface ProgressionActionsContextType {
  refreshProgression: () => Promise<void>;
  completeLevel: ProgressionContextType['completeLevel'];
  recordAttempt: ProgressionContextType['recordAttempt'];
  isWorldUnlocked: (worldId: number) => boolean;
  isLevelUnlocked: (worldId: number, levelId: number) => boolean;
  getWorldStars: (worldId: number) => number;
  getLevelCompletion: (worldId: number, levelId: number) => LevelCompletion | undefined;
  getLevelAttempt: (worldId: number, levelId: number) => LevelAttempt | undefined;
  updateCurrency: ProgressionContextType['updateCurrency'];
  updateChapterQuestProgress: (questType: string, amount: number, questIds: string[]) => void;
  updateWordAlbum: (newWords: string[]) => void;
  updateRunes: ProgressionContextType['updateRunes'];
}

const ProgressionDataContext = createContext<ProgressionDataContextType | null>(null);
const ProgressionActionsContext = createContext<ProgressionActionsContextType | null>(null);

// Legacy combined context — kept for backward compatibility with useProgression()
const ProgressionContext = createContext<ProgressionContextType | null>(null);

// ==============================================
// PROVIDER
// ==============================================

interface ProgressionProviderProps {
  children: ReactNode;
}

export function ProgressionProvider({ children }: ProgressionProviderProps) {
  const { user, loading: authLoading } = useAuth();
  const [progression, setProgressionRaw] = useState<PlayerProgression | null>(null);
  const [attempts, setAttempts] = useState<LevelAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isAuthError, setIsAuthError] = useState(false);

  // Wrap setProgression to also persist to localStorage.
  // IMPORTANT: Setting to null does NOT clear the cache — this prevents auth hiccups
  // from destroying cached progress. Cache is only cleared on explicit sign-out
  // via clearProgressionCache().
  const setProgression = useCallback((
    update: PlayerProgression | null | ((prev: PlayerProgression | null) => PlayerProgression | null)
  ) => {
    setProgressionRaw((prev) => {
      const next = typeof update === 'function' ? update(prev) : update;
      if (next) cacheProgression(next);
      // Don't clear cache on null — auth failures shouldn't destroy cached progress
      return next;
    });
  }, []);

  // Fetch progression and attempts from combined API endpoint
  // Uses /api/adventure/state which returns both in one request (~50-100ms faster)
  const fetchProgression = useCallback(async () => {
    const MAX_RETRIES = 3;
    const BASE_DELAY = 1000;

    if (!user?.id) {
      // No user — clear React state but keep cache (handled by hydration effect)
      setIsLoading(false);
      return;
    }

    setError(null);
    setIsAuthError(false);

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch('/api/adventure/state', {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        // Handle auth failures — flag as auth error so UI can offer re-login
        // but DON'T clear localStorage cache (progress survives auth hiccups)
        if (response.status === 401) {
          setProgressionRaw(null);
          setAttempts([]);
          setIsAuthError(true);
          setError(new Error('Session expired'));
          setIsLoading(false);
          return;
        }

        if (!response.ok) {
          // Capture response body for debugging mobile failures
          let body = '';
          try { body = await response.text(); } catch { /* ignore */ }

          // 404 = route unreachable (cold start, proxy issue) — retry before falling back
          if (response.status === 404) {
            if (attempt < MAX_RETRIES) {
              logger.debug(`[ProgressionContext] /api/adventure/state returned 404, retrying (attempt ${attempt + 1}/${MAX_RETRIES})`);
              await new Promise(r => setTimeout(r, BASE_DELAY * Math.pow(2, attempt)));
              continue;
            }
            // All retries exhausted — fall back to initial state so user can still play
            logger.debug('[ProgressionContext] /api/adventure/state returned 404 after all retries — using initial state');
            setProgression({
              userId: user!.id,
              playerLevel: 1, xp: 0,
              currentWorld: 1, currentLevel: 1,
              totalStars: 0, gold: 0,
              upgrades: {}, skillPoints: 0, skillTree: {},
              runeFragments: 0, runes: [],
              endlessHighFloor: 0, completions: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
            setAttempts([]);
            setIsLoading(false);
            return;
          }

          throw new Error(`HTTP ${response.status}: ${body.slice(0, 200)}`);
        }

        const data = await response.json();
        // Merge server data with existing state to preserve in-flight completions.
        // If completeLevel() already merged a new completion optimistically,
        // a stale API response (from replication lag) must not overwrite it.
        setProgression((prev) => {
          if (!prev || !data.progression) return data.progression;

          // Merge completions: keep the best stars for each level
          const serverCompletions: LevelCompletion[] = data.progression.completions || [];
          const mergedMap = new Map<string, LevelCompletion>();

          // Start with server data
          for (const c of serverCompletions) {
            mergedMap.set(`${c.world}-${c.level}`, c);
          }
          // Overlay local completions — keep whichever has more stars
          for (const c of prev.completions) {
            const key = `${c.world}-${c.level}`;
            const existing = mergedMap.get(key);
            if (!existing || c.stars > existing.stars) {
              mergedMap.set(key, c);
            }
          }

          const mergedCompletions = Array.from(mergedMap.values());
          // Recalculate totalStars from merged completions — this is the
          // source of truth. Avoids stale Math.max between server/cache
          // that caused stars to disappear after cache expiry.
          const recalculatedStars = mergedCompletions.reduce((sum, c) => sum + c.stars, 0);

          return {
            ...data.progression,
            completions: mergedCompletions,
            totalStars: recalculatedStars,
            // Keep the higher gold value (server is authoritative after save)
            gold: Math.max(data.progression.gold ?? 0, prev.gold ?? 0),
          };
        });
        setAttempts(data.attempts || []);
        setIsLoading(false);
        return; // Success — exit
      } catch (err) {
        const isNetworkError = err instanceof TypeError && err.message === 'Failed to fetch';
        const isRetryable = isNetworkError ||
          (err instanceof Error && /HTTP (429|5\d{2})/.test(err.message));

        if (isRetryable && attempt < MAX_RETRIES) {
          const delay = BASE_DELAY * Math.pow(2, attempt);
          logger.warn(`[ProgressionContext] Retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // Final failure
        if (!isNetworkError) {
          logger.warn('[ProgressionContext] Fetch error:', err instanceof Error ? err.message : err);
        }
        setError(err instanceof Error ? err : new Error('Failed to fetch progression'));
        setIsLoading(false);
        return;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on user.id, not the full user object
  }, [user?.id]);

  // Stable ref for fetchProgression — used inside completeLevel to avoid
  // putting fetchProgression in its dependency array (which would cause
  // completeLevel to be recreated on every progression state change and
  // risk infinite render loops when completeLevel triggers a 403 retry).
  const fetchProgressionRef = useRef(fetchProgression);
  fetchProgressionRef.current = fetchProgression;

  // Refresh progression (exposed to consumers)
  const refreshProgression = useCallback(async () => {
    setIsLoading(true);
    await fetchProgression();
  }, [fetchProgression]);

  // Sync adventure progress to CrazyGames cloud save (fire-and-forget)
  const syncCloudSave = useCallback((world: number, level: number, stars: number) => {
    saveToCloud({
      version: 1,
      adventureProgress: { worldId: world, levelId: level, stars, completedLevels: [] },
      educationProgress: { totalXp: 0, level: 0, streak: 0, achievements: [] },
      preferences: { musicVolume: 1, soundVolume: 1, language: 'en' },
    }).catch(() => { /* non-critical — DB is source of truth */ });
  }, []);

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
      longWords?: number,
      wordsFound?: string[],
      flashChallengeGold?: number,
      timePlayed?: number
    ) => {
      if (!user?.id) {
        // Guest users can't save progress
        return false;
      }

      // Capture userId eagerly — the `user` object may change by the time
      // the setProgression updater runs, causing a stale-closure where
      // user.id is undefined and the local state merge silently breaks.
      const userId = user.id;

      // If an identical-or-worse save is already in-flight, piggyback on it.
      // Include stars in the key so a higher-star save always fires a new request.
      const levelKey = `${world}-${level}-${stars}`;
      if (completeLevelInFlightRef.current === levelKey && completeLevelPromiseRef.current) {
        logger.info('[ProgressionContext] Piggy-backing on in-flight completeLevel for', levelKey);
        return completeLevelPromiseRef.current;
      }
      completeLevelInFlightRef.current = levelKey;

      let shouldQueueOnFailure = false;
      const promise = (async (): Promise<boolean> => {
      try {
        const requestBody = buildCompleteLevelBody({
          world, level, stars, score, words,
          goldEarned, longWords, wordsFound, flashChallengeGold, timePlayed,
        });

        let response = await fetch('/api/adventure/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: requestBody,
        });

        // Retry on transient errors: 429 (rate limit), 5xx (cold start), 409 (optimistic lock conflict)
        if (response.status === 429 || response.status === 409 || (response.status >= 500 && response.status < 600)) {
          const retryAfter = response.status === 429
            ? Math.max(2000, Number(response.headers.get('Retry-After') || '3') * 1000)
            : 500;
          logger.info('[ProgressionContext] Retrying completeLevel after', response.status);
          await new Promise(r => setTimeout(r, retryAfter));
          response = await fetch('/api/adventure/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: requestBody,
          });
        }

        // After retry, if still 5xx the server is genuinely unhealthy — durably queue.
        if (response.status >= 500 && response.status < 600) {
          shouldQueueOnFailure = true;
        }

        // 401 = expired session. Token refresh on the next page load can replay
        // this completion successfully, so queue rather than drop the player's progress.
        if (response.status === 401) {
          shouldQueueOnFailure = true;
        }

        // Retry on 403 "Level not unlocked" — stale DB state from a prior failed save.
        // Refresh progression (which updates the server's view) and retry once.
        if (response.status === 403) {
          logger.info('[ProgressionContext] 403 on completeLevel — refreshing progression and retrying');
          await fetchProgressionRef.current();
          await new Promise(r => setTimeout(r, 300));
          response = await fetch('/api/adventure/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: requestBody,
          });

          // Server is source-of-truth: a persistent 403 means the local frontier
          // was stale (cached localStorage from a prior session, URL-jump, or
          // dropped completion). Drop the bad cache so the next render snaps to
          // the server's view and the user is routed back to a valid level.
          // Return cleanly — don't throw (avoids Sentry spam) and don't queue
          // (4xx is deterministic; replay would 403 again).
          if (response.status === 403) {
            logger.info('[ProgressionContext] Level genuinely locked — clearing stale cache');
            clearCachedProgression();
            await fetchProgressionRef.current().catch(() => { /* best-effort */ });
            return false;
          }
        }

        if (!response.ok) {
          const errorBody = await response.text().catch(() => 'no body');
          throw new Error(`Failed to complete level: ${response.status}${errorBody && errorBody !== 'no body' ? ` - ${errorBody}` : ''}`);
        }

        const data = await response.json();

        if (!data.success || !data.progression || !data.completion) {
          logger.warn('[ProgressionContext] Server returned unexpected response for completeLevel');
          shouldQueueOnFailure = true;
          throw new Error('Unexpected response shape for completeLevel');
        }

        // Merge server response into local progression state
        setProgression((prev) => {
          const newCompletion = {
            world: data.completion.world,
            level: data.completion.level,
            stars: data.completion.stars,
            bestScore: data.completion.bestScore,
            bestWords: data.completion.bestWords,
            completedAt: data.completion.completedAt,
          };

          const base: PlayerProgression = prev ?? {
            userId,
            playerLevel: 1,
            xp: 0,
            currentWorld: world,
            currentLevel: level,
            totalStars: 0,
            gold: 0,
            upgrades: {},
            skillPoints: 0,
            skillTree: {},
            runeFragments: 0,
            runes: [],
            endlessHighFloor: 0,
            completions: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          const existingIndex = base.completions.findIndex(
            (c) => c.world === world && c.level === level
          );
          const updatedCompletions = existingIndex >= 0
            ? base.completions.map((c, i) => i === existingIndex ? newCompletion : c)
            : [...base.completions, newCompletion];

          return {
            ...base,
            playerLevel: data.progression.playerLevel,
            xp: data.progression.xp,
            currentWorld: data.progression.currentWorld,
            currentLevel: data.progression.currentLevel,
            totalStars: data.progression.totalStars,
            gold: data.progression.gold ?? base.gold,
            upgrades: data.progression.upgrades ?? base.upgrades,
            completions: updatedCompletions,
            updatedAt: new Date().toISOString(),
          };
        });

        // Show quest completion toast if a weekly quest was completed
        if (data.questUpdate?.completed) {
          import('@/components/quests/QuestCompletionToast').then(({ showQuestCompletionToast }) => {
            showQuestCompletionToast({
              questName: data.questUpdate.description,
              xpReward: data.questUpdate.xpReward,
              dedupKey: `weekly:${data.questUpdate.questType ?? data.questUpdate.description}`,
              t: (key: string) => key,
            });
          });
        }

        // Sync to CrazyGames cloud save (fire-and-forget, non-blocking)
        syncCloudSave(world, level, stars);

        return true;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        // Server-validated rejections (403/404) are deterministic; the retry path above
        // already refreshed progression once. Demote to info so they don't ship to Sentry.
        const isExpectedRejection = /:\s*40[34]\b/.test(errMsg);
        if (isExpectedRejection) {
          logger.info('[ProgressionContext] Complete level rejected:', errMsg);
        } else {
          logger.warn('[ProgressionContext] Complete level error:', errMsg);
        }

        // Queue for offline replay on:
        //  - network errors (TypeError = fetch failed)
        //  - 5xx after retries (server unhealthy, retryable)
        //  - unexpected response shape (server bug — don't silently drop user's progress)
        // Skip 4xx: those are deterministic rejections and will fail again on replay.
        if (err instanceof TypeError || shouldQueueOnFailure) {
          enqueueCompletion({
            world, level, stars, score, words,
            ...(goldEarned !== undefined && { goldEarned }),
            ...(longWords !== undefined && { longWords }),
            ...(wordsFound && wordsFound.length > 0 && { wordsFound }),
            ...(flashChallengeGold !== undefined && flashChallengeGold > 0 && { flashChallengeGold }),
            queuedAt: Date.now(),
          });
          logger.info('[ProgressionContext] Queued level completion for offline replay:', `${world}-${level}`);
        }

        return false;
      } finally {
        completeLevelInFlightRef.current = null;
        completeLevelPromiseRef.current = null;
      }
      })();

      completeLevelPromiseRef.current = promise;
      return promise;
    },
    [user?.id, setProgression, syncCloudSave]
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
          world, level, words, score, timeRemaining, objectiveProgress, isCompletion,
        });

        const response = await fetchWithTransientRetry('/api/adventure/attempt', requestBody);

        if (!response.ok) {
          logger.info('[ProgressionContext] Record attempt failed:', response.status);
          return null;
        }

        const data = await response.json();

        if (data.success && data.attempt) {
          const newAttempt: LevelAttempt = data.attempt;

          setAttempts((prev) => {
            const existingIndex = prev.findIndex(
              (a) => a.world === world && a.level === level
            );
            if (existingIndex >= 0) {
              return prev.map((a, i) => i === existingIndex ? newAttempt : a);
            }
            return [...prev, newAttempt];
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

  // Pre-compute attempts map for O(1) lookups instead of O(n) find
  const attemptsMap = useMemo(() => {
    const map = new Map<string, LevelAttempt>();
    for (const a of attempts) {
      map.set(`${a.world}:${a.level}`, a);
    }
    return map;
  }, [attempts]);

  // Helper: Get attempt for a specific level (O(1) lookup from pre-computed map)
  const getLevelAttempt = useCallback(
    (worldId: number, levelId: number): LevelAttempt | undefined => {
      return attemptsMap.get(`${worldId}:${levelId}`);
    },
    [attemptsMap]
  );

  // Debounced quest-progress persist — batches rapid updates into a single API call
  const questProgressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingQuestProgressRef = useRef<Record<string, number> | null>(null);

  const flushQuestProgress = useCallback(() => {
    const pending = pendingQuestProgressRef.current;
    if (!pending || !user?.id) return;
    pendingQuestProgressRef.current = null;
    fetchWithRetry('/api/adventure/quest-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ chapterQuestProgress: pending }),
    });
  }, [user?.id]);

  // Update chapter quest progress — optimistic local update + debounced server persist
  const updateChapterQuestProgress = useCallback(
    (_questType: string, amount: number, questIds: string[]) => {
      setProgression((prev) => {
        if (!prev) return prev;
        const current = prev.chapterQuestProgress ?? {};
        const updated = { ...current };
        for (const id of questIds) {
          updated[id] = (updated[id] ?? 0) + amount;
        }
        // Stage for debounced persist (2s window batches rapid word-find updates)
        pendingQuestProgressRef.current = updated;
        if (questProgressTimerRef.current) clearTimeout(questProgressTimerRef.current);
        questProgressTimerRef.current = setTimeout(flushQuestProgress, 2000);
        return { ...prev, chapterQuestProgress: updated };
      });
    },
    [flushQuestProgress, setProgression]
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
        // Word album is persisted only through /api/adventure/complete (validated against grid).
        // Local-only update here for immediate UI feedback.
        return { ...prev, wordAlbum: updatedAlbum };
      });
    },
    [setProgression]
  );

  // Update rune inventory — optimistic local update (persisted via cloud save)
  const updateRunes = useCallback(
    (runes: import('@/types/adventure').PlayerRune[], fragments: number) => {
      setProgression((prev) => {
        if (!prev) return prev;
        return { ...prev, runes, runeFragments: fragments };
      });
    },
    [setProgression]
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
            fetchProgressionRef.current();
          }
        } catch (err) {
          logger.warn('[ProgressionContext] Purchase persist error:', err instanceof Error ? err.message : err);
          fetchProgressionRef.current();
        }
      }
    },
    [user?.id, setProgression]
  );

  // Track previous user ID to detect sign-out (user changes from ID → null)
  const prevUserIdRef = useRef<string | null>(null);

  // Hydrate from localStorage immediately while waiting for API
  useEffect(() => {
    const prevUserId = prevUserIdRef.current;
    const currentUserId = user?.id ?? null;

    if (!authLoading && currentUserId) {
      // User is authenticated — load cache then fetch from server
      const cached = loadCachedProgression(currentUserId);
      if (cached && !progression) {
        setProgressionRaw(cached);
        // Don't set isLoading=false here — wait for API fetch to complete.
        // Showing cached data prevents blank flash, but isLoading stays true
        // so components know fresh data is still incoming.
      }
      fetchProgression(); // Fetch from server — sets isLoading=false on complete
      // Fire-and-forget: trigger CrazyGames data.getItem so QA dashboard registers it
      loadFromCloud().catch(() => { /* non-critical */ });
    } else if (!authLoading && !currentUserId) {
      // No user — clear React state
      setProgressionRaw(null);
      setAttempts([]);
      setError(null);
      setIsAuthError(false);
      setIsLoading(false);

      // Only clear localStorage cache on explicit sign-out
      // (previous user was set, now it's null = deliberate sign-out)
      // Don't clear on initial load when prevUserId is still null
      if (prevUserId) {
        clearCachedProgression();
      }
    }

    prevUserIdRef.current = currentUserId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  // Clean up quest progress timer on unmount
  useEffect(() => {
    return () => {
      if (questProgressTimerRef.current) {
        clearTimeout(questProgressTimerRef.current);
        // Flush any pending quest progress on unmount
        flushQuestProgress();
      }
    };
  }, [flushQuestProgress]);

  // Drain queued completions to the server. Stable across renders so the
  // mount-time and 'online'-event effects can share a single implementation.
  // Bounds the loop to the initial queue size so a persistent failure that
  // re-enqueues items doesn't tight-loop forever — re-queued items wait for
  // the next drain trigger ('online' event or next mount).
  const flushOfflineQueue = useCallback(async () => {
    const initial = peekQueue();
    if (initial.length === 0) return;
    logger.info('[ProgressionContext] Flushing', initial.length, 'queued completions');

    for (let i = 0; i < initial.length; i++) {
      const item = dequeueCompletion();
      if (!item) break;
      await completeLevel(
        item.world, item.level, item.stars, item.score, item.words,
        item.goldEarned, item.longWords, item.wordsFound, item.flashChallengeGold,
      );
    }
  }, [completeLevel]);

  // Flush queued completions when connectivity returns.
  useEffect(() => {
    window.addEventListener('online', flushOfflineQueue);
    return () => window.removeEventListener('online', flushOfflineQueue);
  }, [flushOfflineQueue]);

  // Drain on mount/auth-ready: covers the case where the user was offline in
  // a previous session, a save was queued to localStorage, and now the app
  // loads while already online — the 'online' event never fires, so without
  // this we'd hold the completion in localStorage indefinitely.
  useEffect(() => {
    if (!user?.id) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    if (peekQueue().length === 0) return;
    flushOfflineQueue();
  }, [user?.id, flushOfflineQueue]);

  // Split context values for selective re-rendering
  const dataValue = useMemo<ProgressionDataContextType>(
    () => ({ progression, attempts, isLoading, error, isAuthError }),
    [progression, attempts, isLoading, error, isAuthError]
  );

  const actionsValue = useMemo<ProgressionActionsContextType>(
    () => ({
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
      updateRunes,
    }),
    [
      refreshProgression, completeLevel, recordAttempt,
      isWorldUnlocked, isLevelUnlocked,
      getWorldStars, getLevelCompletion, getLevelAttempt,
      updateCurrency, updateChapterQuestProgress, updateWordAlbum, updateRunes,
    ]
  );

  // Legacy combined value — only consumed by useProgression() for backward compat
  const contextValue = useMemo<ProgressionContextType>(
    () => ({ ...dataValue, ...actionsValue }),
    [dataValue, actionsValue]
  );

  return (
    <ProgressionDataContext.Provider value={dataValue}>
      <ProgressionActionsContext.Provider value={actionsValue}>
        <ProgressionContext.Provider value={contextValue}>
          {children}
        </ProgressionContext.Provider>
      </ProgressionActionsContext.Provider>
    </ProgressionDataContext.Provider>
  );
}

// ==============================================
// HOOKS
// ==============================================

/**
 * Hook to access adventure progression context (backward-compatible).
 * Triggers re-render on ANY state change — prefer selective hooks below.
 * Must be used within ProgressionProvider.
 */
export function useProgression(): ProgressionContextType {
  const context = useContext(ProgressionContext);
  if (!context) {
    throw new Error('useProgression must be used within ProgressionProvider');
  }
  return context;
}

/**
 * Selective hook: only re-renders when progression DATA changes.
 * Use when you need progression/attempts/isLoading but don't call actions.
 */
export function useProgressionData(): ProgressionDataContextType {
  const context = useContext(ProgressionDataContext);
  if (!context) {
    throw new Error('useProgressionData must be used within ProgressionProvider');
  }
  return context;
}

/**
 * Selective hook: only re-renders when action refs change (rarely).
 * Use when you only need to call completeLevel, recordAttempt, etc.
 */
export function useProgressionActions(): ProgressionActionsContextType {
  const context = useContext(ProgressionActionsContext);
  if (!context) {
    throw new Error('useProgressionActions must be used within ProgressionProvider');
  }
  return context;
}

// ==============================================
// EXPORTS
// ==============================================

export { ProgressionContext, ProgressionDataContext, ProgressionActionsContext };
export type { ProgressionContextType, ProgressionDataContextType, ProgressionActionsContextType };
