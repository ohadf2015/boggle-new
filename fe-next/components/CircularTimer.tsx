import { memo, useEffect, useRef } from 'react';
import { m } from 'framer-motion';
import { useReducedMotion } from '../utils/accessibility';
import { formatTimeMMSS } from '@/shared/utils';
import { preloadResultsChunks } from '@/utils/preloadResults';
import { useIsSelecting } from '@/hooks/useSelectionStore';
import { useSuppressTimerUrgency } from '@/contexts/AccessibilityContext';
import { computeTimerUrgency } from '@/lib/cosy/timerUrgency';

/**
 * CircularTimer Props
 */
interface CircularTimerProps {
  remainingTime: number;
  totalTime?: number;
  /** Size variant: 'xs' for ultra-compact mobile, 'sm' for compact landscape mode, 'md' (default) for normal, 'lg' for desktop */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Called when timer urgency state changes — used by parent to render screen glow effect */
  onTimerState?: (state: 'normal' | 'low' | 'veryLow' | 'critical') => void;
}

// Size configurations - frameClasses removed since we no longer have a background frame
const SIZES = {
  xs: { svgSize: 80, radius: 30, strokeWidth: 6, textSize: 'text-xl', frameClasses: '', badgeClasses: 'hidden' },
  sm: { svgSize: 100, radius: 38, strokeWidth: 8, textSize: 'text-2xl', frameClasses: '', badgeClasses: 'hidden' },
  md: { svgSize: 120, radius: 45, strokeWidth: 10, textSize: 'text-3xl', frameClasses: '', badgeClasses: '' },
  lg: { svgSize: 140, radius: 52, strokeWidth: 12, textSize: 'text-4xl', frameClasses: '', badgeClasses: '' },
};

/**
 * CircularTimer - Neo-Brutalist styled countdown timer
 * Memoized to prevent unnecessary re-renders when parent updates
 * Respects prefers-reduced-motion for accessibility
 */
const CircularTimer = memo<CircularTimerProps>(({ remainingTime, totalTime = 180, size = 'md', onTimerState }) => {
  const reduceMotion = useReducedMotion();
  const isSelecting = useIsSelecting();
  // Cosy / Calm mode: keep the timer counting but stop it shouting.
  const suppressUrgency = useSuppressTimerUrgency();
  const prevStateRef = useRef<'normal' | 'low' | 'veryLow' | 'critical'>('normal');
  const config = SIZES[size];

  // Remaining clamped so a reconnect tick > total cannot invert the ring
  // (negative dashoffset looks like time is filling up, not counting down).
  const clampedRemaining = Math.max(0, Math.min(remainingTime, Math.max(totalTime, 0)));
  const progress = totalTime > 0 ? clampedRemaining / totalTime : 0;

  // Calculate the stroke dash offset for the circular progress
  const radius = config.radius;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  // Urgency escalation — clamped to 'normal' under cosy / calm mode.
  const { state: currentState, isLowTime, isVeryLowTime, isCriticalTime } =
    computeTimerUrgency(remainingTime, suppressUrgency);

  // Preload results page chunks near the end (idempotent — safe to call
  // repeatedly). Kept independent of urgency *display* so cosy mode doesn't
  // disable this perf nicety.
  const shouldPreloadResults = remainingTime <= 10 && remainingTime > 0;
  useEffect(() => {
    if (shouldPreloadResults) {
      preloadResultsChunks();
    }
  }, [shouldPreloadResults]);

  useEffect(() => {
    if (onTimerState && currentState !== prevStateRef.current) {
      prevStateRef.current = currentState;
      onTimerState(currentState);
    }
  }, [currentState, onTimerState]);

  const svgCenter = config.svgSize / 2;

  return (
    <m.div
      role="timer"
      initial={reduceMotion ? { opacity: 1 } : { scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.3, ease: 'easeOut' }}
      className="flex items-center justify-center"
    >
      {/* Neo-Brutalist frame - circular design */}
      <div
        className={`
          relative
          ${config.frameClasses}
          ${isCriticalTime ? 'drop-shadow-[0_0_15px_rgb(255_50_50/0.6)]' : ''}
        `}
      >
        <div className="relative">
          <svg width={config.svgSize} height={config.svgSize} className="transform -rotate-90">
            {/* Neo-Brutalist: Solid colors instead of gradients */}

            {/* Background circle - thick black stroke */}
            <circle
              cx={svgCenter}
              cy={svgCenter}
              r={radius}
              stroke="var(--neo-black)"
              strokeWidth={size === 'xs' ? 1.5 : size === 'sm' ? 2 : 4}
              fill="none"
              opacity="0.2"
            />

            {/* Inner background circle */}
            <circle
              cx={svgCenter}
              cy={svgCenter}
              r={radius - (size === 'xs' ? 2 : size === 'sm' ? 3 : 6)}
              stroke="var(--neo-black)"
              strokeWidth={size === 'xs' ? 4 : size === 'sm' ? 6 : 12}
              fill="none"
              opacity="0.1"
            />

            {/* Progress circle - CSS transition is composited, runs without
                JS frame work (the previous m.circle ran a 500ms framer-motion
                tween per 1Hz prop change × 4 breakpoint-cloned mounts). */}
            <m.circle
              cx={svgCenter}
              cy={svgCenter}
              r={radius}
              stroke={isLowTime ? 'var(--neo-red)' : 'var(--neo-cyan)'}
              strokeWidth={config.strokeWidth}
              fill="none"
              strokeLinecap="square"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 0.5s linear' }}
            />

            {/* Outer ring */}
            <circle
              cx={svgCenter}
              cy={svgCenter}
              r={radius + (size === 'xs' ? 1.5 : size === 'sm' ? 2 : 4)}
              stroke="var(--neo-black)"
              strokeWidth={size === 'xs' ? 1.5 : size === 'sm' ? 2 : 3}
              fill="none"
            />
          </svg>

          {/* Timer text in the center. The infinite scale/opacity pulse on
              critical/veryLow time is suppressed while the user is mid-drag —
              the grid drag rendering needs the main thread more than the timer
              needs to throb. Drops the cost of 4 breakpoint-cloned mounts each
              running their own framer-motion pulse loop at 5s remaining. */}
          <div className="absolute inset-0 flex items-center justify-center">
            <m.div
              className={`${isCriticalTime ? 'text-4xl sm:text-5xl' : config.textSize} font-black ${isLowTime ? 'text-neo-red' : 'text-neo-white'}`}
              animate={isSelecting ? {} : isCriticalTime && !reduceMotion ? {
                scale: [1, 1.25, 1],
                opacity: [1, 0.8, 1],
              } : isVeryLowTime && !reduceMotion ? {
                scale: [1, 1.1, 1],
              } : {}}
              transition={isSelecting ? {} : isCriticalTime ? {
                duration: 0.35,
                repeat: Infinity,
                ease: 'easeInOut',
              } : isVeryLowTime ? {
                duration: 0.5,
                repeat: Infinity,
                ease: 'easeInOut',
              } : {}}
              style={{
                textShadow: isLowTime
                  ? `${size === 'xs' || size === 'sm' ? '1px 1px' : '2px 2px'} 0px rgba(0,0,0,0.3)`
                  : `${size === 'xs' || size === 'sm' ? '1px 1px' : '2px 2px'} 0px rgba(0,0,0,0.5)`,
                transition: 'color 0.3s ease',
              }}
            >
              {formatTimeMMSS(remainingTime)}
            </m.div>
          </div>
        </div>
      </div>
    </m.div>
  );
});

CircularTimer.displayName = 'CircularTimer';

export default CircularTimer;
