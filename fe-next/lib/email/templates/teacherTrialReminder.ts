import type { TeacherLocale } from '@/lib/education/types';
import type { TrialReminderBucket } from '@/lib/education/trialReminders';

interface Args {
  full_name: string;
  locale: TeacherLocale;
  bucket: TrialReminderBucket;
  /** ISO trial deadline — rendered as a date in the teacher's locale. */
  trialExpiresAt: string;
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

const SITE = 'https://www.lexiclash.live';
const CONTACT = 'ohadf2015@gmail.com';

const DATE_LOCALE: Record<TeacherLocale, string> = {
  en: 'en-US', he: 'he-IL', sv: 'sv-SE', ja: 'ja-JP', es: 'es-ES', ru: 'ru-RU',
};

interface BucketCopy {
  subject: (date: string) => string;
  lead: (date: string) => string;
  cta: string;
}

interface Copy {
  greeting: (n: string) => string;
  buckets: Record<TrialReminderBucket, BucketCopy>;
  /** The honest reason this email exists — the module was broken during their trial. */
  body: string;
  price: string;
  ask: string;
  signoff: string;
  dir: 'ltr' | 'rtl';
}

// ponytail: en + he only, everything else falls back to en. All 29 approved
// teachers are en/he; adding four more translations for zero recipients is
// work for an audience that does not exist yet.
const COPY: Partial<Record<TeacherLocale, Copy>> & { en: Copy } = {
  en: {
    greeting: (n) => `Hi ${n},`,
    buckets: {
      't-3': {
        subject: () => 'Your LexiClash teacher trial ends in 3 days',
        lead: (date) => `Your free teacher trial ends on ${date}.`,
        cta: 'Keep my classroom — $9/mo',
      },
      't-0': {
        subject: () => 'Your LexiClash teacher trial ends today',
        lead: (date) => `Your free teacher trial ends today (${date}).`,
        cta: 'Keep my classroom — $9/mo',
      },
      't+3': {
        subject: () => 'Your LexiClash teacher trial has ended — want it back?',
        lead: (date) => `Your free teacher trial ended on ${date}.`,
        cta: 'Reopen my classroom — $9/mo',
      },
    },
    body:
      'Straight with you: the teacher module was broken for part of your trial, and I fixed it on August 21. If it never worked for you, that is why — and it works now.',
    price: 'Teacher Pro is $9/month: unlimited classrooms, live word games, and the progress dashboard. Cancel any time.',
    ask: `Not the right fit? Reply and tell me why — I read every one: ${CONTACT}`,
    signoff: '— Ohad, the creator of LexiClash',
    dir: 'ltr',
  },
  he: {
    greeting: (n) => `שלום ${n},`,
    buckets: {
      't-3': {
        subject: () => 'תקופת הניסיון שלך כמורה ב-LexiClash מסתיימת בעוד 3 ימים',
        lead: (date) => `תקופת הניסיון החינמית שלך מסתיימת ב-${date}.`,
        cta: 'לשמור על הכיתה שלי — 9$ לחודש',
      },
      't-0': {
        subject: () => 'תקופת הניסיון שלך כמורה ב-LexiClash מסתיימת היום',
        lead: (date) => `תקופת הניסיון החינמית שלך מסתיימת היום (${date}).`,
        cta: 'לשמור על הכיתה שלי — 9$ לחודש',
      },
      't+3': {
        subject: () => 'תקופת הניסיון שלך כמורה ב-LexiClash הסתיימה — רוצה אותה בחזרה?',
        lead: (date) => `תקופת הניסיון החינמית שלך הסתיימה ב-${date}.`,
        cta: 'לפתוח מחדש את הכיתה — 9$ לחודש',
      },
    },
    body:
      'בכנות: המודול למורים היה שבור בחלק מתקופת הניסיון שלך, ותיקנתי אותו ב-21 באוגוסט. אם זה לא עבד לך — זו הסיבה, ועכשיו זה עובד.',
    price: 'מנוי Teacher Pro עולה 9$ לחודש: כיתות ללא הגבלה, משחקי מילים חיים ולוח מעקב התקדמות. אפשר לבטל בכל רגע.',
    ask: `לא מתאים? השב/י ותספר/י לי למה — אני קורא הכול: ${CONTACT}`,
    signoff: '— אוהד, היוצר של LexiClash',
    dir: 'rtl',
  },
};

export function teacherTrialReminder({ full_name, locale, bucket, trialExpiresAt }: Args) {
  const c = COPY[locale] || COPY.en;
  const b = c.buckets[bucket];
  const align = c.dir === 'rtl' ? 'right' : 'left';
  const dateStr = new Date(trialExpiresAt).toLocaleDateString(DATE_LOCALE[locale] || 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const html = `<!doctype html>
<html dir="${c.dir}" lang="${locale}">
<body style="margin:0;padding:0;background:#0e1430;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0e1430;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:3px solid #1a1a2e;">
        <tr><td dir="${c.dir}" align="${align}" style="padding:28px 28px 8px 28px;font-family:Arial,Helvetica,sans-serif;color:#1a1a2e;text-align:${align};">
          <p style="font-size:18px;font-weight:700;margin:0 0 12px 0;">${c.greeting(escape(full_name))}</p>
          <p style="font-size:15px;line-height:1.6;margin:0 0 16px 0;font-weight:700;">${escape(b.lead(dateStr))}</p>
          <p style="font-size:15px;line-height:1.6;margin:0 0 16px 0;">${escape(c.body)}</p>
          <p style="font-size:15px;line-height:1.6;margin:0 0 20px 0;">${escape(c.price)}</p>
        </td></tr>
        <tr><td align="center" style="padding:8px 28px 20px 28px;">
          <a href="${SITE}/${locale}/teacher/upgrade" style="background:#BFFF00;color:#1a1a2e;font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:16px;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block;border:2px solid #1a1a2e;">${escape(b.cta)}</a>
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

  return { subject: b.subject(dateStr), html };
}
