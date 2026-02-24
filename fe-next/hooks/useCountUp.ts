'use client';

import { useState, useEffect, useRef } from 'react';

interface UseCountUpOptions {
  target: number;
  duration?: number;
  startDelay?: number;
  easing?: (t: number) => number;
}

// Ease-out cubic for satisfying deceleration (fast start, slow finish)
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function useCountUp({
  target,
  duration = 1200,
  startDelay = 0,
  easing = easeOutCubic,
}: UseCountUpOptions): number {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(undefined);

  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }

    const timeout = setTimeout(() => {
      const start = performance.now();

      const animate = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easing(progress);
        setValue(Math.round(easedProgress * target));

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
  }, [target, duration, startDelay, easing]);

  return value;
}
