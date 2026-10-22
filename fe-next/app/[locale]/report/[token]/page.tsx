import type { Metadata } from 'next';
import { createAdminClient } from '@/utils/supabase/admin';
import { verifyParentReportToken } from '@/lib/education/parentReportToken';
import { loadParentReportData, type ParentReportSummary } from '@/lib/education/parentReportData';
import { translateKey } from '@/lib/i18n/serverTranslate';
import { interpolate } from '@/components/education/lobby/eduText';
import { locales, isRTL, type Locale } from '@/i18n/config';
import { languageLabelKey } from '@/lib/i18n/languageLabels';
import { ReportInsights, type ReportT } from '@/components/parentReport/ReportInsights';
import { ReportHeader } from '@/components/parentReport/ReportHeader';
import logger from '@/utils/logger';

/**
 * Public "parent report" page — no account needed, the signed token in the
 * URL IS the access control (see `lib/education/parentReportToken.ts`).
 *
 * Every failure mode (malformed/tampered/expired token, service role not
 * configured, student no longer on the roster, or a query error) renders
 * the SAME friendly "link not available" view, so the page never hints at
 * which check failed. A real backend error still gets logged.
 *
 * `robots: noindex,nofollow` unconditionally — this page carries a minor's
 * name and activity, it must never be crawled or show up in search.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: translateKey('parentReport.metaTitle', locale),
    description: translateKey('parentReport.metaDescription', locale),
    robots: { index: false, follow: false },
  };
}

function InvalidReportView({ locale, t }: { locale: string; t: ReportT }) {
  return (
    <main
      dir={isRTL(locale as Locale) ? 'rtl' : 'ltr'}
      className="min-h-dvh bg-neo-navy flex items-center justify-center p-6"
    >
      <div className="w-full max-w-md border-3 bg-neo-navy border-neo-cream/40 shadow-hard rounded-neo p-6 text-center">
        <h1 className="font-neo-display text-2xl text-neo-white mb-3">{t('parentReport.invalidTitle')}</h1>
        <p className="font-neo-body text-neo-white/80">{t('parentReport.invalidBody')}</p>
      </div>
    </main>
  );
}

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
    <section className="break-inside-avoid rounded-neo border-2 border-neo-black bg-neo-white p-4">
      <h2 className="font-neo-display text-lg font-bold text-neo-black">{t('parentReport.recentActivity')}</h2>
      {data.insights && (
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

function ReportView({ locale, token, data, t }: { locale: string; token: string; data: ParentReportSummary; t: ReportT }) {
  return (
    <main
      dir={isRTL(locale as Locale) ? 'rtl' : 'ltr'}
      className="min-h-dvh bg-neo-navy p-4 sm:p-6 print:min-h-0 print:bg-neo-white print:p-0"
    >
      <article className="mx-auto w-full max-w-3xl space-y-4 rounded-neo border-3 border-neo-black bg-neo-cream p-4 font-neo-body text-neo-black shadow-hard sm:p-6 print:max-w-none print:border-0 print:bg-neo-white print:shadow-none">
        <ReportHeader data={data} locale={locale} t={t} />
        {data.insights ? (
          <ReportInsights insights={data.insights} name={data.displayName} t={t} />
        ) : (
          <LegacyStats data={data} t={t} />
        )}
        <RecentActivity data={data} locale={locale} t={t} />
        <p className="text-center text-xs text-neo-black/70">{t('parentReport.footerNote')}</p>
      </article>
      <LocaleSwitcher token={token} current={locale} t={t} />
    </main>
  );
}

export default async function ParentReportPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  const t: ReportT = (key, values) => interpolate(translateKey(key, locale), values);

  const payload = verifyParentReportToken(token);
  if (!payload) return <InvalidReportView locale={locale} t={t} />;

  const admin = createAdminClient();
  if (!admin) {
    logger.error('[parent-report-page] service role key not configured');
    return <InvalidReportView locale={locale} t={t} />;
  }

  const result = await loadParentReportData(admin, payload.studentId, payload.classroomId);
  if (result.status === 'error') {
    logger.error('[parent-report-page] failed to load report data', result.message);
  }
  if (result.status !== 'ok') return <InvalidReportView locale={locale} t={t} />;

  return <ReportView locale={locale} token={token} data={result.data} t={t} />;
}
