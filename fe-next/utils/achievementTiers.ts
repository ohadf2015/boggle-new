/**
 * Achievement Tier System
 * Transforms flat achievement counts into tiered progression (Bronze → Silver → Gold → Platinum)
 */

// Tier thresholds - number of times achievement must be earned to reach tier
export const TIER_THRESHOLDS = {
  BRONZE: 1,
  SILVER: 15,
  GOLD: 75,
  PLATINUM: 300,
} as const;

export type TierName = keyof typeof TIER_THRESHOLDS;

export interface TierColors {
  bg: string;
  border: string;
  text: string;
  glow: string;
}

// Alias for backwards compatibility
export type TierColor = TierColors;

// Tier display colors (for neo-brutalist design)
export const TIER_COLORS: Record<TierName, TierColors> = {
  BRONZE: {
    bg: '#CD7F32',
    border: '#8B4513',
    text: '#FFFFFF',
    glow: 'rgba(205, 127, 50, 0.5)',
  },
  SILVER: {
    bg: '#C0C0C0',
    border: '#808080',
    text: '#000000',
    glow: 'rgba(192, 192, 192, 0.5)',
  },
  GOLD: {
    bg: '#FFD700',
    border: '#B8860B',
    text: '#000000',
    glow: 'rgba(255, 215, 0, 0.5)',
  },
  PLATINUM: {
    bg: '#E5E4E2',
    border: '#9370DB',
    text: '#4B0082',
    glow: 'rgba(147, 112, 219, 0.6)',
  },
};

// Tier icons for display
export const TIER_ICONS: Record<TierName, string> = {
  BRONZE: '🥉',
  SILVER: '🥈',
  GOLD: '🥇',
  PLATINUM: '💎',
};

export interface TierProgress {
  currentTier: TierName | null;
  nextTier: TierName | null;
  currentCount: number;
  nextThreshold: number | null;
  progress: number;
  isMaxTier: boolean;
}

export interface TierDisplay {
  name: TierName;
  colors: TierColors;
  icon: string;
}

export interface AchievementTierInfo extends TierProgress {
  count: number;
  display: TierDisplay | null;
}

/**
 * Calculate tier from achievement count
 * @param count - Number of times achievement has been earned
 * @returns Tier name ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM') or null if not earned
 */
export function calculateTier(count: number): TierName | null {
  if (!count || count < TIER_THRESHOLDS.BRONZE) return null;
  if (count >= TIER_THRESHOLDS.PLATINUM) return 'PLATINUM';
  if (count >= TIER_THRESHOLDS.GOLD) return 'GOLD';
  if (count >= TIER_THRESHOLDS.SILVER) return 'SILVER';
  return 'BRONZE';
}

/**
 * Get detailed tier progress information
 * @param count - Number of times achievement has been earned
 * @returns Tier progress details
 */
export function getTierProgress(count: number): TierProgress {
  const currentTier = calculateTier(count);
  const safeCount = count || 0;

  if (!currentTier) {
    return {
      currentTier: null,
      nextTier: 'BRONZE',
      currentCount: safeCount,
      nextThreshold: TIER_THRESHOLDS.BRONZE,
      progress: 0,
      isMaxTier: false,
    };
  }

  // Determine next tier and threshold
  let nextTier: TierName | null = null;
  let nextThreshold: number | null = null;
  const currentThreshold = TIER_THRESHOLDS[currentTier];

  switch (currentTier) {
    case 'BRONZE':
      nextTier = 'SILVER';
      nextThreshold = TIER_THRESHOLDS.SILVER;
      break;
    case 'SILVER':
      nextTier = 'GOLD';
      nextThreshold = TIER_THRESHOLDS.GOLD;
      break;
    case 'GOLD':
      nextTier = 'PLATINUM';
      nextThreshold = TIER_THRESHOLDS.PLATINUM;
      break;
    case 'PLATINUM':
      // Max tier reached
      return {
        currentTier,
        nextTier: null,
        currentCount: safeCount,
        nextThreshold: null,
        progress: 100,
        isMaxTier: true,
      };
  }

  // Calculate progress to next tier
  const progressInTier = safeCount - currentThreshold;
  const tierRange = nextThreshold - currentThreshold;
  const progress = Math.min(Math.round((progressInTier / tierRange) * 100), 99);

  return {
    currentTier,
    nextTier,
    currentCount: safeCount,
    nextThreshold,
    progress,
    isMaxTier: false,
  };
}

/**
 * Get tier display information (colors, icon, name)
 * @param tier - Tier name
 * @returns Display information for the tier
 */
export function getTierDisplay(tier: TierName | null): TierDisplay | null {
  if (!tier || !TIER_COLORS[tier]) {
    return null;
  }

  return {
    name: tier,
    colors: TIER_COLORS[tier],
    icon: TIER_ICONS[tier],
  };
}

/**
 * Get all achievements with their tier information
 * @param achievementCounts - Object mapping achievement keys to counts
 * @returns Object mapping achievement keys to tier info
 */
export function getAchievementTiers(
  achievementCounts: Record<string, number>
): Record<string, AchievementTierInfo> {
  if (!achievementCounts) return {};

  const result: Record<string, AchievementTierInfo> = {};

  for (const [key, count] of Object.entries(achievementCounts)) {
    result[key] = {
      count,
      ...getTierProgress(count),
      display: getTierDisplay(calculateTier(count)),
    };
  }

  return result;
}
