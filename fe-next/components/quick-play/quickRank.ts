/**
 * Quick Rank — persistent progression for Quick Play.
 * Every round's score_pct becomes permanent rank points (server keeps them as
 * quick_play_results rows; total = SUM(score_pct)). Early tiers land within a
 * session (~6 decent rounds to Bronze) so new players feel motion immediately;
 * later tiers stretch out.
 */
export interface QuickRankDef {
  key: 'rookie' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'legend';
  /** Points threshold where this rank starts */
  at: number;
  /** Neo color token for the chip/bar */
  color: string;
}

export const QUICK_RANKS: QuickRankDef[] = [
  { key: 'rookie', at: 0, color: 'text-neo-cream' },
  { key: 'bronze', at: 300, color: 'text-neo-cozy' },
  { key: 'silver', at: 800, color: 'text-neo-cyan' },
  { key: 'gold', at: 1600, color: 'text-neo-yellow' },
  { key: 'platinum', at: 3000, color: 'text-neo-lime' },
  { key: 'diamond', at: 5000, color: 'text-neo-purple' },
  { key: 'legend', at: 8000, color: 'text-neo-pink' },
];

export interface QuickRankState {
  key: QuickRankDef['key'];
  color: string;
  /** Points where the current rank started */
  at: number;
  /** Points needed for the next rank; null at the top */
  nextAt: number | null;
  /** 0..1 progress within the current rank band */
  progress: number;
}

export function quickRank(totalPoints: number): QuickRankState {
  const points = Math.max(0, totalPoints);
  let current = QUICK_RANKS[0];
  for (const rank of QUICK_RANKS) {
    if (points >= rank.at) current = rank;
  }
  const idx = QUICK_RANKS.indexOf(current);
  const next = QUICK_RANKS[idx + 1] ?? null;
  return {
    key: current.key,
    color: current.color,
    at: current.at,
    nextAt: next ? next.at : null,
    progress: next ? Math.min(1, (points - current.at) / (next.at - current.at)) : 1,
  };
}
