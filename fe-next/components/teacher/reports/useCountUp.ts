'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/** Eases a number from 0 to `target`; lands on the target immediately under reduced motion. */
export function useCountUp(target: number, durationMs = 700): number {
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState(reduceMotion ? target : 0);

  useEffect(() => {
    if (reduceMotion || typeof requestAnimationFrame !== 'function') {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, reduceMotion]);

  return value;
}
