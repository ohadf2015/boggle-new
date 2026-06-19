'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  COACH_VERSION,
  hasSeenCoach,
  markCoachSeen,
  type CoachModeKey,
  type CoachStorage,
} from '@/lib/tutorial/modeCoachStore';
import { getModeCoach } from '@/lib/tutorial/modeCoachContent';

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
  /** Advance to the next step, or dismiss when on the last one. */
  advance: () => void;
  /** Close immediately (Skip / first action / done). */
  dismiss: () => void;
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

  // First-visit detection runs in an effect so SSR and first client render
  // agree (nothing rendered) — no hydration mismatch.
  useEffect(() => {
    const storage = browserStorage();
    if (!content || !storage) return;
    if (hasSeenCoach(mode, COACH_VERSION, storage)) return;

    const timer = window.setTimeout(() => {
      setStepIndex(0);
      setVisible(true);
      markCoachSeen(mode, COACH_VERSION, storage); // mark-on-show: abandon-safe
      onShown?.();
    }, settleMs);
    return () => window.clearTimeout(timer);
    // onShown intentionally excluded — callers pass inline fns; mode is the key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, content, settleMs]);

  const dismiss = useCallback(() => setVisible(false), []);

  const advance = useCallback(() => {
    setStepIndex((i) => {
      if (i >= stepCount - 1) {
        setVisible(false);
        return i;
      }
      return i + 1;
    });
  }, [stepCount]);

  const isLastStep = stepIndex >= stepCount - 1;

  return useMemo(
    () => ({ visible, stepIndex, isLastStep, advance, dismiss }),
    [visible, stepIndex, isLastStep, advance, dismiss],
  );
}
