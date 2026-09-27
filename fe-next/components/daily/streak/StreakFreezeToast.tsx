'use client';

/**
 * StreakFreezeToast — Toast notification when a streak freeze is applied
 *
 * Shows when a player plays today after missing yesterday, and a freeze bridges the gap.
 * Copy is honest: names what it cost (1 freeze) and what it protected (the saved day).
 *
 * Renders as a translucent toast with snowflake icon, clear messaging, and auto-dismiss.
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
      className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2.5 px-4 py-3 rounded-lg bg-neo-cyan/90 backdrop-blur-sm border border-neo-cyan text-neo-navy font-rubik text-sm font-semibold shadow-hard-lg z-50 animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <Snowflake className="w-4 h-4 flex-shrink-0" strokeWidth={2.5} aria-hidden />
      <span>{message}</span>
    </div>
  );
}
