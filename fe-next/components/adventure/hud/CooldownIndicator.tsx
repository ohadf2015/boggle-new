/**
 * CooldownIndicator Component
 *
 * Radial cooldown progress indicator for power-ups.
 * Shows circular SVG with arc depleting clockwise.
 */

'use client';

import { memo, useEffect, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface CooldownIndicatorProps {
  /** Icon to show (emoji or React element) */
  icon: string | React.ReactNode;
  /** Total cooldown duration in seconds */
  totalDuration: number;
  /** Remaining cooldown time in seconds */
  remainingTime: number;
  /** Size: sm=24px, md=36px, lg=48px */
  size?: 'sm' | 'md' | 'lg';
  /** Optional label below icon */
  label?: string;
  /** Callback when cooldown completes */
  onComplete?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// CONSTANTS
// ============================================

const SIZE_CONFIG = {
  sm: {
    size: 24,
    radius: 10,
    strokeWidth: 2,
    iconSize: 'text-xs',
  },
  md: {
    size: 36,
    radius: 14,
    strokeWidth: 3,
    iconSize: 'text-base',
  },
  lg: {
    size: 48,
    radius: 18,
    strokeWidth: 4,
    iconSize: 'text-xl',
  },
} as const;

// ============================================
// COMPONENT
// ============================================

export const CooldownIndicator = memo<CooldownIndicatorProps>(
  ({
    icon,
    totalDuration,
    remainingTime,
    size = 'md',
    label,
    onComplete,
    className,
  }) => {
    const prefersReducedMotion = usePrefersReducedMotion();
    const prevRemainingTime = useRef(remainingTime);

    // Track when cooldown completes to call onComplete once
    useEffect(() => {
      // Only call onComplete when transitioning from > 0 to 0
      const wasActive = prevRemainingTime.current > 0;
      const isNowComplete = remainingTime === 0;

      if (wasActive && isNowComplete && onComplete) {
        onComplete();
      }

      prevRemainingTime.current = remainingTime;
    }, [remainingTime, onComplete]);

    const sizeConfig = SIZE_CONFIG[size];
    const { size: svgSize, radius, strokeWidth } = sizeConfig;

    // Calculate SVG circle properties
    const circumference = 2 * Math.PI * radius;
    const progress = totalDuration > 0 ? remainingTime / totalDuration : 0;
    // Arc depletes as time goes down: offset increases as progress decreases
    const dashOffset = progress * circumference;

    // Check if ready
    const isReady = remainingTime === 0;

    // Format remaining time for reduced motion display
    const formattedTime = useMemo(() => {
      if (isReady) return 'Ready!';
      return `${remainingTime}s`;
    }, [remainingTime, isReady]);

    return (
      <div
        data-testid="cooldown-indicator"
        role="progressbar"
        aria-valuenow={remainingTime}
        aria-valuemax={totalDuration}
        aria-label={
          label
            ? `${label}: ${remainingTime} seconds remaining`
            : `${remainingTime} seconds remaining`
        }
        className={cn(
          'flex flex-col items-center gap-1',
          isReady && 'cooldown-ready',
          className
        )}
      >
        {/* SVG Circle with radial progress */}
        <div className="relative">
          <svg
            data-testid="cooldown-svg"
            width={svgSize}
            height={svgSize}
            viewBox={`0 0 ${svgSize} ${svgSize}`}
            className="transform -rotate-90"
          >
            {/* Background circle */}
            <circle
              cx={svgSize / 2}
              cy={svgSize / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-neo-black/30"
            />

            {/* Progress arc */}
            <circle
              data-testid="cooldown-circle"
              cx={svgSize / 2}
              cy={svgSize / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              className={cn(
                'transition-all duration-300',
                isReady ? 'text-neo-lime' : 'text-neo-cyan'
              )}
            />
          </svg>

          {/* Icon or countdown text in center */}
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center',
              sizeConfig.iconSize
            )}
          >
            {prefersReducedMotion ? (
              <span
                className={cn(
                  'font-neo-body font-black',
                  isReady ? 'text-neo-lime' : 'text-neo-white'
                )}
              >
                {formattedTime}
              </span>
            ) : typeof icon === 'string' ? (
              <span role="img" aria-label="icon">
                {icon}
              </span>
            ) : (
              icon
            )}
          </div>
        </div>

        {/* Optional label */}
        {label && (
          <span
            data-testid="cooldown-label"
            className={cn(
              'text-xs font-neo-body font-bold text-neo-white'
            )}
          >
            {label}
          </span>
        )}
      </div>
    );
  }
);

CooldownIndicator.displayName = 'CooldownIndicator';
