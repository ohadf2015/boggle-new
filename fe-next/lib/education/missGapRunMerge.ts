/**
 * One row per student per assignment — and it only ever gets better.
 *
 * The completion route upserts on (class_key, due_key, student_key), so a
 * replay overwrites the row the teacher's assignment card reads. "Play again"
 * sits right under the stars on the finish screen, which meant a student who
 * aced it, tapped replay out of curiosity and lost interest halfway could hand
 * their teacher a WORSE result for practising more.
 *
 * So a replay merges instead of replacing: best of what they achieved, fastest
 * of how long it took, and an on-time completion can never be undone by a later
 * late one (the class streak already counted that day).
 */

export interface MissGapRunScores {
  words_total: number;
  words_correct: number;
  accuracy: number;
  stars: number;
  best_streak: number;
  duration_ms: number;
  on_time: boolean;
}

function best(a: unknown, b: number): number {
  const previous = Number(a);
  return Number.isFinite(previous) ? Math.max(previous, b) : b;
}

export function mergeMissGapRun<T extends MissGapRunScores>(
  previous: Partial<MissGapRunScores> | null | undefined,
  next: T,
): T {
  if (!previous) return next;

  const previousDuration = Number(previous.duration_ms);
  return {
    ...next,
    // `words_total` describes THIS assignment, not an achievement — the newest
    // run is authoritative (the teacher may have trimmed the word list).
    words_correct: best(previous.words_correct, next.words_correct),
    accuracy: best(previous.accuracy, next.accuracy),
    stars: best(previous.stars, next.stars),
    best_streak: best(previous.best_streak, next.best_streak),
    // A personal best is the SHORTEST time, and 0 is not a real duration.
    duration_ms:
      Number.isFinite(previousDuration) && previousDuration > 0 && next.duration_ms > 0
        ? Math.min(previousDuration, next.duration_ms)
        : next.duration_ms || previousDuration || 0,
    on_time: previous.on_time === true ? true : next.on_time,
  };
}
