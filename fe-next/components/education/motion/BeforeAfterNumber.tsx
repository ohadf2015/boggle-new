'use client';

import { m } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { EDU_MS } from '@/lib/education/motion/tokens';
import { resolvePreset } from '@/lib/education/motion/presets';
import { useEduReducedMotion } from '@/lib/education/motion/useEduReducedMotion';

export interface BeforeAfterNumberProps {
  before: number;
  after: number;
  holdMs?: number;
  /** Rendered beside the number; `lit` is false while yesterday's value shows. */
  icon?: (lit: boolean) => ReactNode;
  /** The ignite sound hook. */
  onIgnite?: () => void;
  className?: string;
}

export function BeforeAfterNumber({ before, after, holdMs = EDU_MS.streakHold, icon, onIgnite, className = '' }: BeforeAfterNumberProps) {
  const reduced = useEduReducedMotion();
  const [lit, setLit] = useState(reduced);
  const onIgniteRef = useRef(onIgnite);
  onIgniteRef.current = onIgnite;

  useEffect(() => {
    if (reduced) {
      setLit(true);
      return;
    }
    if (lit) return;
    const id = setTimeout(() => {
      setLit(true);
      onIgniteRef.current?.();
    }, holdMs);
    return () => clearTimeout(id);
  }, [reduced, holdMs, lit]);

  const ignite = resolvePreset('ignite', reduced || !lit);

  return (
    <span data-testid="edu-before-after" data-state={lit ? 'after' : 'before'} className={`inline-flex items-center gap-2 ${className}`}>
      {icon?.(lit)}
      <m.span
        key={lit ? 'after' : 'before'}
        initial={ignite.initial}
        animate={ignite.animate}
        transition={ignite.transition}
        className={`inline-block font-neo-display font-black tabular-nums ${lit ? 'text-neo-yellow' : 'text-neo-cream/40'}`}
      >
        {lit ? after : before}
      </m.span>
    </span>
  );
}
