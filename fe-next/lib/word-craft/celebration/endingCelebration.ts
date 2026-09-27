export interface EndingCelebrationInput {
  playerScore: number;
  botScore: number;
  /** Hot-seat (two humans) — someone always "won", so celebrate the finish. */
  hotseat: boolean;
  /** In-app calm toggle. */
  cosyMode: boolean;
  /** OS prefers-reduced-motion. */
  reducedMotion: boolean;
}

/**
 * Whether to fire the big game-over confetti burst. We celebrate a player WIN
 * (or any hot-seat finish), and never a loss/tie — confetti on a loss reads as
 * mocking. Suppressed entirely under cosy mode or reduced-motion (a11y).
 */
export function shouldCelebrateEnding({
  playerScore,
  botScore,
  hotseat,
  cosyMode,
  reducedMotion,
}: EndingCelebrationInput): boolean {
  if (cosyMode || reducedMotion) return false;
  if (hotseat) return true;
  return playerScore > botScore;
}
