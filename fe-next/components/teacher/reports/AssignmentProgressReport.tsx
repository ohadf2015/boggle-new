'use client';

/**
 * Per-classroom assignment progress: every student × assignment as
 * completed/missing, with word-level score when the progress row has one.
 * On-screen for every teacher; CSV export is Teacher Pro only — free teachers
 * get a CTA to the existing /{locale}/teacher/upgrade route.
 */

import { useCallback } from 'react';
import Link from 'next/link';
import { Download, Lock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { getClassroomAssignments, getAssignmentCompletions } from '@/lib/supabase/education/assignments';
import { getClassroomStudents } from '@/lib/supabase/education/classrooms';
import { resolveDisplayName } from '@/lib/displayName';
import {
  assignmentProgressToCsv,
  buildAssignmentProgressRows,
  downloadCsvFile,
  type AssignmentProgressRow,
} from '@/lib/education/assignmentProgressReport';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import {
  ReportEmpty,
  ReportError,
  ReportSkeleton,
  SectionTitle,
  useReportData,
} from './ReportChrome';

export interface AssignmentProgressReportProps {
  classroomId: string;
  classroomName: string;
}

export function AssignmentProgressReport({ classroomId, classroomName }: AssignmentProgressReportProps) {
  const { t, language } = useLanguage();
  const { hasPro, loading: proLoading } = useTeacherPro();

  const load = useCallback(async () => {
    const [assignmentRes, studentRes] = await Promise.all([
      getClassroomAssignments(classroomId),
      getClassroomStudents(classroomId),
    ]);
    if (assignmentRes.error) return { data: null, error: assignmentRes.error };
    if (studentRes.error) return { data: null, error: studentRes.error };

    const assignments = assignmentRes.data ?? [];
    const students = studentRes.data ?? [];
    const batches = await Promise.all(assignments.map((a) => getAssignmentCompletions(a.id)));
    const firstErr = batches.find((b) => b.error)?.error;
    if (firstErr) return { data: null, error: firstErr };

    const untitled = t('teacher.reports.assignmentProgress.untitled');
    const anonymous = (id: string) =>
      t('teacher.reports.assignmentProgress.anonymousStudent', { id: id.slice(0, 8) });

    const rows = buildAssignmentProgressRows({
      students: students.map((s) => {
        const profile = s.profiles as { display_name?: string; username?: string } | null;
        return {
          studentId: s.student_id,
          name: resolveDisplayName([profile?.display_name, profile?.username], anonymous(s.student_id)),
        };
      }),
      assignments: assignments.map((a) => ({
        id: a.id,
        title: a.title || a.vocabulary_lessons?.name || untitled,
      })),
      completions: batches.flatMap((batch, i) =>
        (batch.data ?? []).map((c: { student_id: string; score?: number | null; accuracy?: number | null; completed_at?: string | null }) => ({
          assignmentId: assignments[i].id,
          studentId: c.student_id,
          score: c.score ?? null,
          accuracy: c.accuracy ?? null,
          completedAt: c.completed_at ?? null,
        })),
      ),
    });

    return { data: { rows }, error: null };
  }, [classroomId, t]);

  const { data, loading, failed, retry } = useReportData(load);

  const exportCsv = useCallback(() => {
    if (!data) return;
    const csv = assignmentProgressToCsv(data.rows, {
      student: t('teacher.reports.columns.student'),
      assignment: t('teacher.reports.columns.assignment'),
      status: t('teacher.reports.columns.status'),
      score: t('teacher.reports.columns.score'),
      accuracy: t('teacher.reports.columns.accuracy'),
      completedAt: t('teacher.reports.columns.completedAt'),
      completed: t('teacher.reports.assignmentProgress.statusCompleted'),
      missing: t('teacher.reports.assignmentProgress.statusMissing'),
    });
    downloadCsvFile(t('teacher.reports.assignmentProgress.fileName', { name: classroomName }), csv);
  }, [data, t, classroomName]);

  if (loading) return <ReportSkeleton />;
  if (failed) return <ReportError onRetry={retry} />;
  if (!data || data.rows.length === 0) {
    return (
      <section data-testid="assignment-progress-report">
        <SectionTitle>{t('teacher.reports.assignmentProgress.title')}</SectionTitle>
        <ReportEmpty />
        <p className="mt-2 text-center text-sm text-neo-cream/70">{t('teacher.reports.assignmentProgress.empty')}</p>
      </section>
    );
  }

  return (
    <section data-testid="assignment-progress-report" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <SectionTitle>{t('teacher.reports.assignmentProgress.title')}</SectionTitle>
        {proLoading ? null : hasPro ? (
          <button
            type="button"
            onClick={exportCsv}
            data-testid="assignment-progress-csv-export"
            className="inline-flex min-h-11 items-center gap-2 rounded-neo border-2 border-black bg-neo-lime px-4 py-2 font-bold text-black shadow-hard transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-hard-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-white"
          >
            <Download className="size-4" aria-hidden="true" />
            {t('teacher.reports.assignmentProgress.exportCsv')}
          </button>
        ) : (
          <Link
            href={`/${language}/teacher/upgrade`}
            data-testid="assignment-progress-csv-upgrade"
            onClick={() => trackGrowthEvent('landing_cta_clicked', { cta: 'assignment_progress_csv' })}
            className="inline-flex min-h-11 items-center gap-2 rounded-neo border-2 border-black bg-neo-cyan px-4 py-2 font-bold text-neo-navy shadow-hard transition-shadow hover:shadow-hard-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-white"
          >
            <Lock className="size-4" aria-hidden="true" />
            {t('teacher.reports.assignmentProgress.exportCsvPro', { price: `$${TEACHER_PRO_PRICE_USD}` })}
          </Link>
        )}
      </div>

      <div className="overflow-x-auto rounded-neo border-2 border-neo-cream/25">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-neo-navy text-neo-cream/80">
              <th scope="col" className="p-3 text-start font-bold">{t('teacher.reports.columns.student')}</th>
              <th scope="col" className="p-3 text-start font-bold">{t('teacher.reports.columns.assignment')}</th>
              <th scope="col" className="p-3 text-start font-bold">{t('teacher.reports.columns.status')}</th>
              <th scope="col" className="p-3 text-end font-bold">{t('teacher.reports.columns.score')}</th>
              <th scope="col" className="hidden p-3 text-end font-bold sm:table-cell">{t('teacher.reports.columns.accuracy')}</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row: AssignmentProgressRow) => (
              <tr
                key={`${row.studentId}:${row.assignmentId}`}
                data-testid="assignment-progress-row"
                data-status={row.status}
                className="border-t border-neo-cream/40"
              >
                <td className="px-3 py-2 font-bold text-neo-white">{row.studentName}</td>
                <td className="px-3 py-2 text-neo-white">{row.assignmentTitle}</td>
                <td className="px-3 py-2 text-neo-white">
                  {row.status === 'completed'
                    ? t('teacher.reports.assignmentProgress.statusCompleted')
                    : t('teacher.reports.assignmentProgress.statusMissing')}
                </td>
                <td className="px-3 py-2 text-end text-neo-white tabular-nums">
                  {row.score == null ? '—' : row.score}
                </td>
                <td className="hidden px-3 py-2 text-end text-neo-white tabular-nums sm:table-cell">
                  {row.accuracy == null ? '—' : `${row.accuracy}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default AssignmentProgressReport;
