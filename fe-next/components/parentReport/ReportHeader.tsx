import type { ParentReportSummary } from '@/lib/education/parentReportData';
import type { ReportT } from './ReportInsights';
import { PrintReportButton } from './PrintReportButton';

const PERIOD_DAYS = 14;

function Meta({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div data-testid={testId} className="min-w-0">
      <dt className="text-xs font-black uppercase tracking-wide text-neo-black/70">{label}</dt>
      <dd className="break-words font-bold text-neo-black">
        <bdi>{value}</bdi>
      </dd>
    </div>
  );
}

export function ReportHeader({ data, locale, t }: { data: ParentReportSummary; locale: string; t: ReportT }) {
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });
  const end = data.generatedAt ? new Date(data.generatedAt) : null;
  const start = end ? new Date(end.getTime() - (PERIOD_DAYS - 1) * 86400000) : null;

  return (
    <header className="border-b-2 border-neo-black pb-4 print:pb-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-neo-black/70">{t('parentReport.subtitle')}</p>
          <h1 className="break-words font-neo-display text-3xl font-bold text-neo-black">
            <bdi>{data.displayName}</bdi>
          </h1>
        </div>
        <PrintReportButton label={t('parentReport.printButton')} />
      </div>
      <dl className="mt-3 grid gap-3 sm:grid-cols-3 print:mt-2 print:grid-cols-3">
        {data.classroomName && <Meta label={t('parentReport.classLabel')} value={data.classroomName} />}
        {data.teacherName && <Meta testId="report-teacher" label={t('parentReport.teacherLabel')} value={data.teacherName} />}
        {start && end && (
          <Meta
            testId="report-period"
            label={t('parentReport.periodLabel')}
            value={t('parentReport.periodRange', { start: date.format(start), end: date.format(end) })}
          />
        )}
      </dl>
    </header>
  );
}
