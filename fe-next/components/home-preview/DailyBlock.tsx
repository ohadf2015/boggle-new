'use client';

import Link from 'next/link';
import { PressSurface } from '@/components/motion/PressSurface';
import { ArrowRight } from 'lucide-react';
import { StreakFlame } from '@/components/streak/StreakFlame';
import { StreakWeekStrip } from '@/components/streak/StreakWeekStrip';
import { StreakAtRiskPill } from '@/components/streak/StreakAtRiskPill';
import { StreakFreezeButton } from '@/components/streak/StreakFreezeButton';
import { streakTier, type NextMilestone, type WeekDay } from '@/lib/daily/streakRewards';
import styles from './homeMotion.module.css';

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
  /** Motion on (mounted, no reduced-motion): the flame glows, the week pops in, today beats. */
  animate?: boolean;
}

/** The streak at a glance: flame, this week, one link into today's daily. */
export function DailyBlock({ lang, t, streak, streakLoading, freezes = 0, atRisk = false, week, next = null, isGuest = false, onStreakChanged, animate = false }: DailyBlockProps) {
  const lit = animate && !streakLoading && streak > 0;
  return (
    <section
      aria-labelledby="hp-daily-title"
      data-testid="hp-daily"
      data-motion={animate ? 'live' : undefined}
      className="flex flex-col gap-3 rounded-3xl border-[3px] border-neo-cream/15 bg-neo-navy-elevated p-4 text-neo-cream lg:p-5"
    >
      <div className="flex items-center gap-3">
        <span className={`relative shrink-0 ${animate && atRisk && !streakLoading ? styles.tug : ''}`}>
          {lit ? <span data-testid="hp-daily-glow" aria-hidden="true" className={styles.glow} /> : null}
          <StreakFlame days={streakLoading ? 0 : streak} size={44} mood={atRisk && !streakLoading ? 'worried' : 'happy'} animated={!streakLoading} className="relative" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="hp-daily-title" className="truncate font-neo-display text-lg font-bold leading-tight">
            {streakLoading ? t('homePlay.chipDaily') : streak > 0 ? t('homePlay.chipStreak', { n: streak }) : t('homePlay.dailyNoStreak')}
          </h2>
          {!streakLoading && streak > 0 && (
            <span data-testid="hp-daily-tier" className="font-neo-display text-[11px] font-black tracking-wide text-neo-orange uppercase">
              {t(`dailyStreak.flame.tier.${streakTier(streak)}`)}
            </span>
          )}
        </div>
        {!streakLoading && <StreakFreezeButton freezes={freezes} isGuest={isGuest} onChanged={onStreakChanged} testId="hp-daily-freezes" />}
      </div>

      {!streakLoading && atRisk && <StreakAtRiskPill days={streak} className="self-start" />}
      {week && <StreakWeekStrip week={week} size="sm" className={animate ? styles.week : undefined} />}
      {!streakLoading && next && (
        <span data-testid="hp-daily-next-reward" className="text-xs font-bold leading-snug text-neo-cream/70">
          {t('dailyStreak.flame.heroNext', { n: next.remaining, days: next.days, coins: next.coins })}
        </span>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <PressSurface asChild lip={4}>
          <Link
            href={`/${lang}/daily`}
            data-testid="hp-daily-cta"
            className="inline-flex max-w-full items-center gap-1.5 rounded-2xl border-[3px] border-neo-orange bg-neo-navy px-3.5 py-2 text-start font-neo-display text-sm leading-tight font-bold text-neo-orange shadow-neo-orange/40"
          >
            {t('homeFresh.sections.daily.cta')}
            <span className={`inline-flex shrink-0 ${animate ? styles.nudge : ''}`}>
              <ArrowRight className="h-4 w-4 shrink-0 rtl:-scale-x-100" strokeWidth={3} aria-hidden="true" />
            </span>
          </Link>
        </PressSurface>
        <Link
          href={`/${lang}/word-tower/daily`}
          data-testid="hp-daily-tower"
          className="text-xs font-bold leading-snug text-neo-cream/75 underline decoration-2 underline-offset-2 hover:text-neo-cream"
        >
          {t('wordTower.daily.questTitle')}
        </Link>
      </div>
    </section>
  );
}
