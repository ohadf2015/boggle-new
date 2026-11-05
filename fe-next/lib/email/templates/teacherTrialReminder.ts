import type { TeacherLocale } from '@/lib/education/types';
import type { TrialReminderBucket } from '@/lib/education/trialReminders';
import { firstName, renderTeacherEmail, TEACHER_EMAIL_SITE } from './teacherEmailLayout';

interface Args {
  full_name: string;
  locale: TeacherLocale;
  bucket: TrialReminderBucket;
  /** ISO trial deadline — rendered as a date in the teacher's locale. */
  trialExpiresAt: string;
}

const DATE_LOCALE: Record<TeacherLocale, string> = {
  en: 'en-US', he: 'he-IL', sv: 'sv-SE', ja: 'ja-JP', es: 'es-ES', ru: 'ru-RU',
};

interface BucketCopy {
  subject: (date: string) => string;
  preheader: string;
  lead: (date: string) => string;
  body: string;
  cta: string;
}

interface Copy {
  greeting: (n: string) => string;
  tagline: string;
  buckets: Record<TrialReminderBucket, BucketCopy>;
  /** The feedback ask. Soft on purpose: a "no" with a reason is worth more than a pushed sale. */
  ask: string;
  classroom: string;
  signoff: string;
  dir: 'ltr' | 'rtl';
}

// en, he and sv: every approved teacher so far writes in one of these.
// Other locales fall back to en.
const COPY: Partial<Record<TeacherLocale, Copy>> & { en: Copy } = {
  en: {
    greeting: (n) => (n ? `Hi ${n},` : 'Hi there,'),
    tagline: 'For teachers',
    buckets: {
      't-3': {
        subject: (date) => `Your LexiClash trial ends on ${date}`,
        preheader: 'No pressure. Here is what happens next, and a quick question.',
        lead: (date) => `Your free teacher access ends on ${date}.`,
        body: 'If LexiClash has been useful for your class, you can keep everything with Teacher Pro for $9 a month and cancel any time.',
        cta: 'Keep Teacher Pro',
      },
      't-0': {
        subject: () => 'Your LexiClash trial ends today',
        preheader: 'A short note before your free access ends.',
        lead: () => 'Your free teacher access ends today.',
        body: 'If you would like to keep using LexiClash with your class, Teacher Pro is $9 a month and you can cancel any time.',
        cta: 'Keep Teacher Pro',
      },
      't+3': {
        subject: () => 'Your LexiClash trial has ended',
        preheader: 'Thanks for trying LexiClash. One quick question.',
        lead: (date) => `Thanks for trying LexiClash. Your free teacher access ended on ${date}.`,
        body: 'If you would like to come back to it with your class, Teacher Pro is $9 a month and you can cancel any time.',
        cta: 'See Teacher Pro',
      },
    },
    ask: 'And if it was not the right fit, that is completely fine. I would love to know what was missing or what got in the way. Just reply to this email; it comes straight to me.',
    classroom: 'Open my classroom',
    signoff: 'Thanks, Ohad (I build LexiClash)',
    dir: 'ltr',
  },
  he: {
    greeting: (n) => (n ? `שלום ${n},` : 'שלום,'),
    tagline: 'למורים',
    buckets: {
      't-3': {
        subject: (date) => `תקופת הניסיון שלך ב-LexiClash מסתיימת ב-${date}`,
        preheader: 'בלי לחץ. מה קורה עכשיו, ושאלה קצרה.',
        lead: (date) => `הגישה החינמית שלך למורים מסתיימת ב-${date}.`,
        body: 'אם LexiClash עזר לכיתה שלך, אפשר להמשיך עם Teacher Pro ב-9$ לחודש ולבטל בכל רגע.',
        cta: 'להמשיך עם Teacher Pro',
      },
      't-0': {
        subject: () => 'תקופת הניסיון שלך ב-LexiClash מסתיימת היום',
        preheader: 'הודעה קצרה לפני שהגישה החינמית מסתיימת.',
        lead: () => 'הגישה החינמית שלך למורים מסתיימת היום.',
        body: 'אם רוצים להמשיך להשתמש ב-LexiClash עם הכיתה, Teacher Pro עולה 9$ לחודש ואפשר לבטל בכל רגע.',
        cta: 'להמשיך עם Teacher Pro',
      },
      't+3': {
        subject: () => 'תקופת הניסיון שלך ב-LexiClash הסתיימה',
        preheader: 'תודה שניסית את LexiClash. שאלה קצרה.',
        lead: (date) => `תודה שניסית את LexiClash. הגישה החינמית שלך למורים הסתיימה ב-${date}.`,
        body: 'אם רוצים לחזור ולהשתמש בו עם הכיתה, Teacher Pro עולה 9$ לחודש ואפשר לבטל בכל רגע.',
        cta: 'ל-Teacher Pro',
      },
    },
    ask: 'ואם זה לא התאים, זה בסדר גמור. אשמח מאוד לדעת מה היה חסר או מה הפריע. אפשר פשוט להשיב למייל הזה, הוא מגיע ישירות אליי.',
    classroom: 'לכיתה שלי',
    signoff: 'תודה, אוהד (אני בונה את LexiClash)',
    dir: 'rtl',
  },
  sv: {
    greeting: (n) => (n ? `Hej ${n},` : 'Hej,'),
    tagline: 'För lärare',
    buckets: {
      't-3': {
        subject: (date) => `Din LexiClash-provperiod slutar ${date}`,
        preheader: 'Ingen press. Så här går det till, och en snabb fråga.',
        lead: (date) => `Din kostnadsfria lärartillgång slutar ${date}.`,
        body: 'Om LexiClash har varit till nytta för din klass kan du behålla allt med Teacher Pro för 9 $ i månaden och avsluta när du vill.',
        cta: 'Behåll Teacher Pro',
      },
      't-0': {
        subject: () => 'Din LexiClash-provperiod slutar i dag',
        preheader: 'En kort hälsning innan din kostnadsfria tillgång slutar.',
        lead: () => 'Din kostnadsfria lärartillgång slutar i dag.',
        body: 'Vill du fortsätta använda LexiClash med din klass kostar Teacher Pro 9 $ i månaden, och du kan avsluta när du vill.',
        cta: 'Behåll Teacher Pro',
      },
      't+3': {
        subject: () => 'Din LexiClash-provperiod har slutat',
        preheader: 'Tack för att du provade LexiClash. En snabb fråga.',
        lead: (date) => `Tack för att du provade LexiClash. Din kostnadsfria lärartillgång slutade ${date}.`,
        body: 'Vill du komma tillbaka med din klass kostar Teacher Pro 9 $ i månaden, och du kan avsluta när du vill.',
        cta: 'Se Teacher Pro',
      },
    },
    ask: 'Och om det inte passade är det helt okej. Jag vill gärna veta vad som saknades eller vad som stod i vägen. Svara bara på det här mejlet, det kommer direkt till mig.',
    classroom: 'Öppna mitt klassrum',
    signoff: 'Tack, Ohad (jag bygger LexiClash)',
    dir: 'ltr',
  },
};

export function teacherTrialReminder({ full_name, locale, bucket, trialExpiresAt }: Args) {
  const lang = COPY[locale] ? locale : 'en';
  const c = COPY[lang]!;
  const b = c.buckets[bucket];
  const dateStr = new Date(trialExpiresAt).toLocaleDateString(DATE_LOCALE[lang], {
    month: 'long', day: 'numeric',
  });

  const html = renderTeacherEmail({
    lang,
    dir: c.dir,
    preheader: b.preheader,
    tagline: c.tagline,
    greeting: c.greeting(firstName(full_name)),
    lead: b.lead(dateStr),
    paragraphs: [b.body],
    callout: c.ask,
    cta: { label: b.cta, href: `${TEACHER_EMAIL_SITE}/${lang}/teacher/upgrade` },
    secondary: { label: c.classroom, href: `${TEACHER_EMAIL_SITE}/${lang}/teacher` },
    signoff: c.signoff,
  });

  return { subject: b.subject(dateStr), html };
}
