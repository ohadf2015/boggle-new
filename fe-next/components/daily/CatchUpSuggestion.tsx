'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { m } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMissedDailies } from '@/hooks/useMissedDailies';
import { isNative } from '@/utils/platform';

function daysAgo(date: string, today: string): number {
  const a = new Date(date + 'T00:00:00Z').getTime();
  const b = new Date(today + 'T00:00:00Z').getTime();
  return Math.round((b - a) / 86_400_000);
}

interface CatchUpSuggestionProps {
  /** The date just played — filtered out so we never suggest re-playing it. */
  excludeDate?: string;
}

/**
 * Post-results nudge: lists the dailies the player missed in the catch-up
 * window (last 3 days) and links each to its past puzzle. Renders nothing when
 * there's nothing to catch up. Self-contained — fetches its own data + locale.
 */
export default function CatchUpSuggestion({ excludeDate }: CatchUpSuggestionProps) {
  const { t, language } = useLanguage();
  const { missed } = useMissedDailies();
  const today = new Date().toISOString().split('T')[0];

  // Native gates catch-up play behind a rewarded ad — flag it here so tapping a
  // missed day isn't a bait-and-switch. Resolved post-mount to avoid an SSR
  // hydration mismatch (isNative() is false on the server).
  const [showAdHint, setShowAdHint] = useState(false);
  useEffect(() => {
    setShowAdHint(isNative());
  }, []);

  const items = missed.filter(m => m.date !== excludeDate);
  if (items.length === 0) return null;

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.24, type: 'spring', stiffness: 300, damping: 26 }}
      className="rounded-neo border-neo-thick border-neo-black bg-neo-cyan-muted p-4 shadow-hard"
    >
      <div className="mb-1 flex items-center gap-2">
        <span aria-hidden className="text-xl">🗓️</span>
        <h3 className="font-neo-display text-lg text-neo-black">{t('daily.catchUp.title')}</h3>
      </div>
      <p className="mb-3 font-neo-body text-sm text-neo-black/80">
        {t('daily.catchUp.subtitle', { count: items.length })}
      </p>
      {showAdHint && (
        <p className="mb-3 flex items-center gap-1.5 font-neo-body text-xs font-semibold text-neo-black/70">
          <span aria-hidden>📺</span>
          {t('daily.catchUp.watchAd')}
        </p>
      )}
      <div className="flex flex-col gap-2">
        {items.map(item => {
          const n = daysAgo(item.date, today);
          const label = n <= 1 ? t('daily.catchUp.yesterday') : t('daily.catchUp.daysAgo', { count: n });
          return (
            <Link
              key={item.date}
              href={`/${language}/daily/word-hunt?date=${item.date}`}
              className="flex items-center justify-between rounded-neo border-neo border-neo-black bg-neo-cream px-3 py-2 font-neo-body text-neo-black shadow-hard-sm transition-transform hover:-translate-y-px active:translate-y-px"
            >
              <span className="font-semibold">{label}</span>
              <span className="flex items-center gap-1 text-sm">
                #{item.puzzleNumber}
                <span aria-hidden>▶</span>
              </span>
            </Link>
          );
        })}
      </div>
    </m.div>
  );
}
