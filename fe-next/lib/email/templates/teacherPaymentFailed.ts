import type { TeacherLocale } from '@/lib/education/types';

interface Args {
  full_name: string;
  locale: TeacherLocale;
  /**
   * Polar customer-portal URL (update the card in one click). When the portal
   * session could not be created this is the teacher dashboard instead, which
   * carries the same Manage Subscription entry point — never a dead link.
   */
  portalUrl: string;
  /** ISO renewal date that failed — rendered as a date in the teacher's locale. */
  renewalDate: string | null;
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

const DATE_LOCALE: Record<TeacherLocale, string> = {
  en: 'en-US', he: 'he-IL', sv: 'sv-SE', ja: 'ja-JP', es: 'es-ES', ru: 'ru-RU',
};

interface Copy {
  subject: string;
  greeting: (n: string) => string;
  lead: (date: string | null) => string;
  body: string;
  cta: string;
  ask: string;
  signoff: string;
  dir: 'ltr' | 'rtl';
}

const CONTACT = 'ohadf2015@gmail.com';

// en + he only, same rule as teacherTrialReminder: every approved teacher is
// en/he, and a dunning email is exactly the wrong place to gamble on an
// unreviewed translation of billing language.
const COPY: Partial<Record<TeacherLocale, Copy>> & { en: Copy } = {
  en: {
    subject: 'Your LexiClash Teacher Pro payment did not go through',
    greeting: (n) => `Hi ${n},`,
    lead: (date) =>
      date
        ? `The $9 renewal for Teacher Pro on ${date} was declined by your card.`
        : 'The $9 renewal for Teacher Pro was declined by your card.',
    body:
      'Your classroom is untouched — students, lessons and reports are all still there. But if the card keeps declining, Teacher Pro lapses and the account drops back to the free tier (3 classes, no reports). Updating the card takes under a minute.',
    cta: 'Update my card',
    ask: `Card already updated, or want to cancel instead? Reply and I will sort it out myself: ${CONTACT}`,
    signoff: '— Ohad, the creator of LexiClash',
    dir: 'ltr',
  },
  he: {
    subject: 'התשלום על Teacher Pro ב-LexiClash לא עבר',
    greeting: (n) => `שלום ${n},`,
    lead: (date) =>
      date
        ? `חידוש המנוי (9$) ל-Teacher Pro ב-${date} נדחה על ידי כרטיס האשראי.`
        : 'חידוש המנוי (9$) ל-Teacher Pro נדחה על ידי כרטיס האשראי.',
    body:
      'הכיתה שלך לא נפגעה — התלמידים, השיעורים והדוחות עדיין שם. אבל אם הכרטיס ימשיך לדחות את החיוב, המנוי יפקע והחשבון יחזור לחינם (3 כיתות, בלי דוחות). עדכון הכרטיס לוקח פחות מדקה.',
    cta: 'לעדכן את הכרטיס',
    ask: `הכרטיס כבר עודכן, או שאת/ה רוצה לבטל? השב/י ואסדר את זה בעצמי: ${CONTACT}`,
    signoff: '— אוהד, היוצר של LexiClash',
    dir: 'rtl',
  },
};

export function teacherPaymentFailed({ full_name, locale, portalUrl, renewalDate }: Args) {
  const c = COPY[locale] || COPY.en;
  const align = c.dir === 'rtl' ? 'right' : 'left';
  const dateStr = renewalDate
    ? new Date(renewalDate).toLocaleDateString(DATE_LOCALE[locale] || 'en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null;

  const html = `<!doctype html>
<html dir="${c.dir}" lang="${locale}">
<body style="margin:0;padding:0;background:#0e1430;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0e1430;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:3px solid #1a1a2e;">
        <tr><td dir="${c.dir}" align="${align}" style="padding:28px 28px 8px 28px;font-family:Arial,Helvetica,sans-serif;color:#1a1a2e;text-align:${align};">
          <p style="font-size:18px;font-weight:700;margin:0 0 12px 0;">${c.greeting(escape(full_name))}</p>
          <p style="font-size:15px;line-height:1.6;margin:0 0 16px 0;font-weight:700;">${escape(c.lead(dateStr))}</p>
          <p style="font-size:15px;line-height:1.6;margin:0 0 20px 0;">${escape(c.body)}</p>
        </td></tr>
        <tr><td align="center" style="padding:8px 28px 20px 28px;">
          <a href="${escape(portalUrl)}" style="background:#BFFF00;color:#1a1a2e;font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:16px;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block;border:2px solid #1a1a2e;">${escape(c.cta)}</a>
        </td></tr>
        <tr><td dir="${c.dir}" align="${align}" style="padding:0 28px 28px 28px;font-family:Arial,Helvetica,sans-serif;color:#6b7280;font-size:13px;text-align:${align};">
          <p style="margin:0 0 8px 0;">${escape(c.ask)}</p>
          <p style="margin:0;">${escape(c.signoff)}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject: c.subject, html };
}
