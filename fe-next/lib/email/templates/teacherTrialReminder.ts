import type { TeacherLocale } from '@/lib/education/types';
import type { TrialReminderBucket } from '@/lib/education/trialReminders';
import { renderNeoEmail, type NeoAccent } from '@/lib/email/kit/neoEmail';
import { firstName, teacherEmailUrl } from './teacherEmailLayout';

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

const ACCENT: Record<TrialReminderBucket, NeoAccent> = { 't-3': 'purple', 't-0': 'orange', 't+3': 'pink' };

interface BucketCopy {
  subject: (date: string) => string;
  preheader: string;
  headline: string;
  lead: (date: string) => string;
  body: string;
  cta: string;
}

interface Copy {
  greeting: (n: string) => string;
  kicker: string;
  buckets: Record<TrialReminderBucket, BucketCopy>;
  askTitle: string;
  /** Soft on purpose: a "no" with a reason is worth more than a pushed sale. */
  ask: string;
  classroom: string;
  signoff: string;
  footnote: string;
  dir: 'ltr' | 'rtl';
}

// en, he and sv: every approved teacher so far writes in one of these. Other locales fall back to en.
const COPY: Partial<Record<TeacherLocale, Copy>> & { en: Copy } = {
  en: {
    greeting: (n) => (n ? `Hi ${n},` : 'Hi there,'),
    kicker: 'For teachers',
    buckets: {
      't-3': {
        subject: (date) => `Your LexiClash trial ends on ${date}`,
        preheader: 'The date your access ends, and one honest question.',
        headline: 'Your free access ends soon',
        lead: (date) => `Your free teacher access ends on ${date}.`,
        body: "If LexiClash has earned a spot in your lessons, Teacher Pro keeps everything going for $9 a month, and you can cancel whenever you like. If it hasn't, that's useful for me to know too.",
        cta: 'Keep Teacher Pro',
      },
      't-0': {
        subject: () => 'Your LexiClash trial ends today',
        preheader: 'A quick note before your free access runs out.',
        headline: 'Your free access ends today',
        lead: () => 'Your free teacher access ends today.',
        body: "If you'd like to keep playing with your class, Teacher Pro is $9 a month and you can cancel any time.",
        cta: 'Keep Teacher Pro',
      },
      't+3': {
        subject: () => 'Your LexiClash trial has ended',
        preheader: 'Thanks for giving it a go. One quick question.',
        headline: 'Thanks for trying LexiClash',
        lead: (date) => `Thanks for trying LexiClash. Your free teacher access ended on ${date}.`,
        body: "If you'd like to bring it back for your class, Teacher Pro is $9 a month and you can cancel any time.",
        cta: 'See Teacher Pro',
      },
    },
    askTitle: 'One question',
    ask: "Not the right fit? Reply and tell me what was missing or what got in the way. I read every reply myself.",
    classroom: 'Open my classroom',
    signoff: 'Thanks, Ohad (I build LexiClash)',
    footnote: 'You get this because you started free teacher access on LexiClash.',
    dir: 'ltr',
  },
  he: {
    greeting: (n) => (n ? `שלום ${n},` : 'שלום,'),
    kicker: 'למורים',
    buckets: {
      't-3': {
        subject: (date) => `תקופת הניסיון ב-LexiClash מסתיימת ב-${date}`,
        preheader: 'מתי הגישה מסתיימת, ושאלה אחת כנה.',
        headline: 'הגישה החינמית מסתיימת בקרוב',
        lead: (date) => `הגישה החינמית שלך למורים מסתיימת ב-${date}.`,
        body: 'אם LexiClash מצא מקום בשיעורים שלך, אפשר להמשיך עם Teacher Pro ב-9$ לחודש ולבטל מתי שרוצים. ואם לא, גם את זה חשוב לי לדעת.',
        cta: 'להמשיך עם Teacher Pro',
      },
      't-0': {
        subject: () => 'תקופת הניסיון ב-LexiClash מסתיימת היום',
        preheader: 'מילה קצרה לפני שהגישה החינמית נגמרת.',
        headline: 'הגישה החינמית נגמרת היום',
        lead: () => 'הגישה החינמית שלך למורים מסתיימת היום.',
        body: 'אם רוצים להמשיך לשחק עם הכיתה, Teacher Pro עולה 9$ לחודש ואפשר לבטל בכל רגע.',
        cta: 'להמשיך עם Teacher Pro',
      },
      't+3': {
        subject: () => 'תקופת הניסיון ב-LexiClash הסתיימה',
        preheader: 'תודה שניסית. שאלה קצרה אחת.',
        headline: 'תודה שניסית את LexiClash',
        lead: (date) => `תודה שניסית את LexiClash. הגישה החינמית שלך למורים הסתיימה ב-${date}.`,
        body: 'אם בא לך להחזיר את המשחק לכיתה, Teacher Pro עולה 9$ לחודש ואפשר לבטל בכל רגע.',
        cta: 'ל-Teacher Pro',
      },
    },
    askTitle: 'שאלה אחת',
    ask: 'אם זה לא התאים, אשמח לדעת מה היה חסר או מה הפריע. אפשר פשוט להשיב למייל הזה, הוא מגיע ישירות אליי ואני קורא כל תשובה.',
    classroom: 'לכיתה שלי',
    signoff: 'תודה, אוהד (אני בונה את LexiClash)',
    footnote: 'המייל הזה נשלח כי התחלת גישת מורים חינמית ב-LexiClash.',
    dir: 'rtl',
  },
  sv: {
    greeting: (n) => (n ? `Hej ${n},` : 'Hej,'),
    kicker: 'För lärare',
    buckets: {
      't-3': {
        subject: (date) => `Din LexiClash-provperiod slutar ${date}`,
        preheader: 'När tillgången slutar, och en ärlig fråga.',
        headline: 'Din tillgång slutar snart',
        lead: (date) => `Din kostnadsfria lärartillgång slutar ${date}.`,
        body: 'Om LexiClash har fått en plats i dina lektioner kan du fortsätta med Teacher Pro för 9 $ i månaden och avsluta när du vill. Om inte vill jag gärna veta det också.',
        cta: 'Behåll Teacher Pro',
      },
      't-0': {
        subject: () => 'Din LexiClash-provperiod slutar i dag',
        preheader: 'En kort hälsning innan din kostnadsfria tillgång tar slut.',
        headline: 'Din tillgång slutar i dag',
        lead: () => 'Din kostnadsfria lärartillgång slutar i dag.',
        body: 'Vill du fortsätta spela med klassen kostar Teacher Pro 9 $ i månaden, och du kan avsluta när du vill.',
        cta: 'Behåll Teacher Pro',
      },
      't+3': {
        subject: () => 'Din LexiClash-provperiod har slutat',
        preheader: 'Tack för att du testade. En snabb fråga.',
        headline: 'Tack för att du testade',
        lead: (date) => `Tack för att du provade LexiClash. Din kostnadsfria lärartillgång slutade ${date}.`,
        body: 'Vill du ta tillbaka det till klassen kostar Teacher Pro 9 $ i månaden, och du kan avsluta när du vill.',
        cta: 'Se Teacher Pro',
      },
    },
    askTitle: 'En fråga',
    ask: 'Om det inte passade vill jag veta vad som saknades eller vad som stod i vägen. Svara bara på det här mejlet, det kommer direkt till mig.',
    classroom: 'Öppna mitt klassrum',
    signoff: 'Tack, Ohad (jag bygger LexiClash)',
    footnote: 'Du får det här för att du startade kostnadsfri lärartillgång på LexiClash.',
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

  const html = renderNeoEmail({
    lang,
    dir: c.dir,
    preheader: b.preheader,
    accent: ACCENT[bucket],
    art: 'hourglass',
    kicker: c.kicker,
    headline: b.headline,
    greeting: c.greeting(firstName(full_name)),
    blocks: [
      { type: 'p', text: b.lead(dateStr), strong: true },
      { type: 'p', text: b.body },
      { type: 'callout', title: c.askTitle, text: c.ask },
    ],
    cta: { label: b.cta, href: teacherEmailUrl(lang, '/teacher/upgrade', `trial_${bucket}`) },
    secondary: { label: c.classroom, href: teacherEmailUrl(lang, '/teacher', `trial_${bucket}`) },
    signoff: c.signoff,
    footnote: c.footnote,
  });

  return { subject: b.subject(dateStr), html };
}
