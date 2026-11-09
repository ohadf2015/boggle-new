'use client';

/**
 * This week's themed board: one seeded classic board per ISO week, the same
 * for everyone, replayable all week. One tap into Quick Play.
 *
 * Mount-gated: the week is read from the clock, so server HTML (and a page
 * cached across a Monday) can never disagree with the client.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import posthog from '@/lib/analytics/lazyPosthog';
import { isoWeekKey, weeklyThemeFor, type WeeklyThemeId } from '@/shared/utils/weeklyTheme';

interface WeeklyThemeCardProps {
  lang: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Where it sits, for analytics. */
  source: 'home' | 'daily_hub';
  compact?: boolean;
}

export function WeeklyThemeCard({ lang, t, source, compact = false }: WeeklyThemeCardProps) {
  const [theme, setTheme] = useState<WeeklyThemeId | null>(null);
  useEffect(() => {
    setTheme(weeklyThemeFor(isoWeekKey(), lang).id);
  }, [lang]);
  if (!theme) return null;

  const name = t(`quickLoop.weekly.theme.${theme}`);
  return (
    <Link
      href={`/${lang}/quick-play?weekly=1`}
      data-testid="weekly-theme-card"
      data-theme={theme}
      onClick={() => posthog.capture('weekly_theme_board_click', { theme, source })}
      className={`flex w-full items-center gap-3 rounded-2xl border-[3px] border-black bg-neo-cyan text-black shadow-hard-sm transition-transform hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed ${
        compact ? 'px-3 py-2' : 'px-4 py-3'
      }`}
    >
      <Sparkles className={compact ? 'h-5 w-5 shrink-0' : 'h-6 w-6 shrink-0'} strokeWidth={2.75} aria-hidden="true" />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="font-neo-display text-[11px] font-bold uppercase tracking-wider opacity-70">
          {t('quickLoop.weekly.kicker')}
        </span>
        <span className={`truncate font-neo-display font-bold ${compact ? 'text-sm' : 'text-base'}`}>{name}</span>
        {!compact && <span className="text-xs font-semibold opacity-80">{t(`quickLoop.weekly.line.${theme}`)}</span>}
      </span>
      <span className="ms-auto shrink-0 rounded-xl border-2 border-black bg-black px-2.5 py-1 font-neo-display text-xs font-bold text-neo-cyan">
        {t('quickLoop.weekly.play')}
      </span>
    </Link>
  );
}
