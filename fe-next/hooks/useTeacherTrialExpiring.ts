'use client';

import { useTimedDismissal } from '@/hooks/useLocalStorageState';
import { TEACHER_TRIAL_EXPIRING_DISMISS_KEY, TEACHER_TRIAL_EXPIRING_DISMISS_TTL_MS } from '@/lib/education/teacherTrialExpiringDismiss';

export function useTeacherTrialExpiring(): { dismissed: boolean; dismiss: () => void } {
  return useTimedDismissal(TEACHER_TRIAL_EXPIRING_DISMISS_KEY, TEACHER_TRIAL_EXPIRING_DISMISS_TTL_MS);
}
