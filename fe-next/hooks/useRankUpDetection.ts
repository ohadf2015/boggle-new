/**
 * useRankUpDetection Hook
 *
 * Detects ELO tier changes after multiplayer games.
 * Pure logic extracted into detectRankChange for testability.
 */

import { useState, useEffect } from 'react';
import { getRankTier, type RankTier } from '@/shared/utils/eloRating';

// Tier thresholds in ascending order for next-tier lookup
const TIER_THRESHOLDS = [800, 1000, 1200, 1400, 1600, 1800, 2000];

export interface RankUpInfo {
  from: RankTier;
  to: RankTier;
}

export interface NearRankInfo {
  nextTier: RankTier;
  eloNeeded: number;
}

export interface RankChangeResult {
  rankUp: RankUpInfo | null;
  rankDown: RankUpInfo | null;
  nearRank: NearRankInfo | null;
}

/**
 * Pure function: detect rank changes between pre and post game ratings.
 */
export function detectRankChange(preRating: number, postRating: number): RankChangeResult {
  const preTier = getRankTier(preRating);
  const postTier = getRankTier(postRating);

  let rankUp: RankUpInfo | null = null;
  let rankDown: RankUpInfo | null = null;
  let nearRank: NearRankInfo | null = null;

  // Detect tier change
  if (postTier.minRating > preTier.minRating) {
    rankUp = { from: preTier, to: postTier };
  } else if (postTier.minRating < preTier.minRating) {
    rankDown = { from: preTier, to: postTier };
  }

  // Near rank detection (only when no rank up just happened)
  if (!rankUp) {
    // Find next tier threshold above current rating
    const nextThreshold = TIER_THRESHOLDS.find(t => t > postRating);
    if (nextThreshold !== undefined) {
      const eloNeeded = nextThreshold - postRating;
      if (eloNeeded <= 100) {
        nearRank = {
          nextTier: getRankTier(nextThreshold),
          eloNeeded,
        };
      }
    }
  }

  return { rankUp, rankDown, nearRank };
}

export interface UseRankUpDetectionReturn extends RankChangeResult {
  dismiss: () => void;
  dismissed: boolean;
}

/**
 * React hook wrapping detectRankChange with dismiss state.
 */
export function useRankUpDetection(
  preRating: number | null,
  postRating: number | null
): UseRankUpDetectionReturn {
  const [dismissed, setDismissed] = useState(false);
  const [result, setResult] = useState<RankChangeResult>({
    rankUp: null,
    rankDown: null,
    nearRank: null,
  });

  useEffect(() => {
    if (preRating !== null && postRating !== null) {
      setResult(detectRankChange(preRating, postRating));
      setDismissed(false);
    }
  }, [preRating, postRating]);

  return {
    ...result,
    dismissed,
    dismiss: () => setDismissed(true),
  };
}
