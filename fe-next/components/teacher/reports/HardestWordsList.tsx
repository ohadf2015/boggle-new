'use client';

import { useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { HardWord } from '@/lib/education/wordMasteryReport';
import { cn } from '@/lib/utils';

function barTone(missRate: number) {
  if (missRate >= 60) return 'bg-neo-pink';
  if (missRate >= 30) return 'bg-neo-yellow';
  return 'bg-neo-cyan';
}

export const HARDEST_VISIBLE = 6;

export function HardestWordsList({ words }: { words: HardWord[] }) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? words : words.slice(0, HARDEST_VISIBLE);

  return (
    <>
      <ol data-testid="mastery-hardest-list" className="grid gap-1.5 sm:grid-cols-2">
        {visible.map((w, i) => (
          <m.li
            key={w.word}
            data-testid="mastery-hardest-row"
            initial={reduceMotion ? false : { x: -10 }}
            animate={{ x: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30, delay: i * 0.04 }}
            className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-x-2.5 rounded-neo border-2 border-black/60 bg-neo-navy px-2.5 py-1.5"
          >
            <span
              aria-hidden="true"
              className={cn(
                'grid size-7 place-items-center rounded-neo border-2 border-black font-neo-display text-sm font-black text-neo-black',
                i === 0 ? 'bg-neo-pink' : i < 3 ? 'bg-neo-yellow' : 'bg-neo-cream',
              )}
            >
              {i + 1}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-neo-display text-base font-bold text-neo-white" dir="auto">
                {w.display}
              </span>
              <span className="relative mt-0.5 block h-1.5 overflow-hidden rounded-full bg-neo-white/10">
                <m.span
                  aria-hidden="true"
                  className={cn('absolute inset-y-0 start-0 rounded-full', barTone(w.missRate))}
                  initial={reduceMotion ? false : { width: 0 }}
                  animate={{ width: `${Math.max(4, w.missRate)}%` }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 + i * 0.05 }}
                />
              </span>
              <span className="mt-0.5 block truncate text-[11px] font-bold text-neo-cream/70 tabular-nums">
                {t('eduPro.mastery.missedOf', { missed: w.missed, attempts: w.attempts })}
                {' · '}
                {t('eduPro.mastery.studentsMissing', { count: w.studentsMissing, total: w.studentsAsked })}
              </span>
            </span>
            <span className="font-neo-display text-lg font-black text-neo-white tabular-nums">{w.missRate}%</span>
          </m.li>
        ))}
      </ol>
      {words.length > HARDEST_VISIBLE && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          aria-expanded={showAll}
          className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-neo px-2 text-sm font-black text-neo-cyan underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan"
        >
          {showAll ? t('eduPro.mastery.showFewer') : t('eduPro.mastery.showAll', { count: words.length })}
          <ChevronDown className={cn('size-4 transition-transform motion-reduce:transition-none', showAll && 'rotate-180')} aria-hidden="true" />
        </button>
      )}
    </>
  );
}
