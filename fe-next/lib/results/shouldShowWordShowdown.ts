/**
 * Should the MP results hero mount the Word Showdown panel?
 *
 * Pure so stage + tests share one gate. Empty hero is worse than no hero —
 * skip when there are no unique chips AND no best-missed line to show.
 * Cap unique chips at 5 for the hero (Details keeps the full list).
 */
export const WORD_SHOWDOWN_UNIQUE_CAP = 5;

export function shouldShowWordShowdown({
  uniqueCount,
  hasBestMissed,
  hideOutcome = false,
}: {
  uniqueCount: number;
  hasBestMissed: boolean;
  /** Classroom pressure / hidden leaderboard — no public showdown chips. */
  hideOutcome?: boolean;
}): boolean {
  if (hideOutcome) return false;
  return uniqueCount > 0 || hasBestMissed;
}

/** First N unique words for the hero strip (longest-first already from selectUniqueWords). */
export function heroUniqueWords(uniques: readonly string[], cap: number = WORD_SHOWDOWN_UNIQUE_CAP): string[] {
  return uniques.slice(0, Math.max(0, cap));
}
