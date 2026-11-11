import type { TeacherLocale } from '@/lib/education/types';
import {
  polarTrialExpiryUpgradeUrl,
  type PolarTrialExpiryBucket,
} from '@/lib/education/polarTrialExpiryJourney';
import { renderNeoEmail, type NeoAccent, type NeoArt } from '@/lib/email/kit/neoEmail';

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

const DATE_LOCALE: Record<TeacherLocale, string> = {
  en: 'en-US', he: 'he-IL', sv: 'sv-SE', ja: 'ja-JP', es: 'es-ES', ru: 'ru-RU',
};

const LOOK: Record<PolarTrialExpiryBucket, { accent: NeoAccent; art: NeoArt }> = {
  't-0': { accent: 'orange', art: 'hourglass' },
  't+3': { accent: 'purple', art: 'report' },
  't+14': { accent: 'pink', art: 'miss-you' },
  't+30': { accent: 'cyan', art: 'miss-you' },
};

interface BucketCopy {
  subject: (date: string) => string;
  preheader: string;
  headline: string;
  lead: (date: string) => string;
  cta: string;
}

interface WinbackCopy {
  subjectWithClasses: Record<WinbackBucket, string>;
  subjectGeneric: Record<WinbackBucket, string>;
  preheader: string;
  headlineWithClasses: string;
  headlineGeneric: string;
  classes: (n: number) => string;
  games: (n: number) => string;
  ended: (date: string) => string;
  body: string;
  cta: string;
}

interface Copy {
  kicker: string;
  greeting: (n: string) => string;
  buckets: Record<'t-0' | 't+3', BucketCopy>;
  winback: WinbackCopy;
  body: string;
  priceTitle: string;
  price: string;
  ask: string;
  signoff: string;
  dir: 'ltr' | 'rtl';
}

const CONTACT = 'ohadf2015@gmail.com';

const COPY: Partial<Record<TeacherLocale, Copy>> & { en: Copy } = {
  en: {
    kicker: 'Teacher Pro',
    greeting: (n) => `Hi ${n},`,
    buckets: {
      't-0': {
        subject: () => 'Your Teacher Pro trial ends today',
        preheader: 'Last day of the trial. Here is what happens next.',
        headline: 'Last day of your trial',
        lead: (date) => `Your 14-day Teacher Pro trial ends today, ${date}.`,
        cta: 'Keep Teacher Pro',
      },
      't+3': {
        subject: () => 'Want your Teacher Pro reports back?',
        preheader: 'Your trial ended a few days ago. Here is how to pick it back up.',
        headline: 'Your reports are paused',
        lead: (date) => `Your Teacher Pro trial ended on ${date}.`,
        cta: 'Reactivate Teacher Pro',
      },
    },
    winback: {
      subjectWithClasses: { 't+14': 'Your classes are still here', 't+30': 'Your classes are still waiting' },
      subjectGeneric: {
        't+14': 'Your Teacher Pro trial ended two weeks ago',
        't+30': 'A month since your Teacher Pro trial',
      },
      preheader: 'Nothing was deleted. Pick it up whenever suits you.',
      headlineWithClasses: 'Your classes are still here',
      headlineGeneric: 'Whenever you are ready',
      classes: (n) =>
        n === 1
          ? 'Your class is still on LexiClash, with every student and word list where you left it.'
          : `Your ${n} classes are still on LexiClash, with every student and word list where you left them.`,
      games: (n) =>
        n === 1
          ? 'Your students played 1 live game in the last 30 days.'
          : `Your students played ${n} live games in the last 30 days.`,
      ended: (date) => `Your Teacher Pro trial ended on ${date}.`,
      body: 'Nothing was deleted, so you can pick up where you left off whenever you are ready.',
      cta: 'Reactivate Teacher Pro',
    },
    body: 'The weekly numbers on your dashboard come from the classroom you already ran. With Teacher Pro the reports and unlimited classes keep going.',
    priceTitle: 'Teacher Pro, $9 a month',
    price: 'Unlimited classrooms, live word games and the progress dashboard. You can cancel any time.',
    ask: `If it's not the right fit, reply and tell me why. I read every one: ${CONTACT}`,
    signoff: 'Ohad, who built LexiClash',
    dir: 'ltr',
  },
  he: {
    kicker: 'Teacher Pro',
    greeting: (n) => `שלום ${n},`,
    buckets: {
      't-0': {
        subject: () => 'תקופת הניסיון של Teacher Pro מסתיימת היום',
        preheader: 'היום האחרון של הניסיון. ככה זה ממשיך.',
        headline: 'היום האחרון של הניסיון',
        lead: (date) => `תקופת הניסיון של 14 יום ל-Teacher Pro מסתיימת היום, ${date}.`,
        cta: 'להמשיך עם Teacher Pro',
      },
      't+3': {
        subject: () => 'רוצה את הדוחות של Teacher Pro בחזרה?',
        preheader: 'הניסיון נגמר לפני כמה ימים. ככה חוזרים אליו.',
        headline: 'הדוחות שלך בהשהיה',
        lead: (date) => `תקופת הניסיון של Teacher Pro הסתיימה ב-${date}.`,
        cta: 'להפעיל מחדש את Teacher Pro',
      },
    },
    winback: {
      subjectWithClasses: { 't+14': 'הכיתות שלך עדיין כאן', 't+30': 'הכיתות שלך עדיין מחכות' },
      subjectGeneric: {
        't+14': 'תקופת הניסיון של Teacher Pro הסתיימה לפני שבועיים',
        't+30': 'עבר חודש מאז תקופת הניסיון של Teacher Pro',
      },
      preheader: 'שום דבר לא נמחק. אפשר לחזור מתי שנוח.',
      headlineWithClasses: 'הכיתות שלך עדיין כאן',
      headlineGeneric: 'מתי שנוח לך',
      classes: (n) =>
        n === 1
          ? 'הכיתה שלך עדיין ב-LexiClash, עם כל התלמידים ורשימות המילים בדיוק איפה שהשארת אותם.'
          : `${n} הכיתות שלך עדיין ב-LexiClash, עם כל התלמידים ורשימות המילים בדיוק איפה שהשארת אותם.`,
      games: (n) =>
        n === 1
          ? 'התלמידים שלך שיחקו משחק חי אחד ב-30 הימים האחרונים.'
          : `התלמידים שלך שיחקו ${n} משחקים חיים ב-30 הימים האחרונים.`,
      ended: (date) => `תקופת הניסיון של Teacher Pro הסתיימה ב-${date}.`,
      body: 'שום דבר לא נמחק, אז אפשר להמשיך מאיפה שעצרת מתי שנוח לך.',
      cta: 'להפעיל מחדש את Teacher Pro',
    },
    body: 'המספרים השבועיים בלוח מגיעים מהכיתה שכבר הרצת. עם Teacher Pro הדוחות והכיתות ללא הגבלה ממשיכים לעבוד.',
    priceTitle: 'Teacher Pro ב-9$ לחודש',
    price: 'כיתות ללא הגבלה, משחקי מילים חיים ולוח מעקב התקדמות. אפשר לבטל בכל רגע.',
    ask: `אם זה לא מתאים, אפשר להשיב ולספר לי למה. אני קורא כל תשובה: ${CONTACT}`,
    signoff: 'אוהד, שבנה את LexiClash',
    dir: 'rtl',
  },
};

interface Rendered {
  subject: string;
  preheader: string;
  headline: string;
  lead: string;
  paragraphs: string[];
  cta: string;
}

function renderCopy(c: Copy, bucket: PolarTrialExpiryBucket, dateStr: string, stats: WinbackStats | null): Rendered {
  if (bucket === 't-0' || bucket === 't+3') {
    const b = c.buckets[bucket];
    return { subject: b.subject(dateStr), preheader: b.preheader, headline: b.headline, lead: b.lead(dateStr), paragraphs: [c.body], cta: b.cta };
  }
  const w = c.winback;
  const hasClasses = (stats?.classrooms ?? 0) > 0;
  if (!hasClasses) {
    return { subject: w.subjectGeneric[bucket], preheader: w.preheader, headline: w.headlineGeneric, lead: w.ended(dateStr), paragraphs: [w.body], cta: w.cta };
  }
  const paragraphs = stats!.gamesLast30d > 0 ? [w.games(stats!.gamesLast30d), w.body] : [w.body];
  return {
    subject: w.subjectWithClasses[bucket],
    preheader: w.preheader,
    headline: w.headlineWithClasses,
    lead: w.classes(stats!.classrooms),
    paragraphs,
    cta: w.cta,
  };
}

export function teacherPolarTrialExpiry({ full_name, locale, bucket, trialExpiresAt, stats = null }: Args) {
  const c = COPY[locale] || COPY.en;
  const dateStr = new Date(trialExpiresAt).toLocaleDateString(DATE_LOCALE[locale] || 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const r = renderCopy(c, bucket, dateStr, stats);

  const html = renderNeoEmail({
    lang: locale,
    dir: c.dir,
    preheader: r.preheader,
    ...LOOK[bucket],
    kicker: c.kicker,
    headline: r.headline,
    greeting: c.greeting(full_name),
    blocks: [
      { type: 'p', text: r.lead, strong: true },
      ...r.paragraphs.map((text) => ({ type: 'p' as const, text })),
      { type: 'callout', title: c.priceTitle, text: c.price },
      { type: 'p', text: c.ask },
    ],
    cta: { label: r.cta, href: polarTrialExpiryUpgradeUrl(locale, bucket) },
    signoff: c.signoff,
  });

  return { subject: r.subject, html };
}
