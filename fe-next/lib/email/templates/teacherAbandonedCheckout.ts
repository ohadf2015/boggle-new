import type { TeacherLocale } from '@/lib/education/types';
import { abandonedCheckoutUpgradeUrl, type CheckoutMode } from '@/lib/education/abandonedCheckout';

/**
 * `keep`: a trial checkout from a teacher still inside the free access trial. They
 * already have the trial, so the email asks them to keep Pro when it ends rather
 * than "start a free 14-day trial" a second time.
 */
export type AbandonedCheckoutEmailMode = CheckoutMode | 'keep';

interface Args {
  full_name: string;
  locale: TeacherLocale;
  mode: AbandonedCheckoutEmailMode;
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
  modes: Record<AbandonedCheckoutEmailMode, ModeCopy>;
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
      keep: {
        subject: 'Keep Teacher Pro after your free trial',
        lead: 'You started setting up Teacher Pro to keep after your free trial, but did not finish. $9/mo starts only when your free trial ends.',
        cta: 'Keep Teacher Pro after my trial',
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
      keep: {
        subject: 'ממשיכים עם Teacher Pro אחרי תקופת הניסיון',
        lead: 'התחלת להגדיר את Teacher Pro להמשך אחרי תקופת הניסיון החינמית, אבל לא סיימת. התשלום של 9$ לחודש מתחיל רק כשתקופת הניסיון מסתיימת.',
        cta: 'להמשיך עם Teacher Pro אחרי הניסיון',
      },
    },
    body: 'אם משהו השתבש בדף התשלום, הנה קישור חדש. זה לוקח פחות מדקה.',
    price: 'מנוי Teacher Pro עולה 9$ לחודש: כיתות ללא הגבלה, משחקי מילים חיים ולוח מעקב התקדמות. אפשר לבטל בכל רגע.',
    ask: 'נתקעת או שיש לך שאלה? פשוט השב/י למייל הזה — אני קורא הכול.',
    signoff: '— אוהד, היוצר של LexiClash',
    dir: 'rtl',
  },

  sv: {
    greeting: (n) => `Hej ${n},`,
    modes: {
      paid: {
        subject: 'Slutför ditt köp av Teacher Pro',
        lead: 'Du började uppgradera till Teacher Pro men slutförde inte betalningen.',
        cta: 'Slutför köpet — $9/mån',
      },
      trial: {
        subject: 'Din gratis provperiod av Teacher Pro är ett steg bort',
        lead: 'Du började en gratis 14 dagars provperiod av Teacher Pro men slutförde inte registreringen.',
        cta: 'Starta min gratis provperiod',
      },
      keep: {
        subject: 'Behåll Teacher Pro efter din gratisperiod',
        lead: 'Du började ställa in Teacher Pro för att behålla det efter gratisperioden, men slutförde inte. $9/mån börjar först när din gratisperiod slutar.',
        cta: 'Behåll Teacher Pro efter min provperiod',
      },
    },
    body: 'Om något gick fel på betalsidan kommer här en ny länk. Det tar under en minut.',
    price: 'Teacher Pro kostar $9/månad: obegränsade klasser, ordspel i realtid och översikt över elevernas framsteg. Avsluta när du vill.',
    ask: 'Har du stött på problem eller har en fråga? Svara bara på det här mejlet — jag läser alla.',
    signoff: '— Ohad, skaparen av LexiClash',
    dir: 'ltr',
  },
  es: {
    greeting: (n) => `Hola, ${n}:`,
    modes: {
      paid: {
        subject: 'Termina tu compra de Teacher Pro',
        lead: 'Empezaste a mejorar a Teacher Pro pero no terminaste el pago.',
        cta: 'Terminar el pago — $9/mes',
      },
      trial: {
        subject: 'Tu prueba gratis de Teacher Pro está a un paso',
        lead: 'Empezaste una prueba gratis de 14 días de Teacher Pro pero no terminaste el registro.',
        cta: 'Empezar mi prueba gratis',
      },
      keep: {
        subject: 'Sigue con Teacher Pro después de tu prueba gratis',
        lead: 'Empezaste a configurar Teacher Pro para seguir después de tu prueba gratis, pero no terminaste. Los $9/mes empiezan solo cuando termina tu prueba gratis.',
        cta: 'Seguir con Teacher Pro después de mi prueba',
      },
    },
    body: 'Si algo falló en la página de pago, aquí tienes un enlace nuevo. Tarda menos de un minuto.',
    price: 'Teacher Pro cuesta $9/mes: clases ilimitadas, juegos de palabras en vivo y el panel de progreso. Cancela cuando quieras.',
    ask: '¿Algún problema o pregunta? Responde a este correo: los leo todos.',
    signoff: '— Ohad, el creador de LexiClash',
    dir: 'ltr',
  },
  ja: {
    greeting: (n) => `${n}様`,
    modes: {
      paid: {
        subject: 'Teacher Proのお手続きを完了してください',
        lead: 'Teacher Proへのアップグレードを始めましたが、お支払いが完了していません。',
        cta: '手続きを完了する — 月$9',
      },
      trial: {
        subject: 'Teacher Proの無料トライアルまであと一歩です',
        lead: 'Teacher Proの14日間無料トライアルを始めましたが、登録が完了していません。',
        cta: '無料トライアルを始める',
      },
      keep: {
        subject: '無料トライアル後もTeacher Proを続けましょう',
        lead: '無料トライアル後もTeacher Proを続ける設定を始めましたが、完了していません。月$9のお支払いは無料トライアル終了日から始まります。',
        cta: 'トライアル後もTeacher Proを続ける',
      },
    },
    body: 'お支払いページで問題があった場合は、こちらの新しいリンクをご利用ください。1分もかかりません。',
    price: 'Teacher Proは月$9です：クラス無制限、リアルタイムの単語ゲーム、進捗ダッシュボード。いつでも解約できます。',
    ask: '問題やご質問があれば、このメールにそのまま返信してください。すべて読んでいます。',
    signoff: '— LexiClash制作者 Ohad',
    dir: 'ltr',
  },
  ru: {
    greeting: (n) => `Здравствуйте, ${n}!`,
    modes: {
      paid: {
        subject: 'Завершите оформление Teacher Pro',
        lead: 'Вы начали переход на Teacher Pro, но не завершили оплату.',
        cta: 'Завершить оплату — $9/мес',
      },
      trial: {
        subject: 'До бесплатного пробного периода Teacher Pro — один шаг',
        lead: 'Вы начали бесплатный 14-дневный пробный период Teacher Pro, но не завершили регистрацию.',
        cta: 'Начать бесплатный период',
      },
      keep: {
        subject: 'Сохраните Teacher Pro после бесплатного периода',
        lead: 'Вы начали оформлять Teacher Pro, чтобы продолжить после бесплатного периода, но не закончили. Оплата $9/мес начнётся только когда закончится бесплатный период.',
        cta: 'Сохранить Teacher Pro после пробного периода',
      },
    },
    body: 'Если на странице оплаты что-то пошло не так, вот новая ссылка. Это займёт меньше минуты.',
    price: 'Teacher Pro стоит $9 в месяц: безлимитные классы, словесные игры в реальном времени и панель прогресса. Отмена в любой момент.',
    ask: 'Возникла проблема или вопрос? Просто ответьте на это письмо — я читаю все.',
    signoff: '— Охад, создатель LexiClash',
    dir: 'ltr',
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
