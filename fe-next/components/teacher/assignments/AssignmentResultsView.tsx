'use client';

import type { ReactNode } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, ChevronDown, Clock, LifeBuoy } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import type { AssignmentResults } from '@/lib/education/assignmentCompletionResults';
import { MissedPracticeAction } from '@/components/teacher/reports/MissedPracticeAction';
import { cn } from '@/lib/utils';

const MAX_ROW_MISSES = 3;

const CARD = 'rounded-neo border-2 bg-neo-navy p-3';
const CHIP = 'inline-flex min-h-8 items-center gap-1.5 rounded-neo border-2 px-2 py-0.5 text-sm font-bold';

function Section({ title, icon, tone, children, testId }: { title: string; icon: ReactNode; tone: string; children: ReactNode; testId: string }) {
  return (
    <section data-testid={testId} className={cn(CARD, 'min-w-0', tone)}>
      <h4 className="mb-2 flex items-center gap-2 font-neo-display text-base font-black text-neo-cream">
        {icon}
        {title}
      </h4>
      {children}
    </section>
  );
}

function PracticeMissed({ classroomId, classroomName, words }: { classroomId: string; classroomName: string; words: string[] }) {
  const { hasPro, loading } = useTeacherPro();
  if (loading) return null;
  return <MissedPracticeAction classroomId={classroomId} classroomName={classroomName} locked={!hasPro} words={words} />;
}

export function AssignmentResultsView({
  results,
  classroomId,
  classroomName,
}: {
  results: AssignmentResults;
  classroomId?: string;
  classroomName: string;
}) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const { played, notPlayed, needHelp, difficultWords, total } = results;
  const pct = total > 0 ? Math.round((played.length / total) * 100) : 0;
  const pop = (i: number) =>
    reduceMotion
      ? {}
      : { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { delay: Math.min(i, 8) * 0.04, duration: 0.18 } };

  return (
    <div className="space-y-3 font-neo-body text-neo-white">
      <div>
        <div className="mb-1 flex items-center justify-between gap-3">
          <span data-testid="results-played-count" className="text-sm font-bold">
            {t('teacher.completion.playedCount', { played: played.length, total })}
          </span>
          <span className="text-sm font-black tabular-nums text-neo-cyan">{pct}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full border border-neo-cream/40 bg-neo-black/30">
          <div className="h-full bg-neo-cyan transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {played.length === 0 ? (
        <p className="rounded-neo border-2 border-dashed border-neo-cream/40 p-3 text-center text-sm font-bold text-neo-cream/80">
          {t('teacher.completion.nobodyYet')}
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Section
              testId="results-need-help"
              title={t('teacher.completion.needHelp')}
              icon={<LifeBuoy className="size-4 text-neo-pink" aria-hidden="true" />}
              tone="border-neo-pink/70"
            >
              {needHelp.length === 0 ? (
                <p className="text-sm text-neo-cream/80">
                  {t(played.some((s) => s.accuracy !== null) ? 'teacher.completion.onTrack' : 'teacher.completion.noScores')}
                </p>
              ) : (
                <ul className="flex flex-wrap gap-1.5">
                  {needHelp.map((s, i) => (
                    <m.li key={s.studentId} {...pop(i)} className={cn(CHIP, 'border-black bg-neo-pink text-neo-black')}>
                      <bdi>{s.name}</bdi>
                      <span className="tabular-nums">{`${s.accuracy}%`}</span>
                    </m.li>
                  ))}
                </ul>
              )}
            </Section>
            <Section
              testId="results-missed-words"
              title={t('teacher.completion.mostMissed')}
              icon={<AlertTriangle className="size-4 text-neo-orange" aria-hidden="true" />}
              tone="border-neo-orange/70"
            >
              {difficultWords.length === 0 ? (
                <p className="text-sm text-neo-cream/80">{t('teacher.completion.noStrugglingAreas')}</p>
              ) : (
                <ol className="space-y-1">
                  {difficultWords.map((w, i) => (
                    <m.li key={w.word} {...pop(i)} data-testid="missed-word" className="flex min-w-0 items-center gap-2 text-sm">
                      <bdi className="min-w-0 flex-1 truncate font-black">{w.word}</bdi>
                      <span className="min-w-0 text-end text-xs text-neo-cream/80">
                        {t('teacher.completion.missedBy', { count: w.missedBy, played: w.played })}
                      </span>
                      <span className="h-2 w-12 shrink-0 overflow-hidden rounded-full bg-neo-black/40" aria-hidden="true">
                        <span
                          className="block h-full bg-neo-orange"
                          style={{ width: `${Math.round((w.missedBy / Math.max(1, w.played)) * 100)}%` }}
                        />
                      </span>
                    </m.li>
                  ))}
                </ol>
              )}
            </Section>
          </div>

          {classroomId && difficultWords.length > 0 ? (
            <PracticeMissed classroomId={classroomId} classroomName={classroomName} words={difficultWords.map((w) => w.word)} />
          ) : null}
        </>
      )}

      {notPlayed.length > 0 ? (
        <section data-testid="results-not-played">
          <h4 className="mb-1.5 flex items-center gap-2 text-sm font-black text-neo-cream">
            <Clock className="size-4" aria-hidden="true" />
            {t('teacher.completion.notPlayedTitle', { count: notPlayed.length })}
          </h4>
          <ul className="flex max-h-20 flex-wrap gap-1.5 overflow-y-auto">
            {notPlayed.map((s) => (
              <li key={s.studentId} className={cn(CHIP, 'border-neo-cream/40 text-neo-cream')}>
                <bdi>{s.name}</bdi>
              </li>
            ))}
          </ul>
        </section>
      ) : played.length > 0 ? (
        <p className="flex items-center gap-2 text-sm font-bold text-neo-lime">
          <CheckCircle2 className="size-4" aria-hidden="true" />
          {t('teacher.completion.allPlayed')}
        </p>
      ) : null}

      {played.length > 0 ? (
        <details data-testid="results-each-student" className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-neo border-2 border-neo-cream/40 px-3 text-sm font-bold text-neo-cream hover:border-neo-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan">
            <ChevronDown className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
            {t('teacher.completion.eachStudent', { count: played.length })}
          </summary>
          <ul data-testid="results-played" className="mt-1.5 max-h-48 space-y-1.5 overflow-y-auto">
            {played.map((s) => (
              <li
                key={s.studentId}
                data-testid={`played-${s.studentId}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-neo border border-neo-cream/30 bg-neo-black/20 px-3 py-2"
              >
                <CheckCircle2 className="size-4 shrink-0 text-neo-lime" aria-hidden="true" />
                <bdi className="min-w-0 flex-1 truncate font-bold">{s.name}</bdi>
                {s.accuracy !== null ? <span className="text-sm font-black tabular-nums text-neo-cyan">{`${s.accuracy}%`}</span> : null}
                <span className="flex basis-full flex-wrap gap-1 ps-7 text-xs sm:basis-auto sm:ps-0">
                  {s.missed.length === 0 ? (
                    <span className="text-neo-cream/70">{t('teacher.completion.noMisses')}</span>
                  ) : (
                    <>
                      {s.missed.slice(0, MAX_ROW_MISSES).map((word) => (
                        <bdi key={word} className="rounded border border-neo-orange/70 px-1.5 font-bold text-neo-orange">
                          {word}
                        </bdi>
                      ))}
                      {s.missed.length > MAX_ROW_MISSES ? (
                        <span className="font-bold text-neo-cream/70">{`+${s.missed.length - MAX_ROW_MISSES}`}</span>
                      ) : null}
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
