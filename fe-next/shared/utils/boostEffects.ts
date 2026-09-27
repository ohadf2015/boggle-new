export const FIRST_WORD_MULT = 2;
export const SCORE_MULT = 1.5;
export const SCORE_MULT_WINDOW_SEC = 30;

export interface ScoredWord {
  score: number;
  ts: number;
}

export function applyFirstWordBonus<T extends ScoredWord>(words: T[]): T[] {
  if (words.length === 0) return words;
  return words.map((w, i) =>
    i === 0 ? { ...w, score: Math.round(w.score * FIRST_WORD_MULT) } : w
  );
}

export function applyScoreMultiplier<T extends ScoredWord>(
  words: T[],
  gameStartTs: number
): T[] {
  const cutoff = gameStartTs + SCORE_MULT_WINDOW_SEC * 1000;
  return words.map((w) =>
    w.ts < cutoff ? { ...w, score: Math.round(w.score * SCORE_MULT) } : w
  );
}
