'use client';

import React from 'react';
import { X, Sparkles, UserX } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { StudentDrillDown } from '@/lib/education/classReport';

export interface StudentDrillDownPanelProps {
  drill: StudentDrillDown;
  onClose: () => void;
  /** Same path the card's "Practice these words" CTA uses, scoped to one student. */
  onCreateReviewLesson?: (words: string[]) => void;
}

/**
 * One student's column, opened up.
 *
 * The suggested practice type is deliberately coarse — see the note in
 * `lib/education/classReport`. The assign button hands this student's missed
 * words to the same review-lesson path the whole-class CTA uses, so the
 * teacher lands in Prepare with the list pre-filled either way.
 */
export function StudentDrillDownPanel({
  drill,
  onClose,
  onCreateReviewLesson,
}: StudentDrillDownPanelProps) {
  const { t } = useLanguage();
  const canAssign = Boolean(onCreateReviewLesson) && drill.missedWords.length > 0;

  return (
    <section
      data-testid="report-drilldown"
      aria-label={t('teacher.classReport.drilldown.title')}
      className="rounded-neo border-3 border-black bg-white shadow-hard-sm p-4 flex flex-col gap-3 print:hidden"
    >
      <header className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0 text-start">
          <h5 className="font-neo-display font-black text-black text-base leading-tight">
            {drill.name}
          </h5>
          <p className="font-neo-body text-sm font-bold text-black/70">
            {drill.played ? (
              <>
                <span className="tabular-nums">{drill.accuracyPct}%</span>
                {' · '}
                {t('teacher.classReport.drilldown.missedCount', undefined, {
                  count: String(drill.missedWords.length),
                })}
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <UserX className="w-4 h-4" aria-hidden />
                {t('teacher.classReport.didNotPlay')}
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          data-testid="drilldown-close"
          onClick={onClose}
          aria-label={t('teacher.classReport.drilldown.close')}
          className={cn(
            'inline-flex h-11 w-11 items-center justify-center rounded-neo',
            'border-3 border-black bg-neo-cream text-black shadow-hard-sm',
            'hover:-translate-y-0.5 active:translate-y-0.5 transition-all duration-100',
            'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-black'
          )}
        >
          <X className="w-5 h-5" aria-hidden />
        </button>
      </header>

      {drill.missedWords.length > 0 ? (
        <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
          {drill.missedWords.map((word) => (
            <li
              key={word}
              data-testid="drilldown-word"
              className="inline-flex px-3 py-1.5 rounded-neo border-2 border-black bg-neo-pink font-neo-body font-black text-black text-sm"
            >
              {word}
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-neo-body text-sm text-black/70 text-start">
          {drill.played
            ? t('teacher.classReport.drilldown.noneMissed')
            : t('teacher.classReport.drilldown.absentHint')}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <p
          data-testid="drilldown-practice"
          className="font-neo-body text-sm font-bold text-black flex-1 min-w-0 text-start"
        >
          <span className="text-black/60">{t('teacher.classReport.drilldown.suggested')} </span>
          {t(`teacher.classReport.practice.${drill.practiceKey}`)}
        </p>

        {canAssign && (
          <button
            type="button"
            data-testid="drilldown-assign"
            onClick={() => onCreateReviewLesson?.(drill.missedWords)}
            className={cn(
              'inline-flex min-h-[44px] items-center gap-2 px-4 py-2 rounded-neo',
              'border-3 border-black bg-black text-neo-lime font-neo-body font-black text-sm shadow-hard-sm',
              'hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0.5 active:shadow-hard-pressed',
              'transition-all duration-100 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-lime'
            )}
          >
            <Sparkles className="w-4 h-4" aria-hidden />
            {t('teacher.classReport.drilldown.assign')}
          </button>
        )}
      </div>
    </section>
  );
}

export default StudentDrillDownPanel;
