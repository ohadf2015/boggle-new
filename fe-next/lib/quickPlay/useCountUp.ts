'use client';

import { useEffect, useState } from 'react';

interface CountUpOptions {
  delay?: number;
  duration?: number;
  enabled?: boolean;
}

const easeOutCubic = (p: number) => 1 - (1 - p) ** 3;

export function useCountUp(target: number, { delay = 0, duration = 700, enabled = true }: CountUpOptions = {}): number {
  const [value, setValue] = useState(enabled ? 0 : target);

  useEffect(() => {
    if (!enabled) {
      setValue(target);
      return;
    }
    setValue(0);
    let frame = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      start ??= now;
      const p = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * easeOutCubic(p)));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    const timer = setTimeout(() => {
      frame = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [target, delay, duration, enabled]);

  return value;
}
