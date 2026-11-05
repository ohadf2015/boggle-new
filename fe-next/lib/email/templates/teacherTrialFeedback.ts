import type { TeacherLocale } from '@/lib/education/types';
import { firstName, renderTeacherEmail, TEACHER_EMAIL_SITE } from './teacherEmailLayout';

// One soft check-in a few days into the free teacher access. It asks how it is
// going and nothing else: no price, no upgrade button. The trial-ending emails
// (teacherTrialReminder) carry the Teacher Pro offer later.

interface Args {
  full_name: string;
  locale: TeacherLocale;
  /** ISO end of the free access, rendered as a date in the teacher's locale. */
  trialExpiresAt: string;
}

const DATE_LOCALE: Record<TeacherLocale, string> = {
  en: 'en-US', he: 'he-IL', sv: 'sv-SE', ja: 'ja-JP', es: 'es-ES', ru: 'ru-RU',
};

interface Copy {
  subject: string;
  preheader: string;
  tagline: string;
  greeting: (n: string) => string;
  lead: string;
  ask: string;
  access: (date: string) => string;
  cta: string;
  signoff: string;
  dir: 'ltr' | 'rtl';
}

const COPY: Partial<Record<TeacherLocale, Copy>> & { en: Copy } = {
  en: {
    subject: 'How is LexiClash going with your class?',
    preheader: 'A quick check-in, and an honest question.',
    tagline: 'For teachers',
    greeting: (n) => (n ? `Hi ${n},` : 'Hi there,'),
    lead: 'You have had LexiClash for a few days now, and I wanted to check in.',
    ask: 'How is it going? If something did not work, felt confusing, or just is not what your class needs, I would really like to hear it. Just reply to this email; it comes straight to me.',
    access: (date) => `Your free access runs until ${date}, and no card is needed for it.`,
    cta: 'Open my classroom',
    signoff: 'Thanks, Ohad (I build LexiClash)',
    dir: 'ltr',
  },
  he: {
    subject: 'איך הולך עם LexiClash בכיתה?',
    preheader: 'בדיקה קצרה, ושאלה כנה.',
    tagline: 'למורים',
    greeting: (n) => (n ? `שלום ${n},` : 'שלום,'),
    lead: 'עברו כמה ימים מאז שהתחלת להשתמש ב-LexiClash, ורציתי לשאול איך הולך.',
    ask: 'אם משהו לא עבד, היה מבלבל או פשוט לא מתאים לכיתה שלך, אשמח מאוד לשמוע. אפשר פשוט להשיב למייל הזה, הוא מגיע ישירות אליי.',
    access: (date) => `הגישה החינמית שלך פעילה עד ${date}, ולא צריך כרטיס אשראי.`,
    cta: 'לכיתה שלי',
    signoff: 'תודה, אוהד (אני בונה את LexiClash)',
    dir: 'rtl',
  },
  sv: {
    subject: 'Hur går det med LexiClash i klassen?',
    preheader: 'En kort avstämning, och en ärlig fråga.',
    tagline: 'För lärare',
    greeting: (n) => (n ? `Hej ${n},` : 'Hej,'),
    lead: 'Du har haft LexiClash i några dagar nu, och jag ville höra hur det går.',
    ask: 'Om något inte fungerade, kändes krångligt eller inte passar din klass vill jag gärna veta det. Svara bara på det här mejlet, det kommer direkt till mig.',
    access: (date) => `Din kostnadsfria tillgång gäller till ${date}, och inget kort behövs.`,
    cta: 'Öppna mitt klassrum',
    signoff: 'Tack, Ohad (jag bygger LexiClash)',
    dir: 'ltr',
  },
};

export function teacherTrialFeedback({ full_name, locale, trialExpiresAt }: Args) {
  const lang = COPY[locale] ? locale : 'en';
  const c = COPY[lang]!;
  const dateStr = new Date(trialExpiresAt).toLocaleDateString(DATE_LOCALE[lang], {
    month: 'long', day: 'numeric',
  });

  const html = renderTeacherEmail({
    lang,
    dir: c.dir,
    preheader: c.preheader,
    tagline: c.tagline,
    greeting: c.greeting(firstName(full_name)),
    lead: c.lead,
    paragraphs: [c.access(dateStr)],
    callout: c.ask,
    cta: { label: c.cta, href: `${TEACHER_EMAIL_SITE}/${lang}/teacher` },
    signoff: c.signoff,
  });

  return { subject: c.subject, html };
}
