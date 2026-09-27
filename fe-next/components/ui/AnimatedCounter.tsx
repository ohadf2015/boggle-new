'use client';

import { useEffect, useState, useRef } from 'react';
import NumberFlow from '@number-flow/react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

interface AnimatedCounterProps {
  /** Target value to count to */
  value: number;
  /** Duration of the count animation in ms (default: 1000) */
  duration?: number;
  /** Delay before starting animation in ms */
  delay?: number;
  /** Format function for the displayed number */
  formatValue?: (value: number) => string;
  /** Whether to show +/- prefix for changes */
  showChangePrefix?: boolean;
  /** Previous value (for showing change direction) */
  previousValue?: number;
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Color variant */
  variant?: 'default' | 'gold' | 'success' | 'danger';
  /** Show glow effect on change */
  showGlow?: boolean;
  /** Callback when animation completes */
  onAnimationComplete?: () => void;
  /** Additional className */
  className?: string;
}

const sizeClasses = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
  xl: 'text-3xl',
};

const variantClasses = {
  default: 'text-neo-white',
  gold: 'text-neo-lime',
  success: 'text-neo-lime',
  danger: 'text-neo-red',
};

const glowStyles = {
  default: '0 0 10px rgba(255, 255, 255, 0.5)',
  gold: '0 0 15px rgba(255, 225, 53, 0.6)',
  success: '0 0 12px rgba(191, 255, 0, 0.5)',
  danger: '0 0 12px rgba(239, 68, 68, 0.5)',
};

/**
 * AnimatedCounter — Rolling digit animation using NumberFlow.
 *
 * Each digit animates independently with spring physics for a premium
 * "slot machine" feel. Falls back to instant display on low-end devices.
 */
export function AnimatedCounter({
  value,
  delay = 0,
  formatValue,
  showChangePrefix = false,
  previousValue,
  size = 'md',
  variant = 'default',
  showGlow = false,
  onAnimationComplete,
  className,
}: AnimatedCounterProps) {
  const { isLowEnd, prefersReducedMotion, enableGlowEffects } = useDevicePerformance();
  const [displayValue, setDisplayValue] = useState(previousValue ?? value);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValueRef = useRef(previousValue ?? value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const change = value - prevValueRef.current;
  const isIncrease = change > 0;

  useEffect(() => {
    if (delay > 0) {
      timerRef.current = setTimeout(() => {
        setDisplayValue(value);
        setIsAnimating(true);
        prevValueRef.current = value;
      }, delay);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }

    setDisplayValue(value);
    setIsAnimating(true);
    prevValueRef.current = value;
    return undefined;
  }, [value, delay]);

  // Notify animation complete after transition settles
  useEffect(() => {
    if (!isAnimating) return;
    const timer = setTimeout(() => {
      setIsAnimating(false);
      onAnimationComplete?.();
    }, 600);
    return () => clearTimeout(timer);
  }, [isAnimating, onAnimationComplete]);

  const shouldShowGlow = showGlow && enableGlowEffects && isAnimating;

  let prefix = '';
  if (showChangePrefix && change !== 0) {
    prefix = isIncrease ? '+' : '';
  }

  // Low-end / reduced motion: instant display, no animation
  if (isLowEnd || prefersReducedMotion) {
    const formatted = formatValue ? formatValue(value) : Math.round(value).toLocaleString();
    return (
      <span
        className={cn(
          'font-black tabular-nums inline-block',
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
      >
        {prefix}{formatted}
      </span>
    );
  }

  return (
    <AdaptiveMotion.span
      className={cn(
        'font-black tabular-nums inline-block',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      animate={isAnimating ? { scale: [1, 1.05, 1] } : undefined}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={{
        textShadow: shouldShowGlow ? glowStyles[variant] : undefined,
      }}
    >
      {prefix}
      {formatValue ? (
        formatValue(displayValue)
      ) : (
        <NumberFlow
          value={displayValue}
          locales="en-US"
          animated={!prefersReducedMotion}
          willChange
          transformTiming={{ duration: 500, easing: 'ease-out' }}
          spinTiming={{ duration: 500, easing: 'ease-out' }}
        />
      )}
    </AdaptiveMotion.span>
  );
}

/**
 * AnimatedCounterWithImpact — Counter with visual impact effect when value changes significantly.
 */
export function AnimatedCounterWithImpact({
  value,
  threshold = 10,
  ...props
}: AnimatedCounterProps & { threshold?: number }) {
  const { enableComplexAnimations } = useDevicePerformance();
  const [showImpact, setShowImpact] = useState(false);
  const prevValueRef = useRef(value);

  useEffect(() => {
    const change = value - prevValueRef.current;
    if (Math.abs(change) >= threshold && enableComplexAnimations) {
      setShowImpact(true);
      const timer = setTimeout(() => setShowImpact(false), 500);
      return () => clearTimeout(timer);
    }
    prevValueRef.current = value;
    return undefined;
  }, [value, threshold, enableComplexAnimations]);

  return (
    <div className="relative inline-block">
      {showImpact && (
        <AdaptiveMotion.div
          className="absolute inset-0 rounded-full border-2 border-neo-lime"
          initial={{ scale: 1, opacity: 0.8 }}
          animate={{ scale: 2.5, opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100%',
            height: '100%',
          }}
        />
      )}
      <AnimatedCounter value={value} {...props} />
    </div>
  );
}

export default AnimatedCounter;
