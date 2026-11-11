'use client';

import Link from 'next/link';
import { ArrowRight, Flame } from 'lucide-react';
import { useTodayLabel } from './useTodayLabel';
import { StreakFlame } from '@/components/streak/StreakFlame';
import { StreakWeekStrip } from '@/components/streak/StreakWeekStrip';
import { StreakAtRiskPill } from '@/components/streak/StreakAtRiskPill';
import { StreakFreezeButton } from '@/components/streak/StreakFreezeButton';
import { streakTier, type NextMilestone, type WeekDay } from '@/lib/daily/streakRewards';

interface DailyBlockProps {
  lang: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  streak: number;
  streakLoading: boolean;
  /** Banked streak freezes; the count opens the freeze shop. */
  freezes?: number;
  /** Streak alive but today not played yet. */
  atRisk?: boolean;
  week?: WeekDay[];
  next?: NextMilestone | null;
  isGuest?: boolean;
  /** Refetch after a freeze purchase. */
  onStreakChanged?: () => void;
}

/** A tear-off ticket: the streak is the stub, today's puzzle is the ticket. */
export function DailyBlock({ lang, t, streak, streakLoading, freezes = 0, atRisk = false, week, next = null, isGuest = false, onStreakChanged }: DailyBlockProps) {
  const weekday = useTodayLabel(lang, { weekday: 'long' });
  const day = useTodayLabel(lang, { day: 'numeric', month: 'short' });

  return (
    <section aria-labelledby="hp-daily-title" className="relative h-full" data-testid="hp-daily">
      <div className="flex h-full overflow-hidden rounded-3xl border-[3px] border-black bg-neo-orange text-black shadow-hard-lg">
        <div className="relative flex w-[34%] shrink-0 flex-col items-center justify-center gap-1 border-e-[3px] border-dashed border-black bg-neo-yellow px-2 py-4 lg:w-[30%] lg:py-8">
          <StreakFlame
            days={streakLoading ? 0 : streak}
            size={68}
            mood={atRisk && !streakLoading ? 'worried' : 'happy'}
            animated={!streakLoading}
            className="lg:!h-[120px] lg:!w-[96px]"
          />
          {streakLoading ? (
            <span className="h-12 w-14 rounded-lg bg-black/15 lg:h-20 lg:w-24" aria-hidden="true" />
          ) : streak > 0 ? (
            <>
              <span className="font-neo-display text-5xl font-bold leading-none tabular-nums lg:text-8xl">{streak}</span>
              <span className="text-center text-[11px] font-bold uppercase tracking-wider lg:text-sm">
                {t('homeFresh.sections.daily.streak')}
              </span>
              <span data-testid="hp-daily-tier" className="text-center font-neo-display text-[10px] font-black uppercase tracking-wide lg:text-sm">
                {t(`dailyStreak.flame.tier.${streakTier(streak)}`)}
              </span>
            </>
          ) : (
            <span className="text-center font-neo-display text-sm font-bold leading-tight lg:text-lg">{t('homePlay.dailyNoStreak')}</span>
          )}
          {!streakLoading && (
            <StreakFreezeButton freezes={freezes} isGuest={isGuest} onChanged={onStreakChanged} testId="hp-daily-freezes" className="mt-1" />
          )}
        </div>

        <div className="relative flex min-w-0 flex-1 flex-col gap-2 p-4 lg:justify-center lg:gap-4 lg:p-10">
          <div className="flex items-center gap-2">
            <span className="rounded-lg border-2 border-black bg-black px-2 py-0.5 font-neo-display text-[11px] font-bold tracking-widest text-neo-yellow uppercase lg:text-sm">
              {t('daily.badge')}
            </span>
            <span className="truncate text-xs font-bold lg:text-base">
              {weekday && `${weekday} · ${day}`}
            </span>
          </div>
          <h2 id="hp-daily-title" className="font-neo-display text-xl font-bold leading-tight lg:text-4xl">
            {t('homeFresh.sections.daily.title')}
          </h2>
          {!streakLoading && atRisk ? (
            <StreakAtRiskPill days={streak} tone="light" className="self-start" />
          ) : (
            <p className="hidden text-sm font-medium lg:block lg:text-lg">{t('homeFresh.sections.daily.line')}</p>
          )}
          {week && <StreakWeekStrip week={week} size="sm" tone="light" />}
          {!streakLoading && next && (
            <span data-testid="hp-daily-next-reward" className="text-[11px] font-bold leading-snug lg:text-base">
              {t('dailyStreak.flame.heroNext', { n: next.remaining, days: next.days, coins: next.coins })}
            </span>
          )}
          <Link
            href={`/${lang}/daily`}
            className="mt-auto inline-flex items-center gap-1.5 lg:mt-2 self-start rounded-xl border-[3px] border-black bg-black px-2.5 py-2 font-neo-display text-sm whitespace-nowrap font-bold text-neo-yellow shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed lg:px-5 lg:py-3 lg:text-lg"
          >
            <Flame className="h-4 w-4 lg:h-5 lg:w-5" strokeWidth={2.75} aria-hidden="true" />
            {t('homeFresh.sections.daily.cta')}
            <ArrowRight className="hidden h-5 w-5 rtl:-scale-x-100 lg:block" strokeWidth={3} aria-hidden="true" />
          </Link>
        </div>
      </div>
      <span aria-hidden="true" className="absolute start-[34%] -top-3 h-6 w-6 -translate-x-1/2 rounded-full border-[3px] border-black bg-neo-navy rtl:translate-x-1/2 lg:start-[30%]" />
      <span aria-hidden="true" className="absolute start-[34%] -bottom-3 h-6 w-6 -translate-x-1/2 rounded-full border-[3px] border-black bg-neo-navy rtl:translate-x-1/2 lg:start-[30%]" />
    </section>
  );
}
