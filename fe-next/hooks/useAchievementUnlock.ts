'use client';

/**
 * useAchievementUnlock Hook
 *
 * Manages achievement unlock detection and celebration queue.
 * Integrates with educationAchievementManager for unlock detection.
 *
 * Design:
 * - FIFO queue for multiple simultaneous unlocks
 * - localStorage persistence to prevent re-showing
 * - Disabled state support for opt-out scenarios
 *
 * Usage:
 * const { currentUnlock, acknowledgeUnlock, checkForUnlocks } = useAchievementUnlock({
 *   studentId: 'student-123'
 * });
 *
 * // After XP gain or progress update
 * checkForUnlocks(newProgressData);
 *
 * // When user dismisses celebration modal
 * acknowledgeUnlock();
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  calculateNewUnlocks,
  checkAchievementProgress,
  type StudentProgressData,
  type AchievementProgress,
} from '@/backend/modules/educationAchievementManager';

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
  checkForUnlocks: (newProgress: StudentProgressData) => void;
  isChecking: boolean;
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

/**
 * Achievement unlock detection and celebration queue hook
 *
 * @param options - Configuration options
 * @returns Unlock state and actions
 *
 * @example
 * const { currentUnlock, acknowledgeUnlock, checkForUnlocks } = useAchievementUnlock({
 *   studentId: 'student-123',
 * });
 *
 * // After XP gain
 * checkForUnlocks(newProgressData);
 *
 * // In modal onClose
 * acknowledgeUnlock();
 */
export function useAchievementUnlock(
  options: UseAchievementUnlockOptions
): UseAchievementUnlockReturn {
  const { studentId, enabled = true } = options;

  // ==================== State ====================

  const [pendingUnlocks, setPendingUnlocks] = useState<UnlockPayload[]>([]);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  // Store current progress to compare on next check
  const previousProgressRef = useRef<AchievementProgress[] | null>(null);

  // Load acknowledged unlocks on mount
  const acknowledgedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    acknowledgedRef.current = loadAcknowledged(studentId);
  }, [studentId]);

  // ==================== Derived State ====================

  // Current unlock is first in queue (FIFO)
  const currentUnlock = pendingUnlocks.length > 0 ? pendingUnlocks[0] : null;

  // ==================== Actions ====================

  /**
   * Check for new achievement unlocks
   * Compares current progress with previous, detects new unlocks
   */
  const checkForUnlocks = useCallback(
    (newProgress: StudentProgressData): void => {
      // Early return if disabled
      if (!enabled) return;

      setIsChecking(true);

      try {
        // Calculate current achievement progress
        const currentProgress = checkAchievementProgress(newProgress);

        // If no previous progress, store current and exit
        // (First call - no baseline for comparison)
        if (previousProgressRef.current === null) {
          previousProgressRef.current = currentProgress;
          setIsChecking(false);
          return;
        }

        // Compare with previous to find new unlocks
        const newUnlocks = calculateNewUnlocks(previousProgressRef.current, currentProgress);

        // Filter out already acknowledged unlocks
        const unacknowledged = newUnlocks.filter((unlock) => {
          const unlockKey = getUnlockKey(unlock);
          return !acknowledgedRef.current.has(unlockKey);
        });

        // Update previous progress for next comparison
        previousProgressRef.current = currentProgress;

        // Add new unlocks to queue
        if (unacknowledged.length > 0) {
          setPendingUnlocks((prev) => [...prev, ...unacknowledged]);
        }

        setIsChecking(false);
      } catch (error) {
        console.error('[useAchievementUnlock] Error checking for unlocks:', error);
        setIsChecking(false);
      }
    },
    [enabled]
  );

  /**
   * Acknowledge current unlock (dismiss modal)
   * Removes current from queue, shows next, persists acknowledgment
   */
  const acknowledgeUnlock = useCallback((): void => {
    if (pendingUnlocks.length === 0) return;

    const [current, ...remaining] = pendingUnlocks;

    // Persist acknowledgment
    const unlockKey = getUnlockKey(current);
    saveAcknowledged(studentId, unlockKey);
    acknowledgedRef.current.add(unlockKey);

    // Remove from queue
    setPendingUnlocks(remaining);
  }, [pendingUnlocks, studentId]);

  // ==================== Return ====================

  return {
    pendingUnlocks,
    currentUnlock,
    acknowledgeUnlock,
    checkForUnlocks,
    isChecking,
  };
}

// ==================== EXPORTS ====================

export default useAchievementUnlock;
