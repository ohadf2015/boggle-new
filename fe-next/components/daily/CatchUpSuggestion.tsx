'use client';

import React from 'react';
import Link from 'next/link';
import { m } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMissedDailies, type DailyMode } from '@/hooks/useMissedDailies';
import { getDailyChallengeDate } from '@/utils/dailyChallenge/dateUtils';
import { catchUpPlayHref } from '@/utils/dailyChallenge/missedDayAction';

function daysAgo(date: string, today: string): number {
  const a = new Date(date + 'T00:00:00Z').getTime();
  const b = new Date(today + 'T00:00:00Z').getTime();
  return Math.round((b - a) / 86_400_000);
}

interface CatchUpSuggestionProps {
  /** The date just played — filtered out so we never suggest re-playing it. */
  excludeDate?: string;
  /** Which daily mode's missed challenges to show. Defaults to 'word-hunt'. */
  mode?: DailyMode;
}

/**
 * Post-results nudge listing the dailies the player missed in the catch-up
 * window, each a free playable link. Renders nothing when there's nothing to catch up.
 */
export default function CatchUpSuggestion({ excludeDate, mode = 'word-hunt' }: CatchUpSuggestionProps) {
  const { t, language } = useLanguage();
  const { missed } = useMissedDailies(mode, true, language);
  const today = getDailyChallengeDate();

  // On a past day's own results two unsolved days would offer each other forever (#189<->#190).
  if (excludeDate && excludeDate < today) return null;

  const items = missed.filter(item => item.date !== excludeDate);
  if (items.length === 0) return null;

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.24, type: 'spring', stiffness: 300, damping: 26 }}
      className="rounded-neo border-neo-thick border-neo-black bg-neo-cyan p-4 shadow-hard-lg"
    >
      <div className="mb-1 flex items-center gap-2">
        <span aria-hidden className="text-2xl">🗓️</span>
        <h3 className="font-neo-display text-lg font-black text-neo-black">{t('daily.catchUp.title')}</h3>
        <span className="ms-auto rounded-full border-neo border-neo-black bg-neo-black px-2.5 py-0.5 font-neo-display text-sm font-black text-neo-cyan">
          {items.length}
        </span>
      </div>
      <p className="mb-3 font-neo-body text-sm font-medium text-neo-black/80">
        {t('daily.catchUp.subtitle', { count: items.length })}
      </p>
      <div className="flex flex-col gap-2">
        {items.map(item => {
          const n = daysAgo(item.date, today);
          const label = n <= 1 ? t('daily.catchUp.yesterday') : t('daily.catchUp.daysAgo', { count: n });
          return (
            <Link
              key={item.date}
              href={catchUpPlayHref(language, mode, item.date)}
              className="flex items-center justify-between gap-2 rounded-neo border-neo border-neo-black bg-neo-cream px-3 py-2.5 font-neo-body text-neo-black shadow-hard-sm transition-transform hover:-translate-y-px active:translate-y-px active:shadow-hard-pressed"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-neo-display font-black leading-tight">{label}</span>
                <span className="block text-xs font-semibold text-neo-black/60">#{item.puzzleNumber}</span>
              </span>
              <span aria-hidden className="shrink-0 font-neo-display text-lg font-black rtl:rotate-180">▶</span>
            </Link>
          );
        })}
      </div>
    </m.div>
  );
}
