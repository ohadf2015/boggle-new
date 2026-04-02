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

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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

/** sessionStorage key for pending XP update flush on page unload */
const BEFOREUNLOAD_STORAGE_KEY = 'adventure_xp_pending';

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

  // Refs mirror state values so awardXp can compute synchronously without stale closures.
  // Both are updated synchronously inside awardXp and kept in sync via useEffect for
  // any external state changes (e.g., if props change in future).
  const totalXpRef = useRef(initialXp);
  const currentLevelRef = useRef(getLevelFromXp(initialXp));
  useEffect(() => {
    totalXpRef.current = totalXp;
  }, [totalXp]);
  useEffect(() => {
    currentLevelRef.current = currentLevel;
  }, [currentLevel]);

  // Ref mirrors pendingUpdate so the single beforeunload handler always sees
  // the latest value without needing to be re-registered on every state change.
  // Updated synchronously in awardXp and acknowledgePersistence.
  const pendingUpdateRef = useRef<{
    userId: string;
    totalXp: number;
    level: number;
  } | null>(null);

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

      // Compute new values synchronously using refs so we can:
      //   1. Return level-up result immediately (before React flushes state)
      //   2. Build newPending and write it to pendingUpdateRef immediately
      //   3. Still use functional setters for React Strict Mode safety
      const newTotalXp = totalXpRef.current + amount;
      const newLevel = getLevelFromXp(newTotalXp);
      const levelUpResult = checkLevelUp(currentLevelRef.current, newLevel);
      const newPending = { userId, totalXp: newTotalXp, level: newLevel };

      // Update refs synchronously — the beforeunload handler reads pendingUpdateRef and
      // must see the latest value even if useEffect hasn't flushed yet.
      pendingUpdateRef.current = newPending;
      currentLevelRef.current = newLevel;
      totalXpRef.current = newTotalXp;

      setTotalXp(prevXp => prevXp + amount);
      setCurrentLevel(newLevel);
      setPendingUpdate(newPending);

      return levelUpResult;
    },
    [userId]
  );

  /**
   * Acknowledge that pending update has been persisted
   * Clears the pending update flag
   */
  const acknowledgePersistence = useCallback(() => {
    pendingUpdateRef.current = null;
    setPendingUpdate(null);
  }, []);

  // Register beforeunload flush: if the user navigates away with unsaved XP,
  // persist it to sessionStorage so the next session can recover it.
  useEffect(() => {
    const handleBeforeUnload = () => {
      const pending = pendingUpdateRef.current;
      if (pending) {
        try {
          sessionStorage.setItem(BEFOREUNLOAD_STORAGE_KEY, JSON.stringify(pending));
        } catch {
          // sessionStorage unavailable (private mode quota exceeded etc.) — ignore
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []); // empty deps: single registration, ref keeps handler current

  return {
    totalXp,
    currentLevel,
    xpProgress,
    awardXp,
    pendingUpdate,
    acknowledgePersistence,
  };
}
