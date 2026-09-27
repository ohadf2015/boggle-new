import type { Metadata } from 'next';
import { createAdminClient } from '@/utils/supabase/admin';
import { verifyParentReportToken } from '@/lib/education/parentReportToken';
import { loadParentReportData, type ParentReportSummary } from '@/lib/education/parentReportData';
import { translateKey } from '@/lib/i18n/serverTranslate';
import { locales, isRTL, type Locale } from '@/i18n/config';
import { languageLabelKey } from '@/lib/i18n/languageLabels';
import logger from '@/utils/logger';

/**
 * Public "parent report" page — no account needed, the signed token in the
 * URL IS the access control (see `lib/education/parentReportToken.ts`).
 *
 * Every failure mode (malformed/tampered/expired token, service role not
 * configured, student no longer on the roster, or a query error) renders
 * the SAME friendly "link not available" view — never a stack trace, never
 * a hint about which check failed (that would help an attacker enumerate
 * valid tokens). A real backend error still gets logged (recurring-pitfalls
 * Class 4: a query error must never look identical to "nothing to report").
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

function InvalidReportView({ locale, t }: { locale: string; t: (key: string) => string }) {
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

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <div className="border-3 bg-neo-navy border-neo-cream/40 shadow-hard-sm rounded-neo p-4 text-center">
      <div className="font-neo-display text-3xl text-neo-lime">{value}</div>
      <div className="font-neo-body text-xs uppercase text-neo-white/70 mt-1">{label}</div>
    </div>
  );
}

function LocaleSwitcher({ token, current }: { token: string; current: string }) {
  return (
    <nav className="flex flex-wrap justify-center gap-2 mt-6" aria-label="language">
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

function ReportView({
  locale,
  token,
  data,
  t,
}: {
  locale: string;
  token: string;
  data: ParentReportSummary;
  t: (key: string) => string;
}) {
  return (
    <main
      dir={isRTL(locale as Locale) ? 'rtl' : 'ltr'}
      className="min-h-dvh bg-neo-navy p-6 flex flex-col items-center"
    >
      <div className="w-full max-w-lg">
        <div className="border-3 bg-neo-navy border-neo-cream/40 shadow-hard rounded-neo p-6 text-center mb-4">
          <h1 className="font-neo-display text-3xl text-neo-white">{data.displayName}</h1>
          <p className="font-neo-body text-neo-white/70 mt-1">{t('parentReport.subtitle')}</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <StatTile value={data.totalXp} label={t('parentReport.statXp')} />
          <StatTile value={data.lessonsCompleted} label={t('parentReport.statLessons')} />
          <StatTile value={data.wordsMastered} label={t('parentReport.statWords')} />
        </div>

        <div className="border-3 bg-neo-navy border-neo-cream/40 shadow-hard-sm rounded-neo p-4 mb-4">
          <h2 className="font-neo-display text-lg text-neo-white mb-2">{t('parentReport.recentActivity')}</h2>
          {data.recentActivity.length === 0 ? (
            <p className="font-neo-body text-neo-white/70">{t('parentReport.noRecentActivity')}</p>
          ) : (
            <ul className="font-neo-body text-neo-white/90 space-y-1">
              {data.recentActivity.map((entry, i) => (
                <li key={`${entry.completedAt}-${i}`}>
                  {new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(entry.completedAt))}
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="font-neo-body text-xs text-neo-white/50 text-center">{t('parentReport.footerNote')}</p>

        <LocaleSwitcher token={token} current={locale} />
      </div>
    </main>
  );
}

export default async function ParentReportPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  const t = (key: string) => translateKey(key, locale);

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
