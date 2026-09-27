/**
 * WordCraft run mode — round-progress helpers (pure).
 *
 * Turns the bare "score / target" number into felt progress. Cosy framing: the
 * meter is ENCOURAGING, not alarming — it builds quietly, lifts to anticipation
 * near the target, and celebrates on reach. No "you're failing" red zone.
 */

/** Round score as a fraction of the target, clamped to [0, 1]. */
export function getProgressPercent(score: number, target: number): number {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(1, score / target));
}

export type RunMeterZone = 'building' | 'close' | 'reached';

/** Where the round sits: building → close (anticipation) → reached (celebrate). */
export function meterZone(score: number, target: number): RunMeterZone {
  const pct = getProgressPercent(score, target);
  if (pct >= 1) return 'reached';
  if (pct >= 0.85) return 'close';
  return 'building';
}

export type WordFeedbackTier = 'nice' | 'great' | 'huge';

/** Per-word praise tier by the word's total score — drives the commit pop + sound. */
export function wordFeedbackTier(wordTotal: number): WordFeedbackTier {
  if (wordTotal >= 30) return 'huge';
  if (wordTotal >= 15) return 'great';
  return 'nice';
}
