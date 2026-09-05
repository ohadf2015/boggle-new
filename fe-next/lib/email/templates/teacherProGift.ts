import type { TeacherLocale } from '@/lib/education/types';

/**
 * "You're on Teacher Pro — on me." Sent when an admin grants a teacher a
 * complimentary Pro period by email (see lib/education/proGrantServer.ts).
 *
 * Two shapes:
 *  - `pending: false` — the address already has an account. Pro is live now.
 *  - `pending: true`  — no account yet. Pro is reserved for this address and
 *    switches on the moment they sign up with it.
 *
 * en / he / es, falling back to en (same call as teacherGoodwillExtension).
 * One person writing to one teacher: here is what you have, until when, and
 * one personal line from the admin if they wrote one.
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

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
function escapeMultiline(s: string): string {
  return escape(s).replace(/\r?\n/g, '<br/>');
}

const SITE = 'https://www.lexiclash.live';
const CONTACT = 'ohadf2015@gmail.com';

const DATE_LOCALE: Record<TeacherLocale, string> = {
  en: 'en-US', he: 'he-IL', sv: 'sv-SE', ja: 'ja-JP', es: 'es-ES', ru: 'ru-RU',
};

interface Copy {
  subject: string;
  greeting: (n: string) => string;
  lead: string;
  badge: string;
  until: (date: string) => string;
  unlockedTitle: string;
  unlocked: string[];
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
    subject: 'Your LexiClash Teacher Pro is on ✨',
    greeting: (n) => `Hi ${n},`,
    lead: 'Teacher Pro is switched on for your account. Nothing to claim, no card, no trial that quietly turns into a bill.',
    badge: '✨ Teacher Pro — on us',
    until: (date) => `Yours until ${date}.`,
    unlockedTitle: 'What just unlocked',
    unlocked: [
      'Analytics after every game — which words the class struggled with, and who',
      'Printable class and student reports',
      'Unlimited classes and unlimited students',
    ],
    noCard: 'When it ends, you simply go back to the free plan. We will never charge you without you choosing to.',
    pendingLead: 'There is no LexiClash account with this address yet. Sign up with this exact email and Pro switches on by itself the moment you log in.',
    pendingCta: 'Create your account',
    cta: 'Open my teacher dashboard',
    ask: `Anything broken, confusing or missing — just reply. It comes straight to me and I read every single one (${CONTACT}).`,
    signoff: '— Ohad, the creator of LexiClash',
    dir: 'ltr',
  },
  he: {
    subject: 'Teacher Pro של LexiClash הופעל עבורך ✨',
    greeting: (n) => `היי ${n},`,
    lead: 'Teacher Pro הופעל בחשבון שלך. אין מה לממש, בלי כרטיס אשראי, בלי ניסיון שהופך בשקט לחיוב.',
    badge: '✨ Teacher Pro — עלינו',
    until: (date) => `שלך עד ${date}.`,
    unlockedTitle: 'מה נפתח עכשיו',
    unlocked: [
      'אנליטיקה אחרי כל משחק — אילו מילים היו קשות לכיתה, ולמי',
      'דוחות כיתה ותלמיד להדפסה',
      'כיתות ותלמידים ללא הגבלה',
    ],
    noCard: 'כשזה מסתיים, פשוט חוזרים לתוכנית החינמית. לעולם לא נחייב אותך בלי שתבחר/י בכך.',
    pendingLead: 'עדיין אין חשבון LexiClash עם הכתובת הזו. הירשמ/י עם אותו אימייל בדיוק, ו-Pro יופעל מעצמו ברגע ההתחברות.',
    pendingCta: 'ליצור חשבון',
    cta: 'לפתוח את לוח המורה שלי',
    ask: `משהו שבור, מבלבל או חסר — פשוט השב/י למייל הזה. הוא מגיע ישירות אליי ואני קורא כל אחד (${CONTACT}).`,
    signoff: '— אוהד, היוצר של LexiClash',
    dir: 'rtl',
  },
  es: {
    subject: 'Tu Teacher Pro de LexiClash está activo ✨',
    greeting: (n) => `Hola ${n}:`,
    lead: 'Teacher Pro ya está activado en tu cuenta. Nada que canjear, sin tarjeta, sin prueba que se convierta en una factura.',
    badge: '✨ Teacher Pro — por nuestra cuenta',
    until: (date) => `Es tuyo hasta el ${date}.`,
    unlockedTitle: 'Lo que acabas de desbloquear',
    unlocked: [
      'Analíticas después de cada partida: qué palabras costaron a la clase, y a quién',
      'Informes imprimibles de clase y de alumno',
      'Clases y alumnos ilimitados',
    ],
    noCard: 'Cuando termine, vuelves al plan gratuito sin más. Nunca te cobraremos sin que tú lo elijas.',
    pendingLead: 'Todavía no hay una cuenta de LexiClash con esta dirección. Regístrate con este mismo correo y Pro se activará solo al iniciar sesión.',
    pendingCta: 'Crear mi cuenta',
    cta: 'Abrir mi panel de profesor',
    ask: `Si algo falla, confunde o falta, responde a este correo. Me llega directamente y leo todos (${CONTACT}).`,
    signoff: '— Ohad, creador de LexiClash',
    dir: 'ltr',
  },
};

export function teacherProGift({ full_name, locale, note, expiresAt, pending }: Args) {
  const c = COPY[locale] || COPY.en;
  const align = c.dir === 'rtl' ? 'right' : 'left';
  const dateStr = new Date(expiresAt).toLocaleDateString(DATE_LOCALE[locale] || 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const ctaHref = pending ? `${SITE}/${locale}/education/access` : `${SITE}/${locale}/teacher`;
  const ctaLabel = pending ? c.pendingCta : c.cta;
  const trimmedNote = (note || '').trim();

  const html = `<!doctype html>
<html dir="${c.dir}" lang="${locale}">
<body style="margin:0;padding:0;background:#0e1430;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0e1430;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:3px solid #1a1a2e;">
        <tr><td dir="${c.dir}" align="${align}" style="padding:28px 28px 8px 28px;font-family:Arial,Helvetica,sans-serif;color:#1a1a2e;text-align:${align};">
          <p style="font-size:18px;font-weight:700;margin:0 0 12px 0;">${c.greeting(escape(full_name))}</p>
          <p style="font-size:15px;line-height:1.6;margin:0 0 16px 0;">${escape(pending ? c.pendingLead : c.lead)}</p>
          ${trimmedNote ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px 0;"><tr><td dir="${c.dir}" style="border-${c.dir === 'rtl' ? 'right' : 'left'}:4px solid #00e5ff;padding:10px 14px;background:#f4f6ff;font-size:15px;line-height:1.6;font-style:italic;">${escapeMultiline(trimmedNote)}</td></tr></table>` : ''}
        </td></tr>
        <!-- The gift, boxed in the brand lime so it reads as a present rather
             than a policy note. Table-based and inline-styled: Outlook drops
             divs with backgrounds, and this is the one block that must land. -->
        <tr><td align="center" style="padding:0 28px 4px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#BFFF00;border:3px solid #1a1a2e;border-radius:10px;">
            <tr><td dir="${c.dir}" align="center" style="padding:18px 20px;font-family:Arial,Helvetica,sans-serif;color:#1a1a2e;">
              <p style="margin:0 0 6px 0;font-size:20px;font-weight:800;">${escape(c.badge)}</p>
              <p style="margin:0;font-size:15px;line-height:1.6;font-weight:700;">${escape(c.until(dateStr))}</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td dir="${c.dir}" align="${align}" style="padding:20px 28px 0 28px;font-family:Arial,Helvetica,sans-serif;color:#1a1a2e;text-align:${align};">
          <p style="font-size:13px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;margin:0 0 8px 0;color:#4b5563;">${escape(c.unlockedTitle)}</p>
          <ul style="margin:0;padding-${c.dir === 'rtl' ? 'right' : 'left'}:20px;font-size:15px;line-height:1.7;">
            ${c.unlocked.map((u) => `<li>${escape(u)}</li>`).join('')}
          </ul>
          <p style="font-size:14px;line-height:1.6;margin:14px 0 0 0;color:#4b5563;">${escape(c.noCard)}</p>
        </td></tr>
        <tr><td align="center" style="padding:20px 28px;">
          <a href="${ctaHref}" style="background:#1a1a2e;color:#BFFF00;font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:16px;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block;border:2px solid #1a1a2e;">${escape(ctaLabel)}</a>
        </td></tr>
        <tr><td dir="${c.dir}" align="${align}" style="padding:0 28px 28px 28px;font-family:Arial,Helvetica,sans-serif;color:#4b5563;font-size:14px;text-align:${align};line-height:1.6;">
          <p style="margin:0 0 12px 0;">${escape(c.ask)}</p>
          <p style="margin:0;color:#6b7280;">${escape(c.signoff)}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject: c.subject, html };
}
