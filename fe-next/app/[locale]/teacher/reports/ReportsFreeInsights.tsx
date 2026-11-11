'use client';

import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassrooms } from '@/hooks/useClassroom';
import { freeInsightClassId } from '@/lib/education/pro/freeClassInsight';
import { FreeWeekInsight, type FreeWeekStatus } from '@/components/teacher/analytics/free/FreeWeekInsight';

/** A free teacher's real week for the one class the server covers (their oldest), and a plain line for the rest. */
export function ReportsFreeInsights({ onWeekStatus }: { onWeekStatus?: (status: FreeWeekStatus) => void }) {
  const { language } = useLanguage();
  const { classrooms } = useClassrooms();
  if (!classrooms || classrooms.length === 0) return null;
  const freeId = freeInsightClassId(classrooms);
  const free = classrooms.find((c) => c.id === freeId) ?? null;
  return (
    <ReportsFreeInsightsView free={free} others={classrooms.filter((c) => c.id !== freeId)}>
      {free ? <FreeWeekInsight classroomId={free.id} locale={language} onStatus={onWeekStatus} proLine={false} /> : null}
    </ReportsFreeInsightsView>
  );
}

interface NamedClass {
  id: string;
  name: string;
}

export function ReportsFreeInsightsView({ free, others, children }: { free: NamedClass | null; others: readonly NamedClass[]; children: ReactNode }) {
  const { t } = useLanguage();
  return (
    <section data-testid="reports-free-insights" aria-label={t('teacher.weekInsight.title')} className="flex flex-col gap-3">
      {free ? (
        <div className="flex flex-col gap-2">
          <p className="font-neo-display text-lg font-black text-neo-cream">
            <bdi>{free.name}</bdi>
          </p>
          {children}
        </div>
      ) : null}
      {others.length > 0 ? (
        <div
          data-testid="reports-free-other-classes"
          className="flex flex-col gap-2 rounded-neo-lg border-2 border-dashed border-neo-cream/40 p-3 sm:flex-row sm:items-center sm:gap-3"
        >
          <p className="flex items-center gap-2 font-neo-body text-sm font-bold text-neo-cream/90">
            <Lock className="size-4 shrink-0" aria-hidden="true" />
            {t('teacher.reports.freeOtherClasses')}
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {others.map((c) => (
              <li key={c.id} className="rounded-full border-2 border-neo-cream/40 px-2.5 py-0.5 font-neo-body text-xs font-bold text-neo-cream/80">
                <bdi>{c.name}</bdi>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
