/**
 * StudentArcView — the free per-student learning arc (reports drill-down).
 *
 * What a teacher gets here that the printable report cannot give: the TIME
 * axis. Accuracy per asked session as a dated chart against the 80% goal, each word's outcome
 * history as dots, and trend language that is firm but never scary — a word
 * is "needs a re-teach", not "failed". The error-correction loop closes
 * in-product: missed words already re-queue in the student's own Missed Words
 * review, and the view says so instead of leaving the teacher at a red X.
 *
 * Free on purpose (evidence pack §8.2): the per-student arc is the analytics
 * unit; exports and the deep printable report below it stay Pro.
 */

'use client';

import { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStudentArc } from '@/hooks/useStudentArc';
import type { WordTrajectory, WordTrend } from '@/lib/education/wordMasteryTrend';
import { cn } from '@/lib/utils';
import { ArcChart, shortDate } from './ArcChart';
import { StudentPracticeAction } from './StudentPracticeAction';
import { CLASS_GOAL } from './classInsights';

export interface StudentArcViewProps {
  studentId: string;
  classroomId: string;
  studentName?: string;
}

const TREND_ORDER: Record<WordTrend, number> = { stuck: 0, improving: 1, insufficient: 2, mastered: 3 };

const TREND_CHIP: Record<WordTrend, string> = {
  mastered: 'border-neo-lime bg-neo-lime/15 text-neo-lime',
  improving: 'border-neo-cyan bg-neo-cyan/15 text-neo-cyan',
  stuck: 'border-neo-pink bg-neo-pink/15 text-neo-pink',
  insufficient: 'border-neo-cream/40 bg-neo-cream/10 text-neo-cream/70',
};

const MAX_DOTS = 8;

export function StudentArcView({ studentId, classroomId, studentName }: StudentArcViewProps) {
  const { t, language } = useLanguage();
  const { arc, isLoading, error } = useStudentArc({ classroomId, studentId });

  const words = useMemo(
    () =>
      [...(arc?.mastery?.words ?? [])].sort(
        (a, b) => TREND_ORDER[a.trend] - TREND_ORDER[b.trend] || a.display.localeCompare(b.display)
      ),
    [arc]
  );
  const practiceWords = useMemo(
    () => words.filter((w) => w.trend !== 'mastered' && w.correct < w.attempts).map((w) => w.display),
    [words]
  );

  if (isLoading) {
    return (
      <section data-testid="student-arc-loading" aria-busy="true" className={PANEL}>
        <span className="sr-only" role="status">{t('teacher.reports.loading')}</span>
        <div aria-hidden="true" className="space-y-3">
          <div className="h-24 rounded-neo bg-neo-cream/10 motion-safe:animate-pulse" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-11 rounded-neo bg-neo-cream/10 motion-safe:animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={PANEL}>
        <p role="alert" className="rounded-neo border-2 border-neo-pink bg-neo-pink/15 px-3 py-2 text-sm font-bold text-neo-white">
          {t('teacher.reports.error')}
        </p>
      </section>
    );
  }

  if (!arc?.mastery) {
    return (
      <section className={PANEL}>
        <ArcHeader t={t} name={studentName} />
        <p data-testid="student-arc-empty" className="rounded-neo border-2 border-dashed border-neo-cream/30 p-6 text-center text-sm text-neo-cream/80">
          {t('teacher.reports.arc.emptyStudent', { name: studentName ?? '' })}
        </p>
      </section>
    );
  }

  const { points } = arc;
  const first = points[0]?.accuracy ?? 0;
  const last = points[points.length - 1]?.accuracy ?? 0;

  return (
    <section data-testid="student-arc-view" aria-label={t('teacher.reports.arc.title')} className={PANEL}>
      <ArcHeader t={t} name={studentName} />

      {points.length > 0 && (
        <div className="mb-5">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-bold text-neo-cream/80">{t('teacher.reports.arc.accuracyOverTime')}</h3>
            <p data-testid="student-arc-growth" className="flex items-center gap-1.5 text-sm font-black text-neo-white tabular-nums">
              <TrendingUp className="size-4 text-neo-lime" aria-hidden="true" />
              {t('teacher.reports.arc.growth', { first, last })}
            </p>
          </div>
          <ArcChart
            points={points}
            goal={CLASS_GOAL}
            language={language}
            goalLabel={t('eg2Polish.arc.goal', { goal: CLASS_GOAL })}
            label={t('teacher.reports.arc.sparklineLabel', { count: points.length, first, last })}
          />
        </div>
      )}

      {arc.mastery.stuckWords.length > 0 && (
        <p
          data-testid="student-arc-requeue"
          className="mb-4 rounded-neo border-2 border-neo-cyan bg-neo-cyan/10 px-3 py-2 text-xs font-bold text-neo-cream/90"
        >
          {t('teacher.reports.arc.requeueStudent', { name: studentName ?? '' })}
        </p>
      )}

      <div className="mb-4">
        <StudentPracticeAction classroomId={classroomId} studentName={studentName ?? ''} words={practiceWords} />
      </div>

      <ul className="divide-y divide-neo-cream/15">
        {words.map((word) => (
          <WordRow key={word.word} word={word} t={t} language={language} />
        ))}
      </ul>
    </section>
  );
}

const PANEL = 'rounded-neo-lg border-2 border-neo-cream/40 bg-neo-navy-light/95 p-4 shadow-hard sm:p-6';

type T = ReturnType<typeof useLanguage>['t'];

function ArcHeader({ t, name }: { t: T; name?: string }) {
  return (
    <header className="mb-4">
      <h2 className="font-neo-display text-xl font-bold text-neo-white">{t('teacher.reports.arc.title')}</h2>
      <p className="mt-0.5 text-sm text-neo-cream/70">
        {name ? t('teacher.reports.arc.studentSubtitle', { name }) : t('teacher.reports.arc.subtitle')}
      </p>
    </header>
  );
}

function WordRow({ word, t, language }: { word: WordTrajectory; t: T; language: string }) {
  const dots = word.outcomes.slice(-MAX_DOTS);
  return (
    <li data-testid="student-arc-word" className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
      <span className="min-w-0 flex-1 basis-32">
        <span className="block break-words font-bold text-neo-white" dir="auto">
          {word.display}
        </span>
        <span className="block text-xs font-bold text-neo-cream/70">
          {t('eg2Polish.arc.word.attempts', { count: word.attempts, correct: word.correct })}
          {' · '}
          <span className={word.lastCorrect ? 'text-neo-lime' : 'text-neo-pink'}>
            {t(word.lastCorrect ? 'eg2Polish.arc.word.lastCorrect' : 'eg2Polish.arc.word.lastMissed')}
          </span>
          {' · '}
          <time dateTime={word.lastSeen}>{shortDate(word.lastSeen, language)}</time>
        </span>
      </span>
      <span
        role="img"
        aria-label={t('teacher.reports.arc.attempts', { count: word.attempts })}
        className="flex items-center gap-1"
        dir="ltr"
      >
        {dots.map((ok, i) => (
          <span
            key={i}
            data-testid="student-arc-outcome"
            data-ok={ok}
            title={t(ok ? 'teacher.reports.arc.outcomeCorrect' : 'teacher.reports.arc.outcomeMissed')}
            className={cn(
              'size-2.5 rounded-full border-2',
              ok ? 'border-neo-lime bg-neo-lime' : 'border-neo-cream/50 bg-transparent'
            )}
          />
        ))}
      </span>
      <span className={cn('rounded-neo border-2 px-2 py-0.5 text-xs font-black', TREND_CHIP[word.trend])}>
        {t(`teacher.reports.arc.trend.${word.trend}`)}
      </span>
    </li>
  );
}

export default StudentArcView;
