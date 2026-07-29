'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePostHogFlag } from '@/hooks/usePostHogFlag';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { selectAvatarNudge } from '@/lib/avatar/avatarNudge';
import {
  getAvatarNudgeDismissedUntil,
  dismissAvatarNudge,
} from '@/lib/avatar/avatarNudgeStorage';

export interface AvatarCustomizationNudge {
  /** Whether to render the gentle "make it yours" hint. */
  show: boolean;
  /** Snooze for 30 days + track; hides immediately. */
  dismiss: () => void;
  /** Track the CTA click — the consumer opens the builder. */
  markClicked: () => void;
}

/**
 * Decides whether to invite an authenticated user to personalize a still-default
 * avatar. Logic lives in the pure `selectAvatarNudge`; this hook wires it to
 * auth state, the remote kill-switch, dismissal persistence, and telemetry.
 */
export function useAvatarCustomizationNudge(): AvatarCustomizationNudge {
  const { isAuthenticated, profile } = useAuth();
  const enabled = usePostHogFlag<boolean>('avatar-customize-nudge-enabled', true);

  // Lazy-init (runs once) so a prior dismissal is honored on the first paint
  // (no flash) and Date.now() stays out of the render path. Sub-render precision
  // is irrelevant against a 30-day snooze.
  const [dismissedUntil] = useState<number | null>(() => getAvatarNudgeDismissedUntil());
  const [mountNow] = useState<number>(() => Date.now());
  const [snoozedNow, setSnoozedNow] = useState(false);

  const show =
    !snoozedNow &&
    selectAvatarNudge({
      isAuthenticated,
      avatarCustomized: profile?.avatar_customized,
      enabled,
      dismissedUntil,
      now: mountNow,
    });

  const shownRef = useRef(false);
  useEffect(() => {
    if (show && !shownRef.current) {
      shownRef.current = true;
      trackGrowthEvent('avatar_nudge_shown');
    }
  }, [show]);

  const dismiss = useCallback(() => {
    dismissAvatarNudge(Date.now());
    setSnoozedNow(true);
    trackGrowthEvent('avatar_nudge_dismissed');
  }, []);

  const markClicked = useCallback(() => {
    trackGrowthEvent('avatar_nudge_clicked');
  }, []);

  return { show, dismiss, markClicked };
}
