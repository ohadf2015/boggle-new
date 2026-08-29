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
  /** The reward, stated as a done deal — nothing for them to claim or click. */
  badge: string;
  gift: (date: string) => string;
  cta: string;
  /** The one question worth asking a teacher who already gave us a chance. */
  ask: string;
  signoff: string;
  dir: 'ltr' | 'rtl';
}

// Short sentences, no product jargon, no "we apologise for any inconvenience".
// One person writing to one teacher: sorry, it is fixed, here are 14 days, tell
// me what you think.
const COPY: Partial<Record<TeacherLocale, Copy>> & { en: Copy } = {
  en: {
    subject: 'Sorry about that — 14 more days on me 🎁',
    greeting: (n) => `Hi ${n},`,
    lead: 'You clicked "Open Teacher Dashboard" and the page just reloaded instead of opening. That was our bug, not anything you did — and I am sorry it cost you time.',
    what: 'It is fixed. The dashboard opens the moment you click it now.',
    badge: '🎁 14 free days — already added',
    gift: (date) => `You lost trial days to a broken button, so I put 14 more on your account. Nothing to claim, it is already there: your trial now runs to ${date}.`,
    cta: 'Open my classroom',
    ask: `And if you have two minutes — what would make LexiClash genuinely useful in your classroom? Just hit reply. It comes straight to me and I read every single one (${CONTACT}).`,
    signoff: '— Ohad, the creator of LexiClash',
    dir: 'ltr',
  },
  he: {
    subject: 'סליחה על התקלה — 14 ימים נוספים עלינו 🎁',
    greeting: (n) => `היי ${n},`,
    lead: 'לחצת על "פתח את לוח המורה" והדף פשוט נטען מחדש במקום להיפתח. זה היה באג שלנו, לא משהו שעשית — ואני מצטער שזה בזבז לך זמן.',
    what: 'זה תוקן. הלוח נפתח עכשיו ברגע שלוחצים.',
    badge: '🎁 14 ימים חינם — כבר נוספו',
    gift: (date) => `הפסדת ימי ניסיון בגלל כפתור שבור, אז הוספתי לך 14 ימים. אין מה לממש, זה כבר שם: תקופת הניסיון שלך נמשכת עד ${date}.`,
    cta: 'לפתוח את הכיתה שלי',
    ask: `ואם יש לך שתי דקות — מה יהפוך את LexiClash לבאמת שימושי בכיתה שלך? פשוט השב/י למייל הזה. הוא מגיע ישירות אליי ואני קורא כל אחד (${CONTACT}).`,
    signoff: '— אוהד, היוצר של LexiClash',
    dir: 'rtl',
  },
  es: {
    subject: 'Perdona el fallo: 14 días más por mi cuenta 🎁',
    greeting: (n) => `Hola ${n}:`,
    lead: 'Pulsaste «Abrir panel del profesor» y la página se recargó en lugar de abrirse. Fue un fallo nuestro, no tuyo, y siento que te hiciera perder el tiempo.',
    what: 'Ya está arreglado. El panel se abre en cuanto lo pulsas.',
    badge: '🎁 14 días gratis — ya añadidos',
    gift: (date) => `Perdiste días de prueba por un botón roto, así que te he puesto 14 más. No hay que canjear nada, ya están ahí: tu prueba llega hasta el ${date}.`,
    cta: 'Abrir mi clase',
    ask: `Y si tienes dos minutos: ¿qué haría que LexiClash te fuera realmente útil en clase? Responde a este correo. Me llega directamente y leo todos (${CONTACT}).`,
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
          <p style="font-size:15px;line-height:1.6;margin:0 0 20px 0;">${escape(c.what)}</p>
        </td></tr>
        <!-- The gift, boxed in the brand lime so it reads as a present rather
             than a policy note. Table-based and inline-styled: Outlook drops
             divs with backgrounds, and this is the one block that must land. -->
        <tr><td align="center" style="padding:0 28px 4px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#BFFF00;border:3px solid #1a1a2e;border-radius:10px;">
            <tr><td dir="${c.dir}" align="center" style="padding:18px 20px;font-family:Arial,Helvetica,sans-serif;color:#1a1a2e;">
              <p style="margin:0 0 6px 0;font-size:19px;font-weight:800;">${escape(c.badge)}</p>
              <p style="margin:0;font-size:15px;line-height:1.6;">${escape(c.gift(dateStr))}</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding:20px 28px;">
          <a href="${SITE}/${locale}/teacher" style="background:#1a1a2e;color:#BFFF00;font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:16px;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block;border:2px solid #1a1a2e;">${escape(c.cta)}</a>
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
