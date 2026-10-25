import type { TeacherLocale } from '@/lib/education/types';
import type { LifecycleStage } from '@/lib/education/lifecycleNudges';
import { translateKey } from '@/lib/i18n/serverTranslate';

export type LifecycleEmailStage = LifecycleStage | 'reactivate';

interface Args {
  fullName: string;
  locale: TeacherLocale;
  stage: LifecycleEmailStage;
}

const SITE = 'https://www.lexiclash.live';
const CONTACT = 'ohadf2015@gmail.com';

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function ctaUrl(locale: TeacherLocale, stage: LifecycleEmailStage): string {
  return stage === 'reactivate' ? `${SITE}/${locale}/teacher/classroom/new` : `${SITE}/${locale}/teacher`;
}

export function teacherLifecycleNudge({ fullName, locale, stage }: Args) {
  const copy = (key: string) => translateKey(`teacherLifecycleEmail.${key}`, locale);
  const dir = locale === 'he' ? 'rtl' : 'ltr';
  const align = dir === 'rtl' ? 'right' : 'left';
  const greeting = escape(copy('greeting')).replace('{name}', escape(fullName));

  const html = `<!doctype html>
<html dir="${dir}" lang="${locale}">
<body style="margin:0;padding:0;background:#0e1430;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0e1430;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:3px solid #1a1a2e;">
        <tr><td dir="${dir}" align="${align}" style="padding:28px 28px 8px 28px;font-family:Arial,Helvetica,sans-serif;color:#1a1a2e;text-align:${align};">
          <p style="font-size:18px;font-weight:700;margin:0 0 12px 0;">${greeting}</p>
          <p style="font-size:15px;line-height:1.6;margin:0 0 16px 0;font-weight:700;">${escape(copy(`${stage}.lead`))}</p>
          <p style="font-size:15px;line-height:1.6;margin:0 0 20px 0;">${escape(copy(`${stage}.body`))}</p>
        </td></tr>
        <tr><td align="center" style="padding:8px 28px 20px 28px;">
          <a href="${ctaUrl(locale, stage)}" style="background:#BFFF00;color:#1a1a2e;font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:16px;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block;border:2px solid #1a1a2e;">${escape(copy(`${stage}.cta`))}</a>
        </td></tr>
        <tr><td dir="${dir}" align="${align}" style="padding:0 28px 28px 28px;font-family:Arial,Helvetica,sans-serif;color:#6b7280;font-size:13px;text-align:${align};">
          <p style="margin:0 0 8px 0;">${escape(copy('ask'))}</p>
          <p style="margin:0;">${escape(copy('signoff'))}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject: copy(`${stage}.subject`), html, replyTo: CONTACT };
}
