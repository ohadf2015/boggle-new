/**
 * useAdventureAchievements Hook
 *
 * Manages adventure achievement state with localStorage persistence.
 * Provides methods to earn achievements and query achievement status.
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

import { useState, useCallback, useEffect } from 'react';
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

// ==============================================
// HOOK
// ==============================================

export function useAdventureAchievements(): UseAdventureAchievementsReturn {
  // Initialize state from localStorage
  const [achievementCounts, setAchievementCounts] = useState<
    Record<AdventureAchievementId, number>
  >(() => {
    if (typeof window === 'undefined') {
      // SSR: return empty counts
      return {} as Record<AdventureAchievementId, number>;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load adventure achievements:', error);
    }

    return {} as Record<AdventureAchievementId, number>;
  });

  // Persist to localStorage on changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(achievementCounts));
    } catch (error) {
      console.warn('Failed to save adventure achievements:', error);
    }
  }, [achievementCounts]);

  /**
   * Earn an achievement
   * Returns true if this is a new earn or tier upgrade
   */
  const earnAchievement = useCallback(
    (id: AdventureAchievementId): boolean => {
      const achievement = ADVENTURE_ACHIEVEMENTS[id];
      if (!achievement) return false;

      const currentCount = achievementCounts[id] || 0;
      const currentTier = getAchievementTierInfo(id, achievementCounts).tier;

      // For one-time achievements, only earn once
      if (achievement.oneTime && currentCount > 0) {
        return false;
      }

      // Increment count
      const newCounts = {
        ...achievementCounts,
        [id]: currentCount + 1,
      };
      setAchievementCounts(newCounts);

      // Check if this is a new tier
      const newTier = getAchievementTierInfo(id, newCounts).tier;
      const isNewTier = newTier !== currentTier;

      // Return true if first earn or tier upgrade
      return currentCount === 0 || isNewTier;
    },
    [achievementCounts]
  );

  /**
   * Check if an achievement has been earned at least once
   */
  const isEarned = useCallback(
    (id: AdventureAchievementId): boolean => {
      return (achievementCounts[id] || 0) > 0;
    },
    [achievementCounts]
  );

  /**
   * Get the count for a specific achievement
   */
  const getCount = useCallback(
    (id: AdventureAchievementId): number => {
      return achievementCounts[id] || 0;
    },
    [achievementCounts]
  );

  /**
   * Get tier info for an achievement
   */
  const getTierInfo = useCallback(
    (id: AdventureAchievementId) => {
      return getAchievementTierInfo(id, achievementCounts);
    },
    [achievementCounts]
  );

  return {
    achievementCounts,
    earnAchievement,
    isEarned,
    getCount,
    getTierInfo,
  };
}
