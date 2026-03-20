'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSpring, useMotionValue } from 'framer-motion';
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

/**
 * AnimatedCounter - Rolling number animation component
 *
 * Used for score displays, coin counters, XP bars, etc.
 * Automatically adapts to device performance.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <AnimatedCounter value={1500} />
 *
 * // With formatting
 * <AnimatedCounter
 *   value={coins}
 *   formatValue={(v) => v.toLocaleString()}
 *   variant="gold"
 *   showGlow
 * />
 *
 * // Score with change indicator
 * <AnimatedCounter
 *   value={score}
 *   previousValue={previousScore}
 *   showChangePrefix
 *   variant="success"
 * />
 * ```
 */
export function AnimatedCounter({
  value,
  duration = 1000,
  delay = 0,
  formatValue = (v) => Math.round(v).toLocaleString(),
  showChangePrefix = false,
  previousValue,
  size = 'md',
  variant = 'default',
  showGlow = false,
  onAnimationComplete,
  className,
}: AnimatedCounterProps) {
  const { isLowEnd, prefersReducedMotion, enableGlowEffects } = useDevicePerformance();
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValueRef = useRef(previousValue ?? value);
  const animationRef = useRef<number | null>(null);

  // Calculate if value increased or decreased
  const change = value - prevValueRef.current;
  const isIncrease = change > 0;

  // Motion value for spring animation
  const motionValue = useMotionValue(prevValueRef.current);
  const springValue = useSpring(motionValue, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  // Animate function for low-end devices (simple linear interpolation)
  const animateSimple = useCallback((startValue: number, endValue: number) => {
    if (prefersReducedMotion) {
      setDisplayValue(endValue);
      onAnimationComplete?.();
      return;
    }

    const startTime = performance.now();
    const diff = endValue - startValue;

    const tick = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out curve for smoother animation
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + diff * easeProgress;

      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayValue(endValue);
        setIsAnimating(false);
        onAnimationComplete?.();
      }
    };

    setIsAnimating(true);
    animationRef.current = requestAnimationFrame(tick);
  }, [duration, prefersReducedMotion, onAnimationComplete]);

  // Use spring animation for high-end devices
  useEffect(() => {
    if (isLowEnd || prefersReducedMotion) {
      // Simple animation for low-end devices
      const timeoutId = setTimeout(() => {
        animateSimple(prevValueRef.current, value);
        prevValueRef.current = value;
      }, delay);

      return () => {
        clearTimeout(timeoutId);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }

    // Spring animation for capable devices
    const timeoutId = setTimeout(() => {
      setIsAnimating(true);
      motionValue.set(value);
      prevValueRef.current = value;
    }, delay);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [value, delay, isLowEnd, prefersReducedMotion, animateSimple, motionValue]);

  // Subscribe to spring value changes
  useEffect(() => {
    if (isLowEnd || prefersReducedMotion) return;

    const unsubscribe = springValue.on('change', (latest) => {
      setDisplayValue(latest);
    });

    const unsubscribeComplete = springValue.on('animationComplete', () => {
      setIsAnimating(false);
      onAnimationComplete?.();
    });

    return () => {
      unsubscribe();
      unsubscribeComplete();
    };
  }, [springValue, isLowEnd, prefersReducedMotion, onAnimationComplete]);

  // Size classes
  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
    xl: 'text-3xl',
  };

  // Variant classes
  const variantClasses = {
    default: 'text-neo-white',
    gold: 'text-neo-lime',
    success: 'text-neo-lime',
    danger: 'text-neo-red',
  };

  // Glow styles
  const glowStyles = {
    default: '0 0 10px rgba(255, 255, 255, 0.5)',
    gold: '0 0 15px rgba(255, 225, 53, 0.6)',
    success: '0 0 12px rgba(191, 255, 0, 0.5)',
    danger: '0 0 12px rgba(239, 68, 68, 0.5)',
  };

  const shouldShowGlow = showGlow && enableGlowEffects && isAnimating;

  // Determine prefix
  let prefix = '';
  if (showChangePrefix && change !== 0) {
    prefix = isIncrease ? '+' : '';
  }

  return (
    <AdaptiveMotion.span
      className={cn(
        'font-black tabular-nums inline-block',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      animate={isAnimating ? {
        scale: [1, 1.05, 1],
      } : undefined}
      transition={{
        duration: 0.3,
        ease: 'easeOut',
      }}
      style={{
        textShadow: shouldShowGlow ? glowStyles[variant] : undefined,
      }}
    >
      {prefix}{formatValue(displayValue)}
    </AdaptiveMotion.span>
  );
}

/**
 * AnimatedCounterWithImpact - Counter with visual impact effect when value changes
 *
 * Shows a burst/pulse effect when the value increases significantly.
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
      {/* Impact ring effect */}
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
