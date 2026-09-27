'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  isTrialUpgradeNudgeDismissed,
  persistTrialUpgradeNudgeDismissed,
  type TrialStatus,
} from './trial';

/**
 * Local dismiss for the 7-day trial upgrade banner.
 *
 * Starts dismissed (fail closed) so a reload cannot flash an ask Polar will
 * retract, then reads storage. Keyed by `expiresAt` so a later trial can nudge
 * again. Polar / billing are untouched — this is UI state only.
 */
export function useTrialUpgradeNudge(trial: TrialStatus | null | undefined): {
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
    setDismissed(isTrialUpgradeNudgeDismissed(window.localStorage, expiresAt));
  }, [expiresAt]);

  const dismiss = useCallback(() => {
    if (!expiresAt) return;
    persistTrialUpgradeNudgeDismissed(
      typeof window === 'undefined' ? null : window.localStorage,
      expiresAt,
    );
    setDismissed(true);
  }, [expiresAt]);

  return { dismissed, dismiss };
}
