'use client';

/**
 * Incomplete-students list for the assignment progress matrix (Teacher Pro):
 * per assignment, the roster students who have NOT finished, each with a
 * started/not-started badge and a one-tap nudge. The nudge POSTs to
 * /api/education/classroom/[id]/nudge, which delivers an in-app notification
 * (and push where available) and throttles repeats — the button states mirror
 * that contract ('sent' | 'already_nudged' | 'already_completed').
 */

import { useState } from 'react';
import { Bell, Check, Clock, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { fetchWithAuth } from '@/utils/authFetch';
import type { AssignmentProgressMatrix } from '@/lib/education/assignmentProgressMatrix';

interface IncompleteStudent {
  studentId: string;
  name: string;
  started: boolean;
}

type NudgeStatus = 'idle' | 'saving' | 'sent' | 'already' | 'completed' | 'failed';

export function IncompleteAssignmentsPanel({
  classroomId,
  matrix,
}: {
  classroomId: string;
  matrix: AssignmentProgressMatrix;
}) {
  const { t } = useLanguage();

  const sections = matrix.assignments
    .map((assignment, i) => ({
      assignment,
      students: matrix.rows
        .filter((row) => !row.cells[i].completed)
        .map((row): IncompleteStudent => ({
          studentId: row.studentId,
          name: row.studentName,
          started: row.cells[i].started,
        })),
    }))
    .filter((section) => section.students.length > 0);

  return (
    <section data-testid="incomplete-assignments" className="space-y-3">
      <h3 className="font-neo-display text-base font-black uppercase text-neo-cream">
        {t('teacher.reports.progressMatrix.incompleteTitle')}
      </h3>
      {sections.length === 0 ? (
        <p data-testid="incomplete-all-done" className="text-sm font-bold text-neo-lime">
          {t('teacher.reports.progressMatrix.incompleteAllDone')}
        </p>
      ) : (
        sections.map(({ assignment, students }) => (
          <div
            key={assignment.id}
            data-testid={`incomplete-assignment-${assignment.id}`}
            className="rounded-neo border-2 border-neo-cream/40 bg-neo-navy p-3"
          >
            <p dir="auto" className="mb-2 truncate font-neo-display text-sm font-black text-neo-white">
              {assignment.title}
            </p>
            <ul className="space-y-1.5">
              {students.map((student) => (
                <li key={student.studentId} className="flex items-center gap-2">
                  <span dir="auto" className="min-w-0 flex-1 truncate text-sm font-bold text-neo-white">
                    {student.name}
                  </span>
                  <span
                    data-testid={`incomplete-status-${assignment.id}-${student.studentId}`}
                    className={
                      student.started
                        ? 'inline-flex shrink-0 items-center gap-1 rounded-full border border-neo-yellow/60 px-2 py-0.5 text-[10px] font-black uppercase text-neo-yellow'
                        : 'inline-flex shrink-0 items-center gap-1 rounded-full border border-neo-cream/40 px-2 py-0.5 text-[10px] font-black uppercase text-neo-cream/70'
                    }
                  >
                    {student.started && <Clock className="size-3" aria-hidden="true" />}
                    {student.started
                      ? t('teacher.reports.progressMatrix.incompleteStarted')
                      : t('teacher.reports.progressMatrix.incompleteNotStarted')}
                  </span>
                  <NudgeButton classroomId={classroomId} assignmentId={assignment.id} studentId={student.studentId} />
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}

function NudgeButton({
  classroomId,
  assignmentId,
  studentId,
}: {
  classroomId: string;
  assignmentId: string;
  studentId: string;
}) {
  const { t } = useLanguage();
  const [status, setStatus] = useState<NudgeStatus>('idle');

  const nudge = async () => {
    if (status === 'saving') return;
    setStatus('saving');
    try {
      const res = await fetchWithAuth(`/api/education/classroom/${classroomId}/nudge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId, studentId }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) return setStatus('failed');
      if (body.result === 'sent') return setStatus('sent');
      if (body.result === 'already_nudged') return setStatus('already');
      if (body.result === 'already_completed') return setStatus('completed');
      return setStatus('failed');
    } catch {
      setStatus('failed');
    }
  };

  const label =
    status === 'saving'
      ? t('teacher.reports.progressMatrix.nudgeSending')
      : status === 'sent'
        ? t('teacher.reports.progressMatrix.nudgeSent')
        : status === 'already'
          ? t('teacher.reports.progressMatrix.nudgeAlready')
          : status === 'completed'
            ? t('teacher.reports.progressMatrix.nudgeCompleted')
            : status === 'failed'
              ? t('teacher.reports.progressMatrix.nudgeFailed')
              : t('teacher.reports.progressMatrix.nudge');
  const settled = status === 'sent' || status === 'already' || status === 'completed';

  return (
    <button
      type="button"
      data-testid={`nudge-${assignmentId}-${studentId}`}
      data-status={status}
      disabled={status === 'saving' || settled}
      onClick={nudge}
      className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-neo border-2 border-neo-black bg-neo-pink px-2.5 py-1 text-xs font-black uppercase text-neo-black shadow-hard-sm transition-transform hover:-translate-y-0.5 active:translate-y-[2px] disabled:translate-y-0 disabled:opacity-70"
    >
      {status === 'saving' ? (
        <Loader2 className="size-3 animate-spin" aria-hidden="true" />
      ) : settled ? (
        <Check className="size-3" aria-hidden="true" />
      ) : (
        <Bell className="size-3" aria-hidden="true" />
      )}
      {label}
    </button>
  );
}
