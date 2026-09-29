/**
 * Dismiss window for the Teacher Pro trial expiring banner on HQ.
 *
 * Stored in localStorage so dismissing the urgency banner stays quiet
 * for 24 hours rather than flashing on every page reload.
 */

export const TEACHER_TRIAL_EXPIRING_DISMISS_KEY = 'lexiclash.teacher_trial_expiring_dismissed';
export const TEACHER_TRIAL_EXPIRING_DISMISS_TTL_MS = 24 * 60 * 60 * 1000;

type StorageLike = {
  getItem?(key: string): string | null;
  setItem?(key: string, value: string): void;
} | null | undefined;

export function isTeacherTrialExpiringDismissed(
  storage: StorageLike,
  now: number = Date.now(),
): boolean {
  try {
    const raw = storage?.getItem?.(TEACHER_TRIAL_EXPIRING_DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return now - ts < TEACHER_TRIAL_EXPIRING_DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

export function persistTeacherTrialExpiringDismissed(
  storage: StorageLike,
  now: number = Date.now(),
): void {
  try {
    storage?.setItem?.(TEACHER_TRIAL_EXPIRING_DISMISS_KEY, String(now));
  } catch {
    /* private mode / quota — in-session hide still works */
  }
}
