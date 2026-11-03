'use client';

import { useTimedDismissal } from '@/hooks/useLocalStorageState';
import { TEACHER_TRIAL_OFFER_DISMISS_KEY, TEACHER_TRIAL_OFFER_DISMISS_TTL_MS } from '@/lib/education/teacherTrialOfferDismiss';

export function useTeacherTrialOffer(): { dismissed: boolean; dismiss: () => void } {
  return useTimedDismissal(TEACHER_TRIAL_OFFER_DISMISS_KEY, TEACHER_TRIAL_OFFER_DISMISS_TTL_MS);
}
