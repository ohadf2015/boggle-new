'use client';

/**
 * Free classroom roster progress on the class report view — one row per
 * student: assignment completion (completed/total), last-active, and the
 * join-funnel status (signed_in / guest / joined_idle) that makes the
 * post-#1310 drop-off ("invite converted, never practiced") actionable for a
 * free teacher. Deliberately NOT wrapped in ProGate: per-student visibility
 * is the reason to upgrade, so the upgrade CTA below is the only Pro surface
 * here. Reuses the existing data helpers only — no new API routes.
 */

import { useCallback } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { getClassroomAssignments, getAssignmentCompletions } from '@/lib/supabase/education/assignments';
import { getClassroomStudents } from '@/lib/supabase/education/classrooms';
import { getStudentsProgressSummary } from '@/lib/supabase/analytics';
import { resolveDisplayName } from '@/lib/displayName';
import {
  buildAssignmentProgressRows,
  mapProgressRowToCompletion,
} from '@/lib/education/assignmentProgressReport';
import {
  buildClassroomRosterProgress,
  countRosterAssignmentProgress,
  type RosterJoinFunnelStatus,
  type RosterProgressRow,
} from '@/lib/education/classroomRosterProgress';
import { trackTeacherRosterProgressUpgradeClicked } from '@/lib/education/telemetry';
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import { ReportError, ReportSkeleton, useReportData } from './ReportChrome';

export interface ClassroomRosterProgressProps {
  classroomId: string;
}

/** Full quoted keys — the reports i18n contract test scans lookup maps like this one. */
const STATUS_LABEL_KEY: Record<RosterJoinFunnelStatus, string> = {
  joined_idle: 'teacher.reports.rosterProgress.status.joined_idle',
  guest: 'teacher.reports.rosterProgress.status.guest',
  signed_in: 'teacher.reports.rosterProgress.status.signed_in',
};

const STATUS_BADGE_CLASS: Record<RosterJoinFunnelStatus, string> = {
  joined_idle: 'border-neo-orange bg-neo-orange/15 text-neo-orange',
  guest: 'border-neo-cyan bg-neo-cyan/15 text-neo-cyan',
  signed_in: 'border-neo-lime bg-neo-lime/15 text-neo-lime',
};

export function ClassroomRosterProgress({ classroomId }: ClassroomRosterProgressProps) {
  const { t, language } = useLanguage();
  const { hasPro, loading: proLoading } = useTeacherPro();

  const load = useCallback(async () => {
    const [studentRes, practiceRes, assignmentRes] = await Promise.all([
      getClassroomStudents(classroomId),
      getStudentsProgressSummary(classroomId),
      getClassroomAssignments(classroomId),
    ]);
    if (studentRes.error) return { data: null, error: studentRes.error };
    if (practiceRes.error) return { data: null, error: practiceRes.error };
    if (assignmentRes.error) return { data: null, error: assignmentRes.error };

    const students = studentRes.data ?? [];
    if (students.length === 0) return { data: { rows: [] }, error: null };

    const assignments = assignmentRes.data ?? [];
    const batches = await Promise.all(assignments.map((a) => getAssignmentCompletions(a.id)));
    const firstErr = batches.find((b) => b.error)?.error;
    if (firstErr) return { data: null, error: firstErr };

    const untitled = t('teacher.reports.assignmentProgress.untitled');
    const anonymous = (id: string) =>
      t('teacher.reports.assignmentProgress.anonymousStudent', { id: id.slice(0, 8) });

    const rosterStudents = students.map((s) => {
      const profile = s.profiles as { display_name?: string; username?: string } | null;
      return {
        studentId: s.student_id,
        name: resolveDisplayName([profile?.display_name, profile?.username], anonymous(s.student_id)),
        joinedAt: s.joined_at ?? null,
        displayName: profile?.display_name ?? null,
        username: profile?.username ?? null,
      };
    });

    // Same derivation AssignmentProgressReport runs — one row per student ×
    // assignment — then reduced to per-student counts for the roster model.
    const progressRows = buildAssignmentProgressRows({
      students: rosterStudents.map(({ studentId, name }) => ({ studentId, name })),
      assignments: assignments.map((a) => ({
        id: a.id,
        title: a.title || a.vocabulary_lessons?.name || untitled,
        dueDate: a.due_date ?? null,
      })),
      completions: batches.flatMap((batch, i) =>
        (batch.data ?? []).map((c) => mapProgressRowToCompletion(assignments[i].id, c)),
      ),
    });

    const rows = buildClassroomRosterProgress({
      students: rosterStudents,
      assignmentCounts: countRosterAssignmentProgress(progressRows),
      lastPractice: (practiceRes.data ?? []).map((p) => ({
        studentId: p.studentId,
        lastPracticeDate: p.lastPracticeDate,
      })),
    });

    return { data: { rows }, error: null };
  }, [classroomId, t]);

  const { data, loading, failed, retry } = useReportData(load);

  const formatLastActive = useCallback(
    (date: string | null): string => {
      if (!date) return t('teacher.reports.rosterProgress.never');
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
      if (date === today) return t('education.analytics.today');
      if (date === yesterday) return t('education.analytics.yesterday');
      const daysAgo = Math.floor((now.getTime() - new Date(date).getTime()) / 86400000);
      return t('education.analytics.daysAgo', { count: daysAgo });
    },
    [t],
  );

  if (loading) return <ReportSkeleton />;
  if (failed) return <ReportError onRetry={retry} />;
  if (!data || data.rows.length === 0) return null;

  return (
    <section
      data-testid="classroom-roster-progress"
      className="space-y-3 rounded-neo border-2 border-neo-cream/40 bg-neo-navy/40 p-4"
    >
      <h3 className="font-neo-display text-lg font-bold text-neo-white">
        {t('teacher.reports.rosterProgress.title')}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-neo-cream/25 text-xs uppercase tracking-wide text-neo-cream/70">
              <th scope="col" className="p-3 text-start font-bold">
                {t('teacher.reports.rosterProgress.columns.student')}
              </th>
              <th scope="col" className="p-3 text-end font-bold">
                {t('teacher.reports.rosterProgress.columns.completion')}
              </th>
              <th scope="col" className="p-3 text-end font-bold">
                {t('teacher.reports.rosterProgress.columns.lastActive')}
              </th>
              <th scope="col" className="p-3 text-start font-bold">
                {t('teacher.reports.rosterProgress.columns.joinStatus')}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row: RosterProgressRow) => (
              <tr
                key={row.studentId}
                data-testid="classroom-roster-row"
                data-status={row.joinFunnelStatus}
                className="border-b border-neo-cream/15 last:border-b-0"
              >
                <td className="px-3 py-2 font-bold text-neo-white">{row.name}</td>
                <td className="px-3 py-2 text-end text-neo-white tabular-nums">
                  {t('teacher.reports.rosterProgress.completion', {
                    completed: row.completedAssignments,
                    total: row.totalAssignments,
                  })}
                </td>
                <td className="px-3 py-2 text-end text-neo-white tabular-nums">
                  {formatLastActive(row.lastActiveAt)}
                </td>
                <td className="px-3 py-2">
                  <span
                    data-testid="classroom-roster-status"
                    className={`inline-flex items-center rounded border-2 px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide ${STATUS_BADGE_CLASS[row.joinFunnelStatus]}`}
                  >
                    {t(STATUS_LABEL_KEY[row.joinFunnelStatus])}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {proLoading || hasPro ? null : (
        <Link
          href={`/${language}/teacher/upgrade`}
          data-testid="classroom-roster-upgrade"
          onClick={() => trackTeacherRosterProgressUpgradeClicked({ classroomId })}
          className="inline-flex min-h-11 items-center rounded-neo border-2 border-black bg-neo-cyan px-4 py-2 font-bold text-neo-navy shadow-hard transition-shadow hover:shadow-hard-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-white"
        >
          {t('teacher.reports.rosterProgress.upgrade', { price: `$${TEACHER_PRO_PRICE_USD}` })}
        </Link>
      )}
    </section>
  );
}

export default ClassroomRosterProgress;
