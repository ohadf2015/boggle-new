'use client';

import { memo, useRef } from 'react';
import CircularTimer from '@/components/ui/CircularTimer';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { reconcileTimerRing, type TimerRingState } from './timerResync';

export type MpTimerColor = 'lime' | 'pink' | 'cyan' | 'purple';
export type MpTimerSize = 'sm' | 'md' | 'lg' | 'xl';

/** Ring diameter per size token: phone HUD 44, desktop HUD 72, TV 96. */
export const MP_TIMER_PX: Record<MpTimerSize, number> = { sm: 32, md: 44, lg: 72, xl: 96 };

/** Seconds at or below which the timer turns urgent (pink ring, digit punch). */
export const MP_TIMER_URGENT_SEC = 10;

/** m:ss from server seconds (rounded, never negative). */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export interface ShellBadgeTimerProps {
  /** Server-authoritative seconds remaining. The single source of truth. */
  remainingTime: number;
  /** Total match duration in seconds — drives the ring's full-circle fill. */
  totalTime: number;
  /** Ring diameter in px. */
  size?: number;
  /** Per-mode ring color (classic=cyan, blast=lime, wheel-rush=pink, …). */
  colorFamily?: MpTimerColor;
}

/**
 * The self-driven ring kept honest against the server: it sweeps on its own
 * RAF and is only re-seeded (a changed `timerKey`) when the server's
 * `remainingTime` drifts past tolerance — a reconnect resend or a throttled
 * tab. Never `components/CircularTimer.tsx` (its framer pulses repeat forever).
 */
function ShellBadgeTimerImpl({ remainingTime, totalTime, size = 80, colorFamily = 'cyan' }: ShellBadgeTimerProps) {
  const stateRef = useRef<TimerRingState | null>(null);
  // Pure + idempotent: a Strict-Mode double render lands on the same state.
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

/** Ring-only timer (the desktop shell's badge). Prefer `MpTimer` in new code. */
export const ShellBadgeTimer = memo(ShellBadgeTimerImpl);
ShellBadgeTimer.displayName = 'ShellBadgeTimer';

export interface MpTimerProps {
  remainingSec: number;
  totalSec: number;
  size: MpTimerSize;
  colorFamily?: MpTimerColor;
  /** Hide the m:ss digits (ring only). */
  hideDigits?: boolean;
  className?: string;
}

/**
 * HUD timer: server-synced ring + m:ss. At ≤10s the ring turns pink and the
 * digits punch ONCE per tick (the span re-keys per second, so the keyframe
 * runs once — never an infinite loop).
 */
function MpTimerImpl({ remainingSec, totalSec, size, colorFamily = 'cyan', hideDigits, className }: MpTimerProps) {
  const { t } = useLanguage();
  const urgent = remainingSec <= MP_TIMER_URGENT_SEC;
  const clock = formatClock(remainingSec);
  const whole = Math.max(0, Math.round(remainingSec));
  return (
    <div
      data-testid="mp-timer"
      data-urgent={String(urgent)}
      role="timer"
      aria-label={t('mpUi.shell.timeLeft', { seconds: whole })}
      className={cn('inline-flex items-center gap-2', className)}
    >
      <ShellBadgeTimer
        remainingTime={remainingSec}
        totalTime={totalSec}
        size={MP_TIMER_PX[size]}
        colorFamily={urgent ? 'pink' : colorFamily}
      />
      {!hideDigits && (
        <span
          key={urgent ? whole : 'calm'}
          data-testid="mp-timer-digits"
          aria-hidden="true"
          className={cn(
            'font-neo-display font-bold tabular-nums leading-none',
            size === 'sm' || size === 'md' ? 'text-lg' : 'text-3xl',
            urgent ? 'text-neo-pink animate-mp-punch' : 'text-neo-white',
          )}
        >
          {clock}
        </span>
      )}
    </div>
  );
}

export const MpTimer = memo(MpTimerImpl);
MpTimer.displayName = 'MpTimer';
