'use client';

/**
 * Host results: keep this round's lesson open as homework for a week, so the
 * class can play it again any time without the teacher running a live game.
 * Uses the normal assignment path (RLS as the teacher, free-plan limit and
 * re-assign handled there), so it shows on Teacher Home and the student's
 * class like any assignment.
 */

import { useState } from 'react';
import { CalendarCheck, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAssignments } from '@/hooks/useAssignments';
import { localDayPlus } from '@/components/teacher/assignments/AssignmentCreatorDueDate';
import { ASSIGNMENT_LIMIT_REACHED } from '@/lib/education/assignmentLimit';
import { safeCapture } from '@/lib/education/telemetryCore';
import { cn } from '@/lib/utils';
import { PRESS } from './eduLiveStyles';
import { KEEP_OPEN_DAYS, openHomeworkFor } from './keepOpenHomeworkModel';

const K = 'eduLiveRoom.hostResults.keepOpen';

const BUTTON = cn(
  PRESS,
  'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-neo-lg border-[3px] border-neo-black bg-neo-cyan px-3 text-center font-neo-display text-sm font-black normal-case text-neo-navy shadow-hard transition-[transform,box-shadow] duration-150 hover:-translate-y-px active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-70 motion-reduce:transition-none @5xl/results:text-base'
);

type Note = 'limit' | 'failed' | null;

export function KeepOpenHomework({ classroomId, lessonId }: { classroomId: string; lessonId: string }) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { assignments, createAssignment } = useAssignments(user ? classroomId : null);
  const [saving, setSaving] = useState(false);
  const [savedDue, setSavedDue] = useState<string | null>(null);
  const [note, setNote] = useState<Note>(null);

  if (!user) return null;

  const existing = openHomeworkFor(
    (assignments ?? []).map((a) => ({ lesson_id: a.lesson_id, due_date: a.due_date ?? null })),
    lessonId,
    localDayPlus(0),
  );
  const open = savedDue !== null ? { due: savedDue } : existing;
  const dateLabel = (day: string | null) =>
    day ? new Date(`${day}T12:00:00`).toLocaleDateString(language, { weekday: 'short', day: 'numeric', month: 'short' }) : '';

  if (open) {
    return (
      <div data-testid="keep-open-done" role="status" className="flex items-start gap-2 rounded-neo-lg border-[3px] border-neo-cyan/60 bg-neo-cyan/10 p-3 text-neo-cream">
        <CalendarCheck className="mt-0.5 size-5 shrink-0 text-neo-cyan" aria-hidden="true" />
        <p className="font-neo-body text-sm font-bold leading-snug">
          <span className="block font-neo-display font-black text-neo-cyan">
            {open.due ? t(`${K}.done`, { date: dateLabel(open.due) }) : t(`${K}.doneNoDate`)}
          </span>
          {t(`${K}.doneHint`)}
        </p>
      </div>
    );
  }

  const due = localDayPlus(KEEP_OPEN_DAYS);
  const keepOpen = async () => {
    setSaving(true);
    setNote(null);
    const result = await createAssignment({
      classroom_id: classroomId,
      lesson_id: lessonId,
      teacher_id: user.id,
      assignment_type: 'practice',
      due_date: due,
    });
    setSaving(false);
    const outcome = result.success ? (result.alreadyAssigned ? 'reopened' : 'created') : result.error === ASSIGNMENT_LIMIT_REACHED ? 'limit' : 'failed';
    safeCapture('edu_homework_kept_open', { surface: 'host_results', outcome, days: KEEP_OPEN_DAYS });
    if (result.success) setSavedDue(due);
    else setNote(outcome === 'limit' ? 'limit' : 'failed');
  };

  return (
    <div className="flex flex-col gap-1.5">
      <button type="button" data-testid="keep-open-homework" disabled={saving} aria-busy={saving} onClick={keepOpen} className={BUTTON}>
        {saving ? <Loader2 className="size-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <CalendarCheck className="size-4 shrink-0" aria-hidden="true" />}
        {t(`${K}.cta`)}
      </button>
      {note ? (
        <p data-testid="keep-open-note" role="alert" className="font-neo-body text-xs font-bold text-neo-pink">
          {t(`${K}.${note}`)}
        </p>
      ) : (
        <p className="font-neo-body text-xs font-bold text-neo-cream/80">{t(`${K}.hint`, { date: dateLabel(due) })}</p>
      )}
    </div>
  );
}

export default KeepOpenHomework;
