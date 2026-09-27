/**
 * Live Vocab Quiz — scoring.
 *
 * Pure and shared: the server is the source of truth for every number here,
 * but the student UI imports the same functions to explain a score breakdown
 * ("+100 +38 speed +20 streak") without recomputing it differently. Class 3 in
 * .claude/rules/60-recurring-pitfalls.md is exactly this bug — client and
 * server independently computing "the same" number and drifting.
 */

/** Flat award for being right at all. Kids who are slow but correct still score. */
export const VOCAB_QUIZ_BASE_POINTS = 100;
/** Extra for answering instantly, decaying linearly to zero as the clock runs out. */
export const VOCAB_QUIZ_MAX_SPEED_BONUS = 50;
/** Per consecutive correct answer beyond the first. */
export const VOCAB_QUIZ_STREAK_STEP = 10;
/** Ceiling on the streak bonus so a hot student cannot lap a struggling class. */
export const VOCAB_QUIZ_MAX_STREAK_BONUS = 50;

export interface ScoreAnswerInput {
  correct: boolean;
  /** ms between the question appearing and this answer landing. */
  elapsedMs: number;
  /** Full length of the question's clock in ms. */
  limitMs: number;
  /** The player's consecutive-correct count BEFORE this answer. */
  streakBefore: number;
}

export interface ScoreAnswerResult {
  points: number;
  speedBonus: number;
  streakBonus: number;
  streakAfter: number;
}

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

/**
 * Score one answer.
 *
 * A wrong answer is worth nothing and breaks the streak — no consolation
 * points, because the streak flame is the thing students actually chase.
 */
export function scoreAnswer({ correct, elapsedMs, limitMs, streakBefore }: ScoreAnswerInput): ScoreAnswerResult {
  if (!correct) {
    return { points: 0, speedBonus: 0, streakBonus: 0, streakAfter: 0 };
  }

  // A non-positive limit means "no clock" rather than an infinite speed bonus.
  const fractionLeft = limitMs > 0 ? clamp01(1 - Math.max(0, elapsedMs) / limitMs) : 0;
  const speedBonus = Math.round(VOCAB_QUIZ_MAX_SPEED_BONUS * fractionLeft);

  const streakAfter = Math.max(0, streakBefore) + 1;
  const streakBonus = Math.min((streakAfter - 1) * VOCAB_QUIZ_STREAK_STEP, VOCAB_QUIZ_MAX_STREAK_BONUS);

  return {
    points: VOCAB_QUIZ_BASE_POINTS + speedBonus + streakBonus,
    speedBonus,
    streakBonus,
    streakAfter,
  };
}

export interface StandingLike {
  username: string;
  score: number;
  streak: number;
  bestStreak: number;
  correctCount: number;
}

/**
 * Rank the class. Ties break on correct answers then on name so the projector
 * ordering is stable between reveals — a leaderboard that reshuffles two tied
 * students every three seconds reads as a bug from the back of the room.
 */
export function sortStandings<T extends StandingLike>(players: readonly T[]): T[] {
  return [...players].sort(
    (a, b) =>
      b.score - a.score ||
      b.correctCount - a.correctCount ||
      a.username.localeCompare(b.username)
  );
}
