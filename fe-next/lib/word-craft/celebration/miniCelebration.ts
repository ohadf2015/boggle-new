import type { CommitTier } from './commitTier';

export interface MiniCelebrationInput {
  /** Tier of the word just committed (from resolveCommitTier). */
  tier: CommitTier;
  /** Player's current word streak AFTER this commit. */
  streak: number;
  /** Rival squares captured (stolen) on this turn. */
  cellsStolen: number;
}

/**
 * Decides whether an ORDINARY (non-bingo) turn earns an extra confetti pop.
 *
 * Before this, only a bingo lit up the full-screen WordCraftCelebration, so
 * every other turn felt flat. A Conquest game's real thrills are big words,
 * stealing rival turf, and going on a roll — so we surface a lighter 'great'
 * burst for those moments. Bingo is deliberately excluded: it already fires its
 * own dedicated 80-particle burst, and we don't want to double-stack.
 *
 * Pure + exported so the cadence is unit-testable without a WebGL context.
 */
export function pickMiniCelebration(input: MiniCelebrationInput): 'great' | null {
  const { tier, streak, cellsStolen } = input;
  if (tier === 'bingo') return null;
  if (tier === 'great' || tier === 'huge') return 'great';
  if (cellsStolen >= 2) return 'great';
  // Streak milestones: every other word once you hit a 3+ roll (3, 5, 7…).
  if (streak >= 3 && streak % 2 === 1) return 'great';
  return null;
}
