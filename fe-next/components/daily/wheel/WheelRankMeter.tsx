'use client';

import React, { useState } from 'react';
import { m } from 'framer-motion';
import { cn } from '@/lib/utils';
import { WHEEL_RANKS, rankProgress, rankThresholds } from '@/lib/wordWheel/rankLadder';

type T = (key: string, params?: Record<string, string | number>) => string;

interface WheelRankMeterProps {
  t: T;
  score: number;
  /** Fill the track from empty (fresh finish only). */
  animate?: boolean;
}

const FILL = { delay: 0.45, duration: 1.1, ease: [0.16, 1, 0.3, 1] } as const;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** The same rank ladder the play screen climbs, as the results hero's meter strip. */
export default function WheelRankMeter({ t, score, animate = false }: WheelRankMeterProps) {
  const [reduced] = useState(prefersReducedMotion);
  const thresholds = rankThresholds();
  const { index, position, toNext } = rankProgress(score, thresholds);
  const last = thresholds.length - 1;
  const grow = animate && !reduced;

  return (
    <div data-testid="wheel-rank-meter" data-rank-index={index} className="flex flex-col gap-1.5">
      <div className="relative h-5 mx-2">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 rounded-full border-2 border-neo-black bg-neo-black/40 overflow-hidden">
          <m.div
            data-testid="wheel-rank-fill"
            className="absolute inset-0 bg-neo-yellow ltr:origin-left rtl:origin-right"
            initial={grow ? { scaleX: 0 } : false}
            animate={{ scaleX: position }}
            transition={FILL}
          />
        </div>
        {thresholds.map((_, i) => (
          <span
            key={i}
            aria-hidden
            className={cn(
              'absolute top-1/2 -translate-y-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2 border-2 border-neo-black',
              i === last ? 'w-3.5 h-3.5 rounded-[3px]' : 'w-3 h-3 rounded-full',
              i <= index ? 'bg-neo-yellow' : 'bg-neo-navy',
              i === index && 'scale-125 shadow-hard-sm',
            )}
            style={{ insetInlineStart: `${(i / last) * 100}%` }}
          />
        ))}
      </div>
      <span data-testid="wheel-rank-next" className="text-[11px] font-black uppercase tracking-wide text-neo-white/70 text-end">
        {index === last
          ? t('wordWheel.rank.top')
          : t('wordWheel.rank.toNext', { count: toNext, rank: t(`wordWheel.rank.${WHEEL_RANKS[index + 1]}`) })}
      </span>
    </div>
  );
}
