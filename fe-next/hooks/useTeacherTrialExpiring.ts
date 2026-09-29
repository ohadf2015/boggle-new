'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  isTeacherTrialExpiringDismissed,
  persistTeacherTrialExpiringDismissed,
} from '@/lib/education/teacherTrialExpiringDismiss';

/**
 * Local dismiss hook for the Teacher Pro expiring banner on HQ.
 * Reads localStorage on mount, provides dismiss() to silence for 24h.
 */
export function useTeacherTrialExpiring(): { dismissed: boolean; dismiss: () => void } {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDismissed(isTeacherTrialExpiringDismissed(window.localStorage));
    }
  }, []);

  const dismiss = useCallback(() => {
    if (typeof window !== 'undefined') {
      persistTeacherTrialExpiringDismissed(window.localStorage);
    }
    setDismissed(true);
  }, []);

  return { dismissed, dismiss };
}
