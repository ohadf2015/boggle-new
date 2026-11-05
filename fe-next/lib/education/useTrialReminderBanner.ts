'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  isTrialReminderDismissed,
  persistTrialReminderDismissed,
  type TrialStatus,
} from './trial';

/**
 * Local dismiss for the urgent (<=3 days) trial reminder banner.
 *
 * Starts dismissed (fail closed) so a reload cannot flash an ask before reading storage.
 * Keyed by `expiresAt` so a later trial can remind again.
 */
export function useTrialReminderBanner(trial: TrialStatus | null | undefined): {
  dismissed: boolean;
  dismiss: () => void;
} {
  const [dismissed, setDismissed] = useState(true);
  const expiresAt = trial?.expiresAt;

  useEffect(() => {
    if (!expiresAt || typeof window === 'undefined') {
      setDismissed(true);
      return;
    }
    setDismissed(isTrialReminderDismissed(window.localStorage, expiresAt));
  }, [expiresAt]);

  const dismiss = useCallback(() => {
    if (!expiresAt) return;
    persistTrialReminderDismissed(
      typeof window === 'undefined' ? null : window.localStorage,
      expiresAt,
    );
    setDismissed(true);
  }, [expiresAt]);

  return { dismissed, dismiss };
}
