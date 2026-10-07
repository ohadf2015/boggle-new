import type { TeacherLocale } from '@/lib/education/types';
import { polarTrialUpgradeUrl } from '@/lib/education/polarTrialDay10';

interface Args {
  full_name: string;
  locale: TeacherLocale;
  trialExpiresAt: string;
  daysLeft: number;
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

const DATE_LOCALE: Record<TeacherLocale, string> = {
  en: 'en-US', he: 'he-IL', sv: 'sv-SE', ja: 'ja-JP', es: 'es-ES', ru: 'ru-RU',
};

interface Copy {
  greeting: (n: string) => string;
  subject: (days: number) => string;
  lead: (days: number, date: string) => string;
  body: string;
  price: string;
  cta: string;
  ask: string;
  signoff: string;
  dir: 'ltr' | 'rtl';
}

const CONTACT = 'ohadf2015@gmail.com';

const COPY: Partial<Record<TeacherLocale, Copy>> & { en: Copy } = {
  en: {
    greeting: (n) => `Hi ${n},`,
    subject: (days) => `Your Teacher Pro trial has ${days} days left`,
    lead: (days, date) => `Your 14-day Teacher Pro trial ends in ${days} days (${date}).`,
    body: 'If the classroom is working for you, convert now so nothing stops on the last day. Polar will charge $9/month when the trial ends unless you cancel.',
    price: 'Teacher Pro is $9/month: unlimited classrooms, live word games, and the progress dashboard. Cancel any time.',
    cta: 'Keep Teacher Pro — $9/mo',
    ask: `Not the right fit? Reply and tell me why — I read every one: ${CONTACT}`,
    signoff: '— Ohad, the creator of LexiClash',
    dir: 'ltr',
  },
  he: {
    greeting: (n) => `שלום ${n},`,
    subject: (days) => `נותרו ${days} ימים לתקופת הניסיון של Teacher Pro`,
    lead: (days, date) => `תקופת הניסיון של 14 יום ל-Teacher Pro מסתיימת בעוד ${days} ימים (${date}).`,
    body: 'אם הכיתה עובדת לך — המירו עכשיו כדי ששום דבר לא ייעצר ביום האחרון. Polar יחייב 9$ לחודש כשהניסיון ייגמר, אלא אם תבטלו.',
    price: 'מנוי Teacher Pro עולה 9$ לחודש: כיתות ללא הגבלה, משחקי מילים חיים ולוח מעקב התקדמות. אפשר לבטל בכל רגע.',
    cta: 'לשמור על Teacher Pro — 9$ לחודש',
    ask: `לא מתאים? השב/י ותספר/י לי למה — אני קורא הכול: ${CONTACT}`,
    signoff: '— אוהד, היוצר של LexiClash',
    dir: 'rtl',
  },
};

export function teacherPolarTrialDay10({ full_name, locale, trialExpiresAt, daysLeft }: Args) {
  const c = COPY[locale] || COPY.en;
  const align = c.dir === 'rtl' ? 'right' : 'left';
  const dateStr = new Date(trialExpiresAt).toLocaleDateString(DATE_LOCALE[locale] || 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const upgradeUrl = polarTrialUpgradeUrl(locale);

  const html = `<!doctype html>
<html dir="${c.dir}" lang="${locale}">
<body style="margin:0;padding:0;background:#0e1430;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0e1430;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:3px solid #1a1a2e;">
        <tr><td dir="${c.dir}" align="${align}" style="padding:28px 28px 8px 28px;font-family:Arial,Helvetica,sans-serif;color:#1a1a2e;text-align:${align};">
          <p style="font-size:18px;font-weight:700;margin:0 0 12px 0;">${c.greeting(escape(full_name))}</p>
          <p style="font-size:15px;line-height:1.6;margin:0 0 16px 0;font-weight:700;">${escape(c.lead(daysLeft, dateStr))}</p>
          <p style="font-size:15px;line-height:1.6;margin:0 0 16px 0;">${escape(c.body)}</p>
          <p style="font-size:15px;line-height:1.6;margin:0 0 20px 0;">${escape(c.price)}</p>
        </td></tr>
        <tr><td align="center" style="padding:8px 28px 20px 28px;">
          <a href="${upgradeUrl}" style="background:#BFFF00;color:#1a1a2e;font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:16px;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block;border:2px solid #1a1a2e;">${escape(c.cta)}</a>
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

  return { subject: c.subject(daysLeft), html };
}
