'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { StudentInsights } from '@/lib/education/studentInsights';
import { ReportInsights, type ReportT } from '@/components/parentReport/ReportInsights';
import { ShareParentReportButton } from '@/components/teacher/analytics/ShareParentReportButton';

interface StudentParentPreviewProps {
  classroomId: string;
  studentId: string;
  studentName?: string;
}

type State = { status: 'loading' } | { status: 'error' } | { status: 'ok'; insights: StudentInsights };

/** The parent report's body, inside the teacher's student view: same transform, same numbers. */
export function StudentParentPreview({ classroomId, studentId, studentName }: StudentParentPreviewProps) {
  const { t } = useLanguage();
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let live = true;
    setState({ status: 'loading' });
    fetch(`/api/education/classroom/${classroomId}/members/${studentId}/insights`)
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!live) return;
        setState(res.ok && body?.ok && body.insights ? { status: 'ok', insights: body.insights } : { status: 'error' });
      })
      .catch(() => live && setState({ status: 'error' }));
    return () => { live = false; };
  }, [classroomId, studentId]);

  const reportT: ReportT = (key, params) => t(key, params);

  return (
    <section
      aria-labelledby="parent-preview-title"
      className="rounded-neo-lg border-2 border-neo-cream/40 bg-neo-navy-light/95 p-4 shadow-hard sm:p-5"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="parent-preview-title" className="font-neo-display text-lg font-bold text-neo-white">
            {t('parentReport.teacherPreviewTitle')}
          </h2>
          <p className="text-sm text-neo-cream/75">{t('parentReport.teacherPreviewHint')}</p>
        </div>
        <ShareParentReportButton classroomId={classroomId} studentId={studentId} />
      </div>
      {state.status === 'loading' && (
        <div aria-busy="true" className="h-40 rounded-neo bg-neo-cream/10 motion-safe:animate-pulse" />
      )}
      {state.status === 'error' && (
        <p role="alert" className="rounded-neo border-2 border-neo-pink bg-neo-pink/10 p-3 text-sm font-bold text-neo-white">
          {t('parentReport.loadFailed')}
        </p>
      )}
      {state.status === 'ok' && (
        <div className="rounded-neo border-2 border-neo-black bg-neo-cream p-3 text-neo-black sm:p-4">
          <ReportInsights insights={state.insights} name={studentName || t('teacher.reports.arc.unknownStudent')} t={reportT} />
        </div>
      )}
    </section>
  );
}
