'use client';

import { useLayoutEffect, useState } from 'react';
import { m } from 'framer-motion';
import { DAILY_MODES, type DailyModeId } from '@/lib/dailyModes';
import { cn } from '@/lib/utils';
import { chainPips } from './dailyHandoff';

export const STEP_BANNER_MS = 2400;

const PIP_CLASS = {
  done: 'w-2 bg-neo-lime',
  active: 'w-5 bg-neo-yellow',
  next: 'w-2 bg-neo-white/25',
} as const;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

interface DailyStepBannerProps {
  modeId: DailyModeId;
  t: (key: string, params?: Record<string, string | number>) => string;
  onDone: () => void;
}

/** Arrival from the previous quest: a small step pill that springs in under the nav and leaves on its own. */
export function DailyStepBanner({ modeId, t, onDone }: DailyStepBannerProps) {
  const [reduced] = useState(prefersReducedMotion);
  const index = DAILY_MODES.findIndex((md) => md.id === modeId);
  const mode = DAILY_MODES[index];

  useLayoutEffect(() => {
    const timer = setTimeout(onDone, STEP_BANNER_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  if (!mode) return null;
  const pips = chainPips(modeId);
  const spring = { type: 'spring', stiffness: 520, damping: 26 } as const;

  return (
    <div
      data-testid="daily-step-banner"
      role="status"
      className="pointer-events-none fixed inset-x-0 top-[calc(max(env(safe-area-inset-top),0.5rem)+2.75rem)] z-30 flex justify-center px-4"
    >
      <m.div
        className="flex items-center gap-2.5 rounded-full border-2 border-neo-black bg-neo-navy-light ps-1 pe-3.5 py-1 shadow-hard-sm"
        initial={reduced ? false : { y: -18, scale: 0.7 }}
        animate={{ y: 0, scale: 1 }}
        transition={spring}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- 32px decorative thumb */}
        <img src={mode.art} alt="" className="w-8 h-8 rounded-full border-2 border-neo-black object-cover" draggable={false} />
        <span className="flex flex-col leading-tight min-w-0">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-neo-lime">
            {t('daily.journeyStepOf', { n: index + 1, total: DAILY_MODES.length })}
          </span>
          <span className="font-neo-display font-black text-sm text-neo-white truncate">{t(mode.titleKey)}</span>
        </span>
        <span aria-hidden className="flex items-center gap-1 ms-1">
          {pips.map((pip, i) => (
            <m.span
              key={DAILY_MODES[i].id}
              className={cn('block h-2 rounded-full border border-neo-black', PIP_CLASS[pip])}
              initial={reduced || pip !== 'active' ? false : { scaleX: 0.3 }}
              animate={{ scaleX: 1 }}
              transition={{ ...spring, delay: 0.2 }}
            />
          ))}
        </span>
      </m.div>
    </div>
  );
}

export default DailyStepBanner;
