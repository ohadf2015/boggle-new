import { firstName } from './teacherEmailLayout';
import type { TeacherLocale } from '@/lib/education/types';
import { polarTrialManageUrl } from '@/lib/education/polarTrialDayBefore';
import { renderNeoEmail } from '@/lib/email/kit/neoEmail';

interface Args {
  full_name: string;
  locale: TeacherLocale;
  /** When the trial ends and the card is charged (ISO). */
  chargeAt: string;
}

const DATE_LOCALE: Record<TeacherLocale, string> = {
  en: 'en-US', he: 'he-IL', sv: 'sv-SE', ja: 'ja-JP', es: 'es-ES', ru: 'ru-RU',
};

interface Copy {
  kicker: string;
  headline: string;
  greeting: (n: string) => string;
  subject: string;
  preheader: string;
  lead: (date: string) => string;
  keep: string;
  cancel: string;
  priceTitle: string;
  price: string;
  cta: string;
  ask: string;
  signoff: string;
  dir: 'ltr' | 'rtl';
}

const CONTACT = 'lexiclash.game@gmail.com';

const COPY: Record<TeacherLocale, Copy> = {
  en: {
    kicker: 'Teacher Pro trial',
    headline: 'Your free trial ends tomorrow',
    greeting: (n) => `Hi ${n},`,
    subject: 'Your Teacher Pro trial ends tomorrow',
    preheader: 'After that, $9 a month on the card you added. Cancel any time before.',
    lead: (date) => `Your free Teacher Pro trial ends on ${date}. That day, the card you added is charged $9, and then $9 each month.`,
    keep: 'Want to keep Pro? There is nothing to do.',
    cancel: "Don't want to pay? Cancel before then and you won't be charged anything.",
    priceTitle: 'Teacher Pro, $9 a month',
    price: 'Unlimited classes, live word games and the progress dashboard. Cancel any time.',
    cta: 'Manage or cancel',
    ask: `Questions? Just reply, I read every one: ${CONTACT}`,
    signoff: 'Ohad, who built LexiClash',
    dir: 'ltr',
  },
  he: {
    kicker: 'ניסיון Teacher Pro',
    headline: 'הניסיון החינמי נגמר מחר',
    greeting: (n) => `שלום ${n},`,
    subject: 'הניסיון של Teacher Pro נגמר מחר',
    preheader: 'אחרי זה 9$ לחודש בכרטיס ששמרת. אפשר לבטל בכל רגע לפני כן.',
    lead: (date) => `הניסיון החינמי של Teacher Pro מסתיים ב-${date}. באותו יום הכרטיס ששמרת יחויב ב-9$, ואחר כך 9$ בכל חודש.`,
    keep: 'רוצה להמשיך עם Pro? לא צריך לעשות כלום.',
    cancel: 'לא רוצה לשלם? מבטלים לפני כן ולא תחויב בכלום.',
    priceTitle: 'Teacher Pro ב-9$ לחודש',
    price: 'כיתות ללא הגבלה, משחקי מילים חיים ולוח מעקב התקדמות. אפשר לבטל בכל רגע.',
    cta: 'ניהול או ביטול',
    ask: `שאלות? פשוט להשיב למייל, אני קורא כל תשובה: ${CONTACT}`,
    signoff: 'אוהד, שבנה את LexiClash',
    dir: 'rtl',
  },
  sv: {
    kicker: 'Provperiod för Teacher Pro',
    headline: 'Din gratis provperiod tar slut i morgon',
    greeting: (n) => `Hej ${n},`,
    subject: 'Din provperiod för Teacher Pro tar slut i morgon',
    preheader: 'Därefter $9 i månaden på kortet du lade till. Avsluta när du vill innan dess.',
    lead: (date) => `Din gratis provperiod för Teacher Pro tar slut den ${date}. Den dagen dras $9 från kortet du lade till, och sedan $9 varje månad.`,
    keep: 'Vill du behålla Pro? Då behöver du inte göra något.',
    cancel: 'Vill du inte betala? Avsluta innan dess, så debiteras du ingenting.',
    priceTitle: 'Teacher Pro, $9 i månaden',
    price: 'Obegränsat antal klasser, ordspel i realtid och översikten över elevernas framsteg. Avsluta när du vill.',
    cta: 'Hantera eller avsluta',
    ask: `Frågor? Svara bara på mejlet, jag läser alla svar: ${CONTACT}`,
    signoff: 'Ohad, som byggde LexiClash',
    dir: 'ltr',
  },
  ja: {
    kicker: 'Teacher Pro トライアル',
    headline: '無料トライアルは明日で終了します',
    greeting: (n) => `${n}さん、こんにちは。`,
    subject: 'Teacher Pro のトライアルは明日で終了します',
    preheader: '終了後は、登録したカードに毎月$9が請求されます。それまでならいつでも解約できます。',
    lead: (date) => `Teacher Pro の無料トライアルは${date}に終了します。その日に登録したカードへ$9が請求され、以降は毎月$9となります。`,
    keep: 'Pro を続ける場合、手続きは必要ありません。',
    cancel: 'お支払いを希望されない場合は、それまでに解約していただければ一切請求されません。',
    priceTitle: 'Teacher Pro 月額$9',
    price: 'クラス数は無制限で、リアルタイムの言葉ゲームと学習の進み具合がわかるダッシュボードが使えます。いつでも解約できます。',
    cta: '管理・解約する',
    ask: `ご質問はこのメールに返信してください。すべて目を通しています：${CONTACT}`,
    signoff: 'LexiClash を作った Ohad より',
    dir: 'ltr',
  },
  es: {
    kicker: 'Prueba de Teacher Pro',
    headline: 'Tu prueba gratis termina mañana',
    greeting: (n) => `Hola, ${n}:`,
    subject: 'Tu prueba de Teacher Pro termina mañana',
    preheader: 'Después, $9 al mes en la tarjeta que agregaste. Puedes cancelar antes cuando quieras.',
    lead: (date) => `Tu prueba gratis de Teacher Pro termina el ${date}. Ese día se cobrarán $9 a la tarjeta que agregaste, y luego $9 cada mes.`,
    keep: '¿Quieres seguir con Pro? No tienes que hacer nada.',
    cancel: '¿No quieres pagar? Cancela antes y no se te cobrará nada.',
    priceTitle: 'Teacher Pro, $9 al mes',
    price: 'Clases ilimitadas, juegos de palabras en vivo y el panel de progreso. Cancela cuando quieras.',
    cta: 'Gestionar o cancelar',
    ask: `¿Preguntas? Solo responde, leo todas las respuestas: ${CONTACT}`,
    signoff: 'Ohad, el creador de LexiClash',
    dir: 'ltr',
  },
  ru: {
    kicker: 'Пробный период Teacher Pro',
    headline: 'Бесплатный пробный период закончится завтра',
    greeting: (n) => `Здравствуйте, ${n}!`,
    subject: 'Пробный период Teacher Pro закончится завтра',
    preheader: 'Дальше $9 в месяц с карты, которую вы добавили. Отменить можно в любой момент до этого.',
    lead: (date) => `Бесплатный пробный период Teacher Pro закончится ${date}. В этот день с добавленной вами карты спишется $9, а затем по $9 каждый месяц.`,
    keep: 'Хотите оставить Pro? Ничего делать не нужно.',
    cancel: 'Не хотите платить? Отмените подписку до этого, и с вас ничего не спишется.',
    priceTitle: 'Teacher Pro за $9 в месяц',
    price: 'Неограниченное число классов, словесные игры в реальном времени и панель успеваемости. Отменить можно в любой момент.',
    cta: 'Управлять или отменить',
    ask: `Есть вопросы? Просто ответьте на письмо, я читаю каждое: ${CONTACT}`,
    signoff: 'Охад, создатель LexiClash',
    dir: 'ltr',
  },
};

export function teacherPolarTrialDayBefore({ full_name, locale, chargeAt }: Args) {
  const c = COPY[locale] || COPY.en;
  const dateStr = new Date(chargeAt).toLocaleDateString(DATE_LOCALE[locale] || 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
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
      { type: 'p', text: c.lead(dateStr), strong: true },
      { type: 'p', text: c.keep },
      { type: 'p', text: c.cancel },
      { type: 'callout', title: c.priceTitle, text: c.price },
      { type: 'p', text: c.ask },
    ],
    cta: { label: c.cta, href: polarTrialManageUrl(locale) },
    signoff: c.signoff,
  });

  return { subject: c.subject, html };
}
