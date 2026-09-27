import type { PuzzleLocale } from './types';
import { INITIAL_LIVES } from './gameLogic';

export const MAX_LIVES = INITIAL_LIVES;

/**
 * Lives regenerate over wall-clock time, one every 20 minutes.
 *
 * Without this, running out of lives was a PERMANENT dead end on the web. The
 * only revive path is the rewarded-ad button in OutOfLivesModal, and the web
 * rewarded provider is gated off pending AdSense approval
 * (hooks/useRewardedAd.ts:206) — and that approval is currently REJECTED
 * ("Low value content", 2026-08-11). So `canShowAd` is false for every web
 * player: the revive button renders disabled next to "no ad available", and the
 * only live control is "quit to menu". Lives also carry ACROSS levels and never
 * refilled, so three wrong answers spread over three different puzzles ended the
 * mode for good. Measured 28-day result: 13 starts → 1 completion (7.7%), against
 * 35% for classic.
 *
 * Time-based regen is the ad-independent recovery path, so the fix holds whatever
 * happens with AdSense.
 */
export const LIVES_REGEN_MS = 20 * 60 * 1000;

export const LIVES_STORAGE_KEY = (locale: string): string => `connections:lives:${locale}`;

/**
 * When the current sub-max lives value was set — the clock regen counts from.
 * Deliberately a SEPARATE key so the lives value itself stays a bare integer
 * (existing callers and stored data are untouched); a missing stamp just means
 * "no regen yet", never a parse failure.
 */
export const LIVES_SINCE_KEY = (locale: string): string => `connections:lives:${locale}:since`;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function clamp(n: number): number {
  if (!Number.isFinite(n)) return MAX_LIVES;
  return Math.max(0, Math.min(MAX_LIVES, Math.floor(n)));
}

/** Stored regen anchor, or null when absent/garbage (treated as "no regen owed"). */
function readSince(locale: PuzzleLocale | string): number | null {
  const raw = window.localStorage.getItem(LIVES_SINCE_KEY(locale));
  if (raw === null) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

function readStoredLives(locale: PuzzleLocale | string): number {
  const raw = window.localStorage.getItem(LIVES_STORAGE_KEY(locale));
  if (raw === null) return MAX_LIVES;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return MAX_LIVES;
  return clamp(n);
}

/**
 * Lives for this locale, with any time-earned lives already folded in.
 *
 * Regen is applied and PERSISTED on read (there is no ticker to hang it off),
 * and the anchor advances by whole lives only, so the partial progress toward
 * the next life is never silently discarded by a page reload.
 */
export function getCurrentLives(locale: PuzzleLocale | string, now: number = Date.now()): number {
  if (!isBrowser()) return MAX_LIVES;
  const stored = readStoredLives(locale);
  if (stored >= MAX_LIVES) return MAX_LIVES;

  const since = readSince(locale);
  // Legacy rows (and anything hand-cleared) carry no anchor. Start the clock now
  // rather than granting a windfall for time we can't actually account for.
  if (since === null) {
    window.localStorage.setItem(LIVES_SINCE_KEY(locale), String(now));
    return stored;
  }

  // A clock that jumped backwards (timezone/NTP correction) must not owe lives.
  const elapsed = Math.max(0, now - since);
  const earned = Math.floor(elapsed / LIVES_REGEN_MS);
  if (earned <= 0) return stored;

  const next = clamp(stored + earned);
  window.localStorage.setItem(LIVES_STORAGE_KEY(locale), String(next));
  if (next >= MAX_LIVES) {
    window.localStorage.removeItem(LIVES_SINCE_KEY(locale));
  } else {
    // Carry the remainder: only the consumed whole intervals advance the anchor.
    window.localStorage.setItem(LIVES_SINCE_KEY(locale), String(since + earned * LIVES_REGEN_MS));
  }
  return next;
}

export function setCurrentLives(
  locale: PuzzleLocale | string,
  lives: number,
  now: number = Date.now(),
): void {
  if (!isBrowser()) return;
  const next = clamp(lives);
  const prev = readStoredLives(locale);
  window.localStorage.setItem(LIVES_STORAGE_KEY(locale), String(next));

  if (next >= MAX_LIVES) {
    window.localStorage.removeItem(LIVES_SINCE_KEY(locale));
    return;
  }
  // Restamp only when lives actually DROPPED. Re-stamping on an unchanged or
  // regen-driven write would reset the timer on every read and lives would
  // never come back.
  if (next < prev || readSince(locale) === null) {
    window.localStorage.setItem(LIVES_SINCE_KEY(locale), String(now));
  }
}

/**
 * Milliseconds until the next life lands, or null when lives are already full.
 * Powers the "next life in 12m" line in OutOfLivesModal — the dead end was as
 * much about the player not knowing to come back as about the missing life.
 */
export function msUntilNextLife(
  locale: PuzzleLocale | string,
  now: number = Date.now(),
): number | null {
  if (!isBrowser()) return null;
  if (getCurrentLives(locale, now) >= MAX_LIVES) return null;
  const since = readSince(locale) ?? now;
  const elapsedInInterval = Math.max(0, now - since) % LIVES_REGEN_MS;
  return LIVES_REGEN_MS - elapsedInInterval;
}

export function resetLives(locale: PuzzleLocale | string): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(LIVES_STORAGE_KEY(locale));
  window.localStorage.removeItem(LIVES_SINCE_KEY(locale));
}
