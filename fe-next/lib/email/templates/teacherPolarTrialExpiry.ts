import type { TeacherLocale } from '@/lib/education/types';
import {
  polarTrialExpiryUpgradeUrl,
  type PolarTrialExpiryBucket,
} from '@/lib/education/polarTrialExpiryJourney';

export interface WinbackStats {
  classrooms: number;
  gamesLast30d: number;
}

interface Args {
  full_name: string;
  locale: TeacherLocale;
  bucket: PolarTrialExpiryBucket;
  trialExpiresAt: string;
  stats?: WinbackStats | null;
}

type WinbackBucket = 't+14' | 't+30';

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

interface WinbackCopy {
  subjectWithClasses: Record<WinbackBucket, string>;
  subjectGeneric: Record<WinbackBucket, string>;
  classes: (n: number) => string;
  games: (n: number) => string;
  ended: (date: string) => string;
  body: string;
  cta: string;
}

interface Copy {
  greeting: (n: string) => string;
  buckets: Record<'t-0' | 't+3', BucketCopy>;
  winback: WinbackCopy;
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
    winback: {
      subjectWithClasses: { 't+14': 'Your classes are still here', 't+30': 'Your classes are still waiting' },
      subjectGeneric: {
        't+14': 'Your Teacher Pro trial ended two weeks ago',
        't+30': 'A month since your Teacher Pro trial',
      },
      classes: (n) =>
        n === 1
          ? 'Your class is still on LexiClash, with every student and word list where you left it.'
          : `Your ${n} classes are still on LexiClash, with every student and word list where you left them.`,
      games: (n) =>
        n === 1
          ? 'Your students played 1 live game in the last 30 days.'
          : `Your students played ${n} live games in the last 30 days.`,
      ended: (date) => `Your Teacher Pro trial ended on ${date}.`,
      body: 'Nothing was deleted. Pick up where you left off whenever you are ready.',
      cta: 'Reactivate Teacher Pro — $9/mo',
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
    winback: {
      subjectWithClasses: { 't+14': 'הכיתות שלך עדיין כאן', 't+30': 'הכיתות שלך עדיין מחכות' },
      subjectGeneric: {
        't+14': 'תקופת הניסיון של Teacher Pro הסתיימה לפני שבועיים',
        't+30': 'עבר חודש מאז תקופת הניסיון של Teacher Pro',
      },
      classes: (n) =>
        n === 1
          ? 'הכיתה שלך עדיין ב-LexiClash, עם כל התלמידים ורשימות המילים בדיוק איפה שהשארת אותם.'
          : `${n} הכיתות שלך עדיין ב-LexiClash, עם כל התלמידים ורשימות המילים בדיוק איפה שהשארת אותם.`,
      games: (n) =>
        n === 1
          ? 'התלמידים שלך שיחקו משחק חי אחד ב-30 הימים האחרונים.'
          : `התלמידים שלך שיחקו ${n} משחקים חיים ב-30 הימים האחרונים.`,
      ended: (date) => `תקופת הניסיון של Teacher Pro הסתיימה ב-${date}.`,
      body: 'שום דבר לא נמחק. אפשר להמשיך מאיפה שעצרת מתי שנוח לך.',
      cta: 'להפעיל מחדש את Teacher Pro — 9$ לחודש',
    },
    body: 'המספרים השבועיים בלוח הם הכיתה שכבר הרצת. המירו עכשיו כדי שדוחות וכיתות ללא הגבלה לא ייעצרו.',
    price: 'מנוי Teacher Pro עולה 9$ לחודש: כיתות ללא הגבלה, משחקי מילים חיים ולוח מעקב התקדמות. אפשר לבטל בכל רגע.',
    ask: `לא מתאים? השב/י ותספר/י לי למה — אני קורא הכול: ${CONTACT}`,
    signoff: '— אוהד, היוצר של LexiClash',
    dir: 'rtl',
  },
};

interface Rendered {
  subject: string;
  lead: string;
  paragraphs: string[];
  cta: string;
}

function renderCopy(c: Copy, bucket: PolarTrialExpiryBucket, dateStr: string, stats: WinbackStats | null): Rendered {
  if (bucket === 't-0' || bucket === 't+3') {
    const b = c.buckets[bucket];
    return { subject: b.subject(dateStr), lead: b.lead(dateStr), paragraphs: [c.body], cta: b.cta };
  }
  const w = c.winback;
  const hasClasses = (stats?.classrooms ?? 0) > 0;
  if (!hasClasses) {
    return { subject: w.subjectGeneric[bucket], lead: w.ended(dateStr), paragraphs: [w.body], cta: w.cta };
  }
  const paragraphs = stats!.gamesLast30d > 0 ? [w.games(stats!.gamesLast30d), w.body] : [w.body];
  return { subject: w.subjectWithClasses[bucket], lead: w.classes(stats!.classrooms), paragraphs, cta: w.cta };
}

export function teacherPolarTrialExpiry({ full_name, locale, bucket, trialExpiresAt, stats = null }: Args) {
  const c = COPY[locale] || COPY.en;
  const align = c.dir === 'rtl' ? 'right' : 'left';
  const dateStr = new Date(trialExpiresAt).toLocaleDateString(DATE_LOCALE[locale] || 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const upgradeUrl = polarTrialExpiryUpgradeUrl(locale, bucket);
  const r = renderCopy(c, bucket, dateStr, stats);

  const html = `<!doctype html>
<html dir="${c.dir}" lang="${locale}">
<body style="margin:0;padding:0;background:#0e1430;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0e1430;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:3px solid #1a1a2e;">
        <tr><td dir="${c.dir}" align="${align}" style="padding:28px 28px 8px 28px;font-family:Arial,Helvetica,sans-serif;color:#1a1a2e;text-align:${align};">
          <p style="font-size:18px;font-weight:700;margin:0 0 12px 0;">${c.greeting(escape(full_name))}</p>
          <p style="font-size:15px;line-height:1.6;margin:0 0 16px 0;font-weight:700;">${escape(r.lead)}</p>
          ${r.paragraphs.map((p) => `<p style="font-size:15px;line-height:1.6;margin:0 0 16px 0;">${escape(p)}</p>`).join('\n          ')}
          <p style="font-size:15px;line-height:1.6;margin:0 0 20px 0;">${escape(c.price)}</p>
        </td></tr>
        <tr><td align="center" style="padding:8px 28px 20px 28px;">
          <a href="${upgradeUrl}" style="background:#BFFF00;color:#1a1a2e;font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:16px;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block;border:2px solid #1a1a2e;">${escape(r.cta)}</a>
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

  return { subject: r.subject, html };
}
