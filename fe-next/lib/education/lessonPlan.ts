import { defaultFirstGameStart } from './firstGamePlan';

const MINUTE_MS = 60_000;
export const MIN_LEAD_MINUTES = 30;
export const MAX_AHEAD_DAYS = 60;
/** The cron runs every 15 minutes, so a 75-minute lead lands each email 60 to 75 minutes before class. */
export const REMINDER_AHEAD_MINUTES = 75;
export const REMINDER_GRACE_MINUTES = 30;

export function defaultLessonAt(now: Date): Date {
  return defaultFirstGameStart(now);
}

export type LessonAtCheck = { ok: true } | { ok: false; reason: 'invalid' | 'too_soon' | 'too_far' };

export function validateLessonAt(lessonAt: Date, now: Date): LessonAtCheck {
  const ahead = lessonAt.getTime() - now.getTime();
  if (Number.isNaN(ahead)) return { ok: false, reason: 'invalid' };
  if (ahead < MIN_LEAD_MINUTES * MINUTE_MS) return { ok: false, reason: 'too_soon' };
  if (ahead > MAX_AHEAD_DAYS * 24 * 60 * MINUTE_MS) return { ok: false, reason: 'too_far' };
  return { ok: true };
}

export function reminderWindow(now: Date): { from: Date; to: Date } {
  return {
    from: new Date(now.getTime() - REMINDER_GRACE_MINUTES * MINUTE_MS),
    to: new Date(now.getTime() + REMINDER_AHEAD_MINUTES * MINUTE_MS),
  };
}

export function isReminderDue(lessonAt: Date, now: Date): boolean {
  const at = lessonAt.getTime();
  if (Number.isNaN(at)) return false;
  const { from, to } = reminderWindow(now);
  return at >= from.getTime() && at <= to.getTime();
}

function tryFormat(lessonAt: Date, timeZone: string, locale: string): string | null {
  try {
    return new Intl.DateTimeFormat(locale, { weekday: 'long', hour: 'numeric', minute: '2-digit', timeZone }).format(lessonAt);
  } catch {
    return null;
  }
}

export function formatLessonTime(lessonAt: Date, timezone: string | null | undefined, locale: string | null | undefined): string {
  const lang = locale || 'en';
  const zone = timezone || 'UTC';
  return (
    tryFormat(lessonAt, zone, lang) ??
    tryFormat(lessonAt, 'UTC', lang) ??
    tryFormat(lessonAt, zone, 'en') ??
    tryFormat(lessonAt, 'UTC', 'en') ??
    lessonAt.toISOString()
  );
}
