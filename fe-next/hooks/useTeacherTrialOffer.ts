'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  isTeacherTrialOfferDismissed,
  persistTeacherTrialOfferDismissed,
} from '@/lib/education/teacherTrialOfferDismiss';

/**
 * Local dismiss for the Polar 14-day trial HQ banner.
 * Starts dismissed (fail closed) so a reload cannot flash an ask Polar will
 * retract, then reads storage. Polar / billing are untouched.
 */
export function useTeacherTrialOffer(): { dismissed: boolean; dismiss: () => void } {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(isTeacherTrialOfferDismissed(window.localStorage));
  }, []);

  const dismiss = useCallback(() => {
    persistTeacherTrialOfferDismissed(window.localStorage);
    setDismissed(true);
  }, []);

  return { dismissed, dismiss };
}
