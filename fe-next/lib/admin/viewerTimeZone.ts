/**
 * The admin Overview buckets "today" and other calendar windows in the viewer's
 * own IANA timezone. Invalid or missing values fall back to UTC.
 */

const TZ_NAME = /^[A-Za-z0-9_+\-\/]+$/;
const MAX_TZ_LENGTH = 64;

export function isValidTimeZone(tz: string): boolean {
  if (!TZ_NAME.test(tz) || tz.length > MAX_TZ_LENGTH) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Browser IANA timezone, or UTC if the environment cannot report one. */
export function viewerTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz && isValidTimeZone(tz) ? tz : 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Server-side: accept a query value, otherwise UTC. */
export function resolveAdminTimeZone(raw: unknown): string {
  if (typeof raw !== 'string') return 'UTC';
  const tz = raw.trim();
  return tz && isValidTimeZone(tz) ? tz : 'UTC';
}

export function withViewerTz(path: string, tz = viewerTimeZone()): string {
  const join = path.includes('?') ? '&' : '?';
  return `${path}${join}tz=${encodeURIComponent(tz)}`;
}

/** Calendar date YYYY-MM-DD in the given timezone. */
export function localDateOf(ms: number, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms));
}

function offsetMs(at: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(at));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - at;
}

/** UTC ms of local midnight on `localDate` (YYYY-MM-DD) in `timeZone`. */
export function zonedMidnightUtc(localDate: string, timeZone: string): number {
  const [year, month, day] = localDate.split('-').map(Number);
  const asUtcMidnight = Date.UTC(year, month - 1, day, 0, 0, 0);
  let utc = asUtcMidnight - offsetMs(asUtcMidnight, timeZone);
  utc = asUtcMidnight - offsetMs(utc, timeZone);
  return utc;
}

export function addLocalDays(localDate: string, days: number): string {
  const [year, month, day] = localDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Fraction of the viewer's local day that has elapsed, 0–1. Accounts for DST length. */
export function localDayElapsed(nowMs: number, timeZone: string): number {
  const today = localDateOf(nowMs, timeZone);
  const start = zonedMidnightUtc(today, timeZone);
  const end = zonedMidnightUtc(addLocalDays(today, 1), timeZone);
  const length = end - start;
  if (length <= 0) return 0;
  return Math.min(1, Math.max(0, (nowMs - start) / length));
}
