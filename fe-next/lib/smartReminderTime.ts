/**
 * Smart-time utilities for per-user daily-challenge reminders.
 *
 * The cron uses these to find each user's "usual" play time and schedule
 * a push 30 minutes after it, in their local timezone. All times here are
 * minute-of-day integers in [0, 1440); 1440 wraps back to 0.
 */

const MINUTES_PER_DAY = 1440;
const TWO_PI = Math.PI * 2;

/**
 * Average a list of clock times using circular mean — required because the
 * arithmetic mean of 23:30 and 00:30 is 12:00, the antipode of the truth.
 *
 * Returns null when the input is empty OR when the resultant vector is too
 * close to zero (data is uniformly spread around the clock — no meaningful
 * "usual time").
 */
export function circularMeanMinutes(minutes: number[]): number | null {
  if (minutes.length === 0) return null;

  let sumX = 0;
  let sumY = 0;
  for (const m of minutes) {
    const angle = (m / MINUTES_PER_DAY) * TWO_PI;
    sumX += Math.cos(angle);
    sumY += Math.sin(angle);
  }
  const x = sumX / minutes.length;
  const y = sumY / minutes.length;

  if (Math.hypot(x, y) < 1e-6) return null;

  let angle = Math.atan2(y, x);
  if (angle < 0) angle += TWO_PI;

  const result = Math.round((angle / TWO_PI) * MINUTES_PER_DAY);
  return result % MINUTES_PER_DAY;
}

/** Add a (possibly negative, possibly multi-day) delta with mod-1440 wrap. */
export function addMinutesWrap(target: number, delta: number): number {
  const total = ((target + delta) % MINUTES_PER_DAY + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return total;
}

/**
 * `current` falls in [target, target+windowMinutes) on the circular clock.
 * Treats the window as a forward arc — handles midnight wrap without branches.
 */
export function inWindow(current: number, target: number, windowMinutes: number): boolean {
  const diff = (current - target + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return diff < windowMinutes;
}
