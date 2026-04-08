/**
 * EnhancedTimer Component
 *
 * Animated countdown timer with urgency states, flip animation, and visual warnings.
 * Creates tension as time runs out.
 *
 * Respects prefers-reduced-motion for accessibility.
 */

'use client';

import { memo } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

// ==============================================
// TYPES
// ==============================================

interface EnhancedTimerProps {
  timeRemaining: number;
  totalTime: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showIcon?: boolean;
}

interface FlipDigitProps {
  digit: string;
  className?: string;
  prefersReducedMotion?: boolean;
}

// ==============================================
// CONSTANTS
// ==============================================

const WARNING_THRESHOLD = 30;
const DANGER_THRESHOLD = 10;
const CRITICAL_THRESHOLD = 5;

// ==============================================
// FLIP DIGIT COMPONENT
// ==============================================

const FlipDigit = memo(function FlipDigit({ digit, className, prefersReducedMotion }: FlipDigitProps) {
  // If reduced motion is preferred, just show the digit without animation
  if (prefersReducedMotion) {
    return (
      <div className={cn('relative w-[0.6em] h-[1.2em]', className)}>
        <span className="absolute inset-0 flex items-center justify-center font-mono">
          {digit}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('relative w-[0.6em] h-[1.2em] overflow-hidden', className)}>
      <AdaptiveAnimatePresence mode="popLayout">
        <AdaptiveMotion.span
          key={digit}
          initial={{ y: '-100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute inset-0 flex items-center justify-center font-mono"
        >
          {digit}
        </AdaptiveMotion.span>
      </AdaptiveAnimatePresence>
    </div>
  );
});

// ==============================================
// MAIN COMPONENT
// ==============================================

export const EnhancedTimer = memo(function EnhancedTimer({
  timeRemaining,
  totalTime,
  size = 'md',
  className,
  showIcon = true,
}: EnhancedTimerProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  // Format time
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  
  const minTens = Math.floor(minutes / 10).toString();
  const minOnes = (minutes % 10).toString();
  const secTens = Math.floor(seconds / 10).toString();
  const secOnes = (seconds % 10).toString();

  // Determine urgency state based on time thresholds
  function getUrgencyState(): 'critical' | 'danger' | 'warning' | 'normal' {
    if (timeRemaining <= CRITICAL_THRESHOLD) return 'critical';
    if (timeRemaining <= DANGER_THRESHOLD) return 'danger';
    if (timeRemaining <= WARNING_THRESHOLD) return 'warning';
    return 'normal';
  }

  const urgencyState = getUrgencyState();
  const progress = (timeRemaining / totalTime) * 100;

  // Size classes
  const sizeClasses = {
    sm: 'text-lg px-2 py-1',
    md: 'text-2xl px-3 py-2',
    lg: 'text-4xl px-4 py-3',
  };

  // Urgency styles - using hard shadows (no glow) per neo-brutalist design
  const urgencyStyles = {
    normal: {
      bg: 'bg-neo-navy/80',
      border: 'border-2 border-neo-white/20',
      text: 'text-neo-white',
      shadow: 'shadow-hard-sm',
      progressColor: '#22d3ee',
    },
    warning: {
      bg: 'bg-neo-orange/20',
      border: 'border-2 border-neo-orange/60',
      text: 'text-neo-orange',
      shadow: 'shadow-hard-sm',
      progressColor: '#ff6b35',
    },
    danger: {
      bg: 'bg-neo-red/20',
      border: 'border-2 border-neo-red/60',
      text: 'text-neo-red',
      shadow: 'shadow-hard',
      progressColor: '#ff0000',
    },
    critical: {
      bg: 'bg-neo-red/30',
      border: 'border-3 border-neo-red',
      text: 'text-neo-red',
      shadow: 'shadow-hard',
      progressColor: '#ff0000',
    },
  };

  const styles = urgencyStyles[urgencyState];

  // Critical state: simple pulsing background color (opacity change only)
  // Respects prefers-reduced-motion
  const isCriticalAnimating = urgencyState === 'critical' && !prefersReducedMotion;
  const criticalAnimation = isCriticalAnimating
    ? { opacity: [1, 0.7, 1] }
    : {};
  const criticalTransition = isCriticalAnimating
    ? { duration: 0.8, repeat: Infinity, ease: 'easeInOut' as const }
    : undefined;

  return (
    <AdaptiveMotion.div
      className={cn(
        'relative rounded-neo flex items-center gap-2 font-black',
        'transition-colors duration-300',
        sizeClasses[size],
        styles.bg,
        styles.border,
        styles.text,
        styles.shadow,
        className
      )}
      animate={criticalAnimation}
      transition={criticalTransition}
    >
      {/* Progress ring SVG - perimeter ≈ 2*(96+96)=384 */}
      <svg
        className="absolute inset-0 w-full h-full -z-10 opacity-20"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <rect
          x="2"
          y="2"
          width="96"
          height="96"
          rx="8"
          fill="none"
          stroke={styles.progressColor}
          strokeWidth="4"
          strokeDasharray="384 384"
          strokeDashoffset={384 - (384 * progress) / 100}
          className="transition-all duration-1000"
        />
      </svg>

      {/* Icon - switches to AlertTriangle in critical state, no animation */}
      {showIcon && (
        <div className="relative shrink-0">
          {urgencyState === 'critical' ? (
            <AlertTriangle
              className={cn(
                size === 'sm' && 'w-4 h-4',
                size === 'md' && 'w-5 h-5',
                size === 'lg' && 'w-8 h-8'
              )}
            />
          ) : (
            <Clock
              className={cn(
                size === 'sm' && 'w-4 h-4',
                size === 'md' && 'w-5 h-5',
                size === 'lg' && 'w-8 h-8'
              )}
            />
          )}
        </div>
      )}

      {/* Time display with flip animation */}
      <div dir="ltr" className="flex items-center font-mono tabular-nums">
        {/* Minutes */}
        <FlipDigit digit={minTens} prefersReducedMotion={prefersReducedMotion} />
        <FlipDigit digit={minOnes} prefersReducedMotion={prefersReducedMotion} />

        {/* Separator - blinking colon respects reduced motion */}
        <AdaptiveMotion.span
          className="mx-0.5"
          animate={prefersReducedMotion ? {} : { opacity: [1, 0.3, 1] }}
          transition={prefersReducedMotion ? {} : { duration: 1, repeat: Infinity }}
        >
          :
        </AdaptiveMotion.span>

        {/* Seconds */}
        <FlipDigit digit={secTens} prefersReducedMotion={prefersReducedMotion} />
        <FlipDigit digit={secOnes} prefersReducedMotion={prefersReducedMotion} />
      </div>

      {/* No glow effect - using hard shadows per neo-brutalist design */}
    </AdaptiveMotion.div>
  );
});

EnhancedTimer.displayName = 'EnhancedTimer';
FlipDigit.displayName = 'FlipDigit';

export default EnhancedTimer;
