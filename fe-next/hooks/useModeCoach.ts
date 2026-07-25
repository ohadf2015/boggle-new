'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import posthog from '@/lib/analytics/lazyPosthog';
import {
  COACH_VERSION,
  hasSeenCoach,
  markCoachSeen,
  type CoachModeKey,
  type CoachStorage,
} from '@/lib/tutorial/modeCoachStore';
import { getModeCoach } from '@/lib/tutorial/modeCoachContent';

/** Why the coach closed — lets us tell "read it" from "tapped past it" in data. */
export type CoachDismissReason = 'skip' | 'board_touch' | 'escape' | 'completed';

function browserStorage(): CoachStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export interface UseModeCoach {
  /** True only on the first visit, after a short settle delay. */
  visible: boolean;
  stepIndex: number;
  isLastStep: boolean;
  /** Advance to the next step, or dismiss (reason=completed) on the last one. */
  advance: () => void;
  /** Close immediately. `reason` defaults to 'skip'. */
  dismiss: (reason?: CoachDismissReason) => void;
}

/**
 * Drives the per-mode FTUE coach: decides first-visit visibility, walks the
 * steps, and persists "seen" the moment it shows (not on dismiss) so an
 * abandoned first session never re-pops the coach on reload — same lesson as
 * the player-style modal. `onShown` fires once for cross-device DB backfill.
 */
export function useModeCoach(
  mode: CoachModeKey,
  opts: { settleMs?: number; onShown?: () => void } = {},
): UseModeCoach {
  const { settleMs = 650, onShown } = opts;
  const content = getModeCoach(mode);
  const stepCount = content?.steps.length ?? 0;

  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  // Guards one `mode_coach_dismissed` per show cycle (advance + dismiss + the
  // board-tap listener can all race to close). Reset when the coach shows.
  const dismissedRef = useRef(false);
  const stepRef = useRef(0);
  stepRef.current = stepIndex;

  // Coach removed per user request — "more confusing than helping".
  // Players jump straight into gameplay with no FTUE steps.
  useEffect(() => {
    const storage = browserStorage();
    if (!content || !storage) return;
    if (hasSeenCoach(mode, COACH_VERSION, storage)) return;

    // Mark as seen immediately so reload never re-pops, but never show.
    markCoachSeen(mode, COACH_VERSION, storage);
    dismissedRef.current = true;
    // onShown fires so cross-device DB backfill still works.
    onShown?.();
  }, [mode, content, settleMs]);

  const close = useCallback(
    (reason: CoachDismissReason) => {
      if (dismissedRef.current) return;
      dismissedRef.current = true;
      posthog.capture('mode_coach_dismissed', { mode, reason, step: stepRef.current });
      setVisible(false);
    },
    [mode],
  );

  const dismiss = useCallback(
    (reason: CoachDismissReason = 'skip') => close(reason),
    [close],
  );

  const advance = useCallback(() => {
    setStepIndex((i) => {
      if (i >= stepCount - 1) {
        close('completed');
        return i;
      }
      return i + 1;
    });
  }, [stepCount, close]);

  const isLastStep = stepIndex >= stepCount - 1;

  return useMemo(
    () => ({ visible, stepIndex, isLastStep, advance, dismiss }),
    [visible, stepIndex, isLastStep, advance, dismiss],
  );
}
