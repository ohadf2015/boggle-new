import type { CompletionReason } from './engine/completion';

/**
 * How big the win celebration should be. The reward screen must SCALE to the
 * outcome — a 1-star scrape and a 3-star perfect run looking identical is the
 * fastest way to make a clear feel cheap, and a confetti storm on a partial
 * (soft-lock rescue) over-sells it. Three tiers:
 *   - soft     — partial finish: a small flourish, no finale.
 *   - standard — a clean 1-2 star win: a solid burst.
 *   - epic     — a flawless 3-star run: the full show (per-star bursts + finale).
 */
export type CelebrationTier = 'soft' | 'standard' | 'epic';

export interface CelebrationSpec {
  tier: CelebrationTier;
  /** Number of confetti pieces — monotonic with celebration weight. */
  confettiCount: number;
  /** Fire a small radial burst as each star lands (epic only). */
  perStarBurst: boolean;
  /** Play a culminating pulse/flash after the beats settle (epic only). */
  finale: boolean;
}

export interface CelebrationInput {
  completionReason: CompletionReason;
  stars?: number;
}

export function resultCelebration({ completionReason, stars = 1 }: CelebrationInput): CelebrationSpec {
  if (completionReason === 'partial') {
    return { tier: 'soft', confettiCount: 10, perStarBurst: false, finale: false };
  }
  if (stars >= 3) {
    return { tier: 'epic', confettiCount: 48, perStarBurst: true, finale: true };
  }
  return { tier: 'standard', confettiCount: 26, perStarBurst: false, finale: false };
}
