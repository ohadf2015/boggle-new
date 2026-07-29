import { fireRankConfetti, fireFireworks, fireVictoryConfetti } from './confettiUtils';

/**
 * Fire the player's equipped victory effect at a moment the game already celebrates.
 *
 * When a premium effect is equipped it overrides the native celebration. When
 * nothing premium is equipped, the call site's own `fallback` runs — this keeps
 * the ~90% of players who never opened the collection on their existing (richer)
 * celebration instead of silently downgrading them to generic light confetti.
 *
 * @param rank      finishing rank (drives default confetti spread)
 * @param effectId  equipped victoryEffect cosmetic id, or null
 * @param fallback  the call site's native celebration; may return a cancel handle
 * @returns a cancel handle when the chosen effect provides one, else void
 */
export function fireEquippedVictoryEffect(
  rank: number,
  effectId: string | null,
  fallback?: () => (() => void) | void,
): (() => void) | void {
  if (effectId === 'victory-fireworks') {
    return fireFireworks(3, 2000);
  }
  if (effectId === 'victory-lightning') {
    fireVictoryConfetti();
    return;
  }
  // No premium effect equipped → preserve the call site's native celebration.
  if (fallback) {
    return fallback();
  }
  fireRankConfetti(rank, 'light');
}
