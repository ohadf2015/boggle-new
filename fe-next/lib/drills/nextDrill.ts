import type { DrillType } from '@/shared/types/cognitive';

/**
 * Canonical drill order — matches the brain hub's QuickDrillsSection / the
 * brain-training landing page. "Next up" rotates through this order.
 */
export const DRILL_ORDER: DrillType[] = [
  'lightning-round',
  'memory-hunt',
  'combo-master',
  'pattern-switcher',
  'rare-gems',
];

/**
 * Games-played thresholds that unlock each drill. Mirrors the values in
 * QuickDrillsSection.DRILLS and PersonalizedDrillRecommendation.DRILL_CONFIG.
 * (Consolidating those two into this single source is a noted follow-up.)
 */
export const DRILL_UNLOCK_GAMES: Record<DrillType, number> = {
  'lightning-round': 0,
  'memory-hunt': 0,
  'combo-master': 0,
  'pattern-switcher': 5,
  'rare-gems': 10,
};

/**
 * Pick the next *unlocked* drill to suggest after finishing `current`.
 *
 * Rotates forward through DRILL_ORDER (wrapping), skipping any drill the player
 * has not unlocked, and never returns `current`. Returns null only in the
 * degenerate case where no other drill is eligible (cannot happen in practice
 * since three drills are always unlocked).
 */
export function computeNextDrill(current: DrillType, gamesPlayed: number): DrillType | null {
  const played = Number.isFinite(gamesPlayed) && gamesPlayed > 0 ? gamesPlayed : 0;
  const startIndex = DRILL_ORDER.indexOf(current);
  if (startIndex === -1) return null;

  for (let step = 1; step <= DRILL_ORDER.length; step++) {
    const candidate = DRILL_ORDER[(startIndex + step) % DRILL_ORDER.length];
    if (candidate === current) continue;
    if (played >= DRILL_UNLOCK_GAMES[candidate]) return candidate;
  }
  return null;
}
