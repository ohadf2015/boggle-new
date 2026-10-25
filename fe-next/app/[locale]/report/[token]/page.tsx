import type { Metadata } from 'next';
import { createAdminClient } from '@/utils/supabase/admin';
import { verifyParentReportToken } from '@/lib/education/parentReportToken';
import { loadParentReportData } from '@/lib/education/parentReportData';
import { isParentReportRevoked } from '@/lib/education/parentReportRevocation';
import { translateKey } from '@/lib/i18n/serverTranslate';
import { interpolate } from '@/components/education/lobby/eduText';
import { isRTL, type Locale } from '@/i18n/config';
import type { ReportT } from '@/components/parentReport/ReportInsights';
import { ReportView } from '@/components/parentReport/ReportView';
import logger from '@/utils/logger';
import { captureEduServerEvents } from '@/backend/utils/educationTelemetry';
import { buildParentReportViewedEvent } from '@/backend/utils/educationRoundTelemetry';

/**
 * Public "parent report" page — no account needed, the signed token in the
 * URL IS the access control (see `lib/education/parentReportToken.ts`).
 *
 * Every failure mode (malformed/tampered/expired/revoked token, service role
 * not configured, student no longer on the roster, or a query error) renders
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
    referrer: 'no-referrer',
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

  if (await isParentReportRevoked(admin, payload)) return <InvalidReportView locale={locale} t={t} />;

  const result = await loadParentReportData(admin, payload.studentId, payload.classroomId);
  if (result.status === 'error') {
    logger.error('[parent-report-page] failed to load report data', result.message);
  }
  if (result.status !== 'ok') return <InvalidReportView locale={locale} t={t} />;

  captureEduServerEvents([buildParentReportViewedEvent({ token, classroomId: payload.classroomId, locale })]);

  return <ReportView locale={locale} token={token} data={result.data} t={t} />;
}
