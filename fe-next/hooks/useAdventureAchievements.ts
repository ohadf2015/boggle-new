/**
 * useAdventureAchievements Hook
 *
 * Manages adventure achievement state with localStorage persistence
 * and server sync via /api/adventure/achievements.
 *
 * On mount: fetches server counts, merges with localStorage (higher value wins).
 * On earn: updates localStorage + POSTs latest counts to server.
 *
 * Usage:
 * ```
 * const { earnAchievement, achievementCounts, isEarned } = useAdventureAchievements();
 *
 * // Earn an achievement
 * const isNew = earnAchievement('FIRST_WORD');
 * if (isNew) {
 *   // Show unlock modal
 * }
 * ```
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ADVENTURE_ACHIEVEMENTS,
  type AdventureAchievementId,
  getAchievementTierInfo,
} from '@/utils/adventureAchievementUtils';

// ==============================================
// TYPES
// ==============================================

export interface UseAdventureAchievementsReturn {
  /** Map of achievement ID to earn count */
  achievementCounts: Record<AdventureAchievementId, number>;
  /** Earn an achievement (returns true if newly earned or tier upgraded) */
  earnAchievement: (id: AdventureAchievementId) => boolean;
  /** Check if an achievement has been earned at least once */
  isEarned: (id: AdventureAchievementId) => boolean;
  /** Get the count for a specific achievement */
  getCount: (id: AdventureAchievementId) => number;
  /** Get tier info for an achievement */
  getTierInfo: (id: AdventureAchievementId) => ReturnType<typeof getAchievementTierInfo>;
}

// ==============================================
// CONSTANTS
// ==============================================

const STORAGE_KEY = 'lexiclash-adventure-achievements';
const API_PATH = '/api/adventure/achievements';

// ==============================================
// HELPERS
// ==============================================

function loadFromStorage(): Record<AdventureAchievementId, number> {
  if (typeof window === 'undefined') return {} as Record<AdventureAchievementId, number>;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore corrupted data
  }
  return {} as Record<AdventureAchievementId, number>;
}

function saveToStorage(counts: Record<AdventureAchievementId, number>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
  } catch {
    // ignore quota errors
  }
}

/**
 * Merge local and server counts — take the higher value per key.
 */
function mergeCounts(
  local: Record<string, number>,
  server: Record<string, number>
): Record<AdventureAchievementId, number> {
  const merged: Record<string, number> = { ...local };
  for (const [key, serverVal] of Object.entries(server)) {
    merged[key] = Math.max(merged[key] || 0, serverVal);
  }
  return merged as Record<AdventureAchievementId, number>;
}

async function fetchServerCounts(): Promise<Record<string, number> | null> {
  try {
    const res = await fetch(API_PATH);
    if (!res.ok) return null;
    const data = await res.json();
    return data.counts ?? null;
  } catch {
    return null;
  }
}

async function postServerCounts(counts: Record<string, number>): Promise<void> {
  try {
    await fetch(API_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ counts }),
    });
  } catch {
    // Best-effort — local state already updated
  }
}

// ==============================================
// HOOK
// ==============================================

export function useAdventureAchievements(): UseAdventureAchievementsReturn {
  const [achievementCounts, setAchievementCounts] = useState<
    Record<AdventureAchievementId, number>
  >(loadFromStorage);

  // Keep a ref for use inside callbacks without stale closures
  const countsRef = useRef(achievementCounts);
  countsRef.current = achievementCounts;

  // On mount: fetch server counts and merge
  useEffect(() => {
    let cancelled = false;

    fetchServerCounts().then((serverCounts) => {
      if (cancelled || !serverCounts) return;
      setAchievementCounts((prev) => {
        const merged = mergeCounts(prev, serverCounts);
        saveToStorage(merged);
        return merged;
      });
    });

    return () => { cancelled = true; };
  }, []);

  // Persist to localStorage on changes
  useEffect(() => {
    saveToStorage(achievementCounts);
  }, [achievementCounts]);

  /**
   * Earn an achievement.
   * Returns true if this is a new earn or tier upgrade.
   */
  const earnAchievement = useCallback(
    (id: AdventureAchievementId): boolean => {
      const achievement = ADVENTURE_ACHIEVEMENTS[id];
      if (!achievement) return false;

      const currentCounts = countsRef.current;
      const currentCount = currentCounts[id] || 0;
      const currentTier = getAchievementTierInfo(id, currentCounts).tier;

      // For one-time achievements, only earn once
      if (achievement.oneTime && currentCount > 0) {
        return false;
      }

      const newCounts = {
        ...currentCounts,
        [id]: currentCount + 1,
      };

      setAchievementCounts(newCounts);

      // Check if this is a new tier
      const newTier = getAchievementTierInfo(id, newCounts).tier;
      const isNewTier = newTier !== currentTier;

      // Sync to server (best-effort, non-blocking)
      postServerCounts(newCounts);

      return currentCount === 0 || isNewTier;
    },
    [] // stable — reads from ref
  );

  const isEarned = useCallback(
    (id: AdventureAchievementId): boolean => (achievementCounts[id] || 0) > 0,
    [achievementCounts]
  );

  const getCount = useCallback(
    (id: AdventureAchievementId): number => achievementCounts[id] || 0,
    [achievementCounts]
  );

  const getTierInfo = useCallback(
    (id: AdventureAchievementId) => getAchievementTierInfo(id, achievementCounts),
    [achievementCounts]
  );

  return { achievementCounts, earnAchievement, isEarned, getCount, getTierInfo };
}
