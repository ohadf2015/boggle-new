'use client';

/**
 * Teacher Pro — "Missed-words homework". One tap after a live game gives every
 * student THEIR OWN missed words as homework; students meet it as the Missed
 * Words island on their Academy map (/student/review).
 *
 * Storage + limits: see lib/education/missedWordsHomework.ts. Mounted inside
 * <ProGate feature="reports"> on the Teacher HQ Class tools sheet.
 */

import { useEffect, useMemo, useState } from 'react';
import { BookMarked, Check, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRecentClassroomGames } from '@/hooks/useRecentClassroomGames';
import { createAssignment, getClassroomAssignments } from '@/lib/supabase/education';
import {
  assignMissedWordsHomework,
  buildMissedWordsHomeworkPlan,
} from '@/lib/education/missedWordsHomework';
import { trackEduProMissedHomeworkAssigned } from '@/lib/education/proFunnelTelemetry';
import { cn } from '@/lib/utils';

const PREVIEW_STUDENTS = 4;
const PREVIEW_WORDS = 3;

type Status = 'idle' | 'saving' | 'done' | 'failed';

export function MissedWordsHomeworkCard({ classroomId }: { classroomId: string }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { games, isLoading } = useRecentClassroomGames({ classroomId, limit: 1 });
  const [assignedIds, setAssignedIds] = useState<string[] | null>(null);
  const [status, setStatus] = useState<Status>('idle');

  useEffect(() => {
    let cancelled = false;
    setAssignedIds(null);
    setStatus('idle');
    void getClassroomAssignments(classroomId).then(({ data }) => {
      if (!cancelled) setAssignedIds((data || []).map((a) => a.lesson_id).filter(Boolean));
    });
    return () => {
      cancelled = true;
    };
  }, [classroomId]);

  const plan = useMemo(
    () => (assignedIds ? buildMissedWordsHomeworkPlan(games[0] ?? null, assignedIds) : null),
    [games, assignedIds]
  );

  if (isLoading || assignedIds === null) {
    return (
      <Shell t={t}>
        <div className="h-16 animate-pulse rounded-neo bg-neo-white/10 motion-reduce:animate-none" />
      </Shell>
    );
  }

  if (!plan) {
    return (
      <Shell t={t}>
        <p data-testid="missed-homework-empty" className="text-sm font-bold text-neo-white/80">
          {games.length === 0
            ? t('academy.homework.noGame', 'Play a live game — each student’s missed words land here.')
            : t('academy.homework.noMisses', 'Nobody missed a word last game. Nothing to assign!')}
        </p>
      </Shell>
    );
  }

  const done = status === 'done' || plan.alreadyAssigned;

  const assign = async () => {
    if (!user?.id || status === 'saving') return;
    setStatus('saving');
    const res = await assignMissedWordsHomework(plan, {
      classroomId,
      teacherId: user.id,
      createAssignment: (data) => createAssignment(data),
    });
    if (res.failed > 0 || res.created === 0) {
      setStatus('failed');
      return;
    }
    setStatus('done');
    trackEduProMissedHomeworkAssigned({
      classroomId,
      studentCount: plan.studentCount,
      wordCount: plan.wordCount,
      lessonCount: res.created,
    });
  };

  const shown = plan.students.slice(0, PREVIEW_STUDENTS);
  const hidden = plan.students.length - shown.length;

  return (
    <Shell t={t}>
      <p data-testid="missed-homework-summary" className="mb-3 text-sm font-bold text-neo-white/85">
        {t(
          'academy.homework.summary',
          '{students} students · {words} missed words. Each one practises only their own.',
          { students: plan.studentCount, words: plan.wordCount }
        )}
      </p>

      <ul className="mb-3 space-y-1.5">
        {shown.map((s) => (
          <li
            key={s.studentId}
            data-testid="missed-homework-student"
            className="flex min-w-0 items-center gap-2 rounded-neo border-2 border-neo-cream/50 bg-neo-navy px-2.5 py-1.5"
          >
            <span className="min-w-0 max-w-[40%] shrink-0 truncate text-sm font-black text-neo-white">{s.name}</span>
            <span className="shrink-0 rounded-full border-2 border-neo-pink bg-neo-pink/20 px-1.5 text-xs font-black tabular-nums text-neo-white">
              {s.words.length}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs font-bold text-neo-white/70" dir="auto">
              {s.words.slice(0, PREVIEW_WORDS).join(' · ')}
              {s.words.length > PREVIEW_WORDS ? ' …' : ''}
            </span>
          </li>
        ))}
      </ul>
      {hidden > 0 ? (
        <p className="-mt-1 mb-3 text-xs font-bold text-neo-white/60">
          {t('academy.homework.more', '+{count} more students', { count: hidden })}
        </p>
      ) : null}

      {done ? (
        <p
          data-testid="missed-homework-done"
          className="flex items-center gap-2 rounded-neo border-2 border-neo-lime bg-neo-lime/15 px-3 py-2 text-sm font-black text-neo-white"
        >
          <Check className="size-4 shrink-0 text-neo-lime" aria-hidden="true" />
          {t('academy.homework.assigned', 'Assigned! It’s waiting on their Missed Words island.')}
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <button
            type="button"
            onClick={assign}
            disabled={status === 'saving'}
            className={cn(
              'inline-flex items-center gap-2 rounded-neo border-2 border-neo-lime bg-neo-lime px-4 py-2',
              'font-neo-display text-sm font-black uppercase text-neo-navy shadow-hard',
              'transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70',
              'motion-reduce:transition-none motion-reduce:hover:translate-y-0'
            )}
          >
            {status === 'saving' ? (
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : null}
            {t('academy.homework.assign', 'Assign to each student')}
          </button>
          <span className="text-xs font-bold text-neo-white/60">
            {t('academy.homework.due', 'Due {date}', { date: plan.dueDate })}
          </span>
        </div>
      )}
      {status === 'failed' ? (
        <p role="alert" className="mt-2 text-sm font-black text-neo-pink">
          {t('academy.homework.failed', 'Couldn’t assign it. Try again.')}
        </p>
      ) : null}
    </Shell>
  );
}

function Shell({
  t,
  children,
}: {
  t: ReturnType<typeof useLanguage>['t'];
  children: React.ReactNode;
}) {
  return (
    <section
      data-testid="missed-homework-card"
      className="rounded-neo border-2 border-neo-cyan bg-neo-navy-light p-4 shadow-hard"
    >
      <h3 className="mb-2 flex items-center gap-2 font-neo-display text-lg font-black text-neo-white">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-neo border-2 border-neo-cyan bg-neo-cyan/20">
          <BookMarked className="size-4 text-neo-cyan" aria-hidden="true" />
        </span>
        {t('academy.homework.title', 'Missed-words homework')}
      </h3>
      {children}
    </section>
  );
}

export default MissedWordsHomeworkCard;
