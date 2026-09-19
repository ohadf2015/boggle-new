/**
 * Decide the outcome of a finished adventure run from server-trusted inputs only:
 * the signed board, the word list, and the server clock.
 */
import type { AttemptPayload } from './attemptToken';
import { getPlayLevel, starsForScore, bossStarsForElapsed } from './levels';
import { scoreRun } from './scoreRun';
import { rewardsFor } from './progress';

/** Network + intro-countdown slack on top of the level clock. */
export const GRACE_MS = 25_000;

export type SettleResult =
  | { ok: false; error: 'expired' }
  | { ok: true; score: number; valid: string[]; stars: number; won: boolean; rewards: string[]; elapsedMs: number };

export function settleRun(input: {
  payload: AttemptPayload;
  words: string[];
  now: number;
  isWord: (w: string) => boolean;
  prevStars: number;
  pointsFor?: (w: string) => number;
}): SettleResult {
  const { payload, words, now, isWord, prevStars, pointsFor } = input;
  const lvl = getPlayLevel(payload.w, payload.l);
  const elapsedMs = now - payload.t;
  if (elapsedMs > lvl.seconds * 1000 + GRACE_MS) return { ok: false, error: 'expired' };

  const { valid, score } = scoreRun({
    grid: payload.g, words, language: payload.lang, minLength: lvl.minLength, isWord, pointsFor,
  });

  const won = lvl.isBoss ? score >= lvl.bossHp : score >= lvl.stars[0];
  const stars = !won ? 0 : lvl.isBoss ? bossStarsForElapsed(elapsedMs, lvl.seconds) : starsForScore(score, lvl.stars);
  const rewards = rewardsFor({ world: payload.w, level: payload.l, prevStars, stars, isBoss: lvl.isBoss });
  return { ok: true, score, valid, stars, won, rewards, elapsedMs };
}
