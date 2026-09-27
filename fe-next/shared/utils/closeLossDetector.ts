/**
 * Close Loss Detector
 *
 * Determines if a multiplayer loss was close enough to trigger
 * a rematch/revenge nudge, enhancing player engagement.
 */

/**
 * Check if the player lost by a narrow margin.
 *
 * @param playerScore - The player's final score
 * @param opponentScore - The opponent's final score
 * @param threshold - Maximum percentage difference to qualify (default: 0.15 = 15%)
 * @returns true if the player lost and the margin is within threshold
 */
export function isCloseLoss(
  playerScore: number,
  opponentScore: number,
  threshold = 0.15
): boolean {
  if (opponentScore <= 0) return false;
  if (playerScore >= opponentScore) return false;

  const diff = (opponentScore - playerScore) / opponentScore;
  return diff <= threshold;
}

/**
 * Get a motivational message for a close loss.
 *
 * @param scoreDiff - Absolute point difference
 * @param t - Translation function
 * @returns Formatted close-loss message
 */
export function getCloseLossMessage(
  scoreDiff: number,
  t: (key: string) => string
): string {
  const template = t('closeLoss.justPoints') || 'Just {points} points away!';
  return template.replace('{points}', String(scoreDiff));
}
