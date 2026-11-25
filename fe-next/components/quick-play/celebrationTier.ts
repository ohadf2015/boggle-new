/**
 * Celebration escalation for quick-play results.
 * 0 none · 1 decent (>=50% of perfect) · 2 personal best · 3 beat rival · 4 top-10% today
 */
export interface CelebrationSignals {
  scorePct: number;
  isPersonalBest: boolean;
  beatRival: boolean;
  percentileToday: number;
}

/** A "decent" round: the bar the results screen celebrates and the analytics win line. */
export const DECENT_ROUND_PCT = 50;

export function celebrationTier(s: CelebrationSignals): 0 | 1 | 2 | 3 | 4 {
  if (s.percentileToday > 90) return 4;
  if (s.beatRival) return 3;
  if (s.isPersonalBest) return 2;
  if (s.scorePct >= DECENT_ROUND_PCT) return 1;
  return 0;
}
