'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import posthog from '@/lib/analytics/lazyPosthog';
import {
  DIRECTIONS_TUTORIAL_VERSION,
  hasSeenDirectionsTutorial,
  markDirectionsTutorialSeen,
  type DirectionsTutorialStorage,
} from '@/lib/tutorial/directionsTutorialStore';
import { emitDirectionsTutorialActive } from './useDirectionsTutorialPause';

/** Minimum time the overlay stays un-skippable, per product ask ("10s at least"). */
export const DIRECTIONS_MIN_VISIBLE_SECONDS = 10;

/** Why the tutorial closed — separates "read it through" from "traced early". */
export type DirectionsDismissReason = 'button' | 'traced' | 'escape';

function browserStorage(): DirectionsTutorialStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export interface UseDirectionsTutorial {
  /** True once the overlay should be on screen (first visit, after settle). */
  visible: boolean;
  /** Whole seconds remaining before the player may continue (>= 0). */
  secondsLeft: number;
  /** False until the minimum-visible window has elapsed; gates the CTA. */
  canDismiss: boolean;
  /** Close the overlay (no-op before `canDismiss`). Resumes the game clock. */
  dismiss: (reason?: DirectionsDismissReason) => void;
}

export interface UseDirectionsTutorialOptions {
  /** Master gate — pass a mode/first-time predicate. Defaults to true. */
  enabled?: boolean;
  /** Delay before first paint so the board settles first. */
  settleMs?: number;
  /** Un-skippable window in seconds (default {@link DIRECTIONS_MIN_VISIBLE_SECONDS}). */
  minVisibleSeconds?: number;
  /** Fires once when the overlay first shows (cross-device DB backfill hook). */
  onShown?: () => void;
}

/**
 * Drives the first-time directional-selection tutorial: decides first-visit
 * visibility, freezes the game clock while it's up (via the pause event bus),
 * enforces the un-skippable minimum, and persists "seen" the MOMENT it shows —
 * not on dismiss — so an abandoned/reloaded first session never re-pops it (same
 * lesson as the player-style modal, `.claude/rules/60-recurring-pitfalls.md`).
 */
export function useDirectionsTutorial(
  opts: UseDirectionsTutorialOptions = {},
): UseDirectionsTutorial {
  const {
    enabled = true,
    settleMs = 600,
    minVisibleSeconds = DIRECTIONS_MIN_VISIBLE_SECONDS,
    onShown,
  } = opts;

  const [visible, setVisible] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(minVisibleSeconds);
  // Guards one dismiss per show cycle (button + Escape + auto can race).
  const dismissedRef = useRef(false);

  // First-visit detection runs in an effect so SSR and first client render
  // agree (nothing rendered) — no hydration mismatch.
  useEffect(() => {
    if (!enabled) return;
    const storage = browserStorage();
    if (!storage) return;
    if (hasSeenDirectionsTutorial(DIRECTIONS_TUTORIAL_VERSION, storage)) return;

    const settle = window.setTimeout(() => {
      setSecondsLeft(minVisibleSeconds);
      setVisible(true);
      dismissedRef.current = false;
      // Mark-on-show (abandon-safe) + freeze the clock for everyone listening.
      markDirectionsTutorialSeen(DIRECTIONS_TUTORIAL_VERSION, storage);
      emitDirectionsTutorialActive(true);
      posthog.capture('directions_tutorial_shown', {});
      onShown?.();
    }, settleMs);

    return () => window.clearTimeout(settle);
    // onShown intentionally excluded — callers pass inline fns.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, settleMs, minVisibleSeconds]);

  // Countdown that unlocks the CTA. Runs only while visible.
  useEffect(() => {
    if (!visible || secondsLeft <= 0) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [visible, secondsLeft]);

  const canDismiss = visible && secondsLeft <= 0;

  const dismiss = useCallback(
    (reason: DirectionsDismissReason = 'button') => {
      if (dismissedRef.current) return;
      // Honour the un-skippable minimum — early taps are no-ops.
      if (secondsLeft > 0) return;
      dismissedRef.current = true;
      emitDirectionsTutorialActive(false);
      posthog.capture('directions_tutorial_dismissed', { reason });
      setVisible(false);
    },
    [secondsLeft],
  );

  // Safety: if the host unmounts mid-tutorial (navigation), never leave the
  // game clock frozen.
  useEffect(() => {
    return () => {
      if (visible && !dismissedRef.current) {
        emitDirectionsTutorialActive(false);
      }
    };
  }, [visible]);

  return useMemo(
    () => ({ visible, secondsLeft, canDismiss, dismiss }),
    [visible, secondsLeft, canDismiss, dismiss],
  );
}
