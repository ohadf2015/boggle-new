import { isDismissedWithin, persistDismissedAt } from '@/hooks/useLocalStorageState';

/** 14-day trial offer on teacher home: "Not now" stays quiet for a week, then the offer returns (a permanent hide once kept approved teachers from ever starting a trial). */
export const TEACHER_TRIAL_OFFER_DISMISS_KEY = 'lexiclash.teacher_trial_offer_dismissed';
export const TEACHER_TRIAL_OFFER_DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type StorageLike = Parameters<typeof isDismissedWithin>[0];

export function isTeacherTrialOfferDismissed(storage: StorageLike, now: number = Date.now()): boolean {
  return isDismissedWithin(storage, TEACHER_TRIAL_OFFER_DISMISS_KEY, TEACHER_TRIAL_OFFER_DISMISS_TTL_MS, now);
}

export function persistTeacherTrialOfferDismissed(storage: StorageLike, now: number = Date.now()): void {
  persistDismissedAt(storage, TEACHER_TRIAL_OFFER_DISMISS_KEY, now);
}
