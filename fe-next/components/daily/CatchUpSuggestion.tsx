'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { m } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMissedDailies, type DailyMode } from '@/hooks/useMissedDailies';
import { isNative } from '@/utils/platform';
import { playStoreUrlWithReferrer } from '@/utils/androidApp';
import GooglePlayMark from '@/components/android-install/GooglePlayMark';

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
 * Post-results nudge for the dailies the player missed in the catch-up window
 * (last 3 days). Renders nothing when there's nothing to catch up.
 *
 * Replaying a missed daily is a **native-app exclusive**: on the native shell
 * we list each missed day as a playable link (gated behind a rewarded ad). On
 * **web** we deliberately don't offer replay — instead we pitch the Android
 * app, where catch-up lives. Self-contained — fetches its own data + locale.
 */
export default function CatchUpSuggestion({ excludeDate, mode }: CatchUpSuggestionProps) {
  const { t, language } = useLanguage();
  const { missed } = useMissedDailies(mode || 'word-hunt');
  const today = new Date().toISOString().split('T')[0];

  // Platform decides which surface we render (links vs app pitch). Resolved
  // post-mount because isNative() is false during SSR — holding render until
  // we know avoids web flashing the native links and native flashing the web
  // pitch (Class 1: render the pessimistic state until the source resolves).
  const [mounted, setMounted] = useState(false);
  const [native, setNative] = useState(false);
  useEffect(() => {
    setNative(isNative());
    setMounted(true);
  }, []);

  // Suppress the nudge on a catch-up's OWN results screen. `excludeDate` is
  // always the puzzle currently being viewed; when it's a *past* date we're
  // already inside a catch-up, not on today's results. Re-surfacing the nudge
  // there is a UI-locking trap: two unsolved past dailies (a failed Word Hunt
  // never counts as "solved", so it stays "missed") mutually offer each other,
  // and because each item only swaps the `?date=` search param in place, every
  // tap just re-renders the already-played results to the *other* date — the
  // #189<->#190 ping-pong. The nudge belongs only on today's results, so any
  // navigation into a historical puzzle stays put instead of fighting back.
  if (excludeDate && excludeDate < today) return null;

  const items = missed.filter(m => m.date !== excludeDate);
  if (items.length === 0) return null;
  if (!mounted) return null;

  // Web: no replay here. Advertise the native app, where catch-up lives.
  if (!native) {
    return (
      <m.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.24, type: 'spring', stiffness: 300, damping: 26 }}
        className="rounded-neo border-neo-thick border-neo-black bg-neo-cyan p-4 shadow-hard-lg"
      >
        <div className="mb-1 flex items-center gap-2">
          <span aria-hidden className="text-2xl">🗓️</span>
          <h3 className="font-neo-display text-lg font-black text-neo-black">{t('daily.catchUp.appTitle')}</h3>
        </div>
        <p dir="auto" className="mb-3 font-neo-body text-sm font-medium text-neo-black/80">
          {t('daily.catchUp.appSubtitle', { count: items.length })}
        </p>
        <a
          href={playStoreUrlWithReferrer('daily_catchup', language)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${t('daily.catchUp.appCta')} — Google Play`}
          className="group inline-flex w-full items-center justify-center gap-3 rounded-neo border-neo border-neo-black bg-neo-black px-6 py-3 text-neo-white shadow-hard-sm transition-transform hover:-translate-y-px active:translate-y-px"
        >
          <GooglePlayMark size={24} />
          <span className="font-neo-display text-base font-black tracking-tight">
            {t('daily.catchUp.appCta')}
          </span>
        </a>
      </m.div>
    );
  }

  // Native: list each missed day as a playable link (start is gated behind a
  // rewarded ad, hinted below so tapping isn't a bait-and-switch).
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
      <p className="mb-3 flex items-center gap-1.5 font-neo-body text-xs font-semibold text-neo-black/70">
        <span aria-hidden>📺</span>
        {t('daily.catchUp.watchAd')}
      </p>
      <div className="flex flex-col gap-2">
        {items.map(item => {
          const n = daysAgo(item.date, today);
          const label = n <= 1 ? t('daily.catchUp.yesterday') : t('daily.catchUp.daysAgo', { count: n });
          return (
            <Link
              key={item.date}
              href={`/${language}/daily/${mode || 'word-hunt'}?date=${item.date}`}
              className="flex items-center justify-between gap-2 rounded-neo border-neo border-neo-black bg-neo-cream px-3 py-2.5 font-neo-body text-neo-black shadow-hard-sm transition-transform hover:-translate-y-px active:translate-y-px active:shadow-hard-pressed"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-neo-display font-black leading-tight">{label}</span>
                <span className="block text-xs font-semibold text-neo-black/60">#{item.puzzleNumber}</span>
              </span>
              {/* The ad is the price of THIS replay, so it is priced on the
                  button. A header sentence is read once; a badge is read on
                  every row, by the player about to tap it. */}
              <span
                data-testid="catch-up-ad-badge"
                className="flex shrink-0 items-center gap-1 rounded-full border-neo border-neo-black bg-neo-black px-2.5 py-1 font-neo-display text-[10px] font-black uppercase tracking-wide text-neo-cyan"
              >
                <span aria-hidden>📺</span>
                {t('daily.catchUp.adBadge')}
              </span>
              <span aria-hidden className="shrink-0 font-neo-display text-lg font-black rtl:rotate-180">▶</span>
            </Link>
          );
        })}
      </div>
    </m.div>
  );
}
