/**
 * One honest "almost" line for the Quick Play results screen, from real numbers
 * only: the player's own best on this mode, else the round's par words.
 * Returns null when there is nothing true and close to say.
 */
export type NearMiss =
  /** Points needed to BEAT the best (gap + 1). */
  | { kind: 'pointsToBeatBest'; points: number }
  | { kind: 'newBestBy'; points: number }
  | { kind: 'wordsToPar'; words: number };

/** Beyond this share of the best, "N points from your best" stops feeling close. */
const MAX_GAP_SHARE = 0.6;

export function nearMissFor(input: {
  score: number;
  /** Best raw score on this mode BEFORE this round (0 = none). */
  prevBest: number;
  wordsFound: number;
  /** Words in the round's par (the target players see). */
  parWords: number;
}): NearMiss | null {
  const score = Math.max(0, Math.round(input.score));
  const prevBest = Math.max(0, Math.round(input.prevBest));
  if (prevBest > 0) {
    if (score > prevBest) return { kind: 'newBestBy', points: score - prevBest };
    const gap = prevBest - score;
    if (gap <= prevBest * MAX_GAP_SHARE) return { kind: 'pointsToBeatBest', points: gap + 1 };
    return null;
  }
  const short = input.parWords - input.wordsFound;
  if (input.wordsFound > 0 && short > 0 && short <= Math.max(3, Math.ceil(input.parWords * 0.5))) {
    return { kind: 'wordsToPar', words: short };
  }
  return null;
}
