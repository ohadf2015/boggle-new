import type { TeacherLocale } from '@/lib/education/types';
import {
  polarTrialExpiryUpgradeUrl,
  type PolarTrialExpiryBucket,
} from '@/lib/education/polarTrialExpiryJourney';

interface Args {
  full_name: string;
  locale: TeacherLocale;
  bucket: PolarTrialExpiryBucket;
  trialExpiresAt: string;
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

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
  buckets: Record<PolarTrialExpiryBucket, BucketCopy>;
  body: string;
  price: string;
  ask: string;
  signoff: string;
  dir: 'ltr' | 'rtl';
}

const CONTACT = 'ohadf2015@gmail.com';

const COPY: Partial<Record<TeacherLocale, Copy>> & { en: Copy } = {
  en: {
    greeting: (n) => `Hi ${n},`,
    buckets: {
      't-0': {
        subject: () => 'Your Teacher Pro trial ends today',
        lead: (date) => `Your 14-day Teacher Pro trial ends today (${date}).`,
        cta: 'Keep Teacher Pro — $9/mo',
      },
      't+3': {
        subject: () => 'Your Teacher Pro trial has ended — want the reports back?',
        lead: (date) => `Your Teacher Pro trial ended on ${date}.`,
        cta: 'Reactivate Teacher Pro — $9/mo',
      },
    },
    body: 'The weekly numbers on your dashboard are the classroom you already ran. Convert now so reports and unlimited classes do not stop.',
    price: 'Teacher Pro is $9/month: unlimited classrooms, live word games, and the progress dashboard. Cancel any time.',
    ask: `Not the right fit? Reply and tell me why — I read every one: ${CONTACT}`,
    signoff: '— Ohad, the creator of LexiClash',
    dir: 'ltr',
  },
  he: {
    greeting: (n) => `שלום ${n},`,
    buckets: {
      't-0': {
        subject: () => 'תקופת הניסיון של Teacher Pro מסתיימת היום',
        lead: (date) => `תקופת הניסיון של 14 יום ל-Teacher Pro מסתיימת היום (${date}).`,
        cta: 'לשמור על Teacher Pro — 9$ לחודש',
      },
      't+3': {
        subject: () => 'תקופת הניסיון של Teacher Pro הסתיימה — רוצה את הדוחות בחזרה?',
        lead: (date) => `תקופת הניסיון של Teacher Pro הסתיימה ב-${date}.`,
        cta: 'להפעיל מחדש את Teacher Pro — 9$ לחודש',
      },
    },
    body: 'המספרים השבועיים בלוח הם הכיתה שכבר הרצת. המירו עכשיו כדי שדוחות וכיתות ללא הגבלה לא ייעצרו.',
    price: 'מנוי Teacher Pro עולה 9$ לחודש: כיתות ללא הגבלה, משחקי מילים חיים ולוח מעקב התקדמות. אפשר לבטל בכל רגע.',
    ask: `לא מתאים? השב/י ותספר/י לי למה — אני קורא הכול: ${CONTACT}`,
    signoff: '— אוהד, היוצר של LexiClash',
    dir: 'rtl',
  },
};

export function teacherPolarTrialExpiry({ full_name, locale, bucket, trialExpiresAt }: Args) {
  const c = COPY[locale] || COPY.en;
  const b = c.buckets[bucket];
  const align = c.dir === 'rtl' ? 'right' : 'left';
  const dateStr = new Date(trialExpiresAt).toLocaleDateString(DATE_LOCALE[locale] || 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const upgradeUrl = polarTrialExpiryUpgradeUrl(locale, bucket);

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
          <a href="${upgradeUrl}" style="background:#BFFF00;color:#1a1a2e;font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:16px;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block;border:2px solid #1a1a2e;">${escape(b.cta)}</a>
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
