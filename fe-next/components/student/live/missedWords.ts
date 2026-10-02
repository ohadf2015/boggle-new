import type { ClassroomSummary } from '@/shared/types/classroom';

export const MISSED_WORDS_LIMIT = 5;

/** The lesson words this student did not find, board-placed ones first, capped for one glance. */
export function myMissedWords(
  summary: Pick<ClassroomSummary, 'coverage' | 'neverPlacedWords'> | null | undefined,
  username: string,
  limit = MISSED_WORDS_LIMIT,
): string[] {
  if (!summary?.coverage?.length) return [];
  const neverPlaced = new Set((summary.neverPlacedWords ?? []).map((w) => w.toLowerCase()));
  const missed = summary.coverage.filter((c) => !c.foundBy.includes(username)).map((c) => c.word);
  const seen = missed.filter((w) => !neverPlaced.has(w.toLowerCase()));
  const unseen = missed.filter((w) => neverPlaced.has(w.toLowerCase()));
  return [...seen, ...unseen].slice(0, limit);
}
