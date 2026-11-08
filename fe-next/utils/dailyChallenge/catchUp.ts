/**
 * Daily Challenge Catch-up
 *
 * Players can replay dailies they missed within a short window (the last 3 days).
 * Catch-up plays count toward personal stats + the daily streak (a replayed
 * missed day repairs the streak — `catchUpStreakRepairs`), but deliberately
 * do NOT count toward weekly-chest cycle continuity — see docs/specs/
 * daily-catchup-chest-fairness.md. Otherwise a player could grind catch-up to
 * fabricate a 7-day cycle and defeat the gold-tier fairness gate.
 */

export const CATCH_UP_WINDOW_DAYS = 3;

// Self-contained so this module is safe to import from the Express backend,
// which resolves relative paths only — dateUtils pulls a `@/` alias import that
// would not resolve there.
function previousDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().split('T')[0];
}

/**
 * The catch-up dates: the N calendar days immediately before `today`,
 * newest first (today-1, today-2, today-3).
 */
export function getCatchUpDates(today: string, windowDays: number = CATCH_UP_WINDOW_DAYS): string[] {
  const dates: string[] = [];
  let cursor = today;
  for (let i = 0; i < windowDays; i++) {
    cursor = previousDate(cursor);
    dates.push(cursor);
  }
  return dates;
}

/**
 * A date the player is allowed to submit: today, or any day in the catch-up window.
 */
export function isSubmittableDate(today: string, date: string, windowDays: number = CATCH_UP_WINDOW_DAYS): boolean {
  if (date === today) return true;
  return getCatchUpDates(today, windowDays).includes(date);
}

/**
 * A play is "catch-up" when it's a past date inside the window. Today is never
 * catch-up (and submitting yesterday near the UTC rollover stays a normal play
 * unless the client explicitly flags catch-up intent).
 */
export function isCatchUpDate(today: string, date: string, windowDays: number = CATCH_UP_WINDOW_DAYS): boolean {
  return date !== today && getCatchUpDates(today, windowDays).includes(date);
}

export interface CatchUpAdGateState {
  /** Is this a catch-up play (a past day), not today's daily? */
  isCatchup: boolean;
  /** Already watched the ad for this catch-up date this session? */
  alreadyUnlocked: boolean;
  /** Running inside the native (Capacitor) app? */
  isNative: boolean;
  /** Is a rewarded ad ready to show? */
  isAdAvailable: boolean;
  /** Is the placeholder ad provider in its post-show cooldown? */
  isPlaceholderCooldown: boolean;
}

/**
 * Whether starting a catch-up play must first show a rewarded ad.
 *
 * Native-only: the ad is the price of replaying a missed day. On web (or when
 * no ad is ready / a placeholder is cooling down) we degrade to free play —
 * identical contract to the WordHunt forfeit/retry gate. Returns false once the
 * date is already unlocked so a single watch covers the whole session for it.
 */
export function shouldGateCatchUpBehindAd(state: CatchUpAdGateState): boolean {
  const { isCatchup, alreadyUnlocked, isNative, isAdAvailable, isPlaceholderCooldown } = state;
  if (!isCatchup || alreadyUnlocked) return false;
  return isNative && isAdAvailable && !isPlaceholderCooldown;
}

/**
 * Catch-up dates the player has NOT yet completed, newest first.
 */
export function getMissedCatchUpDates(
  today: string,
  completedDates: Iterable<string>,
  windowDays: number = CATCH_UP_WINDOW_DAYS,
): string[] {
  const done = new Set(completedDates);
  return getCatchUpDates(today, windowDays).filter(d => !done.has(d));
}

/**
 * Catch-up plays that repair the current daily streak: missed days (no live
 * play) that were replayed inside the window and now sit inside the current
 * run. The run is anchored like computeCurrentStreak: today if played, else
 * yesterday. Empty when no catch-up play changes the streak.
 */
export function catchUpStreakRepairs(liveDates: Iterable<string>, catchUpDates: Iterable<string>, today: string): string[] {
  const live = new Set(liveDates);
  const all = new Set([...live, ...catchUpDates]);
  const repairs: string[] = [];
  let cursor = all.has(today) ? today : previousDate(today);
  while (all.has(cursor)) {
    if (!live.has(cursor)) repairs.push(cursor);
    cursor = previousDate(cursor);
  }
  return repairs.sort();
}
