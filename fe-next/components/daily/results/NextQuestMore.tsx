'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { cn } from '@/lib/utils';
import { DAILY_MODES, dailyModeHref, type DailyModeId } from '@/lib/dailyModes';
import { markDailyHandoff } from '@/components/daily/flow/dailyHandoff';
import type { Language } from '@/types';

const DOT: Record<string, string> = {
  orange: 'border-neo-orange',
  yellow: 'border-neo-yellow',
  cyan: 'border-neo-cyan',
  purple: 'border-neo-purple',
};

export const MORE_ROW_HEIGHT = 'min-h-10';

interface NextQuestMoreProps {
  /** Unplayed modes other than the headline one, in hand-off order. */
  modes: readonly DailyModeId[];
  currentLanguage: Language;
  source: string;
}

/** Quiet second row under the headline CTA: the way back, plus any other challenge still open today. */
export function NextQuestMore({ modes, currentLanguage, source }: NextQuestMoreProps) {
  const { t } = useLanguage();
  const defs = modes.map((id) => DAILY_MODES.find((m) => m.id === id)).filter((m) => m !== undefined);

  return (
    <nav
      data-testid="next-quest-more"
      aria-label={t('daily.alsoToday')}
      className={cn('flex w-full flex-wrap items-center gap-2', MORE_ROW_HEIGHT)}
    >
      <Link
        href={`/${currentLanguage}/daily`}
        data-testid="next-quest-back"
        className="inline-flex min-h-10 items-center gap-1.5 rounded-full border-2 border-neo-cream/30 px-3 text-sm font-bold text-neo-cream transition-colors hover:border-neo-cream hover:bg-neo-cream/10 focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime"
      >
        <ArrowLeft className="h-4 w-4 shrink-0 rtl:rotate-180" aria-hidden="true" />
        {t('daily.backToDailyHub')}
      </Link>

      {defs.length > 0 && (
        <span className="ms-auto flex flex-wrap items-center justify-end gap-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-neo-cream/60 rtl:tracking-normal">
            {t('daily.alsoToday')}
          </span>
          {defs.map((mode) => (
            <Link
              key={mode.id}
              href={dailyModeHref(mode, currentLanguage)}
              data-testid="next-quest-more-mode"
              data-mode={mode.id}
              onClick={() => {
                markDailyHandoff(mode.id);
                trackGrowthEvent('cross_promo_click', {
                  target: mode.id,
                  source,
                  placement: 'next_quest_more',
                  language: currentLanguage,
                });
              }}
              className="group inline-flex min-h-10 items-center gap-2 rounded-full border-2 border-neo-black bg-neo-navy-light py-1 pe-3 ps-1 text-sm font-bold text-neo-white shadow-hard-sm transition-[translate,box-shadow] hover:-translate-y-px active:translate-y-px active:shadow-none focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime"
            >
              <span
                aria-hidden="true"
                style={{ backgroundImage: `url(${mode.art})` }}
                className={cn('h-8 w-8 shrink-0 rounded-full border-2 bg-cover bg-center', DOT[mode.accent])}
              />
              {t(mode.titleKey)}
            </Link>
          ))}
        </span>
      )}
    </nav>
  );
}
