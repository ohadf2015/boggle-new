'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import type { FreeWeekStatus } from '@/components/teacher/analytics/free/FreeWeekInsight';
import { ReportsFreeInsights } from './ReportsFreeInsights';

/** A free teacher's reports page: their real week first; the Pro lock follows. */
export function ReportsLockedTitle({ onWeekStatus }: { onWeekStatus?: (status: FreeWeekStatus) => void }) {
  const { t } = useLanguage();
  return (
    <div className="mx-auto mb-4 flex w-full max-w-5xl flex-col gap-4 sm:mb-6">
      <div>
        <h1 className="font-neo-display text-2xl font-bold leading-tight text-neo-white sm:text-3xl">{t('teacher.reports.title')}</h1>
        <p data-testid="reports-locked-value" className="mt-1 max-w-prose text-sm leading-snug text-neo-cream sm:text-base">
          {t('teacher.reports.lockedValue')}
        </p>
      </div>
      <ReportsFreeInsights onWeekStatus={onWeekStatus} />
    </div>
  );
}
