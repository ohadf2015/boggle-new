'use client';

/**
 * Teacher Home: this week's class challenge. An always-open homework round the
 * class plays any time, no live game needed. Shows who finished (results are
 * waiting when the teacher comes back), runs it again with a new word list in
 * one tap, or starts one in one tap when none is open. Uses the normal
 * assignment path (RLS as the teacher, free-plan limit handled there).
 */

import { useState } from 'react';
import Link from 'next/link';
import { CalendarCheck, ChevronRight, Loader2, RefreshCw, Trophy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAssignments } from '@/hooks/useAssignments';
import { localDayPlus } from '@/components/teacher/assignments/AssignmentCreatorDueDate';
import { ASSIGNMENT_LIMIT_REACHED } from '@/lib/education/assignmentLimit';
import { safeCapture } from '@/lib/education/telemetryCore';
import { cn } from '@/lib/utils';
import { NB_BLOCK, NB_PANEL } from '../nb/nbStyles';
import { CHALLENGE_DAYS, firstWordSet, nextWordSet, pickWeekChallenge, type ChallengeLesson } from './weekChallengeModel';

type T = (key: string, params?: Record<string, string | number>) => string;
const K = 'eduShell.home.challenge';

const PILL =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-neo-lg border-[3px] border-neo-black px-3 font-neo-body text-sm font-black leading-tight shadow-hard transition-transform duration-150 hover:-translate-y-px active:translate-y-px active:shadow-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream disabled:opacity-70 motion-reduce:transition-none';

export interface HomeWeekChallengeProps {
  classroomId: string;
  classLanguage: string | null;
  lessons: ChallengeLesson[];
  /** The class's last list (from the week loop), used to start a first challenge. */
  preferredLessonId: string | null;
  resultsHref: string;
  /** Opens the assignment picker when there is no list to use in one tap. */
  onPickList: () => void;
  language: string;
  t: T;
}

type Outcome = 'created' | 'reopened' | 'limit' | 'failed';

export function HomeWeekChallenge({ classroomId, classLanguage, lessons, preferredLessonId, resultsHref, onPickList, language, t }: HomeWeekChallengeProps) {
  const { user } = useAuth();
  const { assignments, isLoading, error, createAssignment } = useAssignments(user ? classroomId : null);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<'limit' | 'failed' | null>(null);

  if (!user || isLoading || error) return null;

  const today = localDayPlus(0);
  const challenge = pickWeekChallenge(assignments ?? [], today);
  const dateLabel = (ymd: string) =>
    new Date(`${ymd}T12:00:00`).toLocaleDateString(language, { weekday: 'short', day: 'numeric', month: 'short' });

  const assign = async (lesson: ChallengeLesson, action: 'start' | 'run_again') => {
    setSaving(true);
    setNote(null);
    const result = await createAssignment({
      classroom_id: classroomId,
      lesson_id: lesson.id,
      teacher_id: user.id,
      assignment_type: 'practice',
      due_date: localDayPlus(CHALLENGE_DAYS),
    });
    setSaving(false);
    const outcome: Outcome = result.success ? (result.alreadyAssigned ? 'reopened' : 'created') : result.error === ASSIGNMENT_LIMIT_REACHED ? 'limit' : 'failed';
    safeCapture('edu_week_challenge_set', { surface: 'teacher_home', action, outcome, days: CHALLENGE_DAYS });
    if (!result.success) setNote(outcome === 'limit' ? 'limit' : 'failed');
  };

  const next = nextWordSet(lessons, challenge?.lessonId ?? null, classroomId, classLanguage);
  const first = challenge ? null : firstWordSet(lessons, preferredLessonId, classroomId, classLanguage);

  const runAgain = () => (next ? assign(next, 'run_again') : onPickList());
  const start = () => (first ? assign(first, 'start') : onPickList());

  const busyIcon = <Loader2 className="size-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />;
  const noteLine = note ? (
    <p data-testid="home-challenge-note" role="alert" className="font-neo-body text-xs font-bold text-neo-pink">{t(`${K}.${note}`)}</p>
  ) : null;

  if (!challenge) {
    return (
      <section data-testid="home-challenge" data-state="none" aria-labelledby="home-challenge-title" className={cn(NB_PANEL, 'flex flex-col gap-2 p-4')}>
        <h2 id="home-challenge-title" className="flex items-center gap-2 font-neo-display text-base font-black">
          <CalendarCheck className="size-5 shrink-0 text-neo-cyan" aria-hidden="true" />
          {t(`${K}.title`)}
        </h2>
        <p className="font-neo-body text-sm font-semibold text-neo-cream/85">{t(`${K}.emptyHint`)}</p>
        <button type="button" data-testid="home-challenge-start" disabled={saving} aria-busy={saving} onClick={start} className={cn(PILL, NB_BLOCK.cyan, 'self-start')}>
          {saving ? busyIcon : <CalendarCheck className="size-4 shrink-0" aria-hidden="true" />}
          {first ? t(`${K}.start`, { list: first.name }) : t(`${K}.pick`)}
        </button>
        {noteLine}
      </section>
    );
  }

  const name = challenge.lessonName || t(`${K}.untitled`);
  const pct = challenge.students > 0 ? Math.min(100, Math.round((challenge.finished / challenge.students) * 100)) : 0;
  const status = challenge.state === 'ended'
    ? t(`${K}.ended`, { date: dateLabel(challenge.due ?? today) })
    : challenge.due ? t(`${K}.due`, { date: dateLabel(challenge.due) }) : t(`${K}.openAnyTime`);

  return (
    <section data-testid="home-challenge" data-state={challenge.state} aria-labelledby="home-challenge-title" className={cn(NB_PANEL, 'flex flex-col gap-3 p-4')}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="home-challenge-title" className="flex items-center gap-2 font-neo-display text-base font-black">
          <Trophy className="size-5 shrink-0 text-neo-yellow" aria-hidden="true" />
          {challenge.state === 'ended' ? t(`${K}.lastTitle`) : t(`${K}.title`)}
        </h2>
        <span className="font-neo-body text-xs font-bold text-neo-cream/80">{status}</span>
      </div>
      <p data-testid="home-challenge-list" className="font-neo-display text-lg font-black leading-tight">{name}</p>
      <div>
        <div className="h-3 overflow-hidden rounded-full border-2 border-neo-cream/60 bg-neo-navy" role="progressbar" aria-valuemin={0} aria-valuemax={challenge.students} aria-valuenow={challenge.finished} aria-label={t(`${K}.finished`, { done: challenge.finished, total: challenge.students })}>
          <div className="h-full bg-neo-lime" style={{ width: `${pct}%` }} />
        </div>
        <p data-testid="home-challenge-finished" className="mt-1 font-neo-body text-sm font-bold">
          {t(`${K}.finished`, { done: challenge.finished, total: challenge.students })}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {challenge.finished > 0 ? (
          <Link href={resultsHref} data-testid="home-challenge-results" className={cn(PILL, 'bg-neo-cream text-neo-black')}>
            {t(`${K}.results`)}
            <ChevronRight className="size-4 shrink-0 rtl:-scale-x-100" aria-hidden="true" />
          </Link>
        ) : null}
        <button type="button" data-testid="home-challenge-run-again" disabled={saving} aria-busy={saving} onClick={runAgain} className={cn(PILL, NB_BLOCK.cyan)}>
          {saving ? busyIcon : <RefreshCw className="size-4 shrink-0" aria-hidden="true" />}
          {next ? t(`${K}.runAgain`, { list: next.name }) : t(`${K}.pick`)}
        </button>
      </div>
      {noteLine}
    </section>
  );
}

export default HomeWeekChallenge;
