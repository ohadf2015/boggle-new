import type { TeacherLocale } from '@/lib/education/types';

/**
 * Teacher Pro trial re-invite for approved teachers whose trial expired (or
 * who never started one). Same honest tone as teacherTrialReminder: the module
 * was broken, it is fixed, the door is open again.
 *
 * en / he only, falling back to en (es teachers get en, per the existing
 * fallback in teacherTrialReminder / teacherGoodwillExtension).
 */

interface Args {
  full_name: string;
  locale: TeacherLocale;
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

const SITE = 'https://www.lexiclash.live';
const CONTACT = 'ohadf2015@gmail.com';
/** PostHog funnel attribution: trial_cta_view -> ... -> edu_pro_checkout_succeeded. */
const UTM = 'utm_source=email&amp;utm_medium=reinvite&amp;utm_campaign=teacher_trial_reinvite_2026_10';

interface Copy {
  subject: string;
  greeting: (n: string) => string;
  lead: string;
  what: string;
  cta: string;
  ask: string;
  signoff: string;
  dir: 'ltr' | 'rtl';
}

const COPY: Partial<Record<TeacherLocale, Copy>> & { en: Copy } = {
  en: {
    subject: 'Your LexiClash Teacher Pro trial is open again',
    greeting: (n) => `Hi ${n},`,
    lead: 'The teacher dashboard was broken when you tried it. That was our bug, it has been fixed since August 21, and I would like you to see it working.',
    what: 'Teacher Pro gives you classroom boards, student progress and weekly digests. You can start a free trial again whenever you are ready.',
    cta: 'Start my free trial',
    ask: `If something still gets in your way, just hit reply. It comes straight to me and I read every one (${CONTACT}).`,
    signoff: '— Ohad, the creator of LexiClash',
    dir: 'ltr',
  },
  he: {
    subject: 'תקופת הניסיון של LexiClash Teacher Pro פתוחה שוב',
    greeting: (n) => `היי ${n},`,
    lead: 'לוח המורה היה שבור כשניסית אותו. זה היה באג שלנו, והוא תוקן ב-21 באוגוסט, ואשמח שתראה/י אותו עובד.',
    what: 'Teacher Pro נותן לך לוחות כיתה, התקדמות תלמידים ודוחות שבועיים. אפשר להתחיל ניסיון חינם שוב בכל רגע.',
    cta: 'להתחיל ניסיון חינם',
    ask: `אם משהו עדיין מפריע, פשוט השב/י למייל הזה. הוא מגיע ישירות אליי ואני קורא כל אחד (${CONTACT}).`,
    signoff: '— אוהד, היוצר של LexiClash',
    dir: 'rtl',
  },
};

export function teacherTrialReinvite({ full_name, locale }: Args) {
  const c = COPY[locale] || COPY.en;
  const align = c.dir === 'rtl' ? 'right' : 'left';

  const html = `<!doctype html>
<html dir="${c.dir}" lang="${locale}">
<body style="margin:0;padding:0;background:#0e1430;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0e1430;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:3px solid #1a1a2e;">
        <tr><td dir="${c.dir}" align="${align}" style="padding:28px 28px 8px 28px;font-family:Arial,Helvetica,sans-serif;color:#1a1a2e;text-align:${align};">
          <p style="font-size:18px;font-weight:700;margin:0 0 12px 0;">${c.greeting(escape(full_name))}</p>
          <p style="font-size:15px;line-height:1.6;margin:0 0 16px 0;font-weight:700;">${escape(c.lead)}</p>
          <p style="font-size:15px;line-height:1.6;margin:0 0 20px 0;">${escape(c.what)}</p>
        </td></tr>
        <tr><td align="center" style="padding:0 28px 20px 28px;">
          <a href="${SITE}/${locale}/teacher/upgrade?${UTM}" style="background:#BFFF00;color:#1a1a2e;font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:16px;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block;border:2px solid #1a1a2e;">${escape(c.cta)}</a>
        </td></tr>
        <tr><td dir="${c.dir}" align="${align}" style="padding:0 28px 28px 28px;font-family:Arial,Helvetica,sans-serif;color:#4b5563;font-size:14px;text-align:${align};line-height:1.6;">
          <p style="margin:0 0 12px 0;">${escape(c.ask)}</p>
          <p style="margin:0;color:#6b7280;">${escape(c.signoff)}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject: c.subject, html };
}
