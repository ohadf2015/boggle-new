/**
 * Decide the outcome of a finished adventure run from server-trusted inputs only:
 * the signed board (+ kind, relics, hunt targets), the word list, and the server clock.
 */
import type { AttemptPayload } from './attemptToken';
import { getPlayLevel, starsForScore, bossStarsForElapsed, isCombatKind } from './levels';
import { scoreRun, sanitizeTimes } from './scoreRun';
import { rewardsFor } from './progress';
import { secondsBonus, POTION_TIME_MS } from './relics';

/** Network + intro-countdown slack on top of the level clock. */
export const GRACE_MS = 25_000;

export type SettleResult =
  | { ok: false; error: 'expired' }
  | {
    ok: true; score: number; valid: string[]; points: number[]; stars: number; won: boolean;
    rewards: string[]; elapsedMs: number; targetsFound?: string[];
  };

/** Full clock for an attempt: level seconds + hourglass + every time potion it held. */
export function attemptSeconds(payload: Pick<AttemptPayload, 'w' | 'l' | 'r' | 'tp'>): number {
  const lvl = getPlayLevel(payload.w, payload.l);
  return lvl.seconds + secondsBonus(payload.r ?? []) + (payload.tp ?? 0) * (POTION_TIME_MS / 1000);
}

export function settleRun(input: {
  payload: AttemptPayload;
  words: string[];
  now: number;
  isWord: (w: string) => boolean;
  prevStars: number;
  pointsFor?: (w: string) => number;
  /** Client find time per word (ms from level start) — combo + speed bonus. Untrusted. */
  times?: unknown;
}): SettleResult {
  const { payload, words, now, isWord, prevStars, pointsFor } = input;
  const lvl = getPlayLevel(payload.w, payload.l);
  const kind = payload.k ?? lvl.kind;
  const seconds = attemptSeconds(payload);
  const elapsedMs = now - payload.t;
  if (elapsedMs > seconds * 1000 + GRACE_MS) return { ok: false, error: 'expired' };

  // Thresholds tuned to the board this attempt was dealt. Signed at /start, so
  // the client cannot lower its own bar; legacy tokens fall back to the table.
  const stars3 = payload.st ?? lvl.stars;
  const enemyHp = payload.eh ?? lvl.enemyHp ?? lvl.bossHp;

  const { valid, score, points } = scoreRun({
    grid: payload.g, words, language: payload.lang, minLength: lvl.minLength, isWord, pointsFor,
    relics: payload.r ?? [], kind,
    times: sanitizeTimes(input.times, words.length, seconds * 1000 + GRACE_MS) ?? undefined,
  });

  let won: boolean;
  let stars: number;
  let targetsFound: string[] | undefined;
  if (isCombatKind(kind)) {
    won = score >= enemyHp;
    stars = won ? bossStarsForElapsed(elapsedMs, seconds) : 0;
  } else if (kind === 'hunt') {
    const targets = new Set((payload.tg ?? []).map((w) => w.toLowerCase()));
    targetsFound = valid.filter((w) => targets.has(w));
    won = targetsFound.length >= (lvl.huntCount ?? targets.size);
    stars = won ? Math.max(1, starsForScore(score, stars3)) : 0;
  } else {
    won = score >= stars3[0];
    stars = won ? starsForScore(score, stars3) : 0;
  }
  const rewards = rewardsFor({ world: payload.w, level: payload.l, prevStars, stars, isBoss: lvl.isBoss });
  return { ok: true, score, valid, points, stars, won, rewards, elapsedMs, ...(targetsFound ? { targetsFound } : {}) };
}
