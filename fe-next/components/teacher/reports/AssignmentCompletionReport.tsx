'use client';

/**
 * Compact submitted-vs-roster strip on the classroom report/assignments view.
 * Renders only when the class has >=1 assignment. Free teachers get ONE
 * Polar upgrade link at /{locale}/teacher/upgrade — no new checkout.
 */

import { useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { getClassroomAssignments } from '@/lib/supabase/education/assignments';
import { summarizeAssignmentCompletions } from '@/lib/education/assignmentCompletionReport';
import {
  trackTeacherAssignmentReportUpgradeClicked,
  trackTeacherAssignmentReportViewed,
} from '@/lib/education/telemetry';
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import { ReportError, ReportSkeleton, useReportData } from './ReportChrome';

export interface AssignmentCompletionReportProps {
  classroomId: string;
}

export function AssignmentCompletionReport({ classroomId }: AssignmentCompletionReportProps) {
  const { t, language } = useLanguage();
  const { hasPro, loading: proLoading } = useTeacherPro();

  const load = useCallback(async () => {
    const res = await getClassroomAssignments(classroomId);
    if (res.error) return { data: null, error: res.error };
    const rows = summarizeAssignmentCompletions(
      res.data ?? [],
      t('teacher.reports.assignmentProgress.untitled'),
    );
    return { data: { rows }, error: null };
  }, [classroomId, t]);

  const { data, loading, failed, retry } = useReportData(load);
  const viewed = useRef(false);

  useEffect(() => {
    if (!data || data.rows.length === 0 || viewed.current) return;
    viewed.current = true;
    trackTeacherAssignmentReportViewed({
      classroomId,
      assignmentCount: data.rows.length,
      hasPro,
    });
  }, [classroomId, data, hasPro]);

  if (loading) return <ReportSkeleton />;
  if (failed) return <ReportError onRetry={retry} />;
  if (!data || data.rows.length === 0) return null;

  return (
    <section
      data-testid="assignment-completion-report"
      className="space-y-3 rounded-neo border-2 border-neo-cream/25 bg-neo-navy/40 p-4"
    >
      <h3 className="font-neo-display text-lg font-bold text-neo-white">
        {t('teacher.reports.assignmentCompletion.title')}
      </h3>
      <ul className="space-y-2">
        {data.rows.map((row) => (
          <li
            key={row.assignmentId}
            data-testid="assignment-completion-row"
            data-submitted={row.submitted}
            data-roster={row.roster}
            className="flex items-baseline justify-between gap-3 text-sm"
          >
            <span className="min-w-0 break-words font-bold text-neo-white">{row.title}</span>
            <span className="shrink-0 tabular-nums text-neo-cyan">
              {t('teacher.reports.assignmentCompletion.submitted', {
                submitted: row.submitted,
                roster: row.roster,
              })}
            </span>
          </li>
        ))}
      </ul>
      {proLoading || hasPro ? null : (
        <Link
          href={`/${language}/teacher/upgrade`}
          data-testid="assignment-completion-upgrade"
          onClick={() => trackTeacherAssignmentReportUpgradeClicked({ classroomId })}
          className="inline-flex min-h-11 items-center rounded-neo border-2 border-black bg-neo-cyan px-4 py-2 font-bold text-neo-navy shadow-hard transition-shadow hover:shadow-hard-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-white"
        >
          {t('teacher.reports.assignmentCompletion.upgrade', { price: `$${TEACHER_PRO_PRICE_USD}` })}
        </Link>
      )}
    </section>
  );
}

export default AssignmentCompletionReport;
