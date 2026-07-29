/**
 * useAchievementPin Hook
 *
 * Manages achievement pinning functionality with persistence to database.
 * Max 3 pins per student.
 *
 * Usage:
 *   const { pinnedKeys, togglePin, isLoading, error } = useAchievementPin(studentId);
 */

import { useState, useCallback, useEffect } from 'react';
import type { StudentAchievement } from '@/types/education';
import logger from '@/utils/logger';

// ============================================
// TYPES
// ============================================

interface UseAchievementPinReturn {
  /** Set of pinned achievement keys */
  pinnedKeys: Set<string>;
  /** Toggle pin status for an achievement */
  togglePin: (achievementKey: string, currentPinned: boolean) => Promise<void>;
  /** Whether a pin operation is in progress */
  isLoading: boolean;
  /** Error from the last operation */
  error: string | null;
  /** Clear any error */
  clearError: () => void;
  /** Maximum number of pins allowed */
  maxPins: number;
  /** Current number of pins */
  pinCount: number;
  /** Whether max pins reached */
  canPinMore: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const MAX_PINS = 3;

// ============================================
// HOOK
// ============================================

export function useAchievementPin(studentId: string | undefined): UseAchievementPinReturn {
  const [pinnedKeys, setPinnedKeys] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial pinned achievements
  useEffect(() => {
    if (!studentId) return;

    const fetchPinned = async () => {
      try {
        const response = await fetch('/api/education/achievements/pin');

        if (!response.ok) {
          throw new Error('Failed to fetch pinned achievements');
        }

        const result = await response.json();
        
        if (result.success && result.data) {
          const keys = new Set<string>(result.data.map((p: { achievementKey: string }) => p.achievementKey));
          setPinnedKeys(keys);
        }
      } catch (err) {
        logger.error('Error fetching pinned achievements:', err);
        // Don't set error state for initial fetch - just fail silently
      }
    };

    fetchPinned();
  }, [studentId]);

  /**
   * Toggle pin status for an achievement
   */
  const togglePin = useCallback(
    async (achievementKey: string, currentPinned: boolean) => {
      if (!studentId) {
        setError('Student ID required');
        return;
      }

      setIsLoading(true);
      setError(null);

      const newPinnedState = !currentPinned;

      // Optimistic update
      setPinnedKeys((prev) => {
        const next = new Set(prev);
        if (newPinnedState) {
          next.add(achievementKey);
        } else {
          next.delete(achievementKey);
        }
        return next;
      });

      try {
        const response = await fetch('/api/education/achievements/pin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            achievementKey,
            isPinned: newPinnedState,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          // Revert optimistic update on error
          setPinnedKeys((prev) => {
            const next = new Set(prev);
            if (currentPinned) {
              next.add(achievementKey);
            } else {
              next.delete(achievementKey);
            }
            return next;
          });

          throw new Error(result.error || 'Failed to update pin');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update pin';
        setError(message);
        logger.error('Error toggling pin:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [studentId]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    pinnedKeys,
    togglePin,
    isLoading,
    error,
    clearError,
    maxPins: MAX_PINS,
    pinCount: pinnedKeys.size,
    canPinMore: pinnedKeys.size < MAX_PINS,
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Merge pin status from hook into achievements array
 */
export function mergePinStatus(
  achievements: StudentAchievement[],
  pinnedKeys: Set<string>
): StudentAchievement[] {
  return achievements.map((achievement) => ({
    ...achievement,
    isPinned: pinnedKeys.has(achievement.achievementKey),
  }));
}

export default useAchievementPin;
