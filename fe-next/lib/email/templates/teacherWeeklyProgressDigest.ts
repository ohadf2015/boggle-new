import type { TeacherLocale } from '@/lib/education/types';
import type { WeeklyTeacherDigest } from '@/lib/education/weeklyTeacherDigest';
import { en } from '../../../translations/en.js';
import { he } from '../../../translations/he.js';
import { sv } from '../../../translations/sv.js';
import { ja } from '../../../translations/ja.js';
import { es } from '../../../translations/es.js';
import { ru } from '../../../translations/ru.js';

/**
 * Weekly class numbers.
 *
 * The Polar reactivation CTA lives in THIS template, not in the on-screen
 * digest fold (`components/teacher/digest/ProgressDigestDashboard`). That fold
 * already has its own Pro lock. A second "your trial ended, start another
 * free trial" ask there is the stacked-banner bug. Pro teachers get the
 * numbers and no upsell. The link is the paid upgrade page, not `{ trial: true }`.
 */

const SITE = 'https://www.lexiclash.live';

const DICTS: Record<string, unknown> = { en, he, sv, ja, es, ru };

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function lookup(locale: string, path: string): string {
  const dict = DICTS[locale] ?? DICTS.en;
  const value = path.split('.').reduce<unknown>((node, key) => (
    node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined
  ), dict);
  return typeof value === 'string' && value.trim() ? value : path;
}

function fmt(n: number | null): string {
  return n == null ? '—' : String(n);
}

export function teacherWeeklyProgressDigest({
  locale,
  teacherName,
  digest,
}: {
  locale: TeacherLocale;
  teacherName: string;
  digest: WeeklyTeacherDigest;
}): { subject: string; html: string } {
  const dir = locale === 'he' ? 'rtl' : 'ltr';
  const align = dir === 'rtl' ? 'right' : 'left';
  const subject = lookup(locale, 'teacher.digest.weeklySubject');
  const expired = digest.polarTrialExpiredLineKey
    ? lookup(locale, digest.polarTrialExpiredLineKey)
    : null;
  const cta = expired ? lookup(locale, 'teacher.subscription.trialEndedCta') : null;
  const href = `${SITE}/${locale}/teacher/upgrade`;

  const upsell = expired && cta
    ? `<p style="font-size:15px;line-height:1.6;margin:16px 0;">${escape(expired)}</p>
        <p style="margin:0 0 8px 0;">
          <a href="${href}" style="background:#1a1a2e;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:15px;padding:12px 22px;border-radius:8px;text-decoration:none;display:inline-block;border:2px solid #1a1a2e;">${escape(cta)}</a>
        </p>`
    : '';

  const html = `<!doctype html>
<html dir="${dir}" lang="${locale}">
<body style="margin:0;padding:0;background:#0e1430;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0e1430;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:3px solid #1a1a2e;">
        <tr><td dir="${dir}" align="${align}" style="padding:28px;font-family:Arial,Helvetica,sans-serif;color:#1a1a2e;text-align:${align};">
          <p style="font-size:18px;font-weight:700;margin:0 0 12px 0;">${escape(teacherName)}</p>
          <p style="font-size:15px;line-height:1.6;margin:0 0 8px 0;">${escape(lookup(locale, 'teacher.digest.played'))}: ${fmt(digest.played)}</p>
          <p style="font-size:15px;line-height:1.6;margin:0 0 8px 0;">${escape(lookup(locale, 'teacher.digest.accuracy'))}: ${digest.accuracyPct == null ? '—' : `${digest.accuracyPct}%`}</p>
          <p style="font-size:15px;line-height:1.6;margin:0;">${escape(lookup(locale, 'teacher.digest.coverage'))}: ${digest.coveragePct == null ? '—' : `${digest.coveragePct}%`}</p>
          ${upsell}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
