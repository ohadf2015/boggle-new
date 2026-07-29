/**
 * useSkillPoints Hook
 *
 * Wires adventure level-up events to skill point awards.
 * Awards 1 skill point per level gained.
 *
 * Usage:
 * ```tsx
 * const { currentLevel } = useAdventureXp({ userId, initialXp });
 * useSkillPoints({ currentLevel });
 * ```
 */

import { useRef, useEffect } from 'react';
import { useSkillTreeStore } from './useSkillTreeStore';

// ==============================================
// TYPES
// ==============================================

export interface UseSkillPointsOptions {
  /** Current player level (from useAdventureXp) */
  currentLevel: number;
  /** Callback when skill points are awarded */
  onLevelUp?: (data: LevelUpData) => void;
}

export interface LevelUpData {
  previousLevel: number;
  newLevel: number;
  pointsAwarded: number;
}

export interface UseSkillPointsReturn {
  /** Currently tracked level */
  trackedLevel: number;
  /** Available skill points to spend */
  availablePoints: number;
  /** Total skill points earned */
  totalPointsEarned: number;
}

// ==============================================
// HOOK
// ==============================================

export function useSkillPoints(options: UseSkillPointsOptions): UseSkillPointsReturn {
  const { currentLevel, onLevelUp } = options;

  // Store integration
  const addSkillPoints = useSkillTreeStore((state) => state.addSkillPoints);
  const availablePoints = useSkillTreeStore((state) => state.availablePoints);
  const totalPointsEarned = useSkillTreeStore((state) => state.totalPointsEarned);

  // Track previous level to detect increases
  const prevLevelRef = useRef(currentLevel);

  // Detect level increases and award points
  useEffect(() => {
    const previousLevel = prevLevelRef.current;

    if (currentLevel > previousLevel) {
      // Award 1 point per level gained
      const pointsAwarded = currentLevel - previousLevel;
      addSkillPoints(pointsAwarded);

      // Callback for UI celebrations
      onLevelUp?.({
        previousLevel,
        newLevel: currentLevel,
        pointsAwarded,
      });
    }

    // Always update ref to track current level
    prevLevelRef.current = currentLevel;
  }, [currentLevel, addSkillPoints, onLevelUp]);

  return {
    trackedLevel: currentLevel,
    availablePoints,
    totalPointsEarned,
  };
}
