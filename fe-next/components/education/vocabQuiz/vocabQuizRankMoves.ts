import type { VocabQuizStanding } from '@/shared/types/vocabQuiz';

const CLOSE_RACE_MIN_GAP = 50;
const CLOSE_RACE_SHARE = 0.1;

const nameKey = (name: string) => name.trim().toLowerCase();

/** Places climbed (positive) or lost (negative) since the previous reveal, keyed by the current username. */
export function rankMoves(prev: readonly VocabQuizStanding[] | null, next: readonly VocabQuizStanding[]): Record<string, number> {
  const before = new Map((prev ?? []).map((p, i) => [nameKey(p.username), i]));
  const moves: Record<string, number> = {};
  next.forEach((p, i) => {
    const was = before.get(nameKey(p.username));
    moves[p.username] = was === undefined ? 0 : was - i;
  });
  return moves;
}

/** The top two are within a question's worth of points: the wall should say so. */
export function closeRace(standings: readonly VocabQuizStanding[]): boolean {
  const [first, second] = standings;
  if (!first || !second || first.score <= 0) return false;
  return first.score - second.score <= Math.max(CLOSE_RACE_MIN_GAP, first.score * CLOSE_RACE_SHARE);
}
