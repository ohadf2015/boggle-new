'use client';

/**
 * Celebration queue for awards the server granted (PATCH /api/education/practice returns them).
 * Each achievement tier shows once per student: it is remembered in localStorage when shown.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface UnlockPayload {
  achievementKey: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  icon: string;
  isNew: boolean; // First time earning this achievement
  isUpgrade: boolean; // Upgraded to higher tier
}

export interface UseAchievementUnlockOptions {
  studentId: string;
  enabled?: boolean; // Default: true
}

export interface UseAchievementUnlockReturn {
  pendingUnlocks: UnlockPayload[];
  currentUnlock: UnlockPayload | null;
  acknowledgeUnlock: () => void;
  enqueueUnlocks: (unlocks: UnlockPayload[]) => void;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate unique key for achievement unlock
 * Used for localStorage persistence
 */
function getUnlockKey(unlock: UnlockPayload): string {
  return `${unlock.achievementKey}:${unlock.tier}`;
}

/**
 * Load acknowledged unlocks from localStorage
 */
function loadAcknowledged(studentId: string): Set<string> {
  if (typeof window === 'undefined') return new Set();

  try {
    const key = `achievement-acknowledged-${studentId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return new Set();

    const parsed: string[] = JSON.parse(stored);
    return new Set(parsed);
  } catch (error) {
    console.warn('[useAchievementUnlock] Failed to load acknowledged unlocks:', error);
    return new Set();
  }
}

/**
 * Save acknowledged unlock to localStorage
 */
function saveAcknowledged(studentId: string, unlockKey: string): void {
  if (typeof window === 'undefined') return;

  try {
    const key = `achievement-acknowledged-${studentId}`;
    const existing = loadAcknowledged(studentId);
    existing.add(unlockKey);

    localStorage.setItem(key, JSON.stringify(Array.from(existing)));
  } catch (error) {
    console.warn('[useAchievementUnlock] Failed to save acknowledged unlock:', error);
  }
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useAchievementUnlock(
  options: UseAchievementUnlockOptions
): UseAchievementUnlockReturn {
  const { studentId, enabled = true } = options;

  // ==================== State ====================

  const [pendingUnlocks, setPendingUnlocks] = useState<UnlockPayload[]>([]);

  // Load acknowledged unlocks on mount
  const acknowledgedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    acknowledgedRef.current = loadAcknowledged(studentId);
  }, [studentId]);

  // ==================== Derived State ====================

  // Current unlock is first in queue (FIFO)
  const currentUnlock = pendingUnlocks.length > 0 ? pendingUnlocks[0] : null;

  // Remembered when shown, not when dismissed: a reload mid-celebration must not replay it.
  useEffect(() => {
    if (!currentUnlock) return;
    const unlockKey = getUnlockKey(currentUnlock);
    if (acknowledgedRef.current.has(unlockKey)) return;
    acknowledgedRef.current.add(unlockKey);
    saveAcknowledged(studentId, unlockKey);
  }, [currentUnlock, studentId]);

  // ==================== Actions ====================

  const enqueueUnlocks = useCallback(
    (unlocks: UnlockPayload[]): void => {
      if (!enabled) return;
      const known = loadAcknowledged(studentId);
      setPendingUnlocks((prev) => {
        const queued = new Set(prev.map(getUnlockKey));
        const fresh = unlocks.filter((u) => {
          const key = getUnlockKey(u);
          if (known.has(key) || acknowledgedRef.current.has(key) || queued.has(key)) return false;
          queued.add(key);
          return true;
        });
        return fresh.length ? [...prev, ...fresh] : prev;
      });
    },
    [enabled, studentId]
  );

  const acknowledgeUnlock = useCallback((): void => {
    setPendingUnlocks((prev) => prev.slice(1));
  }, []);

  // ==================== Return ====================

  return {
    pendingUnlocks,
    currentUnlock,
    acknowledgeUnlock,
    enqueueUnlocks,
  };
}

// ==================== EXPORTS ====================

export default useAchievementUnlock;
