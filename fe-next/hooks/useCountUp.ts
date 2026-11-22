'use client';

import { useState, useEffect, useRef } from 'react';

interface UseCountUpOptions {
  target: number;
  duration?: number;
  startDelay?: number;
  easing?: (t: number) => number;
  /**
   * Skip the rAF count-up and return `target` immediately. Callers pass this
   * for reduced-motion / low-end devices so the results page avoids a 60fps
   * re-render storm (many gauges + stats animate at once on mount).
   */
  immediate?: boolean;
}

// Ease-out cubic for satisfying deceleration (fast start, slow finish)
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function useCountUp({
  target,
  duration = 1200,
  startDelay = 0,
  easing = easeOutCubic,
  immediate = false,
}: UseCountUpOptions): number {
  const [value, setValue] = useState(immediate ? target : 0);
  const frameRef = useRef<number>(undefined);
  const shownRef = useRef(value);

  useEffect(() => {
    const reduceMotion =
      typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (immediate || reduceMotion || target === 0) {
      shownRef.current = target;
      setValue(target);
      return;
    }
    const from = shownRef.current;
    if (from === target) return;

    const timeout = setTimeout(() => {
      const start = performance.now();

      const animate = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easing(progress);
        shownRef.current = Math.round(from + (target - from) * easedProgress);
        setValue(shownRef.current);

        if (progress < 1) {
          frameRef.current = requestAnimationFrame(animate);
        }
      };

      frameRef.current = requestAnimationFrame(animate);
    }, startDelay);

    return () => {
      clearTimeout(timeout);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration, startDelay, easing, immediate]);

  return value;
}
