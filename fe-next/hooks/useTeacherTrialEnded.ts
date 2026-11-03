'use client';

import { useTimedDismissal } from '@/hooks/useLocalStorageState';
import { TEACHER_TRIAL_ENDED_DISMISS_KEY, TEACHER_TRIAL_ENDED_DISMISS_TTL_MS } from '@/lib/education/teacherTrialEndedDismiss';

export function useTeacherTrialEnded(): { dismissed: boolean; dismiss: () => void } {
  return useTimedDismissal(TEACHER_TRIAL_ENDED_DISMISS_KEY, TEACHER_TRIAL_ENDED_DISMISS_TTL_MS);
}
