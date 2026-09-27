/**
 * Score display utilities.
 *
 * With exponential base scores (5–500), the multiplier is 1 (identity).
 * These helpers are intentional no-ops — they exist as a single seam
 * so all 13+ call-sites can be rescaled in one place if needed.
 */
export const SCORE_DISPLAY_MULTIPLIER = 1;

export function displayScore(score: number): number {
  return score * SCORE_DISPLAY_MULTIPLIER;
}

export function formatScore(score: number): string {
  return (score * SCORE_DISPLAY_MULTIPLIER).toLocaleString();
}
