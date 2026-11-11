import type { TeacherLocale } from '@/lib/education/types';
import { renderNeoEmail } from '@/lib/email/kit/neoEmail';
import { firstName, teacherEmailUrl } from './teacherEmailLayout';

/**
 * Sent when an admin grants a teacher a complimentary Pro period by email
 * (see lib/education/proGrantServer.ts). `pending: true` means no account has
 * this address yet: Pro is reserved and switches on when they sign up with it.
 * en / he / es, falling back to en.
 */

interface Args {
  full_name: string;
  locale: TeacherLocale;
  /** Personal line from the admin. Escaped; newlines kept. */
  note?: string | null;
  /** ISO deadline the email promises. */
  expiresAt: string;
  /** No account with this email yet — tell them to sign up with it. */
  pending: boolean;
}

const SITE = 'https://www.lexiclash.live';
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
  noteTitle: string;
  until: (date: string) => string;
  includedTitle: string;
  included: string[];
  noCard: string;
  pendingLead: string;
  pendingCta: string;
  cta: string;
  ask: string;
  signoff: string;
  dir: 'ltr' | 'rtl';
}

const COPY: Partial<Record<TeacherLocale, Copy>> & { en: Copy } = {
  en: {
    subject: 'Your LexiClash Teacher Pro is on, my treat',
    preheader: 'No card, no trial, nothing to claim.',
    kicker: 'A gift for your class',
    headline: 'Teacher Pro, on me',
    greeting: (n) => `Hi ${n},`,
    lead: "Teacher Pro is switched on for your account. There's nothing to claim, no card, and no trial that quietly turns into a bill.",
    noteTitle: 'A note for you',
    until: (date) => `Yours until ${date}.`,
    includedTitle: "What's included",
    included: [
      'Analytics after every game: which words the class struggled with, and who struggled',
      'Printable class and student reports',
      'Unlimited classes',
    ],
    noCard: "When it ends, you simply go back to the free plan. You'll never be charged unless you choose to be.",
    pendingLead: "There's no LexiClash account with this address yet. Sign up with this exact email and Pro switches on by itself the moment you log in.",
    pendingCta: 'Create your account',
    cta: 'Open my teacher dashboard',
    ask: `If anything is broken, confusing or missing, just reply. It comes straight to me and I read every single one (${CONTACT}).`,
    signoff: 'Ohad, who built LexiClash',
    dir: 'ltr',
  },
  he: {
    subject: 'Teacher Pro של LexiClash הופעל עבורך, עליי',
    preheader: 'בלי כרטיס, בלי ניסיון, אין מה לממש.',
    kicker: 'מתנה לכיתה',
    headline: 'Teacher Pro, עליי',
    greeting: (n) => `היי ${n},`,
    lead: 'Teacher Pro הופעל בחשבון שלך. אין מה לממש, אין צורך בכרטיס אשראי, ואין ניסיון שהופך בשקט לחיוב.',
    noteTitle: 'כמה מילים בשבילך',
    until: (date) => `בתוקף עד ${date}.`,
    includedTitle: 'מה כלול',
    included: [
      'אנליטיקה אחרי כל משחק: אילו מילים היו קשות לכיתה, ולמי',
      'דוחות כיתה ותלמיד להדפסה',
      'כיתות ותלמידים ללא הגבלה',
    ],
    noCard: 'כשזה מסתיים, פשוט חוזרים לתוכנית החינמית. לא יהיה שום חיוב בלי שבוחרים בזה.',
    pendingLead: 'עדיין אין חשבון LexiClash עם הכתובת הזו. נרשמים עם אותו אימייל בדיוק, ו-Pro מופעל מעצמו ברגע ההתחברות.',
    pendingCta: 'ליצור חשבון',
    cta: 'לפתוח את לוח המורה שלי',
    ask: `אם משהו שבור, מבלבל או חסר, אפשר פשוט להשיב למייל הזה. הוא מגיע ישירות אליי ואני קורא כל תשובה (${CONTACT}).`,
    signoff: 'אוהד, שבנה את LexiClash',
    dir: 'rtl',
  },
  es: {
    subject: 'Tu Teacher Pro de LexiClash ya está activo',
    preheader: 'Sin tarjeta, sin prueba y nada que canjear.',
    kicker: 'Un regalo para tu clase',
    headline: 'Teacher Pro, invito yo',
    greeting: (n) => `Hola ${n}:`,
    lead: 'Teacher Pro ya está activado en tu cuenta. No hay nada que canjear, no hace falta tarjeta y no hay ninguna prueba que acabe en factura.',
    noteTitle: 'Unas palabras para ti',
    until: (date) => `Es tuyo hasta el ${date}.`,
    includedTitle: 'Qué incluye',
    included: [
      'Analíticas después de cada partida: qué palabras le costaron a la clase, y a quién',
      'Informes imprimibles de clase y de alumno',
      'Clases y alumnos ilimitados',
    ],
    noCard: 'Cuando termine, vuelves al plan gratuito sin más. Nunca se te cobrará nada a menos que tú lo elijas.',
    pendingLead: 'Todavía no hay una cuenta de LexiClash con esta dirección. Regístrate con este mismo correo y Pro se activará solo al iniciar sesión.',
    pendingCta: 'Crear mi cuenta',
    cta: 'Abrir mi panel de profesor',
    ask: `Si algo falla, confunde o falta, responde a este correo. Me llega directamente y leo todos (${CONTACT}).`,
    signoff: 'Ohad, creador de LexiClash',
    dir: 'ltr',
  },
};

export function teacherProGift({ full_name, locale, note, expiresAt, pending }: Args) {
  const c = COPY[locale] || COPY.en;
  const dateStr = new Date(expiresAt).toLocaleDateString(DATE_LOCALE[locale] || 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const ctaHref = pending ? `${SITE}/${locale}/education/access` : teacherEmailUrl(locale, '/teacher', 'pro_gift');
  const trimmedNote = (note || '').trim();

  const html = renderNeoEmail({
    lang: locale,
    dir: c.dir,
    preheader: c.preheader,
    accent: 'purple',
    art: 'gift',
    kicker: c.kicker,
    headline: c.headline,
    greeting: c.greeting(firstName(full_name) || full_name),
    blocks: [
      { type: 'p', text: pending ? c.pendingLead : c.lead, strong: true },
      ...(trimmedNote ? [{ type: 'callout' as const, title: c.noteTitle, text: trimmedNote }] : []),
      { type: 'p', text: c.until(dateStr), strong: true },
      { type: 'p', text: c.includedTitle },
      { type: 'steps', items: c.included },
      { type: 'p', text: c.noCard },
      { type: 'p', text: c.ask },
    ],
    cta: { label: pending ? c.pendingCta : c.cta, href: ctaHref },
    signoff: c.signoff,
  });

  return { subject: c.subject, html };
}
