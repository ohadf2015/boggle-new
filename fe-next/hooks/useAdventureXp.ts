/**
 * useAdventureXp Hook
 *
 * Manages adventure XP state including level tracking, XP gains,
 * and database persistence coordination.
 *
 * Features:
 * - Local state management for totalXp and level
 * - Derived xpProgress using getXpProgress utility
 * - Level up detection when awarding XP
 * - Pending update tracking for database sync
 */

import { useState, useMemo, useCallback } from 'react';
import {
  getLevelFromXp,
  getXpProgress,
  checkLevelUp,
  type AdventureXpProgress,
} from '@/shared/utils/adventureXpUtils';

// ==================== Types ====================

export interface UseAdventureXpOptions {
  /** User ID for tracking pending updates */
  userId: string;
  /** Initial XP value (default: 0) */
  initialXp?: number;
}

export interface UseAdventureXpReturn {
  /** Total accumulated XP */
  totalXp: number;
  /** Current level (derived from totalXp) */
  currentLevel: number;
  /** Detailed XP progress for UI display */
  xpProgress: AdventureXpProgress;
  /** Award XP and check for level up */
  awardXp: (amount: number) => { leveledUp: boolean; newLevel?: number };
  /** Pending database update (null if nothing pending) */
  pendingUpdate: { userId: string; totalXp: number; level: number } | null;
  /** Clear pending update after successful database write */
  acknowledgePersistence: () => void;
}

// ==================== Hook ====================

export function useAdventureXp(
  options: UseAdventureXpOptions
): UseAdventureXpReturn {
  const { userId, initialXp = 0 } = options;

  // State: Total XP accumulated
  const [totalXp, setTotalXp] = useState<number>(initialXp);

  // State: Current level (derived from XP, but cached for performance)
  const [currentLevel, setCurrentLevel] = useState<number>(() =>
    getLevelFromXp(initialXp)
  );

  // State: Pending update for database persistence
  const [pendingUpdate, setPendingUpdate] = useState<{
    userId: string;
    totalXp: number;
    level: number;
  } | null>(null);

  // Derived: XP progress information (memoized to avoid recalculation)
  const xpProgress = useMemo<AdventureXpProgress>(() => {
    return getXpProgress(totalXp);
  }, [totalXp]);

  /**
   * Award XP to the user
   * Returns level up information if level increased
   */
  const awardXp = useCallback(
    (amount: number): { leveledUp: boolean; newLevel?: number } => {
      // Ignore negative or zero amounts
      if (amount <= 0) {
        return { leveledUp: false };
      }

      // Use functional updaters to avoid stale closure over totalXp/currentLevel.
      // This prevents double-fire in React Strict Mode from silently dropping XP.
      let levelUpResult: { leveledUp: boolean; newLevel?: number } = { leveledUp: false };

      setTotalXp(prevXp => {
        const newTotalXp = prevXp + amount;
        const newLevel = getLevelFromXp(newTotalXp);

        setCurrentLevel(prevLevel => {
          levelUpResult = checkLevelUp(prevLevel, newLevel);
          return newLevel;
        });

        // Create pending update for database persistence
        setPendingUpdate({
          userId,
          totalXp: newTotalXp,
          level: getLevelFromXp(newTotalXp),
        });

        return newTotalXp;
      });

      return levelUpResult;
    },
    [userId]
  );

  /**
   * Acknowledge that pending update has been persisted
   * Clears the pending update flag
   */
  const acknowledgePersistence = useCallback(() => {
    setPendingUpdate(null);
  }, []);

  return {
    totalXp,
    currentLevel,
    xpProgress,
    awardXp,
    pendingUpdate,
    acknowledgePersistence,
  };
}
