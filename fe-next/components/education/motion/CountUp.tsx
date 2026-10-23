'use client';

import { useEffect, useRef, useState } from 'react';
import { EDU_DUR } from '@/lib/education/motion/tokens';
import { useEduReducedMotion } from '@/lib/education/motion/useEduReducedMotion';

export interface CountUpProps {
  to: number;
  from?: number;
  durationMs?: number;
  format?: (n: number) => string;
  /** The ding hook: fires once, as the number lands. */
  onDone?: () => void;
  className?: string;
}

const easeOutCubic = (p: number) => 1 - (1 - p) ** 3;

export function CountUp({ to, from = 0, durationMs = EDU_DUR.countUp * 1000, format = String, onDone, className = '' }: CountUpProps) {
  const reduced = useEduReducedMotion();
  const [value, setValue] = useState(reduced ? to : from);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (reduced || durationMs <= 0) {
      setValue(to);
      onDoneRef.current?.();
      return;
    }
    const start = Date.now();
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / durationMs);
      setValue(Math.round(from + (to - from) * easeOutCubic(p)));
      if (p >= 1) {
        clearInterval(id);
        onDoneRef.current?.();
      }
    }, 16);
    return () => clearInterval(id);
  }, [to, from, durationMs, reduced]);

  return (
    <span data-testid="edu-count-up" className={`tabular-nums ${className}`}>
      {format(value)}
    </span>
  );
}
