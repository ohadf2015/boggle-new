'use client';

import { memo, useMemo, useCallback } from 'react';
import { CountdownCircleTimer } from 'react-countdown-circle-timer';
import { cn } from '@/lib/utils';

interface CircularTimerProps {
  /** Total duration in seconds */
  duration: number;
  /** Whether the timer is currently counting down */
  isPlaying: boolean;
  /** Size in pixels */
  size?: number;
  /** Stroke width */
  strokeWidth?: number;
  /** Color family: lime, pink, cyan, purple */
  colorFamily?: 'lime' | 'pink' | 'cyan' | 'purple';
  /** Warning threshold in seconds (switches to orange) */
  warningAt?: number;
  /** Critical threshold in seconds (switches to red) */
  criticalAt?: number;
  /** Called when timer completes */
  onComplete?: () => void;
  /** Additional className for the wrapper */
  className?: string;
  /** Unique key to reset the timer (change to restart) */
  timerKey?: number | string;
  /** Starting point in seconds (for mid-game reconnects). Defaults to duration. */
  initialRemainingTime?: number;
}

const COLOR_FAMILIES = {
  lime: { normal: '#BFFF00', trail: '#1a1a2e' },
  pink: { normal: '#FF1493', trail: '#1a1a2e' },
  cyan: { normal: '#00FFFF', trail: '#1a1a2e' },
  purple: { normal: '#8B5CF6', trail: '#1a1a2e' },
} as const;

const WARNING_COLOR = '#FF6B35';
const CRITICAL_COLOR = '#FF3366';

/**
 * CircularTimer — Neo-brutalist countdown ring
 * Wraps react-countdown-circle-timer with project theme colors and urgency transitions.
 */
const CircularTimer = memo<CircularTimerProps>(({
  duration,
  isPlaying,
  size = 80,
  strokeWidth = 6,
  colorFamily = 'cyan',
  warningAt = 10,
  criticalAt = 5,
  onComplete,
  className,
  timerKey = 0,
  initialRemainingTime,
}) => {
  const family = COLOR_FAMILIES[colorFamily];

  // Hold the normal color until warningAt — interpolating from `duration`
  // down to `warningAt` painted the ring orange for most of the match.
  const colors = useMemo(() => {
    return [family.normal, family.normal, WARNING_COLOR, CRITICAL_COLOR] as [
      `#${string}`,
      `#${string}`,
      `#${string}`,
      `#${string}`,
    ];
  }, [family.normal]);

  const colorsTime = useMemo((): { 0: number } & { 1: number } & number[] => {
    const warn = Math.min(Math.max(warningAt, 0), duration);
    const crit = Math.min(Math.max(criticalAt, 0), warn);
    return [duration, warn, Math.max(crit, warn - 0.01), crit];
  }, [duration, warningAt, criticalAt]);

  const handleComplete = useCallback(() => {
    onComplete?.();
    return { shouldRepeat: false } as const;
  }, [onComplete]);

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <CountdownCircleTimer
        key={timerKey}
        isPlaying={isPlaying}
        duration={duration}
        initialRemainingTime={initialRemainingTime}
        colors={colors}
        colorsTime={colorsTime}
        size={size}
        strokeWidth={strokeWidth}
        trailColor={family.trail}
        strokeLinecap="square"
        onComplete={handleComplete}
      >
        {({ remainingTime }) => {
          const total = Math.max(0, Math.floor(remainingTime));
          const mins = Math.floor(total / 60);
          const secs = total % 60;
          const display = `${mins}:${secs.toString().padStart(2, '0')}`;

          return (
            <span
              className={cn(
                'font-neo-display font-black tabular-nums text-neo-white',
                size < 60 ? 'text-xs' : size < 100 ? 'text-lg' : 'text-2xl'
              )}
            >
              {display}
            </span>
          );
        }}
      </CountdownCircleTimer>
    </div>
  );
});

CircularTimer.displayName = 'CircularTimer';

export default CircularTimer;
