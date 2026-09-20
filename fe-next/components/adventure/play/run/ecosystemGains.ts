/**
 * The meta-game ledger for one cleared node — what /complete's ecosystem block
 * actually moved outside the run (see lib/adventure/play/ecosystem.ts).
 *
 * The bar is Slay the Spire's victory screen: one line per thing that moved,
 * with its number. Nothing is the COMMON case here, not an edge — coins only
 * pay on elite/boss (`COINS_FOR`), and `xpGained` is 0 whenever the daily cap
 * inside `increment_player_xp` is already spent. A row of zeros would be worse
 * than no strip at all, so this filters first and the strip renders nothing
 * when the list is empty.
 */
import type { RunResult } from '../runTypes';

export type GainKind = 'xp' | 'coins' | 'points' | 'streak';
export interface Gain {
  kind: GainKind;
  value: number;
}

/** Day one is not a streak — the chip starts at two consecutive days. */
export const STREAK_MIN = 2;

/** Only trust a positive, finite number from the wire. */
const pos = (n: unknown): number => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0);

type Source = Partial<Pick<RunResult, 'xpGained' | 'coinsGained' | 'leaderboardPoints' | 'streak' | 'levelUp' | 'achievementsUnlocked'>>;

/** Ordered ledger lines, zeros removed. Order is fixed: xp → coins → points → streak. */
export function ecosystemGains(r: Source): Gain[] {
  const streak = pos(r.streak?.current);
  const out: Gain[] = [
    { kind: 'xp', value: pos(r.xpGained) },
    { kind: 'coins', value: pos(r.coinsGained) },
    { kind: 'points', value: pos(r.leaderboardPoints) },
    { kind: 'streak', value: streak >= STREAK_MIN ? streak : 0 },
  ];
  return out.filter((g) => g.value > 0);
}

/**
 * Is there ANY meta-game beat to play? Wider than the ledger: a level-up and an
 * achievement unlock are their own celebrations (modal / toast) and can land on
 * a node whose numeric gains are all zero.
 */
export function hasEcosystemGains(r: Source): boolean {
  return ecosystemGains(r).length > 0 || !!r.levelUp || (r.achievementsUnlocked?.length ?? 0) > 0;
}
