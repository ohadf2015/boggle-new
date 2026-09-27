/**
 * Word Tower — tangible coin rewards (pure, renderer-agnostic).
 *
 * The climb already pays out in HEIGHT (the score) and in the seeded "surprise"
 * layer (bonus meters/scrambles). What it never did was give the player a real,
 * keepable thing. This module turns milestone moments — entering a new height
 * zone, unlocking an achievement, setting a fresh personal-best bracket, or
 * hitting a surprise — into actual coins the wallet keeps (granted via
 * `utils/coinManager.addCoins`).
 *
 * Design discipline (non-predatory, per the casual-word-game brief):
 *   - EVERY roll grants real coins. There is no "you got nothing" outcome — the
 *     variable-reward layer only changes HOW MUCH, never WHETHER. A cold streak
 *     can't leave a player empty-handed.
 *   - PITY: after {@link REWARD_PITY_THRESHOLD} common rolls in a row, the next
 *     roll is floored to at least uncommon. Droughts self-heal.
 *   - DETERMINISTIC: rolls come from a seeded hash of (run + source + id), so a
 *     reload re-derives the same tier — and the dedupe key (mirroring
 *     coinManager's daily-award breadcrumb) guarantees a milestone pays ONCE.
 *
 * Pure so the drop-table, pity, and dedupe-key logic are unit-testable without a
 * DOM or a wallet.
 */

import { fnv1aHash } from '@/lib/rng/seededRandom';

export type RewardTier = 'common' | 'uncommon' | 'rare' | 'epic';

/** What earned the reward — scales the base coin payout and tags the wallet txn. */
export type RewardSource = 'zone' | 'achievement' | 'pbMilestone' | 'surprise';

export interface TowerRewardContext {
  source: RewardSource;
  /** Event magnitude (zone index, PB-bucket index, …) — scales base coins so
   *  deeper milestones pay proportionally more. */
  magnitude: number;
  /** Consecutive common rolls before this one — drives the pity floor. */
  dryStreak: number;
}

export interface TowerReward {
  coins: number;
  tier: RewardTier;
}

/** Common rolls in a row that force the next roll up to at least uncommon. */
export const REWARD_PITY_THRESHOLD = 8;

// Tier cut-points on a [0,1) roll. Low roll = better tier (rarer = luckier).
const EPIC_MAX = 0.04;
const RARE_MAX = 0.12;
const UNCOMMON_MAX = 0.32;

function tierFromRoll(roll01: number): RewardTier {
  if (roll01 < EPIC_MAX) return 'epic';
  if (roll01 < RARE_MAX) return 'rare';
  if (roll01 < UNCOMMON_MAX) return 'uncommon';
  return 'common';
}

const TIER_MULT: Record<RewardTier, number> = {
  common: 1,
  uncommon: 1.6,
  rare: 2.6,
  epic: 4.2,
};

// Base coins per source BEFORE the tier multiplier. Zones are the headline
// milestone (rarer, bigger); a PB bracket or a surprise is a frequent small top-up.
function baseCoins(source: RewardSource, magnitude: number): number {
  switch (source) {
    case 'zone':
      return 30 + Math.max(0, magnitude) * 15;
    case 'achievement':
      return 20;
    case 'pbMilestone':
      return 8;
    case 'surprise':
      return 6;
  }
}

/**
 * Roll a coin reward. `roll01` is a deterministic [0,1) value (see
 * {@link rewardRoll01}). Pity floors a would-be common up to uncommon once the
 * dry streak is long enough — but never DOWNGRADES a naturally high tier.
 */
export function rollTowerReward(roll01: number, ctx: TowerRewardContext): TowerReward {
  let tier = tierFromRoll(roll01);
  if (ctx.dryStreak >= REWARD_PITY_THRESHOLD && tier === 'common') {
    tier = 'uncommon';
  }
  const coins = Math.round(baseCoins(ctx.source, ctx.magnitude) * TIER_MULT[tier]);
  return { coins: Math.max(1, coins), tier };
}

/** Advance the pity counter: a common extends the streak, anything better resets it. */
export function nextDryStreak(prev: number, tier: RewardTier): number {
  return tier === 'common' ? prev + 1 : 0;
}

/** Deterministic [0,1) roll from a seed string (FNV-1a → unit float). Same seed
 *  → same roll, so a reload re-derives the identical tier for a milestone. */
export function rewardRoll01(seed: string): number {
  return (fnv1aHash(`word-tower-reward-${seed}`) >>> 0) / 0x100000000;
}

/** localStorage breadcrumb key so a milestone grants coins exactly once. Mirrors
 *  coinManager's `lexiclash_daily_coin_award_*` daily-award pattern. */
export function rewardDedupeKey(playerId: string, source: RewardSource, id: string): string {
  return `lexiclash_wt_reward_${playerId}_${source}_${id}`;
}

/** Emoji + i18n suffix per tier for the reveal chip. Co-located so adding a tier
 *  forces its display metadata in the same edit. */
export const REWARD_TIER_META: Record<RewardTier, { emoji: string; key: string }> = {
  common: { emoji: '🪙', key: 'common' },
  uncommon: { emoji: '✨', key: 'uncommon' },
  rare: { emoji: '💎', key: 'rare' },
  epic: { emoji: '🌟', key: 'epic' },
};
