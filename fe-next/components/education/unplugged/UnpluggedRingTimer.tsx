/**
 * The reveal countdown ring — one tap starts it, the whole room can read it.
 *
 * The ring is INFORMATION, so prefers-reduced-motion only drops the pulse, never
 * the sweep. Resting state is fully painted (no opacity-from-0 entrance).
 */
'use client';

import { cn } from '@/lib/utils';

const RADIUS = 46;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export interface UnpluggedRingTimerProps {
  /** 0..1 — share of the countdown still left. */
  progress: number;
  secondsLeft: number;
  /** Under the urgency threshold: orange ring + pulsing numeral. */
  urgent: boolean;
  /** Countdown is armed and sweeping. */
  running: boolean;
  /** Word already revealed — ring goes quiet. */
  spent: boolean;
  label: string;
  reducedMotion?: boolean;
  className?: string;
}

export function UnpluggedRingTimer({
  progress,
  secondsLeft,
  urgent,
  running,
  spent,
  label,
  reducedMotion = false,
  className,
}: UnpluggedRingTimerProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const stroke = spent
    ? 'var(--color-neo-white, #fff)'
    : urgent
      ? 'var(--color-neo-orange, #FF6B35)'
      : 'var(--color-neo-cyan, #00FFFF)';

  return (
    <div
      data-testid="unplugged-ring-timer"
      data-running={String(running)}
      data-urgent={String(urgent)}
      className={cn('relative shrink-0 aspect-square', className)}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="#000" strokeWidth="11" />
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth="7"
        />
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke={stroke}
          strokeWidth="7"
          strokeLinecap="butt"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - (spent ? 0 : clamped))}
          opacity={spent ? 0.3 : 1}
          style={{ transition: reducedMotion ? 'none' : 'stroke-dashoffset 120ms linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          data-testid="unplugged-ring-seconds"
          className={cn(
            'font-neo-display font-bold leading-none tabular-nums',
            'text-[clamp(1.5rem,4.2vw,3.5rem)]',
            spent ? 'text-neo-white/40' : urgent ? 'text-neo-orange' : 'text-neo-white',
            urgent && !reducedMotion && 'animate-neo-wobble',
          )}
        >
          {Math.max(0, secondsLeft)}
        </span>
        <span className="font-neo-body font-bold uppercase tracking-widest text-neo-white/50 text-[clamp(0.45rem,0.8vw,0.7rem)] mt-0.5">
          {label}
        </span>
      </div>
    </div>
  );
}
