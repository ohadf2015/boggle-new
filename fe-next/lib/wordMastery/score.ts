/**
 * Per-player-word mastery scoring.
 *
 * Solved without hints and fast → mastered.
 * Used hints or failed → learning.
 */

export const FAST_SOLVE_MS = 8_000;
export const MASTERED_MIN_SCORE = 70;

export type WordAttemptOutcome = 'solved' | 'failed';

export interface WordAttempt {
  outcome: WordAttemptOutcome;
  usedHint: boolean;
  durationMs: number | null;
}

export type WordMasteryStatus = 'mastered' | 'learning' | 'unseen';

export interface WordMasteryScore {
  score: number;
  status: WordMasteryStatus;
}

export interface WeakWordRow {
  word: string;
  status: Exclude<WordMasteryStatus, 'unseen'>;
  score: number;
}

export interface MasteryListRow {
  word: string;
  status: Exclude<WordMasteryStatus, 'unseen'>;
  score: number;
  language: string;
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function classifyWordMastery(attempts: readonly WordAttempt[]): WordMasteryStatus {
  if (attempts.length === 0) return 'unseen';

  const anyFail = attempts.some((a) => a.outcome === 'failed');
  const anyHint = attempts.some((a) => a.usedHint);
  const anyFastUnhintedSolve = attempts.some(
    (a) =>
      a.outcome === 'solved' &&
      !a.usedHint &&
      a.durationMs != null &&
      a.durationMs <= FAST_SOLVE_MS,
  );

  if (anyFastUnhintedSolve && !anyFail && !anyHint) return 'mastered';
  return 'learning';
}

export function scoreWordMastery(attempts: readonly WordAttempt[]): WordMasteryScore {
  if (attempts.length === 0) {
    return { score: 0, status: 'unseen' };
  }

  let score = 50;
  let fastUnhinted = 0;

  for (const attempt of attempts) {
    if (attempt.outcome === 'failed') {
      score -= 20;
      continue;
    }
    if (attempt.usedHint) {
      score -= 15;
      continue;
    }
    const isFast = attempt.durationMs != null && attempt.durationMs <= FAST_SOLVE_MS;
    if (isFast) {
      score += 20;
      fastUnhinted += 1;
    } else {
      score += 10;
    }
  }

  // Extra credit for repeating a fast unhinted solve, capped so a grind
  // cannot hide a later fail/hint in the status classifier.
  if (fastUnhinted > 1) score += 10;

  const clamped = clampScore(score);
  const status = classifyWordMastery(attempts);
  return { score: clamped, status };
}

export function buildMasteryLists(rows: readonly MasteryListRow[]): {
  mastered: MasteryListRow[];
  learning: MasteryListRow[];
} {
  const mastered = rows
    .filter((row) => row.status === 'mastered')
    .slice()
    .sort((a, b) => b.score - a.score || a.word.localeCompare(b.word));
  const learning = rows
    .filter((row) => row.status === 'learning')
    .slice()
    .sort((a, b) => a.score - b.score || a.word.localeCompare(b.word));
  return { mastered, learning };
}

export function pickWeakestWords(rows: readonly WeakWordRow[], limit: number): string[] {
  if (limit <= 0) return [];
  return rows
    .filter((row) => row.status === 'learning')
    .slice()
    .sort((a, b) => a.score - b.score || a.word.localeCompare(b.word))
    .slice(0, limit)
    .map((row) => row.word);
}
