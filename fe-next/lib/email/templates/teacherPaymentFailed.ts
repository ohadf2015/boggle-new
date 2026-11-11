import { firstName } from './teacherEmailLayout';
import type { TeacherLocale } from '@/lib/education/types';
import { escapeHtml, renderNeoEmail } from '@/lib/email/kit/neoEmail';

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

const DATE_LOCALE: Record<TeacherLocale, string> = {
  en: 'en-US', he: 'he-IL', sv: 'sv-SE', ja: 'ja-JP', es: 'es-ES', ru: 'ru-RU',
};

interface Copy {
  subject: string;
  preheader: string;
  kicker: string;
  headline: string;
  greeting: (n: string) => string;
  lead: (date: string | null) => string;
  safeTitle: string;
  safe: string;
  body: string;
  cta: string;
  ask: string;
  signoff: string;
  dir: 'ltr' | 'rtl';
}

const CONTACT = 'ohadf2015@gmail.com';

// en + he only: a billing email is the wrong place to gamble on an unreviewed translation.
const COPY: Partial<Record<TeacherLocale, Copy>> & { en: Copy } = {
  en: {
    subject: 'Your Teacher Pro payment did not go through',
    preheader: 'Your classroom is fine. The card just needs a quick update.',
    kicker: 'Billing',
    headline: 'Your card needs a quick look',
    greeting: (n) => `Hi ${n},`,
    lead: (date) =>
      date
        ? `Your card declined the $9 Teacher Pro renewal on ${date}. This happens a lot with expired or replaced cards.`
        : 'Your card declined the $9 Teacher Pro renewal. This happens a lot with expired or replaced cards.',
    safeTitle: 'Nothing is lost',
    safe: 'Your classroom is untouched. Students, lessons and reports are all still there.',
    body: 'If the card keeps declining, Teacher Pro lapses and the account goes back to the free tier (3 classes, no reports). Updating the card takes less than a minute.',
    cta: 'Update my card',
    ask: `Already updated the card, or would you rather cancel? Reply and I'll sort it out myself: ${CONTACT}`,
    signoff: 'Ohad, who built LexiClash',
    dir: 'ltr',
  },
  he: {
    subject: 'התשלום על Teacher Pro לא עבר',
    preheader: 'הכיתה בסדר. צריך רק לעדכן את הכרטיס.',
    kicker: 'חיוב',
    headline: 'צריך לעדכן את הכרטיס',
    greeting: (n) => `שלום ${n},`,
    lead: (date) =>
      date
        ? `חידוש המנוי ל-Teacher Pro (9$) ב-${date} נדחה על ידי כרטיס האשראי. זה קורה הרבה כשכרטיס פג תוקף או הוחלף.`
        : 'חידוש המנוי ל-Teacher Pro (9$) נדחה על ידי כרטיס האשראי. זה קורה הרבה כשכרטיס פג תוקף או הוחלף.',
    safeTitle: 'שום דבר לא אבד',
    safe: 'הכיתה שלך לא נפגעה. התלמידים, השיעורים והדוחות עדיין שם.',
    body: 'אם הכרטיס ימשיך לדחות את החיוב, המנוי יפקע והחשבון יחזור לתוכנית החינמית (3 כיתות, בלי דוחות). עדכון הכרטיס לוקח פחות מדקה.',
    cta: 'לעדכן את הכרטיס',
    ask: `הכרטיס כבר עודכן, או שעדיף לבטל? אפשר להשיב למייל ואסדר את זה בעצמי: ${CONTACT}`,
    signoff: 'אוהד, שבנה את LexiClash',
    dir: 'rtl',
  },
};

export function teacherPaymentFailed({ full_name, locale, portalUrl, renewalDate }: Args) {
  const c = COPY[locale] || COPY.en;
  const dateStr = renewalDate
    ? new Date(renewalDate).toLocaleDateString(DATE_LOCALE[locale] || 'en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null;

  const html = renderNeoEmail({
    lang: locale,
    dir: c.dir,
    preheader: c.preheader,
    accent: 'cyan',
    art: 'card-oops',
    kicker: c.kicker,
    headline: c.headline,
    greeting: c.greeting(firstName(full_name) || full_name),
    blocks: [
      { type: 'p', text: c.lead(dateStr), strong: true },
      { type: 'callout', title: c.safeTitle, text: c.safe },
      { type: 'p', text: c.body },
      { type: 'p', text: c.ask },
    ],
    cta: { label: c.cta, href: portalUrl },
    signoff: c.signoff,
  });

  return { subject: c.subject, html };
}
