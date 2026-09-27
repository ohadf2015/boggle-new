/**
 * Word Tower — clue gate.
 *
 * Clues were unlimited (ad-gated after a free daily one, but no cap on how
 * many ad-watches could refill it). Capped at CLUE_RUN_CAP per run — every
 * clue, including the first, costs a rewarded ad watch.
 */

/** Max clues a player can reveal in a single run. */
export const CLUE_RUN_CAP = 3;

/** Can the player request another clue this run? */
export function canRequestClue(cluesUsedThisRun: number): boolean {
  return cluesUsedThisRun < CLUE_RUN_CAP;
}
