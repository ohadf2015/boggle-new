/**
 * useSkillPoints Hook
 *
 * Tracks skill point awarding on level up.
 * Awards 1 skill point per level gained.
 *
 * Usage in AdventureGame:
 * ```
 * useSkillPoints({
 *   currentLevel,
 *   onLevelUp: ({ pointsAwarded }) => {
 *     console.log(`Earned ${pointsAwarded} skill point(s)!`);
 *   },
 * });
 * ```
 */

import { useEffect, useRef } from 'react';
import { useSkillTreeStore } from '@/stores/skillTreeStore';

// ==============================================
// TYPES
// ==============================================

export interface UseSkillPointsOptions {
  /** Current player level */
  currentLevel: number;
  /** Callback when skill points are awarded */
  onLevelUp?: (data: { pointsAwarded: number; newTotal: number }) => void;
}

export interface UseSkillPointsReturn {
  /** Available skill points to spend */
  availablePoints: number;
  /** Total points earned across all levels */
  totalPointsEarned: number;
}

// ==============================================
// CONSTANTS
// ==============================================

/** Skill points awarded per level */
const POINTS_PER_LEVEL = 1;

// ==============================================
// HOOK
// ==============================================

export function useSkillPoints(
  options: UseSkillPointsOptions
): UseSkillPointsReturn {
  const { currentLevel, onLevelUp } = options;

  // Track previous level to detect level ups
  const previousLevelRef = useRef<number>(currentLevel);

  // Get skill tree state and actions
  const availablePoints = useSkillTreeStore((state) => state.availablePoints);
  const totalPointsEarned = useSkillTreeStore((state) => state.totalPointsEarned);
  const awardPoints = useSkillTreeStore((state) => state.awardPoints);

  // Detect level up and award points
  useEffect(() => {
    const previousLevel = previousLevelRef.current;

    if (currentLevel > previousLevel) {
      // Calculate levels gained (handles multiple level ups at once)
      const levelsGained = currentLevel - previousLevel;
      const pointsToAward = levelsGained * POINTS_PER_LEVEL;

      // Award points
      awardPoints(pointsToAward);

      // Notify callback
      if (onLevelUp) {
        onLevelUp({
          pointsAwarded: pointsToAward,
          newTotal: totalPointsEarned + pointsToAward,
        });
      }
    }

    // Update ref for next comparison
    previousLevelRef.current = currentLevel;
  }, [currentLevel, awardPoints, onLevelUp, totalPointsEarned]);

  return {
    availablePoints,
    totalPointsEarned,
  };
}
