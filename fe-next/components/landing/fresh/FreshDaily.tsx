'use client';

import { Flame } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { FreshSection } from './FreshSection';
import s from './FreshMotion.module.css';

const DONE_DAYS = 6;

/**
 * The daily visual: a week of lit streak days, today's flame popping on and
 * the count rolling 6 → 7, with the on-fire mascot riding the card. Resting
 * frame (reduced motion, no JS, paused capture) = the finished 7-day streak.
 * Mascot art is a CSS background, not an <img>: it paints without scrolling,
 * and returning visitors (whose fresh tree is display:none) never fetch it.
 */
function StreakArt({ label }: { label: string }) {
  return (
    <div data-fresh-art="streak" aria-hidden="true" className="relative w-full max-w-[340px] pt-12 md:max-w-[440px]">
      <div
        className={cn(
          'rounded-neo-lg border-3 border-neo-cyan bg-neo-navy-light p-5 shadow-[6px_6px_0_0_rgb(0_0_0)] md:p-6',
          s.tiltCard
        )}
      >
        <div className="flex items-end gap-2">
          <span className="font-neo-display text-6xl font-bold leading-none text-neo-orange md:text-7xl">
            <span className={s.rollWindow}>
              <span className={s.rollStrip}>
                <span>{DONE_DAYS}</span>
                <span>{DONE_DAYS + 1}</span>
              </span>
            </span>
          </span>
          <span className="pb-1 font-neo-display text-lg font-bold leading-tight text-neo-cream md:text-xl">{label}</span>
        </div>
        <ol className="mt-5 grid grid-cols-7 gap-1.5 md:gap-2">
          {Array.from({ length: DONE_DAYS }, (_, i) => (
            <li
              key={i}
              data-streak-day="done"
              className="flex aspect-square items-center justify-center rounded-[8px] border-2 border-neo-black bg-neo-orange"
            >
              <Flame className="h-4 w-4 fill-neo-yellow text-neo-black md:h-5 md:w-5" strokeWidth={2.5} />
            </li>
          ))}
          <li
            data-streak-day="today"
            className={cn(
              'flex aspect-square items-center justify-center rounded-[8px] border-2 border-neo-black bg-neo-lime',
              s.todayRing
            )}
          >
            <Flame className={cn('h-4 w-4 fill-neo-orange text-neo-black md:h-5 md:w-5', s.todayFlame)} strokeWidth={2.5} />
          </li>
        </ol>
      </div>
      <div
        className={cn(
          'absolute -top-4 end-0 aspect-square w-28 bg-[url(/home/shell/daily-inferno.webp)] bg-contain bg-center bg-no-repeat md:-end-6 md:w-32',
          s.bob
        )}
      />
    </div>
  );
}

/** Section 2: the daily puzzle and its streak → /daily. */
export function FreshDaily() {
  const { t, language } = useLanguage();
  return (
    <FreshSection
      id="daily"
      accent="cyan"
      title={t('homeFresh.sections.daily.title')}
      line={t('homeFresh.sections.daily.line')}
      link={{ href: `/${language}/daily`, label: t('homeFresh.sections.daily.cta') }}
      art={<StreakArt label={t('homeFresh.sections.daily.streak')} />}
    />
  );
}
