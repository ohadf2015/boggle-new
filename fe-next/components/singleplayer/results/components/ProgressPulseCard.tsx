'use client';

import React, { memo } from 'react';
import { TrendingUp, TrendingDown, Minus, Target, Trophy } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { safeToLocaleString } from '@/utils/bcp47Locale';
import { cn } from '@/lib/utils';
import type { ProgressSnapshot } from '../progressSnapshot';

interface ProgressPulseCardProps {
  snapshot: ProgressSnapshot;
  className?: string;
}

/**
 * ProgressPulseCard — "how am I doing?" at a glance, every game.
 *
 * Sits directly under the results hero. Game number, the delta against the
 * previous game, a 6-bar score sparkline with this game highlighted, the
 * personal best, how much of the board was found, and ONE concrete next goal.
 * Pure presentation over a ProgressSnapshot; neo-brutalist like its
 * StreakIgnitionCard sibling. The bar row inherits `dir` (RTL flows right→left).
 */
export const ProgressPulseCard: React.FC<ProgressPulseCardProps> = memo(({ snapshot, className }) => {
  const { t, language } = useLanguage();
  const fmt = (n: number) => safeToLocaleString(n, language);
  const { gameNumber, score, delta, best, isNewBest, recentScores, wordsFound, wordsPossible, coverage, nextGoal } = snapshot;

  const trend = delta == null ? null : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const maxScore = Math.max(1, ...recentScores);

  const goalText =
    nextGoal.kind === 'first' ? t('results.progressPulse.goalFirst')
    : nextGoal.kind === 'newBest' ? t('results.progressPulse.goalNewBest', { target: fmt(nextGoal.target) })
    : t('results.progressPulse.goalBeatBest', { gap: fmt(nextGoal.gap) });

  const coverageText =
    coverage != null && wordsPossible != null
      ? t('results.progressPulse.coverage', { found: fmt(wordsFound), total: fmt(wordsPossible), pct: coverage })
      : t('results.progressPulse.wordsFound', { found: fmt(wordsFound) });

  return (
    <section
      data-testid="progress-pulse"
      aria-label={t('results.progressPulse.title')}
      className={cn(
        'relative bg-neo-navy-light border-neo-thick border-neo-black shadow-hard rounded-neo',
        'p-4 sm:p-5 overflow-hidden',
        className,
      )}
    >
      <div aria-hidden className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-neo-cyan via-neo-lime to-neo-yellow" />

      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-neo border-2 border-neo-black shadow-hard-sm bg-neo-cyan">
            <Target className="h-5 w-5 text-neo-black" aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="font-neo-display text-base sm:text-lg font-black uppercase tracking-wide text-neo-white leading-tight">
              {t('results.progressPulse.title')}
            </h3>
            <p className="text-xs text-neo-white/70 font-bold">{t('results.progressPulse.game', { n: gameNumber })}</p>
          </div>
        </div>
        {trend && delta != null && (
          <span
            data-testid="progress-delta"
            data-trend={trend}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded-neo border-2 border-neo-black font-neo-display font-black text-sm shadow-hard-sm',
              trend === 'up' && 'bg-neo-lime text-neo-black',
              trend === 'down' && 'bg-neo-navy text-neo-white',
              trend === 'flat' && 'bg-neo-navy text-neo-white',
            )}
            aria-label={t('results.progressPulse.vsLast', { delta: `${delta > 0 ? '+' : ''}${fmt(delta)}` })}
          >
            <TrendIcon className="h-4 w-4" aria-hidden />
            {delta > 0 ? '+' : ''}{fmt(delta)}
          </span>
        )}
      </div>

      {/* Sparkline — one bar per recent game, this game last + lit. */}
      <div
        data-testid="progress-sparkline"
        role="img"
        aria-label={t('results.progressPulse.sparklineAria', { n: recentScores.length })}
        className="flex items-end gap-1.5 h-14 mb-3"
      >
        {recentScores.map((s, i) => {
          const current = i === recentScores.length - 1;
          const heightPct = Math.max(8, Math.round((s / maxScore) * 100));
          return (
            <div key={`${i}-${s}`} className="flex-1 flex flex-col items-center justify-end h-full">
              <div
                data-testid="progress-bar"
                data-current={current}
                title={fmt(s)}
                style={{ height: `${heightPct}%` }}
                className={cn(
                  'w-full rounded-sm border-2 border-neo-black transition-[height] duration-500',
                  current ? 'bg-neo-lime shadow-hard-sm' : s === best && s > 0 ? 'bg-neo-yellow/80' : 'bg-neo-white/25',
                )}
              />
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neo-white mb-2">
        <span className="inline-flex items-center gap-1 font-bold">
          <Trophy className="h-4 w-4 text-neo-yellow" aria-hidden />
          {t('results.progressPulse.best', { score: fmt(best) })}
        </span>
        {isNewBest && (
          <span className="px-1.5 py-0.5 rounded-neo border-2 border-neo-black bg-neo-yellow text-neo-black font-neo-display font-black text-[10px] uppercase motion-safe:animate-pulse">
            {t('results.progressPulse.newBest')}
          </span>
        )}
        <span className="text-neo-white/80">{coverageText}</span>
      </div>

      <p className="text-sm font-bold text-neo-cyan leading-snug" data-testid="progress-goal">
        {goalText}
      </p>
      <span className="sr-only">{fmt(score)}</span>
    </section>
  );
});

ProgressPulseCard.displayName = 'ProgressPulseCard';

export default ProgressPulseCard;
