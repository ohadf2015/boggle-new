/**
 * Milestones Module
 *
 * Handles milestone detection, rewards, and progress calculation for education mode.
 * Milestones are special levels that award bonus XP and coins.
 */

import {
  getXpForLevel,
  getLevelFromXp,
  LEVEL_TITLES,
} from '@/backend/modules/xpManager';
import type { MilestoneLevel } from './types';

// ==============================================
// CONSTANTS
// ==============================================

/**
 * Major milestones trigger celebration overlay with larger rewards
 */
export const MAJOR_MILESTONES = [5, 10, 25, 50, 100] as const;

/**
 * Minor milestones give smaller rewards without overlay
 */
export const MINOR_MILESTONES = [3, 7, 15, 20, 30, 35, 40, 60, 75, 90] as const;

/**
 * All milestones combined and sorted
 */
export const ALL_MILESTONES = [...MAJOR_MILESTONES, ...MINOR_MILESTONES].sort((a, b) => a - b);

/**
 * Reward structure for major milestones
 */
export const MILESTONE_REWARDS = {
  5: { xp: 100, coins: 25 },
  10: { xp: 250, coins: 50 },
  25: { xp: 500, coins: 100 },
  50: { xp: 1000, coins: 250 },
  100: { xp: 5000, coins: 1000 },
} as const;

/**
 * Minor milestone rewards (flat across all minor milestones)
 */
const MINOR_REWARDS = { xp: 50, coins: 10 };

// ==============================================
// FUNCTIONS
// ==============================================

/**
 * Get all milestone levels with metadata
 */
export function getMilestones(): MilestoneLevel[] {
  return ALL_MILESTONES.map(level => ({
    level,
    title: LEVEL_TITLES[level] || null,
    isMajor: (MAJOR_MILESTONES as readonly number[]).includes(level),
  }));
}

/**
 * Check if a milestone was crossed when leveling up
 * @param oldLevel - Previous level
 * @param newLevel - New level after XP gain
 * @returns Milestone info if crossed, null otherwise (returns highest if multiple)
 */
export function checkMilestoneCrossed(
  oldLevel: number,
  newLevel: number
): MilestoneLevel | null {
  if (newLevel <= oldLevel) {
    return null;
  }

  // Find all milestones crossed in this level range
  const crossedMilestones = ALL_MILESTONES.filter(
    milestone => milestone > oldLevel && milestone <= newLevel
  );

  if (crossedMilestones.length === 0) {
    return null;
  }

  // Return highest milestone crossed
  const highestMilestone = crossedMilestones[crossedMilestones.length - 1];

  return {
    level: highestMilestone,
    title: LEVEL_TITLES[highestMilestone] || null,
    isMajor: (MAJOR_MILESTONES as readonly number[]).includes(highestMilestone),
  };
}

/**
 * Get reward structure for a milestone level
 */
export function getMilestoneRewards(milestoneLevel: number): {
  xpBonus: number;
  coinBonus: number;
  title: string | null;
} {
  // Check if major milestone
  if ((MAJOR_MILESTONES as readonly number[]).includes(milestoneLevel)) {
    const rewards = MILESTONE_REWARDS[milestoneLevel as keyof typeof MILESTONE_REWARDS];
    return {
      xpBonus: rewards?.xp || 0,
      coinBonus: rewards?.coins || 0,
      title: LEVEL_TITLES[milestoneLevel] || null,
    };
  }

  // Check if minor milestone
  if ((MINOR_MILESTONES as readonly number[]).includes(milestoneLevel)) {
    return {
      xpBonus: MINOR_REWARDS.xp,
      coinBonus: MINOR_REWARDS.coins,
      title: null,
    };
  }

  // Not a milestone
  return {
    xpBonus: 0,
    coinBonus: 0,
    title: null,
  };
}

/**
 * Get next milestone for a given level
 */
export function getNextMilestoneForLevel(currentLevel: number): {
  level: number;
  isMajor: boolean;
  xpNeeded: number;
  title: string | null;
} | null {
  const nextMilestone = ALL_MILESTONES.find(m => m > currentLevel);

  if (!nextMilestone) {
    return null;
  }

  const currentXp = getXpForLevel(currentLevel);
  const nextMilestoneXp = getXpForLevel(nextMilestone);

  return {
    level: nextMilestone,
    isMajor: MAJOR_MILESTONES.includes(nextMilestone as any),
    xpNeeded: nextMilestoneXp - currentXp,
    title: LEVEL_TITLES[nextMilestone] || null,
  };
}

/**
 * Get milestone progress from total XP
 */
export function getMilestoneProgress(totalXp: number): {
  currentLevel: number;
  nextMilestone: {
    level: number;
    isMajor: boolean;
    title: string | null;
  } | null;
  progressPercent: number;
  xpToNextMilestone: number;
} {
  const currentLevel = getLevelFromXp(totalXp);
  const nextMilestoneInfo = getNextMilestoneForLevel(currentLevel);

  if (!nextMilestoneInfo) {
    // At max milestone
    return {
      currentLevel,
      nextMilestone: null,
      progressPercent: 100,
      xpToNextMilestone: 0,
    };
  }

  const nextMilestoneXp = getXpForLevel(nextMilestoneInfo.level);
  const xpToNextMilestone = nextMilestoneXp - totalXp;
  const currentLevelXp = getXpForLevel(currentLevel);
  const xpRange = nextMilestoneXp - currentLevelXp;
  const xpProgress = totalXp - currentLevelXp;

  const progressPercent = Math.min(
    Math.round((xpProgress / xpRange) * 100),
    99
  );

  return {
    currentLevel,
    nextMilestone: {
      level: nextMilestoneInfo.level,
      isMajor: nextMilestoneInfo.isMajor,
      title: nextMilestoneInfo.title,
    },
    progressPercent,
    xpToNextMilestone: Math.max(0, xpToNextMilestone),
  };
}
