'use client';

import { useEffect, useRef, useState } from 'react';

/** Eases a displayed number toward `target`; jumps straight there under reduced motion. */
export function useCountUp(target: number, durationMs: number, reducedMotion: boolean): number {
  const [shown, setShown] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    fromRef.current = target;
    if (reducedMotion || from === target) {
      setShown(target);
      return undefined;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      setShown(Math.round(from + (target - from) * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, reducedMotion]);

  return shown;
}
