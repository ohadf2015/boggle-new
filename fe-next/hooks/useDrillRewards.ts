'use client';

/**
 * useDrillRewards
 *
 * Awards XP and gold after drill completion.
 * - XP: calculated server-side and returned from /api/drills/submit
 * - Gold: calculated here and added to local/remote balance via CoinContext
 *
 * Gold formula: base = level * 5, bonus = floor(score / 20), capped at 100
 */

import { useCallback } from 'react';
import { useCoinContext } from '@/contexts/CoinContext';

// ─── Pure calculation ─────────────────────────────────────────────────────────

/**
 * Calculate gold earned from a drill session.
 * Pure function so it can be unit tested without React.
 */
export function calculateDrillGold(level: number, score: number): number {
  const base = level * 5;
  const scoreBonus = Math.floor(score / 20);
  return Math.min(100, Math.max(0, base + scoreBonus));
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DrillRewardInput {
  level: number;
  score: number;
  /** XP already awarded by the server (from /api/drills/submit response) */
  xpAwarded: number;
}

export interface DrillRewardResult {
  goldAwarded: number;
  xpAwarded: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDrillRewards() {
  const { addCoins } = useCoinContext();

  /**
   * Award gold for a drill session and pass through server-awarded XP.
   * Call this after a successful /api/drills/submit response.
   */
  const awardDrillRewards = useCallback(
    async ({ level, score, xpAwarded }: DrillRewardInput): Promise<DrillRewardResult> => {
      const goldAwarded = calculateDrillGold(level, score);

      try {
        await addCoins(goldAwarded, 'Brain Drill', { level, score });
        return { goldAwarded, xpAwarded };
      } catch {
        // Non-fatal: gold award failed but XP was already granted server-side
        console.error('[useDrillRewards] Failed to award gold');
        return { goldAwarded: 0, xpAwarded };
      }
    },
    [addCoins]
  );

  return { awardDrillRewards };
}
