'use client';

import Link from 'next/link';
import { m, useReducedMotion } from 'framer-motion';
import { Check, Lock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { FREE_PREVIEW_WORDS, type HardWord } from '@/lib/education/wordMasteryReport';
import { HardestWordsList } from './HardestWordsList';
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import { trackGrowthEvent } from '@/utils/growthTracking';

const GHOST_ROWS = 3;
const GHOST_WIDTHS = [72, 58, 44];
const GHOST_OPACITY = [0.9, 0.6, 0.3];
const UNLOCKS = ['eduPro.mastery.unlock.allWords', 'eduPro.mastery.unlock.heatmap', 'eduPro.mastery.unlock.practice'] as const;

/** Free preview: real top 3, then ghost rows that are placeholder shapes, never data: blur is not a security boundary. */
export function MasteryLockedTeaser({ words, hidden }: { words: HardWord[]; hidden: number }) {
  const { t, language } = useLanguage();
  const reduceMotion = useReducedMotion();
  const ghosts = Math.min(hidden, GHOST_ROWS);

  return (
    <div data-testid="mastery-locked-teaser">
      {words.length > 0 ? (
        <HardestWordsList
          words={words}
          trailing={
            <>
              {GHOST_WIDTHS.slice(0, ghosts).map((width, i) => (
                <li
                  key={width}
                  aria-hidden="true"
                  data-testid="mastery-ghost-row"
                  style={{ opacity: GHOST_OPACITY[i] }}
                  className="pointer-events-none grid select-none grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-x-2.5 rounded-neo border-2 border-neo-cream/40 bg-neo-navy px-2.5 py-1.5"
                >
                  <span className="grid size-7 place-items-center rounded-neo border-2 border-black bg-neo-cream font-neo-display text-sm font-black text-neo-black">
                    {FREE_PREVIEW_WORDS + i + 1}
                  </span>
                  <span className="min-w-0 space-y-1.5 blur-[3px]">
                    <span className="block h-3.5 rounded-full bg-neo-white/50" style={{ width: `${width - 25}%` }} />
                    <span className="block h-1.5 rounded-full bg-neo-pink/70" style={{ width: `${width}%` }} />
                  </span>
                  <span className="block h-4 w-9 rounded-full bg-neo-white/40 blur-[3px]" />
                </li>
              ))}
            </>
          }
        />
      ) : (
        <p className="text-sm font-bold text-neo-cream/70">{t('eduPro.mastery.noneMissed')}</p>
      )}

      <m.div
        data-testid="mastery-unlock-panel"
        initial={reduceMotion ? false : { y: 8 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 26, delay: 0.2 }}
        className="relative mt-3 flex flex-col gap-3 rounded-neo border-2 border-neo-lime bg-neo-navy p-4 shadow-hard sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-neo-display text-base font-black text-neo-white">
            <span className="grid size-7 shrink-0 place-items-center rounded-neo border-2 border-black bg-neo-lime text-neo-black">
              <Lock className="size-3.5" aria-hidden="true" />
            </span>
            {t('teacher.proGate.mastery.title')}
          </p>
          {hidden > 0 && <p className="mt-1 text-xs font-black text-neo-lime">{t('eduPro.mastery.hiddenWords', { count: hidden })}</p>}
          <ul className="mt-2 space-y-1">
            {UNLOCKS.map((key) => (
              <li key={key} data-testid="mastery-unlock-item" className="flex items-start gap-2 text-sm font-bold text-neo-cream/90">
                <Check className="mt-0.5 size-4 shrink-0 text-neo-lime" strokeWidth={3} aria-hidden="true" />
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>
        </div>
        <Link
          href={`/${language}/teacher/upgrade`}
          onClick={() => trackGrowthEvent('landing_cta_clicked', { cta: 'pro_gate_mastery' })}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-neo border-2 border-black bg-neo-cyan px-4 py-2 text-center text-sm font-black text-neo-navy shadow-hard transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0.5 active:shadow-none motion-reduce:transition-none"
        >
          {t('teacher.proGate.cta', { price: `$${TEACHER_PRO_PRICE_USD}` })}
        </Link>
      </m.div>
    </div>
  );
}
