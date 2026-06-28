'use client';

import { memo, useRef } from 'react';
import CircularTimer from '../../ui/CircularTimer';
import { reconcileTimerRing, type TimerRingState } from './timerResync';

export interface ShellBadgeTimerProps {
  /** Server-authoritative seconds remaining. The single source of truth. */
  remainingTime: number;
  /** Total match duration in seconds — drives the ring's full-circle fill. */
  totalTime: number;
  /** Ring diameter in px. */
  size?: number;
  /** Per-mode ring color (classic=cyan, blast=lime, wheel-rush=pink, …). */
  colorFamily?: 'lime' | 'pink' | 'cyan' | 'purple';
}

/**
 * The one timer the desktop shell shows per mode (left-rail badge). It wraps the
 * self-driven ring but keeps it honest against the server: the ring sweeps
 * smoothly on its own RAF, and we only re-seed it (via a changed `timerKey`)
 * when the server's `remainingTime` has drifted past tolerance — e.g. a
 * reconnect resend or a backgrounded tab. Without this the ring silently
 * diverged from the server clock (and, in Blast, from the in-canvas timer),
 * which is the "two timers that aren't in sync" symptom this fixes.
 */
function ShellBadgeTimerImpl({ remainingTime, totalTime, size = 80, colorFamily = 'cyan' }: ShellBadgeTimerProps) {
  const stateRef = useRef<TimerRingState | null>(null);
  // Pure + idempotent: a Strict-Mode double render lands on the same state
  // (second pass sees lastServer === remainingTime → drop 0 → no extra re-seed).
  stateRef.current = reconcileTimerRing(stateRef.current, remainingTime);
  const { key, remaining } = stateRef.current;

  return (
    <CircularTimer
      duration={totalTime}
      initialRemainingTime={remaining}
      timerKey={key}
      isPlaying
      size={size}
      colorFamily={colorFamily}
    />
  );
}

export const ShellBadgeTimer = memo(ShellBadgeTimerImpl);
ShellBadgeTimer.displayName = 'ShellBadgeTimer';
