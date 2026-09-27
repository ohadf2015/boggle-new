/**
 * Progress snapshot for the solo results screen.
 *
 * New players are dropped straight into single player; every game has to
 * FEEL like progress or they leave. This distils "how am I doing" into a
 * handful of numbers the ProgressPulseCard renders: which game this is, how
 * it compared with the last one, the personal best, a short score history
 * for a sparkline, how much of the board was found, and one concrete next
 * goal. Pure — the hook decides where the inputs come from.
 */

export type NextGoal =
  | { kind: 'first' }
  | { kind: 'newBest'; target: number }
  | { kind: 'beatBest'; gap: number };

export interface ProgressSnapshot {
  /** 1-based, lifetime solo games on this device (this one included). */
  gameNumber: number;
  score: number;
  lastScore: number | null;
  /** score - lastScore, null on the first game. */
  delta: number | null;
  best: number;
  isNewBest: boolean;
  /** Up to the last 5 prior scores plus the current one, oldest → newest. */
  recentScores: number[];
  wordsFound: number;
  wordsPossible: number | null;
  /** Percent of the board's words found, null when the board size is unknown. */
  coverage: number | null;
  nextGoal: NextGoal;
}

export interface ProgressSnapshotInput {
  score: number;
  isNewHighScore: boolean;
  previousHighScore: number | null;
  /** Prior solo scores, newest first (the current game excluded). */
  priorScores: number[];
  /** Lifetime solo games recorded (may already include the current game). */
  totalGames: number;
  wordsFound: number;
  wordsPossible: number | null;
}

const SPARKLINE_PRIOR = 5;

export function buildProgressSnapshot(input: ProgressSnapshotInput): ProgressSnapshot {
  const { score, isNewHighScore, previousHighScore, priorScores, wordsFound, wordsPossible } = input;
  const gameNumber = Math.max(input.totalGames, priorScores.length + 1);
  const lastScore = priorScores.length > 0 ? priorScores[0] : null;
  const delta = lastScore == null ? null : score - lastScore;
  const priorBest = Math.max(previousHighScore ?? 0, ...priorScores, 0);
  const isNewBest = isNewHighScore || (priorScores.length > 0 && score > priorBest);
  const best = isNewBest ? score : Math.max(priorBest, score);
  const recentScores = [...priorScores.slice(0, SPARKLINE_PRIOR).reverse(), score];
  const coverage =
    wordsPossible && wordsPossible > 0 ? Math.round((wordsFound / wordsPossible) * 100) : null;

  let nextGoal: NextGoal;
  if (priorScores.length === 0 && previousHighScore == null) {
    nextGoal = { kind: 'first' };
  } else if (isNewBest) {
    nextGoal = { kind: 'newBest', target: score };
  } else {
    nextGoal = { kind: 'beatBest', gap: Math.max(1, best - score) };
  }

  return {
    gameNumber, score, lastScore, delta, best, isNewBest, recentScores,
    wordsFound, wordsPossible, coverage, nextGoal,
  };
}
