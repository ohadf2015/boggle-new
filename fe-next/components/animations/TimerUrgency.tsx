'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { cn } from '@/lib/utils';
import { Clock, AlertTriangle } from 'lucide-react';

interface TimerUrgencyProps {
  /** Time remaining in seconds */
  timeRemaining: number;
  /** Total time in seconds (for percentage calculation) */
  totalTime: number;
  /** Threshold for warning state (seconds) */
  warningThreshold?: number;
  /** Threshold for critical state (seconds) */
  criticalThreshold?: number;
  /** Show progress bar */
  showProgressBar?: boolean;
  /** Show time text */
  showTimeText?: boolean;
  /** Compact mode */
  compact?: boolean;
  /** Format time as MM:SS or just seconds */
  formatAsMinutes?: boolean;
  /** Callback when warning threshold reached */
  onWarning?: () => void;
  /** Callback when critical threshold reached */
  onCritical?: () => void;
  /** Additional className */
  className?: string;
}

type UrgencyLevel = 'normal' | 'warning' | 'critical';

const URGENCY_CONFIG = {
  normal: {
    bg: 'bg-neo-cyan',
    text: 'text-neo-cyan',
    glow: '#00FFFF',
    pulseSpeed: 0,
  },
  warning: {
    bg: 'bg-neo-orange',
    text: 'text-neo-orange',
    glow: '#FF6B35',
    pulseSpeed: 1.5,
  },
  critical: {
    bg: 'bg-red-500',
    text: 'text-red-500',
    glow: '#EF4444',
    pulseSpeed: 0.5,
  },
};

/**
 * TimerUrgency - Countdown timer with visual urgency states
 *
 * Features:
 * - Progressive urgency colors (cyan → orange → red)
 * - Pulse animation that intensifies with urgency
 * - Screen edge glow at critical time
 * - Sound/haptic callback hooks
 * - Progress bar with animated fill
 *
 * @example
 * ```tsx
 * <TimerUrgency
 *   timeRemaining={timeLeft}
 *   totalTime={120}
 *   warningThreshold={30}
 *   criticalThreshold={10}
 *   showProgressBar
 *   onCritical={() => playUrgentSound()}
 * />
 * ```
 */
export function TimerUrgency({
  timeRemaining,
  totalTime,
  warningThreshold = 30,
  criticalThreshold = 10,
  showProgressBar = true,
  showTimeText = true,
  compact = false,
  formatAsMinutes = true,
  onWarning,
  onCritical,
  className,
}: TimerUrgencyProps) {
  const { isLowEnd, prefersReducedMotion, enableGlowEffects } = useDevicePerformance();
  const [hasTriggeredWarning, setHasTriggeredWarning] = useState(false);
  const [hasTriggeredCritical, setHasTriggeredCritical] = useState(false);

  // Determine urgency level
  const urgencyLevel: UrgencyLevel = useMemo(() => {
    if (timeRemaining <= criticalThreshold) return 'critical';
    if (timeRemaining <= warningThreshold) return 'warning';
    return 'normal';
  }, [timeRemaining, warningThreshold, criticalThreshold]);

  const config = URGENCY_CONFIG[urgencyLevel];
  const percentage = Math.max(0, Math.min(100, (timeRemaining / totalTime) * 100));

  // Format time — floor so a float remaining value never renders as "1:29.7"
  const formattedTime = useMemo(() => {
    const total = Math.max(0, Math.floor(timeRemaining));
    if (formatAsMinutes) {
      const mins = Math.floor(total / 60);
      const secs = total % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${total}`;
  }, [timeRemaining, formatAsMinutes]);

  // Trigger callbacks
  useEffect(() => {
    if (urgencyLevel === 'warning' && !hasTriggeredWarning) {
      setHasTriggeredWarning(true);
      onWarning?.();
    }
    if (urgencyLevel === 'critical' && !hasTriggeredCritical) {
      setHasTriggeredCritical(true);
      onCritical?.();
    }
  }, [urgencyLevel, hasTriggeredWarning, hasTriggeredCritical, onWarning, onCritical]);

  // Reset triggers when time resets
  useEffect(() => {
    if (timeRemaining > warningThreshold) {
      setHasTriggeredWarning(false);
      setHasTriggeredCritical(false);
    }
  }, [timeRemaining, warningThreshold]);

  // Reduced motion - static display
  if (prefersReducedMotion) {
    return (
      <div
        className={cn(
          'rounded-neo border-3 border-neo-black shadow-hard px-3 py-1',
          config.bg,
          className
        )}
      >
        <span className="font-black text-neo-black">{formattedTime}</span>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {/* Screen edge glow for critical */}
      {urgencyLevel === 'critical' && enableGlowEffects && !isLowEnd && (
        <m.div
          className="fixed inset-0 pointer-events-none z-[60]"
          animate={{
            opacity: [0, 0.15, 0],
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            background: `
              linear-gradient(to bottom, ${config.glow}40 0%, transparent 20%),
              linear-gradient(to top, ${config.glow}40 0%, transparent 20%)
            `,
          }}
        />
      )}

      {/* Main timer container */}
      <m.div
        className={cn(
          'relative rounded-neo border-3 border-neo-black overflow-hidden',
          config.bg,
          compact ? 'px-2 py-0.5' : 'px-4 py-2'
        )}
        animate={
          config.pulseSpeed > 0
            ? {
                scale: [1, 1.02, 1],
                boxShadow: enableGlowEffects
                  ? [
                      '4px 4px 0 black',
                      `4px 4px 0 black, 0 0 15px ${config.glow}60`,
                      '4px 4px 0 black',
                    ]
                  : undefined,
              }
            : undefined
        }
        transition={{
          duration: config.pulseSpeed,
          repeat: config.pulseSpeed > 0 ? Infinity : 0,
          ease: 'easeInOut',
        }}
        style={{
          boxShadow: enableGlowEffects && urgencyLevel !== 'normal'
            ? `4px 4px 0 black, 0 0 10px ${config.glow}40`
            : '4px 4px 0 black',
        }}
      >
        {/* Time display */}
        {showTimeText && (
          <div className={cn(
            'flex items-center justify-center gap-2',
            compact ? 'text-sm' : 'text-xl'
          )}>
            {urgencyLevel === 'critical' ? (
              <m.div
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.3, repeat: Infinity }}
              >
                <AlertTriangle
                  className={cn(
                    'text-neo-black',
                    compact ? 'w-3 h-3' : 'w-5 h-5'
                  )}
                />
              </m.div>
            ) : (
              <Clock
                className={cn(
                  'text-neo-black',
                  compact ? 'w-3 h-3' : 'w-4 h-4'
                )}
              />
            )}
            <m.span
              className="font-black text-neo-black tabular-nums"
              animate={
                urgencyLevel === 'critical'
                  ? { scale: [1, 1.1, 1] }
                  : undefined
              }
              transition={{
                duration: 0.5,
                repeat: urgencyLevel === 'critical' ? Infinity : 0,
              }}
            >
              {formattedTime}
            </m.span>
          </div>
        )}

        {/* Progress bar */}
        {showProgressBar && (
          <div
            className={cn(
              'w-full bg-neo-black/20 rounded-full overflow-hidden',
              compact ? 'h-1 mt-0.5' : 'h-2 mt-2'
            )}
          >
            <m.div
              className="h-full bg-neo-black/60 rounded-full"
              initial={{ width: '100%' }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}
      </m.div>

      {/* Tick marks for milestones */}
      {!compact && urgencyLevel !== 'normal' && !isLowEnd && (
        <m.div
          className="absolute -right-1 -top-1"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [1, 0.7, 1],
          }}
          transition={{
            duration: config.pulseSpeed || 1,
            repeat: Infinity,
          }}
        >
          <div
            className={cn(
              'w-3 h-3 rounded-full',
              config.bg,
              'border-2 border-neo-black'
            )}
            style={{
              boxShadow: enableGlowEffects ? `0 0 8px ${config.glow}` : undefined,
            }}
          />
        </m.div>
      )}
    </div>
  );
}

/**
 * TimeBonusPopup - Animated popup when bonus time is added
 */
export function TimeBonusPopup({
  amount,
  position,
  onComplete,
}: {
  amount: number;
  position: { x: number; y: number };
  onComplete?: () => void;
}) {
  const { prefersReducedMotion } = useDevicePerformance();

  if (prefersReducedMotion) return null;

  return (
    <m.div
      className="fixed pointer-events-none z-150"
      style={{ left: position.x, top: position.y }}
      initial={{ opacity: 0, y: 0, x: '-50%', scale: 0.8 }}
      animate={{ opacity: [0, 1, 1, 0], y: -40, scale: 1 }}
      transition={{ duration: 1.2 }}
      onAnimationComplete={onComplete}
    >
      <div className="px-3 py-1.5 rounded-neo border-3 border-neo-black shadow-hard bg-neo-lime">
        <span className="font-black text-neo-black flex items-center gap-1">
          <Clock className="w-4 h-4" />
          +{amount}s
        </span>
      </div>
    </m.div>
  );
}

export default TimerUrgency;
