/**
 * AdventureTimer Component
 *
 * Displays countdown timer with urgency states (normal, warning, danger).
 * Features flip digit animation and pulsing glow effects.
 * Urgency colors driven by useTimerTheme() for per-world theming.
 *
 * Performance: accepts an optional `timerStore` prop. When provided, this
 * component subscribes directly via useSyncExternalStore so it re-renders
 * independently of its parent — parent re-renders don't cascade here on
 * non-timer changes, and per-second ticks don't re-render siblings.
 */

'use client';

import React, { memo, useMemo } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTimerTheme } from '@/contexts/AdventureThemeContext';
import { type AdventureTimerStore, useAdventureTimerValue } from '@/hooks/useAdventureTimerStore';

// ==============================================
// TYPES
// ==============================================

interface AdventureTimerProps {
  /**
   * External timer store (preferred). Subscribes via useSyncExternalStore so
   * only this component re-renders each second, not sibling components.
   * When provided, `timeRemaining` prop is ignored.
   */
  timerStore?: AdventureTimerStore;
  /**
   * Fallback: direct timeRemaining value. Used when timerStore is not passed
   * (legacy callers, tests that pass the value directly).
   */
  timeRemaining?: number;
  /**
   * Size variant.
   * - `embedded`: no border/bg/icon — just digits, for nesting inside another pill.
   */
  size?: 'compact' | 'normal' | 'large' | 'embedded';
  /** Additional CSS classes */
  className?: string;
}

interface FlipDigitProps {
  digit: string;
  className?: string;
}

interface AdventureTimerDisplayProps {
  timeRemaining: number;
  size: 'compact' | 'normal' | 'large' | 'embedded';
  className?: string;
}

// ==============================================
// CONSTANTS
// ==============================================

const WARNING_THRESHOLD = 30;
const DANGER_THRESHOLD = 10;
const CRITICAL_THRESHOLD = 5;

// ==============================================
// NO-OP STORE for when timerStore prop is absent
// ==============================================

const NO_OP_STORE: AdventureTimerStore = {
  getSnapshot: () => 0,
  subscribe: () => () => {},
  notify: () => {},
  destroy: () => {},
};

// ==============================================
// FLIP DIGIT COMPONENT
// ==============================================

const FlipDigit = memo(function FlipDigit({ digit, className }: FlipDigitProps) {
  return (
    <div className={cn('relative w-[0.55em] h-[1.1em] overflow-hidden', className)}>
      <AdaptiveAnimatePresence mode="popLayout">
        <AdaptiveMotion.span
          key={digit}
          initial={{ y: '-100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {digit}
        </AdaptiveMotion.span>
      </AdaptiveAnimatePresence>
    </div>
  );
});

// ==============================================
// DISPLAY COMPONENT (pure, receives timeRemaining as number)
// ==============================================

const AdventureTimerDisplay = memo<AdventureTimerDisplayProps>(
  ({ timeRemaining, size, className }) => {
    // Format time
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;

    const minTens = Math.floor(minutes / 10).toString();
    const minOnes = (minutes % 10).toString();
    const secTens = Math.floor(seconds / 10).toString();
    const secOnes = (seconds % 10).toString();

    // Determine urgency state
    const urgencyState = useMemo(() => {
      if (timeRemaining <= CRITICAL_THRESHOLD) return 'critical';
      if (timeRemaining <= DANGER_THRESHOLD) return 'danger';
      if (timeRemaining <= WARNING_THRESHOLD) return 'warning';
      return 'normal';
    }, [timeRemaining]);

    const isDanger = urgencyState === 'danger' || urgencyState === 'critical';
    const isCritical = urgencyState === 'critical';
    const shouldPulse = isDanger;

    const isEmbedded = size === 'embedded';

    // Size classes
    const sizeClasses: Record<string, string> = {
      embedded: 'text-xs gap-0',
      compact: 'text-sm sm:text-base px-2.5 py-1.5 gap-1.5',
      normal: 'text-lg px-3 py-2 gap-2',
      large: 'text-3xl px-4 py-3 gap-3',
    };

    const iconSizes: Record<string, string> = {
      embedded: 'w-3 h-3',
      compact: 'w-4 h-4 sm:w-5 sm:h-5',
      normal: 'w-5 h-5',
      large: 'w-8 h-8',
    };

    // Theme-driven urgency styles
    const timerTheme = useTimerTheme();
    const themeLevel = timerTheme[urgencyState];

    return (
      <AdaptiveMotion.div
        role="timer"
        aria-label={`${timeRemaining} seconds remaining`}
        aria-live={isDanger ? 'assertive' : 'polite'}
        className={cn(
          'flex items-center font-black',
          'transition-all duration-300',
          sizeClasses[size],
          isEmbedded
            ? cn('relative', isDanger ? 'text-neo-red' : themeLevel.text)
            : cn('rounded-neo border-2', themeLevel.bg, themeLevel.text, themeLevel.shadow),
          className
        )}
        animate={shouldPulse ? {
          scale: [1, 1.02, 1],
        } : {}}
        transition={{ duration: 0.5, repeat: shouldPulse ? Infinity : 0 }}
      >
        {/* Icon — hidden in embedded mode */}
        {!isEmbedded && (
          <div className="relative">
            {isCritical ? (
              <AdaptiveMotion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                <AlertTriangle className={iconSizes[size]} />
              </AdaptiveMotion.div>
            ) : (
              <Clock className={iconSizes[size]} />
            )}
          </div>
        )}

        {/* Time display with flip animation */}
        <div dir="ltr" className="flex items-center font-mono tabular-nums">
          {/* Minutes */}
          <FlipDigit digit={minTens} />
          <FlipDigit digit={minOnes} />

          {/* Separator */}
          <AdaptiveMotion.span
            className="mx-0.5 opacity-60"
            animate={{ opacity: [0.6, 0.3, 0.6] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            :
          </AdaptiveMotion.span>

          {/* Seconds */}
          <FlipDigit digit={secTens} />
          <FlipDigit digit={secOnes} />
        </div>

        {/* Urgency glow effect — hidden in embedded mode (parent handles theming) */}
        {isDanger && !isEmbedded && (
          <AdaptiveMotion.div
            className="absolute inset-0 rounded-neo pointer-events-none"
            style={{ boxShadow: '0 0 25px rgba(255, 0, 0, 0.6)' }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
      </AdaptiveMotion.div>
    );
  }
);

// ==============================================
// PUBLIC COMPONENT
// ==============================================

/**
 * AdventureTimer renders the countdown display.
 *
 * Pass `timerStore` (from useAdventureGame) to subscribe directly —
 * only this component re-renders each second, not its parent or siblings.
 *
 * Pass `timeRemaining` directly for tests and legacy callers.
 */
const AdventureTimer = memo<AdventureTimerProps>(function AdventureTimer({
  timerStore,
  timeRemaining: timeRemainingProp = 0,
  size = 'normal',
  className,
}) {
  // Always call the hook (no conditional hook calls). When timerStore is absent,
  // NO_OP_STORE returns 0 and never notifies, so this subscription is dormant.
  const storeValue = useAdventureTimerValue(timerStore ?? NO_OP_STORE);
  const timeRemaining = timerStore ? storeValue : timeRemainingProp;

  return (
    <AdventureTimerDisplay
      timeRemaining={timeRemaining}
      size={size}
      className={className}
    />
  );
});

AdventureTimer.displayName = 'AdventureTimer';
AdventureTimerDisplay.displayName = 'AdventureTimerDisplay';
FlipDigit.displayName = 'FlipDigit';

export default AdventureTimer;
