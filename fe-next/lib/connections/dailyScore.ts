/**
 * Word Bridge daily-score submission — pure validation + upsert decision.
 *
 * The API route owns the DB; this module owns the rules. Keeping them pure
 * makes the anti-cheat gate (score clamp, date window, field bounds) and the
 * best-keeps upsert decision fully testable without a database.
 */
import { yesterdayISO } from './streak';
import { DAILY_PUZZLE_COUNT } from './daily';
import { POINTS_HARD, STREAK_BONUS_MULTIPLIER } from './gameLogic';

const LANGUAGES = ['en', 'he', 'sv', 'ja', 'es', 'ru'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TIME_SECONDS = 86_400; // a day's worth — anything above is garbage
const MAX_NAME_LEN = 50;
/** No solve (chain riddle or pyramid finale) is worth more than a hard riddle on a bonus streak. */
const MAX_POINTS_PER_SOLVE = Math.ceil(POINTS_HARD * STREAK_BONUS_MULTIPLIER);
const MIN_SECONDS_PER_SOLVE = 1;

export interface DailySubmission {
  puzzleDate: string;
  language: string;
  displayName: string;
  score: number;
  timeTakenSeconds: number;
  puzzlesSolved: number;
}

export type ValidationResult =
  | { ok: true; value: DailySubmission }
  | { ok: false; error: string };

function isInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n);
}

/**
 * Validate a client submission against server-known bounds.
 * @param maxScore the day's clamp ceiling (see daily.maxDailyScore)
 * @param todayISO the server's current UTC date
 */
export function validateDailySubmission(body: unknown, maxScore: number, todayISO: string): ValidationResult {
  if (!body || typeof body !== 'object') return { ok: false, error: 'invalid body' };
  const b = body as Record<string, unknown>;

  const { puzzleDate, language, displayName, score, timeTakenSeconds, puzzlesSolved } = b;

  if (typeof puzzleDate !== 'string' || !DATE_RE.test(puzzleDate)) {
    return { ok: false, error: 'invalid puzzleDate' };
  }
  // Accept today or yesterday only (yesterday absorbs UTC-midnight skew).
  if (puzzleDate > todayISO || puzzleDate < yesterdayISO(todayISO)) {
    return { ok: false, error: 'puzzleDate out of window' };
  }
  if (typeof language !== 'string' || !LANGUAGES.includes(language)) {
    return { ok: false, error: 'invalid language' };
  }
  if (typeof displayName !== 'string' || displayName.trim().length < 1 || displayName.length > MAX_NAME_LEN) {
    return { ok: false, error: 'invalid displayName' };
  }
  if (!isInt(score) || score < 0 || score > maxScore) {
    return { ok: false, error: 'invalid score' };
  }
  if (!isInt(timeTakenSeconds) || timeTakenSeconds < 0 || timeTakenSeconds > MAX_TIME_SECONDS) {
    return { ok: false, error: 'invalid timeTakenSeconds' };
  }
  if (!isInt(puzzlesSolved) || puzzlesSolved < 0 || puzzlesSolved > DAILY_PUZZLE_COUNT) {
    return { ok: false, error: 'invalid puzzlesSolved' };
  }
  if (score > puzzlesSolved * MAX_POINTS_PER_SOLVE) {
    return { ok: false, error: 'score exceeds solved puzzles' };
  }
  if (timeTakenSeconds < puzzlesSolved * MIN_SECONDS_PER_SOLVE) {
    return { ok: false, error: 'implausible time' };
  }

  return {
    ok: true,
    value: { puzzleDate, language, displayName: displayName.trim(), score, timeTakenSeconds, puzzlesSolved },
  };
}

export interface ScorePoint {
  score: number;
  timeTakenSeconds: number;
  language?: string;
}

/**
 * Best-keeps: higher score wins; on a tie, the faster time wins. The day's
 * first language sticks — each language is a different puzzle set, so a
 * replay in another one would let a player keep the best of several runs.
 */
export function resolveDailySubmission({
  existing,
  incoming,
}: {
  existing: ScorePoint | null;
  incoming: ScorePoint;
}): { action: 'insert' | 'update' | 'keep' } {
  if (!existing) return { action: 'insert' };
  if (existing.language && incoming.language && existing.language !== incoming.language) return { action: 'keep' };
  if (incoming.score > existing.score) return { action: 'update' };
  if (incoming.score === existing.score && incoming.timeTakenSeconds < existing.timeTakenSeconds) {
    return { action: 'update' };
  }
  return { action: 'keep' };
}
