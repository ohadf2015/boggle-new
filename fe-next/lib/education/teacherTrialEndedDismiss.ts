import { isDismissedWithin, persistDismissedAt } from '@/hooks/useLocalStorageState';

/** Expired-trial reactivation banner on teacher home: "Not now" stays quiet for a week. */
export const TEACHER_TRIAL_ENDED_DISMISS_KEY = 'lexiclash.teacher_trial_ended_dismissed';
export const TEACHER_TRIAL_ENDED_DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type StorageLike = Parameters<typeof isDismissedWithin>[0];

export function isTeacherTrialEndedDismissed(storage: StorageLike, now: number = Date.now()): boolean {
  return isDismissedWithin(storage, TEACHER_TRIAL_ENDED_DISMISS_KEY, TEACHER_TRIAL_ENDED_DISMISS_TTL_MS, now);
}

export function persistTeacherTrialEndedDismissed(storage: StorageLike, now: number = Date.now()): void {
  persistDismissedAt(storage, TEACHER_TRIAL_ENDED_DISMISS_KEY, now);
}
