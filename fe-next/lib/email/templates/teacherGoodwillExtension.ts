import type { TeacherLocale } from '@/lib/education/types';
import { renderNeoEmail } from '@/lib/email/kit/neoEmail';
import { firstName, teacherEmailUrl } from './teacherEmailLayout';

/**
 * The apology-and-extension email: the dashboard button reloaded the page
 * instead of opening the dashboard, so every approved teacher got 14 more days.
 * en / he / es only, falling back to en: those are the only locales among the approved teachers.
 */

interface Args {
  full_name: string;
  locale: TeacherLocale;
  /** ISO deadline AFTER the extension — the date the email promises. */
  newExpiresAt: string;
}

const CONTACT = 'ohadf2015@gmail.com';

const DATE_LOCALE: Record<TeacherLocale, string> = {
  en: 'en-US', he: 'he-IL', sv: 'sv-SE', ja: 'ja-JP', es: 'es-ES', ru: 'ru-RU',
};

interface Copy {
  subject: string;
  preheader: string;
  kicker: string;
  headline: string;
  greeting: (n: string) => string;
  lead: string;
  what: string;
  /** The reward, stated as a done deal: nothing for them to claim or click. */
  badge: string;
  gift: (date: string) => string;
  cta: string;
  ask: string;
  signoff: string;
  dir: 'ltr' | 'rtl';
}

const COPY: Partial<Record<TeacherLocale, Copy>> & { en: Copy } = {
  en: {
    subject: 'Sorry about that. 14 more days on me',
    preheader: 'The dashboard button is fixed, and your trial is longer.',
    kicker: 'From Ohad',
    headline: 'Sorry, and 14 days on me',
    greeting: (n) => `Hi ${n},`,
    lead: 'You clicked "Open Teacher Dashboard" and the page just reloaded instead of opening. That was my bug, not anything you did, and I\'m sorry it cost you time.',
    what: "It's fixed now. The dashboard opens the moment you click it.",
    badge: '14 free days, already added',
    gift: (date) => `You lost trial days to a broken button, so I put 14 more on your account. Nothing to claim, they're already there: your trial now runs to ${date}.`,
    cta: 'Open my classroom',
    ask: `And if you have two minutes: what would make LexiClash genuinely useful in your classroom? Just hit reply. It comes straight to me and I read every single one (${CONTACT}).`,
    signoff: 'Ohad, who built LexiClash',
    dir: 'ltr',
  },
  he: {
    subject: 'סליחה על התקלה. 14 ימים נוספים עליי',
    preheader: 'הכפתור של לוח המורה תוקן, ותקופת הניסיון התארכה.',
    kicker: 'מאוהד',
    headline: 'סליחה, ו-14 ימים עליי',
    greeting: (n) => `היי ${n},`,
    lead: 'לחצת על "פתח את לוח המורה" והדף פשוט נטען מחדש במקום להיפתח. זה היה באג שלי, לא משהו שעשית, ואני מצטער שזה בזבז לך זמן.',
    what: 'זה תוקן. הלוח נפתח עכשיו ברגע שלוחצים.',
    badge: '14 ימים חינם, כבר נוספו',
    gift: (date) => `ימי ניסיון הלכו לאיבוד בגלל כפתור שבור, אז הוספתי לחשבון 14 ימים. אין מה לממש, הם כבר שם: תקופת הניסיון נמשכת עכשיו עד ${date}.`,
    cta: 'לפתוח את הכיתה שלי',
    ask: `ואם יש לך שתי דקות: מה יהפוך את LexiClash לבאמת שימושי בכיתה שלך? אפשר פשוט להשיב למייל הזה. הוא מגיע ישירות אליי ואני קורא כל תשובה (${CONTACT}).`,
    signoff: 'אוהד, שבנה את LexiClash',
    dir: 'rtl',
  },
  es: {
    subject: 'Perdona el fallo: 14 días más por mi cuenta',
    preheader: 'El botón del panel ya funciona y tu prueba es más larga.',
    kicker: 'De parte de Ohad',
    headline: 'Perdón, y 14 días de regalo',
    greeting: (n) => `Hola ${n}:`,
    lead: 'Pulsaste «Abrir panel del profesor» y la página se recargó en lugar de abrirse. El fallo fue mío, no tuyo, y siento que te hiciera perder el tiempo.',
    what: 'Ya está arreglado. El panel se abre en cuanto lo pulsas.',
    badge: '14 días gratis, ya añadidos',
    gift: (date) => `Perdiste días de prueba por un botón roto, así que te he puesto 14 más. No hay que canjear nada, ya están ahí: tu prueba dura hasta el ${date}.`,
    cta: 'Abrir mi clase',
    ask: `Y si tienes dos minutos: ¿qué haría que LexiClash te resultara útil de verdad en clase? Responde a este correo. Me llega directamente y leo todos (${CONTACT}).`,
    signoff: 'Ohad, creador de LexiClash',
    dir: 'ltr',
  },
};

export function teacherGoodwillExtension({ full_name, locale, newExpiresAt }: Args) {
  const c = COPY[locale] || COPY.en;
  const dateStr = new Date(newExpiresAt).toLocaleDateString(DATE_LOCALE[locale] || 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const html = renderNeoEmail({
    lang: locale,
    dir: c.dir,
    preheader: c.preheader,
    accent: 'lime',
    art: 'gift',
    kicker: c.kicker,
    headline: c.headline,
    greeting: c.greeting(firstName(full_name) || full_name),
    blocks: [
      { type: 'p', text: c.lead, strong: true },
      { type: 'p', text: c.what },
      { type: 'callout', title: c.badge, text: c.gift(dateStr) },
      { type: 'p', text: c.ask },
    ],
    cta: { label: c.cta, href: teacherEmailUrl(locale, '/teacher', 'goodwill_extension') },
    signoff: c.signoff,
  });

  return { subject: c.subject, html };
}
