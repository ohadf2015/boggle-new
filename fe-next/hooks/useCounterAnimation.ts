import { useState, useRef, useCallback, useEffect } from 'react';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

export interface UseCounterAnimationOptions {
  /** Target value to animate to */
  value: number;
  /** Duration of animation in milliseconds */
  duration?: number;
  /** Delay before starting animation */
  delay?: number;
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Whether to animate on initial mount */
  animateOnMount?: boolean;
  /** Use spring physics for high-end devices (framer-motion) */
  useSpring?: boolean;
}

export interface UseCounterAnimationReturn {
  /** Current displayed value (may be mid-animation) */
  displayValue: number;
  /** Whether animation is currently running */
  isAnimating: boolean;
  /** Amount changed since last value (positive or negative) */
  change: number;
  /** Whether value increased */
  isIncrease: boolean;
  /** Whether value decreased */
  isDecrease: boolean;
  /** Previous value */
  previousValue: number;
}

/**
 * useCounterAnimation - Shared animation logic for rolling number counters
 *
 * Handles the core counting animation with performance adaptation:
 * - requestAnimationFrame for smooth counting
 * - Ease-out interpolation for natural feel
 * - Respects reduced motion preferences
 * - Adapts to device performance
 *
 * Used by AnimatedCounter, CoinCounterAnimated, and other number displays.
 *
 * @example
 * ```tsx
 * function MyCounter({ value }: { value: number }) {
 *   const { displayValue, isAnimating } = useCounterAnimation({
 *     value,
 *     duration: 1000,
 *   });
 *
 *   return <span>{Math.round(displayValue)}</span>;
 * }
 * ```
 */
export function useCounterAnimation({
  value,
  duration = 1000,
  delay = 0,
  onComplete,
  animateOnMount = true,
  useSpring = false,
}: UseCounterAnimationOptions): UseCounterAnimationReturn {
  const { prefersReducedMotion } = useDevicePerformance();
  const [displayValue, setDisplayValue] = useState(animateOnMount ? 0 : value);
  const [isAnimating, setIsAnimating] = useState(false);
  const [previousValue, setPreviousValue] = useState(animateOnMount ? 0 : value);
  const prevValueRef = useRef(animateOnMount ? 0 : value);
  const animationRef = useRef<number | null>(null);
  const delayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasMountedRef = useRef(false);

  // Calculate change metrics
  const change = value - previousValue;
  const isIncrease = change > 0;
  const isDecrease = change < 0;

  /**
   * Core animation function using requestAnimationFrame
   * Uses ease-out cubic curve for natural deceleration
   */
  const animate = useCallback(
    (from: number, to: number) => {
      // Skip animation if no change or reduced motion preferred
      if (from === to || prefersReducedMotion) {
        setDisplayValue(to);
        onComplete?.();
        return;
      }

      const startTime = performance.now();
      const diff = to - from;

      const tick = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease-out cubic: decelerates toward end
        // Formula: 1 - (1 - x)³
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const currentValue = from + diff * easeProgress;

        setDisplayValue(currentValue);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(tick);
        } else {
          setDisplayValue(to);
          setIsAnimating(false);
          onComplete?.();
        }
      };

      setIsAnimating(true);
      animationRef.current = requestAnimationFrame(tick);
    },
    [duration, prefersReducedMotion, onComplete]
  );

  // Trigger animation when value changes or on mount
  useEffect(() => {
    const from = prevValueRef.current;
    const to = value;
    const isFirstMount = !hasMountedRef.current;

    // Mark as mounted
    if (isFirstMount) {
      hasMountedRef.current = true;
    }

    // Skip if no change (unless it's first mount with animateOnMount)
    if (from === to && !(isFirstMount && animateOnMount)) return;

    // Update previous value state for change metrics
    if (from !== to) {
      setPreviousValue(from);
    }

    // Cancel any pending delayed animation
    if (delayTimeoutRef.current) {
      clearTimeout(delayTimeoutRef.current);
    }

    // Cancel any ongoing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    if (delay > 0) {
      // Schedule animation after delay
      delayTimeoutRef.current = setTimeout(() => {
        animate(from, to);
        prevValueRef.current = to;
      }, delay);
    } else {
      // Start animation immediately
      animate(from, to);
      prevValueRef.current = to;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current);
      }
    };
  }, []);

  return {
    displayValue,
    isAnimating,
    change,
    isIncrease,
    isDecrease,
    previousValue,
  };
}

export default useCounterAnimation;
