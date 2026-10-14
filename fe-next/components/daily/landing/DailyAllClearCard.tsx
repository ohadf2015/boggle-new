'use client';

import { CheckCheck, Flame } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface DailyAllClearCardProps {
  /** Current daily streak; the streak line is omitted at 0. */
  streak: number;
}

/**
 * Closure for a finished day. Takes the hero slot once every quest is played,
 * where the hub used to fall back to a desaturated Word Wheel card still
 * labelled START QUEST — an invitation into a game the player had finished.
 *
 * Static on purpose (no entrance tween): a full-width opacity tween is a known
 * mobile-Chromium flash source (rules/60 Class 5).
 */
export function DailyAllClearCard({ streak }: DailyAllClearCardProps) {
  const { t } = useLanguage();

  return (
    <section
      data-testid="daily-all-clear"
      aria-live="polite"
      className="relative w-full overflow-hidden rounded-xl border-3 border-neo-black bg-neo-navy shadow-hard p-4 flex items-center gap-4"
    >
      <span aria-hidden="true" className="absolute inset-e-0 top-0 bottom-0 w-2 bg-neo-lime" />
      <span
        aria-hidden="true"
        className="shrink-0 w-14 h-14 rounded-full border-3 border-neo-black bg-neo-lime shadow-hard-sm flex items-center justify-center"
      >
        <CheckCheck className="w-8 h-8 text-neo-black" strokeWidth={3} />
      </span>
      <div className="min-w-0 flex-1 pe-2">
        <h2 className="font-neo-display font-black text-2xl leading-tight text-neo-lime">
          {t('daily.allClear.title')}
        </h2>
        <p className="mt-0.5 text-sm font-bold text-neo-white">{t('daily.allClear.body')}</p>
        {streak > 0 && (
          <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-black text-neo-yellow" data-testid="all-clear-streak">
            <Flame className="w-4 h-4 shrink-0 text-neo-orange" aria-hidden="true" />
            {t('daily.allClear.streak', { n: streak })}
          </p>
        )}
      </div>
    </section>
  );
}

export default DailyAllClearCard;
