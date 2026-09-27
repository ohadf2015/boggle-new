/**
 * Streak Tier Rewards
 *
 * Defines streak tiers and their associated coin bonus percentages.
 * Tiers give players a tangible reason to maintain streaks beyond the emoji.
 */

export interface StreakTierConfig {
  id: 'starting' | 'hot' | 'fire' | 'epic' | 'legendary' | 'mythic' | 'immortal';
  minDays: number;
  emoji: string;
  /** Percentage bonus applied to all coin earnings (0 = no bonus) */
  coinBonusPercent: number;
}

/**
 * Streak tiers in ascending order.
 * "starting" has 0% bonus — the reward is simply having a streak.
 * Real bonuses kick in at 3 days to reward commitment.
 */
export const STREAK_TIERS: readonly StreakTierConfig[] = [
  { id: 'starting', minDays: 1, emoji: '✨', coinBonusPercent: 0 },
  { id: 'hot', minDays: 3, emoji: '⚡', coinBonusPercent: 5 },
  { id: 'fire', minDays: 7, emoji: '🔥', coinBonusPercent: 10 },
  { id: 'epic', minDays: 14, emoji: '💎', coinBonusPercent: 15 },
  { id: 'legendary', minDays: 30, emoji: '👑', coinBonusPercent: 25 },
  { id: 'mythic', minDays: 60, emoji: '🌟', coinBonusPercent: 35 },
  { id: 'immortal', minDays: 100, emoji: '🏆', coinBonusPercent: 50 },
] as const;

/**
 * Get the current streak tier for a given streak length.
 * Returns null if streak is 0.
 */
export function getStreakTier(streak: number): StreakTierConfig | null {
  if (streak <= 0) return null;
  let result: StreakTierConfig = STREAK_TIERS[0];
  for (const tier of STREAK_TIERS) {
    if (streak >= tier.minDays) result = tier;
  }
  return result;
}

/**
 * Get the coin bonus percentage for a given streak length.
 * Returns 0 if no bonus applies.
 */
export function getStreakCoinBonusPercent(streak: number): number {
  const tier = getStreakTier(streak);
  return tier?.coinBonusPercent ?? 0;
}

/**
 * Get info about the next tier the player can reach.
 * Returns null if already at max tier.
 */
export function getNextTierInfo(
  streak: number
): { tier: StreakTierConfig; daysNeeded: number } | null {
  for (const tier of STREAK_TIERS) {
    if (streak < tier.minDays) {
      return { tier, daysNeeded: tier.minDays - streak };
    }
  }
  return null;
}
