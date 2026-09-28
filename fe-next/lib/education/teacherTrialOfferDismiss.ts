/**
 * Dismiss window for the Teacher Pro 14-day trial offer on HQ.
 *
 * Permanent hide is how 65 approved teachers never started a trial (PR #1143
 * shipped the Polar path, but only /teacher/upgrade called it). "Not now"
 * stays quiet for a week, then the banner comes back — same TTL shape as
 * the milestone Pro ask.
 */

export const TEACHER_TRIAL_OFFER_DISMISS_KEY = 'lexiclash.teacher_trial_offer_dismissed';
export const TEACHER_TRIAL_OFFER_DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type StorageLike = {
  getItem?(key: string): string | null;
  setItem?(key: string, value: string): void;
} | null | undefined;

export function isTeacherTrialOfferDismissed(
  storage: StorageLike,
  now: number = Date.now(),
): boolean {
  try {
    const raw = storage?.getItem?.(TEACHER_TRIAL_OFFER_DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return now - ts < TEACHER_TRIAL_OFFER_DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

export function persistTeacherTrialOfferDismissed(
  storage: StorageLike,
  now: number = Date.now(),
): void {
  try {
    storage?.setItem?.(TEACHER_TRIAL_OFFER_DISMISS_KEY, String(now));
  } catch {
    /* private mode / quota — in-session hide still works */
  }
}
