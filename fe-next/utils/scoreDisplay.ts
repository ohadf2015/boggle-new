/** Display multiplier for perceived value. Internal scores are unchanged. */
export const SCORE_DISPLAY_MULTIPLIER = 10;

export function displayScore(score: number): number {
  return score * SCORE_DISPLAY_MULTIPLIER;
}

export function formatScore(score: number): string {
  return (score * SCORE_DISPLAY_MULTIPLIER).toLocaleString();
}
