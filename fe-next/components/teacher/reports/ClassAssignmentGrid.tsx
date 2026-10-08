'use client';

/**
 * Per-class progress: students × assignments. Each cell is completion
 * status plus the best word and score from the existing progress row.
 * The weekly summary is plain text a teacher can paste into a parent or
 * student channel. The Pro line links at the existing upgrade route.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { getClassroomAssignments, getAssignmentCompletions } from '@/lib/supabase/education/assignments';
import { getClassroomStudents } from '@/lib/supabase/education/classrooms';
import { resolveDisplayName } from '@/lib/displayName';
import {
  buildClassProgressGrid,
  buildWeeklySummary,
  classGridCompletionFromRow,
  formatWeeklySummary,
} from '@/lib/education/classProgressGrid';
import type { AssignmentProgressSourceRow } from '@/lib/education/assignmentProgressReport';
import { trackProgressReportViewed, trackWeeklySummaryCopied } from '@/lib/education/telemetry';
import { cn } from '@/lib/utils';
import { ReportEmpty, ReportError, ReportSkeleton, SectionTitle, useReportData } from './ReportChrome';

export interface ClassAssignmentGridProps {
  classroomId: string;
  classroomName: string;
}

type CopyState = 'idle' | 'copied' | 'failed';

export function ClassAssignmentGrid({ classroomId, classroomName }: ClassAssignmentGridProps) {
  const { t, language } = useLanguage();
  const { hasPro, loading: proLoading } = useTeacherPro();
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const viewedFor = useRef<string | null>(null);

  const load = useCallback(async () => {
    const [assignmentRes, studentRes] = await Promise.all([
      getClassroomAssignments(classroomId),
      getClassroomStudents(classroomId),
    ]);
    if (assignmentRes.error) return { data: null, error: assignmentRes.error };
    if (studentRes.error) return { data: null, error: studentRes.error };

    const assignments = assignmentRes.data ?? [];
    const students = studentRes.data ?? [];
    const batches = await Promise.all(assignments.map((assignment) => getAssignmentCompletions(assignment.id)));
    const firstErr = batches.find((batch) => batch.error)?.error;
    if (firstErr) return { data: null, error: firstErr };

    const untitled = t('teacher.reports.assignmentProgress.untitled');
    const anonymous = (id: string) =>
      t('teacher.reports.assignmentProgress.anonymousStudent', { id: id.slice(0, 8) });

    const grid = buildClassProgressGrid({
      students: students.map((student) => {
        const profile = student.profiles as { display_name?: string; username?: string } | null;
        return {
          id: student.student_id,
          name: resolveDisplayName([profile?.display_name, profile?.username], anonymous(student.student_id)),
        };
      }),
      assignments: assignments.map((assignment) => ({
        id: assignment.id,
        title: assignment.title || assignment.vocabulary_lessons?.name || untitled,
        dueDate: assignment.due_date ?? null,
      })),
      completions: batches.flatMap((batch, index) =>
        (batch.data ?? []).map((row: AssignmentProgressSourceRow) =>
          classGridCompletionFromRow(assignments[index].id, row),
        ),
      ),
    });

    const summaryText = formatWeeklySummary(buildWeeklySummary({ className: classroomName, grid }), {
      due: t('teacher.reports.classGrid.summaryDue'),
      completed: t('teacher.reports.classGrid.summaryCompleted'),
      topWords: t('teacher.reports.classGrid.summaryTopWords'),
      attention: t('teacher.reports.classGrid.summaryAttention'),
      none: t('teacher.reports.classGrid.summaryNone'),
      missing: (name, count) => t('teacher.reports.classGrid.summaryMissing', { name, count }),
    });

    return { data: { grid, summaryText }, error: null };
  }, [classroomId, classroomName, t]);

  const { data, loading, failed, retry } = useReportData(load);

  useEffect(() => {
    if (loading || failed || !data) return;
    if (viewedFor.current === classroomId) return;
    viewedFor.current = classroomId;
    trackProgressReportViewed(classroomId);
  }, [classroomId, loading, failed, data]);

  useEffect(() => {
    if (copyState === 'idle') return;
    const id = window.setTimeout(() => setCopyState('idle'), 2400);
    return () => window.clearTimeout(id);
  }, [copyState]);

  const copySummary = useCallback(async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.summaryText);
      trackWeeklySummaryCopied(classroomId);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  }, [classroomId, data]);

  if (loading) return <ReportSkeleton />;
  if (failed) return <ReportError onRetry={retry} />;
  if (!data) return <ReportEmpty />;

  const { grid, summaryText } = data;
  const hasGrid = grid.students.length > 0 && grid.assignments.length > 0;

  return (
    <section data-testid="class-assignment-grid" className="space-y-4">
      <SectionTitle>{t('teacher.reports.classGrid.title')}</SectionTitle>

      {hasGrid ? (
        <div className="overflow-x-auto rounded-neo border-2 border-neo-cream/25">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-neo-navy text-neo-cream/80">
                <th scope="col" className="p-3 text-start font-bold">
                  {t('teacher.reports.columns.student')}
                </th>
                {grid.assignments.map((assignment) => (
                  <th key={assignment.id} scope="col" className="min-w-28 p-3 text-start font-bold">
                    {assignment.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.students.map((student, studentIndex) => (
                <tr key={student.id} className="border-t border-neo-cream/40">
                  <th scope="row" className="px-3 py-2 text-start font-bold text-neo-white">
                    {student.name}
                  </th>
                  {grid.assignments.map((assignment, assignmentIndex) => {
                    const cell = grid.cells[studentIndex]?.[assignmentIndex];
                    const completed = cell?.status === 'completed';
                    return (
                      <td
                        key={assignment.id}
                        data-testid="class-progress-cell"
                        data-status={cell?.status ?? 'missing'}
                        data-student={student.id}
                        data-assignment={assignment.id}
                        className={cn(
                          'px-3 py-2 align-top text-neo-white',
                          completed ? 'bg-neo-lime/10' : 'bg-neo-pink/10',
                        )}
                      >
                        <span className="block text-xs font-bold uppercase tracking-wide">
                          {completed
                            ? t('teacher.reports.classGrid.statusCompleted')
                            : t('teacher.reports.classGrid.statusMissing')}
                        </span>
                        {completed && cell?.bestWord ? (
                          <span data-testid="class-progress-best-word" className="block font-bold">
                            {cell.bestWord}
                          </span>
                        ) : null}
                        <span className="block tabular-nums">{cell?.score == null ? '—' : cell.score}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <ReportEmpty />
          <p className="text-center text-sm text-neo-cream/70">{t('teacher.reports.classGrid.empty')}</p>
        </>
      )}

      <div className="rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light p-4">
        <pre
          data-testid="weekly-summary"
          className="whitespace-pre-wrap break-words font-sans text-sm text-neo-white"
        >{summaryText}</pre>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-testid="weekly-summary-copy"
            onClick={copySummary}
            className="inline-flex min-h-11 items-center rounded-neo border-2 border-black bg-neo-cream px-4 py-2 font-bold text-neo-navy shadow-hard-sm transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-hard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan"
          >
            {copyState === 'copied'
              ? t('teacher.reports.classGrid.copied')
              : t('teacher.reports.classGrid.copySummary')}
          </button>
          <span role="status" className={cn('text-xs font-bold text-neo-pink', copyState !== 'failed' && 'sr-only')}>
            {copyState === 'failed' ? t('teacher.reports.classGrid.copyFailed') : ''}
          </span>
        </div>
        {!proLoading && !hasPro ? (
          <p className="mt-3 text-xs text-neo-cream/70">
            <Link
              href={`/${language}/teacher/upgrade`}
              data-testid="class-grid-pro-nudge"
              className="font-bold text-neo-cyan underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan"
            >
              {t('teacher.reports.classGrid.proNudge')}
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}

export default ClassAssignmentGrid;
