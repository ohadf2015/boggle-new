/**
 * Rank-aware Word Wheel signup encouragement (pure).
 *
 * A guest who finishes today's wheel is already on the leaderboard (their score
 * is persisted server-side by guest fingerprint). This selector turns their
 * *live* rank into the single most compelling honest signup hook — "you're #1
 * today" — which the `WordWheelSignupCta` surfaces in place of the generic
 * board-spot copy when it qualifies.
 *
 * Pure + deterministic so it is unit-testable and the resulting `tier` can be
 * logged as a PostHog property alongside the existing `offerType`. The A/B
 * experiment still decides whether the CTA renders at all; this only upgrades
 * the framing for guests who already qualify.
 *
 * Honesty gates (matching the mode's non-predatory, Families-safe ethos):
 *   • a rank only means something when there are others to beat — "#1 of 1"
 *     never claims leadership (totalPlayers >= 2 required).
 *   • only the top 10 earn a rank-specific hook; deeper ranks return null so
 *     the generic offer copy takes over.
 */

export type WheelRankTier = 'leader' | 'podium' | 'topTen';

export interface WheelRankEncouragement {
  tier: WheelRankTier;
  /** The guest's 1-based rank on today's leaderboard. */
  rank: number;
  /** Total players on today's board — used for "#N of M" framing. */
  totalPlayers: number;
}

/** Deepest rank that still earns a rank-specific hook. */
const TOP_TEN_CUTOFF = 10;

/**
 * Decide which (if any) rank-aware encouragement to surface for a guest based
 * on their live position on today's Word Wheel leaderboard. Returns null to
 * defer to the generic offer copy.
 */
export function selectWheelRankEncouragement(
  rank: number | null | undefined,
  totalPlayers: number,
): WheelRankEncouragement | null {
  if (rank == null || rank < 1) return null;
  // Honesty gate: a rank is only a brag when there's someone else to beat.
  if (totalPlayers < 2) return null;

  if (rank === 1) return { tier: 'leader', rank, totalPlayers };
  if (rank <= 3) return { tier: 'podium', rank, totalPlayers };
  if (rank <= TOP_TEN_CUTOFF) return { tier: 'topTen', rank, totalPlayers };

  return null;
}
