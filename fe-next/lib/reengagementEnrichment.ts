/**
 * Re-engagement enrichment helpers
 *
 * Pure data helpers that feed the personalization chips in
 * ReengagementEmailV2 (loss-aversion / social-proof / urgency).
 *
 * Kept dependency-free so the unit tests stay fast and the runtime
 * surface stays small.
 */

/**
 * Hours until the next local midnight in `timezone`. Always returns
 * an integer in [0, 24], biased upward (ceil) so the urgency framing
 * "Xh left" rounds toward urgency. Falls back to UTC when the IANA
 * zone is unrecognized.
 */
export function computeHoursUntilReset(timezone: string, now: Date = new Date()): number {
  const safeZone = isValidTimeZone(timezone) ? timezone : 'UTC';

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: safeZone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now);

  const hourPart = Number(parts.find((p) => p.type === 'hour')?.value);
  const minutePart = Number(parts.find((p) => p.type === 'minute')?.value);

  // Intl returns "24" at midnight on some runtimes — normalize to 0.
  const h = hourPart === 24 ? 0 : hourPart;
  const m = Number.isFinite(minutePart) ? minutePart : 0;

  const remaining = 24 - h - m / 60;
  const ceiled = Math.ceil(remaining);
  return Math.max(0, Math.min(24, ceiled));
}

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Whole days between `lastPlayed` and `now`, floored.
 * Accepts Date or ISO string; returns null when input is missing or unparseable.
 */
export function computeDaysSinceLastPlay(
  lastPlayed: Date | string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (lastPlayed == null) return null;
  const last = lastPlayed instanceof Date ? lastPlayed : new Date(lastPlayed);
  if (Number.isNaN(last.getTime())) return null;
  const diffMs = now.getTime() - last.getTime();
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / 86400000);
}
