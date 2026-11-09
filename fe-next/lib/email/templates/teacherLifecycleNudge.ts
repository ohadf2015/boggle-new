import type { TeacherLocale } from '@/lib/education/types';
import type { LifecycleStage, NudgeClassroom } from '@/lib/education/lifecycleNudges';
import { translateKey } from '@/lib/i18n/serverTranslate';

export type LifecycleEmailStage = LifecycleStage | 'reactivate';

interface Args {
  fullName: string;
  locale: TeacherLocale;
  stage: LifecycleEmailStage;
  /** The class to open (share_code, start_live). Without it the button goes to teacher home. */
  classroom?: NudgeClassroom | null;
}

const SITE = 'https://www.lexiclash.live';
const CONTACT = 'ohadf2015@gmail.com';

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

const SITE_LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'];

function ctaUrl(locale: TeacherLocale, stage: LifecycleEmailStage, classroom?: NudgeClassroom | null): string {
  if (stage === 'reactivate') return `${SITE}/${locale}/teacher/classroom/new`;
  if (!classroom) return `${SITE}/${locale}/teacher`;
  const url = new URL(`${SITE}/${locale}/teacher/classroom/new`);
  url.searchParams.set('classroomId', classroom.id);
  url.searchParams.set('utm_source', 'email');
  url.searchParams.set('utm_medium', 'lifecycle');
  url.searchParams.set('utm_campaign', `edu_${stage}`);
  return url.toString().replace(/\+/g, '%20');
}

/** Students land in the class's language, the teacher's as fallback (same rule as the in-app invite). */
function joinUrl(locale: TeacherLocale, classroom: NudgeClassroom): string {
  const lang = classroom.language && SITE_LOCALES.includes(classroom.language) ? classroom.language : locale;
  return `${SITE}/${lang}/join/${encodeURIComponent(classroom.joinCode)}`;
}

export function teacherLifecycleNudge({ fullName, locale, stage, classroom }: Args) {
  const copy = (key: string) => translateKey(`teacherLifecycleEmail.${key}`, locale);
  const dir = locale === 'he' ? 'rtl' : 'ltr';
  const align = dir === 'rtl' ? 'right' : 'left';
  const greeting = escape(copy('greeting')).replace('{name}', escape(fullName));
  const codeBox = stage === 'share_code' && classroom
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;border:2px solid #1a1a2e;border-radius:8px;background:#f4f6ff;">
            <tr><td dir="${dir}" align="${align}" style="padding:14px 16px;font-family:Arial,Helvetica,sans-serif;color:#1a1a2e;text-align:${align};">
              <p style="margin:0 0 4px 0;font-size:13px;font-weight:700;">${escape(copy('codeLabel'))}</p>
              <p style="margin:0 0 12px 0;font-size:28px;font-weight:800;letter-spacing:4px;font-family:'Courier New',monospace;" dir="ltr">${escape(classroom.joinCode)}</p>
              <p style="margin:0 0 4px 0;font-size:13px;font-weight:700;">${escape(copy('linkLabel'))}</p>
              <p style="margin:0;font-size:14px;word-break:break-all;" dir="ltr"><a href="${escape(joinUrl(locale, classroom))}" style="color:#1a1a2e;">${escape(joinUrl(locale, classroom))}</a></p>
            </td></tr>
          </table>`
    : '';

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
          ${codeBox}
        </td></tr>
        <tr><td align="center" style="padding:8px 28px 20px 28px;">
          <a href="${escape(ctaUrl(locale, stage, classroom))}" style="background:#BFFF00;color:#1a1a2e;font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:16px;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block;border:2px solid #1a1a2e;">${escape(copy(`${stage}.cta`))}</a>
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
