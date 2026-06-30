'use client';

import React, { useMemo } from 'react';
import { m } from 'framer-motion';
import { Flame, ArrowUpRight, Star } from 'lucide-react';
import { selectImprovementSummary } from '@/lib/results/selectImprovementSummary';
import type { XpGainedData, LevelUpData } from '@/types/components';

interface StreakLike {
  currentStreak: number;
  bestStreak: number;
  isNewMilestone: boolean;
  previousStreak: number;
}

type TFunction = (key: string, params?: Record<string, string | number>) => string;

export interface ImprovementPanelProps {
  xp: XpGainedData | null;
  levelUp: LevelUpData | null;
  streak: StreakLike | null;
  t: TFunction;
  reducedMotion: boolean | null;
}

/**
 * Results-screen "Your Progress" panel — the personal-improvement payoff. Built
 * ONLY from server-authoritative signals (XP earned, level, level-up, win streak)
 * via the pure {@link selectImprovementSummary}. It never claims a cross-mode
 * "personal best" (localStorage history can't be trusted across modes) and never
 * shows an empty shell: when there's nothing reliable, it renders nothing.
 *
 * Neo-brutalist refined: navy-light card, full borders, yellow = XP/level
 * (celebration token), orange = streak fire. No accent side-stripes.
 */
const ImprovementPanel: React.FC<ImprovementPanelProps> = ({ xp, levelUp, streak, t, reducedMotion }) => {
  const summary = useMemo(
    () => selectImprovementSummary({ xp, levelUp, streak }),
    [xp, levelUp, streak],
  );

  if (!summary) return null;

  const hasXp = summary.level !== undefined;

  return (
    <m.section
      data-testid="improvement-panel"
      data-component="improvement"
      aria-label={t('results.progress.aria')}
      initial={reducedMotion ? undefined : { y: 12 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-3 rounded-neo border-neo-thick border-black bg-neo-navy-light shadow-hard p-3 animate-in fade-in-0 duration-300"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-neo-display font-bold uppercase tracking-wide text-sm text-neo-yellow">
          {t('results.progress.header')}
        </span>
        {summary.streak !== undefined && (
          <span
            data-testid="improvement-streak"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border-2 border-black bg-neo-orange text-neo-black text-[11px] font-black tabular-nums"
          >
            <Flame className="w-3.5 h-3.5" aria-hidden="true" />
            {t('results.progress.streak', { n: summary.streak })}
          </span>
        )}
      </div>

      {/* Level-up flourish */}
      {summary.leveledUp && (
        <div
          data-testid="improvement-levelup"
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border-2 border-black bg-neo-yellow text-neo-black"
        >
          <ArrowUpRight className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="text-xs font-black uppercase tracking-wide">
            {summary.newTitle
              ? t('results.progress.leveledUpTitle', { level: summary.level ?? 0, title: summary.newTitle })
              : t('results.progress.leveledUp', { level: summary.level ?? 0 })}
          </span>
        </div>
      )}

      {hasXp && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="inline-flex items-baseline gap-1.5">
              <m.span
                data-testid="improvement-xp"
                initial={reducedMotion ? undefined : { scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 320, damping: 16 }}
                className="font-neo-display text-2xl font-black text-neo-yellow tabular-nums leading-none"
              >
                +{summary.xpEarned}
              </m.span>
              <span className="text-[11px] font-bold uppercase tracking-wide text-neo-cream/60">
                {t('results.progress.xp')}
              </span>
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-neo-cream/70 uppercase tracking-wide">
              <Star className="w-3.5 h-3.5 text-neo-yellow" aria-hidden="true" />
              {t('results.progress.level')}{' '}
              <span data-testid="improvement-level" className="text-neo-white font-black tabular-nums">
                {summary.level}
              </span>
            </span>
          </div>

          {/* Level progress bar */}
          <div className="relative h-3 rounded-full border-2 border-black bg-neo-navy overflow-hidden">
            <m.span
              data-testid="improvement-progress-fill"
              aria-hidden
              initial={reducedMotion ? undefined : { scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: reducedMotion ? 0 : 0.1 }}
              className="absolute inset-y-0 start-0 origin-left rtl:origin-right bg-neo-yellow"
              style={{ width: `${summary.levelProgressPct ?? 0}%` }}
            />
          </div>
        </div>
      )}
    </m.section>
  );
};

export default ImprovementPanel;
