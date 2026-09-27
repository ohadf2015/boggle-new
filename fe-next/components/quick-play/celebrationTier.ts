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

export function celebrationTier(s: CelebrationSignals): 0 | 1 | 2 | 3 | 4 {
  if (s.percentileToday > 90) return 4;
  if (s.beatRival) return 3;
  if (s.isPersonalBest) return 2;
  if (s.scorePct >= 50) return 1;
  return 0;
}
