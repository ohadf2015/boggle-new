import { firstName } from './teacherEmailLayout';
import type { TeacherLocale } from '@/lib/education/types';
import { polarTrialUpgradeUrl } from '@/lib/education/polarTrialDay10';
import { renderNeoEmail } from '@/lib/email/kit/neoEmail';

interface Args {
  full_name: string;
  locale: TeacherLocale;
  trialExpiresAt: string;
  daysLeft: number;
}

const DATE_LOCALE: Record<TeacherLocale, string> = {
  en: 'en-US', he: 'he-IL', sv: 'sv-SE', ja: 'ja-JP', es: 'es-ES', ru: 'ru-RU',
};

interface Copy {
  kicker: string;
  headline: string;
  greeting: (n: string) => string;
  subject: (days: number) => string;
  preheader: string;
  lead: (days: number, date: string) => string;
  body: string;
  priceTitle: string;
  price: string;
  cta: string;
  ask: string;
  signoff: string;
  dir: 'ltr' | 'rtl';
}

const CONTACT = 'ohadf2015@gmail.com';

const COPY: Partial<Record<TeacherLocale, Copy>> & { en: Copy } = {
  en: {
    kicker: 'Teacher Pro trial',
    headline: 'Your trial is in its last stretch',
    greeting: (n) => `Hi ${n},`,
    subject: (days) => `Your Teacher Pro trial has ${days} days left`,
    preheader: 'What happens when it ends, so nothing surprises you.',
    lead: (days, date) => `Your 14-day Teacher Pro trial ends in ${days} days, on ${date}.`,
    body: "If the classroom is working for you, there's nothing you need to do. When the trial ends, Polar charges $9 a month unless you cancel before then.",
    priceTitle: 'Teacher Pro, $9 a month',
    price: 'Unlimited classrooms, live word games and the progress dashboard. You can cancel any time.',
    cta: 'Keep Teacher Pro',
    ask: `If it's not the right fit, reply and tell me why. I read every one: ${CONTACT}`,
    signoff: 'Ohad, who built LexiClash',
    dir: 'ltr',
  },
  he: {
    kicker: 'ניסיון Teacher Pro',
    headline: 'הניסיון בישורת האחרונה',
    greeting: (n) => `שלום ${n},`,
    subject: (days) => `נשארו ${days} ימים לניסיון של Teacher Pro`,
    preheader: 'מה קורה כשהניסיון נגמר, כדי שלא תהיה הפתעה.',
    lead: (days, date) => `תקופת הניסיון של 14 יום ל-Teacher Pro מסתיימת בעוד ${days} ימים, ב-${date}.`,
    body: 'אם הכיתה עובדת טוב, לא צריך לעשות כלום. כשהניסיון נגמר, Polar מחייבת 9$ לחודש, אלא אם מבטלים לפני כן.',
    priceTitle: 'Teacher Pro ב-9$ לחודש',
    price: 'כיתות ללא הגבלה, משחקי מילים חיים ולוח מעקב התקדמות. אפשר לבטל בכל רגע.',
    cta: 'להמשיך עם Teacher Pro',
    ask: `אם זה לא מתאים, אפשר להשיב ולספר לי למה. אני קורא כל תשובה: ${CONTACT}`,
    signoff: 'אוהד, שבנה את LexiClash',
    dir: 'rtl',
  },
};

export function teacherPolarTrialDay10({ full_name, locale, trialExpiresAt, daysLeft }: Args) {
  const c = COPY[locale] || COPY.en;
  const dateStr = new Date(trialExpiresAt).toLocaleDateString(DATE_LOCALE[locale] || 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const html = renderNeoEmail({
    lang: locale,
    dir: c.dir,
    preheader: c.preheader,
    accent: 'cyan',
    art: 'hourglass',
    kicker: c.kicker,
    headline: c.headline,
    greeting: c.greeting(firstName(full_name) || full_name),
    blocks: [
      { type: 'p', text: c.lead(daysLeft, dateStr), strong: true },
      { type: 'p', text: c.body },
      { type: 'callout', title: c.priceTitle, text: c.price },
      { type: 'p', text: c.ask },
    ],
    cta: { label: c.cta, href: polarTrialUpgradeUrl(locale) },
    signoff: c.signoff,
  });

  return { subject: c.subject(daysLeft), html };
}
