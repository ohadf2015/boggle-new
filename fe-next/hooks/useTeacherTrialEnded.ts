'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  isTeacherTrialEndedDismissed,
  persistTeacherTrialEndedDismissed,
} from '@/lib/education/teacherTrialEndedDismiss';

/**
 * Local dismiss hook for the Teacher Pro expired-trial banner on HQ.
 * Reads localStorage on mount, provides dismiss() to silence for 7 days.
 */
export function useTeacherTrialEnded(): { dismissed: boolean; dismiss: () => void } {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDismissed(isTeacherTrialEndedDismissed(window.localStorage));
    }
  }, []);

  const dismiss = useCallback(() => {
    if (typeof window !== 'undefined') {
      persistTeacherTrialEndedDismissed(window.localStorage);
    }
    setDismissed(true);
  }, []);

  return { dismissed, dismiss };
}
