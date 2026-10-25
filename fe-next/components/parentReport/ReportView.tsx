import type { ParentReportSummary } from '@/lib/education/parentReportData';
import { translateKey } from '@/lib/i18n/serverTranslate';
import { locales, isRTL, type Locale } from '@/i18n/config';
import { languageLabelKey } from '@/lib/i18n/languageLabels';
import { ReportInsights, type ReportT } from './ReportInsights';
import { ReportHeader } from './ReportHeader';

function LegacyStats({ data, t }: { data: ParentReportSummary; t: ReportT }) {
  const tiles: Array<[number, string]> = [
    [data.totalXp, t('parentReport.statXp')],
    [data.lessonsCompleted, t('parentReport.statLessons')],
    [data.wordsMastered, t('parentReport.statWords')],
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {tiles.map(([value, label]) => (
        <div key={label} className="rounded-neo border-2 border-neo-black bg-neo-white p-4 text-center">
          <div dir="ltr" className="font-neo-display text-3xl font-bold tabular-nums text-neo-black">{value}</div>
          <div className="mt-1 text-xs font-black uppercase text-neo-black/75">{label}</div>
        </div>
      ))}
    </div>
  );
}

function RecentActivity({ data, locale, t }: { data: ParentReportSummary; locale: string; t: ReportT }) {
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });
  return (
    <section className="break-inside-avoid rounded-neo border-2 border-neo-black bg-neo-white p-4 print:p-2.5">
      <h2 className="font-neo-display text-lg font-bold text-neo-black">{t('parentReport.recentActivity')}</h2>
      {data.insights && (data.totalXp > 0 || data.lessonsCompleted > 0) && (
        <p className="text-xs text-neo-black/75">
          {t('parentReport.allTime', { xp: data.totalXp, lessons: data.lessonsCompleted })}
        </p>
      )}
      {data.recentActivity.length === 0 ? (
        <p className="mt-2 text-neo-black/75">{t('parentReport.noRecentActivity')}</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-2">
          {data.recentActivity.map((entry, i) => (
            <li key={`${entry.completedAt}-${i}`} className="rounded-neo border-2 border-neo-black px-2 py-0.5 text-sm font-bold text-neo-black">
              {date.format(new Date(entry.completedAt))}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const PRINT_CSS = `
@page { size: A4; margin: 12mm; }
@media print {
  html { color-scheme: light; }
  html, body, body *:has([data-parent-report]) {
    display: block !important; height: auto !important; min-height: 0 !important;
    overflow: visible !important; position: static !important; background: none !important;
    padding: 0 !important; margin: 0 !important;
  }
  [data-parent-report], [data-parent-report] * { box-shadow: none !important; }
  body *:not(:has([data-parent-report])):not([data-parent-report]):not([data-parent-report] *) { display: none !important; }
}`;

function LocaleSwitcher({ token, current, t }: { token: string; current: string; t: ReportT }) {
  return (
    <nav className="mt-6 flex flex-wrap justify-center gap-2 print:hidden" aria-label={t('parentReport.language')}>
      {locales.map((code) => (
        <a
          key={code}
          href={`/${code}/report/${token}`}
          className={`px-3 py-1 rounded-neo border-3 font-neo-body text-sm ${
            code === current
              ? 'bg-neo-lime border-neo-black text-neo-black'
              : 'bg-neo-navy border-neo-cream/40 text-neo-white/80'
          }`}
        >
          {translateKey(languageLabelKey(code), code)}
        </a>
      ))}
    </nav>
  );
}

export function ReportView({ locale, token, data, t }: { locale: string; token: string; data: ParentReportSummary; t: ReportT }) {
  const name = data.displayName ?? t('parentReport.studentFallback');
  return (
    <div
      data-parent-report=""
      dir={isRTL(locale as Locale) ? 'rtl' : 'ltr'}
      className="min-h-dvh bg-neo-navy p-4 sm:p-6 print:min-h-0 print:bg-neo-white print:p-0"
    >
      <style>{PRINT_CSS}</style>
      <article className="mx-auto w-full max-w-3xl space-y-4 rounded-neo border-3 border-neo-black bg-neo-cream p-4 font-neo-body text-neo-black shadow-hard sm:p-6 print:max-w-none print:space-y-3 print:border-0 print:bg-neo-white print:p-0 print:shadow-none">
        <ReportHeader data={data} name={name} locale={locale} t={t} />
        {data.insights ? (
          <ReportInsights insights={data.insights} name={name} t={t} />
        ) : (
          <LegacyStats data={data} t={t} />
        )}
        <RecentActivity data={data} locale={locale} t={t} />
        <p className="text-center text-xs text-neo-black/70">{t('parentReport.footerNote')}</p>
        <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-sm font-bold print:hidden">
          <span>{t('parentReport.playPrompt')}</span>
          <a
            href={`/${locale}/daily?utm_source=parent_report&utm_medium=referral`}
            data-testid="parent-report-play"
            className="inline-flex min-h-11 items-center rounded-neo border-2 border-neo-black bg-neo-lime px-3 font-neo-display font-black text-neo-black shadow-hard-sm hover:-translate-y-0.5 focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan print:hidden"
          >
            {t('parentReport.playCta')}
          </a>
        </p>
      </article>
      <LocaleSwitcher token={token} current={locale} t={t} />
    </div>
  );
}
