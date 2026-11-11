'use client';

/**
 * StreakFreezeToast — Toast notification when a streak freeze is applied
 *
 * Shows when a player plays today after missing yesterday, and a freeze bridges the gap.
 * Copy is honest: names what it cost (1 freeze) and what it protected (the saved day).
 *
 * Solid cyan toast with a snowflake, clear messaging, and auto-dismiss.
 */

import { Snowflake } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { DailyPlayedStatus } from '@/app/api/daily/status/route';

function formatDateForDisplay(isoDate: string, locale: string): string {
  // isoDate is YYYY-MM-DD; return localized day name (e.g., "Tuesday")
  try {
    const date = new Date(isoDate + 'T00:00:00Z');
    const localeMap: Record<string, string> = {
      he: 'he-IL',
      ja: 'ja-JP',
      sv: 'sv-SE',
      es: 'es-ES',
      ru: 'ru-RU',
    };
    return date.toLocaleDateString(localeMap[locale] || 'en-US', {
      weekday: 'long',
    });
  } catch {
    return isoDate;
  }
}

interface StreakFreezeToastProps {
  freezeApplied: NonNullable<DailyPlayedStatus['freezeApplied']>;
}

export function StreakFreezeToast({ freezeApplied }: StreakFreezeToastProps) {
  const { t, language } = useLanguage();
  const dayName = formatDateForDisplay(freezeApplied.date, language);

  // Count-neutral phrasing: an "s" suffix is wrong in he/ru/ja/es, so the copy carries no plural form.
  const message = t('dailyStreak.streak_freeze_toast_message', { day: dayName, remaining: freezeApplied.freezesRemaining });

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-neo border-[3px] border-neo-black bg-neo-cyan px-4 py-3 font-neo-display text-sm font-bold text-neo-black shadow-hard-lg animate-in slide-in-from-bottom-4 duration-300"
    >
      <Snowflake className="w-5 h-5 flex-shrink-0" strokeWidth={2.5} aria-hidden />
      <span>{message}</span>
    </div>
  );
}
