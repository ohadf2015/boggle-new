/**
 * Dismiss window for the Teacher Pro expired-trial reactivation banner on HQ.
 *
 * "Not now" stays quiet for a week, then the Reactivate CTA comes back —
 * same TTL shape as the Polar trial offer. Permanent hide is how expired
 * trials go silent.
 */

export const TEACHER_TRIAL_ENDED_DISMISS_KEY = 'lexiclash.teacher_trial_ended_dismissed';
export const TEACHER_TRIAL_ENDED_DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type StorageLike = {
  getItem?(key: string): string | null;
  setItem?(key: string, value: string): void;
} | null | undefined;

export function isTeacherTrialEndedDismissed(
  storage: StorageLike,
  now: number = Date.now(),
): boolean {
  try {
    const raw = storage?.getItem?.(TEACHER_TRIAL_ENDED_DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return now - ts < TEACHER_TRIAL_ENDED_DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

export function persistTeacherTrialEndedDismissed(
  storage: StorageLike,
  now: number = Date.now(),
): void {
  try {
    storage?.setItem?.(TEACHER_TRIAL_ENDED_DISMISS_KEY, String(now));
  } catch {
    /* private mode / quota — in-session hide still works */
  }
}
