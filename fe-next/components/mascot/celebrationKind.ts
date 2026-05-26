import type { MascotCelebrationKind } from './MascotCelebrationVideo';

export interface PickCelebrationInput {
  /** 1-based rank. 1 = winner. Undefined = unknown. */
  rank?: number;
  /** Total players in the match. Needed to know if rank=last. */
  totalPlayers?: number;
  /** Did the viewer commit a bingo / pangram / "wow" word this match? */
  hadBingo?: boolean;
  /** Daily-only signals (only one should be true) */
  daily?: {
    perfectScore?: boolean;
    streakMilestone?: boolean;
    allDailiesDone?: boolean;
    firstVisitToday?: boolean;
  };
}

/**
 * Choose which mascot video to show given the player's game outcome.
 *
 * Priority order (highest wins):
 *   1. Bingo / pangram → 'bingo' (regardless of placement — earned it)
 *   2. Daily perfect score → 'bingo'
 *   3. Daily streak milestone → 'streak'
 *   4. Daily all-completed → 'mission-complete'
 *   5. Daily first-visit-today → 'explorer'
 *   6. MP rank=1 → 'champion'
 *   7. MP rank in [2,3] → 'runner-up'
 *   8. MP last place (rank == totalPlayers, totalPlayers>=2) → 'defeat'
 *   9. Fallback → 'knight'
 *
 * Returns `null` when there's nothing celebratory to show (e.g. middle-of-pack
 * without bingo, or no signals at all).
 */
export function pickCelebrationKind(input: PickCelebrationInput): MascotCelebrationKind | null {
  const { rank, totalPlayers, hadBingo, daily } = input;

  if (hadBingo) return 'bingo';
  if (daily?.perfectScore) return 'bingo';
  if (daily?.streakMilestone) return 'streak';
  if (daily?.allDailiesDone) return 'mission-complete';
  if (daily?.firstVisitToday) return 'explorer';

  if (typeof rank === 'number') {
    if (rank === 1) return 'champion';
    // Defeat (last-place) overrides runner-up — in a 2- or 3-player match,
    // finishing at the bottom is "GG" not "podium finish".
    if (typeof totalPlayers === 'number' && totalPlayers >= 2 && rank === totalPlayers) {
      return 'defeat';
    }
    if (rank === 2 || rank === 3) return 'runner-up';
  }
  return null;
}

const TITLE_KEY_BY_KIND: Record<MascotCelebrationKind, string> = {
  champion: 'mascotCelebration.titleChampion',
  'runner-up': 'mascotCelebration.titleRunnerUp',
  defeat: 'mascotCelebration.titleDefeat',
  bingo: 'mascotCelebration.titleBingo',
  knight: 'mascotCelebration.titleKnight',
  streak: 'mascotCelebration.titleStreak',
  explorer: 'mascotCelebration.titleExplorer',
  'mission-complete': 'mascotCelebration.titleMissionComplete',
};

const TITLE_FALLBACK_BY_KIND: Record<MascotCelebrationKind, string> = {
  champion: 'CHAMPION!',
  'runner-up': 'PODIUM!',
  defeat: 'GG',
  bingo: 'BINGO!',
  knight: 'VICTORY!',
  streak: 'ON FIRE!',
  explorer: 'NICE FIND!',
  'mission-complete': 'ALL CLEAR!',
};

/**
 * Resolve the localized hero title for a given celebration kind via the
 * caller's `t()` function (each surface owns its own LanguageContext binding).
 */
export function celebrationTitleFor(
  kind: MascotCelebrationKind,
  t: (path: string, fallback?: string) => string,
): string {
  return t(TITLE_KEY_BY_KIND[kind], TITLE_FALLBACK_BY_KIND[kind]);
}
