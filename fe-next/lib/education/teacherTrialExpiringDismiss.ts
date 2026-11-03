import { isDismissedWithin, persistDismissedAt } from '@/hooks/useLocalStorageState';

/** Trial-expiring banner on teacher home: "Not now" stays quiet for 24 hours. */
export const TEACHER_TRIAL_EXPIRING_DISMISS_KEY = 'lexiclash.teacher_trial_expiring_dismissed';
export const TEACHER_TRIAL_EXPIRING_DISMISS_TTL_MS = 24 * 60 * 60 * 1000;

type StorageLike = Parameters<typeof isDismissedWithin>[0];

export function isTeacherTrialExpiringDismissed(storage: StorageLike, now: number = Date.now()): boolean {
  return isDismissedWithin(storage, TEACHER_TRIAL_EXPIRING_DISMISS_KEY, TEACHER_TRIAL_EXPIRING_DISMISS_TTL_MS, now);
}

export function persistTeacherTrialExpiringDismissed(storage: StorageLike, now: number = Date.now()): void {
  persistDismissedAt(storage, TEACHER_TRIAL_EXPIRING_DISMISS_KEY, now);
}
