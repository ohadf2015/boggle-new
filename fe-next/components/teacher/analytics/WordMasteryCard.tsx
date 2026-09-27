'use client';

import React, { useMemo } from 'react';
import { BookMarked, CheckCircle2, TrendingUp, AlertTriangle, RefreshCw, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWordMasteryTrend } from '@/hooks/useWordMasteryTrend';
import type { ClassMastery } from '@/lib/education/wordMasteryTrend';
import { MetricCard } from './MetricCard';
import { PageLoader } from '@/components/ui/PageLoader';
import { cn } from '@/lib/utils';

export interface WordMasteryCardProps {
  classroomId: string;
  /** Receives the top stuck words when the teacher clicks "Create review lesson". */
  onCreateReviewLesson?: (words: string[]) => void;
  /** How many stuck words to surface (default 5). */
  topStuckLimit?: number;
  className?: string;
}

/** Tallies mastered/improving/stuck across every student's word trajectories. */
function countTrends(mastery: ClassMastery) {
  let mastered = 0;
  let improving = 0;
  let stuck = 0;
  for (const student of mastery.students) {
    for (const word of student.words) {
      if (word.trend === 'mastered') mastered += 1;
      else if (word.trend === 'improving') improving += 1;
      else if (word.trend === 'stuck') stuck += 1;
    }
  }
  return { mastered, improving, stuck };
}

/**
 * WordMasteryCard — the Teacher Pro "Word Mastery Trends" card.
 *
 * Folds `practice_sessions` evidence (via `useWordMasteryTrend` /
 * `lib/education/wordMasteryTrend`) into class-wide mastered/improving/stuck
 * counts plus a ranked "reteach these" list — the cross-session signal that
 * `LastGameInsights` (single-game) and `VocabularyHeatmap` (per-cell) don't
 * answer.
 */
export function WordMasteryCard({
  classroomId,
  onCreateReviewLesson,
  topStuckLimit = 5,
  className,
}: WordMasteryCardProps) {
  const { t } = useLanguage();
  const { mastery, isLoading, error, refresh } = useWordMasteryTrend({ classroomId });

  const topStuck = useMemo(
    () => (mastery ? mastery.classStuckWords.slice(0, topStuckLimit) : []),
    [mastery, topStuckLimit]
  );

  // ==================== LOADING ====================
  if (isLoading) {
    return (
      <div data-testid="word-mastery-loading" className={cn('flex items-center justify-center py-8', className)}>
        <PageLoader size="md" text={t('education.analytics.loading')} />
      </div>
    );
  }

  // ==================== ERROR ====================
  if (error) {
    return (
      <div
        data-testid="word-mastery-error"
        role="alert"
        className={cn('rounded-neo border-3 border-black bg-neo-pink shadow-hard-sm p-4 flex flex-wrap items-center gap-3', className)}
      >
        <p className="font-neo-body font-bold text-black flex-1 min-w-0 text-start">{t('education.analytics.error')}</p>
        <button
          type="button"
          onClick={() => { void refresh(); }}
          className="inline-flex items-center gap-2 px-3 py-2 bg-black text-neo-lime font-black font-neo-body text-sm rounded-neo border-3 border-black shadow-hard-sm hover:-translate-y-0.5 transition-all duration-100"
        >
          <RefreshCw className="w-4 h-4" aria-hidden />
          {t('education.analytics.retry')}
        </button>
      </div>
    );
  }

  // ==================== EMPTY (not enough evidence yet) ====================
  if (!mastery || mastery.sessionsAnalyzed === 0) {
    return (
      <div
        data-testid="word-mastery-empty"
        className={cn('rounded-neo border-3 border-dashed border-neo-cream/40 bg-neo-navy/30 p-6 text-center', className)}
      >
        <BookMarked className="w-8 h-8 mx-auto mb-2 text-neo-white/50" aria-hidden />
        <p className="font-neo-display font-black text-neo-white">{t('education.analytics.wordMastery.emptyTitle')}</p>
        <p className="font-neo-body text-sm text-neo-white/70 mt-1">{t('education.analytics.wordMastery.emptyHint')}</p>
      </div>
    );
  }

  // ==================== DATA ====================
  const { mastered, improving, stuck } = countTrends(mastery);

  return (
    <section
      data-testid="word-mastery-card"
      aria-label={t('education.analytics.wordMastery.title')}
      className={cn('flex flex-col gap-4', className)}
    >
      <div className="text-start">
        <h3 className="text-lg font-neo-display font-bold text-neo-white">
          {t('education.analytics.wordMastery.title')}
        </h3>
        <p className="text-sm text-neo-white/70 font-neo-body">
          {t('education.analytics.wordMastery.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          testId="word-mastery-mastered"
          title={t('education.analytics.wordMastery.mastered')}
          value={mastered}
          icon={<CheckCircle2 className="w-6 h-6" aria-hidden />}
          severity="info"
        />
        <MetricCard
          testId="word-mastery-improving"
          title={t('education.analytics.wordMastery.improving')}
          value={improving}
          icon={<TrendingUp className="w-6 h-6" aria-hidden />}
          severity="warning"
        />
        <MetricCard
          testId="word-mastery-stuck"
          title={t('education.analytics.wordMastery.stuck')}
          value={stuck}
          icon={<AlertTriangle className="w-6 h-6" aria-hidden />}
          severity="urgent"
        />
      </div>

      <div className="text-start">
        <h4 className="font-neo-display font-black text-neo-white text-base mb-2">
          {t('education.analytics.wordMastery.reteachTitle')}
        </h4>
        {topStuck.length === 0 ? (
          <p className="font-neo-body text-sm text-neo-white/70">
            {t('education.analytics.wordMastery.reteachEmpty')}
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
            {topStuck.map((w) => (
              <li
                key={w.word}
                data-testid="stuck-word-chip"
                data-word={w.word}
                className="inline-flex items-baseline gap-2 px-3 py-1.5 rounded-neo border-3 border-black shadow-hard-sm font-neo-body bg-neo-pink"
              >
                <span className="font-black text-black">{w.display}</span>
                <span className="text-xs font-bold text-black/70 whitespace-nowrap">
                  {t('education.analytics.wordMastery.studentsStuck', {
                    stuck: w.studentsStuck,
                    total: w.studentsWithEvidence,
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {onCreateReviewLesson && topStuck.length > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onCreateReviewLesson(topStuck.map((w) => w.word))}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 bg-black text-neo-lime',
              'font-black font-neo-body text-sm rounded-neo border-3 border-black shadow-hard-sm',
              'hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0.5 active:shadow-hard-pressed',
              'transition-all duration-100 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-lime'
            )}
          >
            <Sparkles className="w-4 h-4" aria-hidden />
            {t('education.analytics.createReviewLesson')}
          </button>
        </div>
      )}
    </section>
  );
}

export default WordMasteryCard;
