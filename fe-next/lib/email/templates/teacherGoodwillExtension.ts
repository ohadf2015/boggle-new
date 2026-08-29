import type { TeacherLocale } from '@/lib/education/types';

/**
 * The apology-and-extension email: the dashboard button reloaded the page
 * instead of opening the dashboard, so we give every approved teacher 14 more
 * days of trial and say what happened in one sentence.
 *
 * en / he / es only, falling back to en — those are the only locales among the
 * approved teachers (27 / 2 / 5). Same call as teacherTrialReminder: extra
 * translations for an audience that does not exist are work, not kindness.
 */

interface Args {
  full_name: string;
  locale: TeacherLocale;
  /** ISO deadline AFTER the extension — the date the email promises. */
  newExpiresAt: string;
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
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
  what: string;
  gift: (date: string) => string;
  cta: string;
  ask: string;
  signoff: string;
  dir: 'ltr' | 'rtl';
}

const COPY: Partial<Record<TeacherLocale, Copy>> & { en: Copy } = {
  en: {
    subject: '14 more days on me — the teacher dashboard was broken',
    greeting: (n) => `Hi ${n},`,
    lead: 'If you clicked "Open Teacher Dashboard" and the page just reloaded on you — that was a bug, not you.',
    what: 'The button did a full page reload instead of opening your dashboard, so you landed back where you started. It is fixed now, and the dashboard opens straight away.',
    gift: (date) => `You lost trial days to it, so I have added 14 more. Your trial now runs to ${date}.`,
    cta: 'Open my teacher dashboard',
    ask: `If anything else in the classroom tools misbehaves, reply to this email — it comes to me directly: ${CONTACT}`,
    signoff: '— Ohad, the creator of LexiClash',
    dir: 'ltr',
  },
  he: {
    subject: '14 ימי ניסיון נוספים עלינו — לוח המורה היה שבור',
    greeting: (n) => `שלום ${n},`,
    lead: 'אם לחצת על "פתח את לוח המורה" והדף פשוט נטען מחדש — זה היה באג, לא אתה.',
    what: 'הכפתור ביצע טעינה מחדש של הדף במקום לפתוח את לוח המורה, וכך חזרת לאותו מקום. זה תוקן, והלוח נפתח עכשיו מיד.',
    gift: (date) => `הפסדת בגלל זה ימי ניסיון, אז הוספתי 14 ימים. תקופת הניסיון שלך נמשכת עד ${date}.`,
    cta: 'לפתוח את לוח המורה',
    ask: `אם משהו נוסף בכלים לכיתה לא מתנהג כמו שצריך — פשוט השב/י למייל הזה, הוא מגיע ישירות אליי: ${CONTACT}`,
    signoff: '— אוהד, היוצר של LexiClash',
    dir: 'rtl',
  },
  es: {
    subject: '14 días más por mi cuenta: el panel del profesor estaba roto',
    greeting: (n) => `Hola ${n}:`,
    lead: 'Si pulsaste «Abrir panel del profesor» y la página simplemente se recargó, era un fallo nuestro, no tuyo.',
    what: 'El botón recargaba la página entera en vez de abrir tu panel, así que volvías al mismo sitio. Ya está arreglado: el panel se abre al instante.',
    gift: (date) => `Perdiste días de prueba por eso, así que te he añadido 14 más. Tu prueba llega ahora hasta el ${date}.`,
    cta: 'Abrir mi panel del profesor',
    ask: `Si algo más en las herramientas de clase falla, responde a este correo: me llega directamente a mí (${CONTACT}).`,
    signoff: '— Ohad, creador de LexiClash',
    dir: 'ltr',
  },
};

export function teacherGoodwillExtension({ full_name, locale, newExpiresAt }: Args) {
  const c = COPY[locale] || COPY.en;
  const align = c.dir === 'rtl' ? 'right' : 'left';
  const dateStr = new Date(newExpiresAt).toLocaleDateString(DATE_LOCALE[locale] || 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const html = `<!doctype html>
<html dir="${c.dir}" lang="${locale}">
<body style="margin:0;padding:0;background:#0e1430;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0e1430;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:3px solid #1a1a2e;">
        <tr><td dir="${c.dir}" align="${align}" style="padding:28px 28px 8px 28px;font-family:Arial,Helvetica,sans-serif;color:#1a1a2e;text-align:${align};">
          <p style="font-size:18px;font-weight:700;margin:0 0 12px 0;">${c.greeting(escape(full_name))}</p>
          <p style="font-size:15px;line-height:1.6;margin:0 0 16px 0;font-weight:700;">${escape(c.lead)}</p>
          <p style="font-size:15px;line-height:1.6;margin:0 0 16px 0;">${escape(c.what)}</p>
          <p style="font-size:15px;line-height:1.6;margin:0 0 20px 0;font-weight:700;">${escape(c.gift(dateStr))}</p>
        </td></tr>
        <tr><td align="center" style="padding:8px 28px 20px 28px;">
          <a href="${SITE}/${locale}/teacher" style="background:#BFFF00;color:#1a1a2e;font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:16px;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block;border:2px solid #1a1a2e;">${escape(c.cta)}</a>
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

  return { subject: c.subject, html };
}
