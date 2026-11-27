'use client';

import { m } from 'framer-motion';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useSkipAnimations } from './AdaptiveMotion';
import { MOTION } from './tokens';

const FILL_TONES = {
  lime: 'bg-neo-lime',
  pink: 'bg-neo-pink',
  cyan: 'bg-neo-cyan',
  yellow: 'bg-neo-yellow',
  purple: 'bg-neo-purple',
  orange: 'bg-neo-orange',
  cream: 'bg-neo-cream',
} as const;

export interface SpringProgressProps {
  value: number;
  max?: number;
  label: string;
  tone?: keyof typeof FILL_TONES;
  segments?: number;
  animateOnMount?: boolean;
  className?: string;
}

export function SpringProgress({ value: raw, max = 1, label, tone = 'lime', segments, animateOnMount = false, className }: SpringProgressProps) {
  const skip = useSkipAnimations();
  const value = Number.isFinite(raw) ? raw : 0;
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const [prev, setPrev] = useState(value);
  const [shine, setShine] = useState(0);
  if (value !== prev) {
    setPrev(value);
    setShine(value > prev ? shine + 1 : 0);
  }

  const fillClass = cn('absolute inset-0 origin-left rtl:origin-right', FILL_TONES[tone]);
  const rtl = shine > 0 && typeof document !== 'undefined' && document.documentElement.dir === 'rtl';

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn('relative h-4 w-full overflow-hidden rounded-neo border-2 border-neo-black bg-neo-navy-light', className)}
    >
      {skip ? (
        <div data-part="fill" className={fillClass} style={{ transform: `scaleX(${ratio})` }} />
      ) : (
        <m.div
          data-part="fill"
          className={fillClass}
          initial={animateOnMount ? { scaleX: 0 } : false}
          animate={{ scaleX: ratio }}
          transition={MOTION.fill}
        >
          {shine > 0 && (
            <m.span
              key={shine}
              data-part="shine"
              aria-hidden
              className="absolute inset-y-0 start-0 w-1/4 bg-neo-white/50"
              initial={{ x: rtl ? '100%' : '-100%', skewX: -12 }}
              animate={{ x: rtl ? '-400%' : '400%', skewX: -12 }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
            />
          )}
        </m.div>
      )}
      {segments != null &&
        segments > 1 &&
        Array.from({ length: segments - 1 }, (_, i) => (
          <span
            key={i}
            data-part="tick"
            aria-hidden
            className="absolute inset-y-0 w-0.5 bg-neo-black/40"
            style={{ insetInlineStart: `${((i + 1) / segments) * 100}%` }}
          />
        ))}
    </div>
  );
}
