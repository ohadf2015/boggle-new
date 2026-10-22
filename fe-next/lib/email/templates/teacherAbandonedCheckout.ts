import type { TeacherLocale } from '@/lib/education/types';
import { abandonedCheckoutUpgradeUrl, type CheckoutMode } from '@/lib/education/abandonedCheckout';

interface Args {
  full_name: string;
  locale: TeacherLocale;
  mode: CheckoutMode;
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

interface ModeCopy {
  subject: string;
  lead: string;
  cta: string;
}

interface Copy {
  greeting: (n: string) => string;
  modes: Record<CheckoutMode, ModeCopy>;
  body: string;
  price: string;
  ask: string;
  signoff: string;
  dir: 'ltr' | 'rtl';
}

const CONTACT = 'ohadf2015@gmail.com';

const COPY: Partial<Record<TeacherLocale, Copy>> & { en: Copy } = {
  en: {
    greeting: (n) => `Hi ${n},`,
    modes: {
      paid: {
        subject: 'Finish your Teacher Pro checkout',
        lead: 'You started upgrading to Teacher Pro but did not finish checkout.',
        cta: 'Finish checkout — $9/mo',
      },
      trial: {
        subject: 'Your free Teacher Pro trial is one step away',
        lead: 'You started a free 14-day Teacher Pro trial but did not finish signing up.',
        cta: 'Start my free trial',
      },
    },
    body: 'If something went wrong on the payment page, here is a fresh link. It takes under a minute.',
    price: 'Teacher Pro is $9/month: unlimited classrooms, live word games, and the progress dashboard. Cancel any time.',
    ask: 'Hit a problem or have a question? Just reply to this email — I read every one.',
    signoff: '— Ohad, the creator of LexiClash',
    dir: 'ltr',
  },
  he: {
    greeting: (n) => `שלום ${n},`,
    modes: {
      paid: {
        subject: 'לסיים את השדרוג ל-Teacher Pro',
        lead: 'התחלת לשדרג ל-Teacher Pro, אבל לא סיימת את התשלום.',
        cta: 'לסיים את השדרוג — 9$ לחודש',
      },
      trial: {
        subject: 'עוד צעד אחד לתקופת הניסיון החינמית של Teacher Pro',
        lead: 'התחלת תקופת ניסיון חינמית של 14 יום ל-Teacher Pro, אבל לא סיימת את ההרשמה.',
        cta: 'להתחיל את תקופת הניסיון',
      },
    },
    body: 'אם משהו השתבש בדף התשלום, הנה קישור חדש. זה לוקח פחות מדקה.',
    price: 'מנוי Teacher Pro עולה 9$ לחודש: כיתות ללא הגבלה, משחקי מילים חיים ולוח מעקב התקדמות. אפשר לבטל בכל רגע.',
    ask: 'נתקעת או שיש לך שאלה? פשוט השב/י למייל הזה — אני קורא הכול.',
    signoff: '— אוהד, היוצר של LexiClash',
    dir: 'rtl',
  },
};

export function teacherAbandonedCheckout({ full_name, locale, mode }: Args) {
  const c = COPY[locale] || COPY.en;
  const m = c.modes[mode];
  const align = c.dir === 'rtl' ? 'right' : 'left';
  const url = abandonedCheckoutUpgradeUrl(locale);

  const html = `<!doctype html>
<html dir="${c.dir}" lang="${locale}">
<body style="margin:0;padding:0;background:#0e1430;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0e1430;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:3px solid #1a1a2e;">
        <tr><td dir="${c.dir}" align="${align}" style="padding:28px 28px 8px 28px;font-family:Arial,Helvetica,sans-serif;color:#1a1a2e;text-align:${align};">
          <p style="font-size:18px;font-weight:700;margin:0 0 12px 0;">${c.greeting(escape(full_name))}</p>
          <p style="font-size:15px;line-height:1.6;margin:0 0 16px 0;font-weight:700;">${escape(m.lead)}</p>
          <p style="font-size:15px;line-height:1.6;margin:0 0 16px 0;">${escape(c.body)}</p>
          <p style="font-size:15px;line-height:1.6;margin:0 0 20px 0;">${escape(c.price)}</p>
        </td></tr>
        <tr><td align="center" style="padding:8px 28px 20px 28px;">
          <a href="${url}" style="background:#BFFF00;color:#1a1a2e;font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:16px;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block;border:2px solid #1a1a2e;">${escape(m.cta)}</a>
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

  return { subject: m.subject, html, replyTo: CONTACT };
}
