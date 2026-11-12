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

const CONTACT = 'lexiclash.game@gmail.com';

const ruDays = (n: number) =>
  ({ one: 'день', few: 'дня' } as Record<string, string>)[new Intl.PluralRules('ru').select(n)] ?? 'дней';

const COPY: Record<TeacherLocale, Copy> = {
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
  sv: {
    kicker: 'Provperiod för Teacher Pro',
    headline: 'Din provperiod går mot sitt slut',
    greeting: (n) => `Hej ${n},`,
    subject: (days) => `Din provperiod för Teacher Pro har ${days} dagar kvar`,
    preheader: 'Så här blir det när den tar slut, så att inget kommer som en överraskning.',
    lead: (days, date) => `Din provperiod på 14 dagar för Teacher Pro tar slut om ${days} dagar, den ${date}.`,
    body: 'Om klassrummet fungerar bra för dig behöver du inte göra något. När provperioden är slut drar Polar $9 i månaden, om du inte avslutar innan dess.',
    priceTitle: 'Teacher Pro, $9 i månaden',
    price: 'Obegränsat antal klassrum, ordspel i realtid och översikten över elevernas framsteg. Du kan avsluta när du vill.',
    cta: 'Behåll Teacher Pro',
    ask: `Om det inte passar, svara på mejlet och berätta varför. Jag läser alla svar: ${CONTACT}`,
    signoff: 'Ohad, som byggde LexiClash',
    dir: 'ltr',
  },
  ja: {
    kicker: 'Teacher Pro トライアル',
    headline: 'トライアル期間が残りわずかになりました',
    greeting: (n) => `${n}さん、こんにちは。`,
    subject: (days) => `Teacher Pro のトライアルは残り${days}日です`,
    preheader: '終了後にどうなるのか、驚かれないよう先にお伝えします。',
    lead: (days, date) => `14日間の Teacher Pro トライアルは、あと${days}日、${date}に終了します。`,
    body: 'クラスでうまく使えているようでしたら、特に手続きは必要ありません。トライアル終了後は、それまでに解約されない限り、Polar から毎月$9が請求されます。',
    priceTitle: 'Teacher Pro 月額$9',
    price: 'クラス数は無制限で、リアルタイムの言葉ゲームと学習の進み具合がわかるダッシュボードが使えます。いつでも解約できます。',
    cta: 'Teacher Pro を続ける',
    ask: `合わないと感じたら、このメールに返信して理由を教えてください。いただいた返信にはすべて目を通しています：${CONTACT}`,
    signoff: 'LexiClash を作った Ohad より',
    dir: 'ltr',
  },
  es: {
    kicker: 'Prueba de Teacher Pro',
    headline: 'Tu prueba está en la recta final',
    greeting: (n) => `Hola, ${n}:`,
    subject: (days) => `A tu prueba de Teacher Pro le quedan ${days} días`,
    preheader: 'Qué pasa cuando termine, para que nada te tome por sorpresa.',
    lead: (days, date) => `Tu prueba de 14 días de Teacher Pro termina en ${days} días, el ${date}.`,
    body: 'Si la clase te está funcionando, no tienes que hacer nada. Cuando termine la prueba, Polar te cobrará $9 al mes, a menos que canceles antes.',
    priceTitle: 'Teacher Pro, $9 al mes',
    price: 'Clases ilimitadas, juegos de palabras en vivo y el panel de progreso. Puedes cancelar cuando quieras.',
    cta: 'Seguir con Teacher Pro',
    ask: `Si no es lo que buscas, responde y cuéntame por qué. Leo todas las respuestas: ${CONTACT}`,
    signoff: 'Ohad, el creador de LexiClash',
    dir: 'ltr',
  },
  ru: {
    kicker: 'Пробный период Teacher Pro',
    headline: 'Пробный период подходит к концу',
    greeting: (n) => `Здравствуйте, ${n}!`,
    subject: (days) => `Пробный период Teacher Pro закончится через ${days} ${ruDays(days)}`,
    preheader: 'Рассказываю заранее, что будет после его окончания, чтобы не было сюрпризов.',
    lead: (days, date) => `Ваш 14-дневный пробный период Teacher Pro закончится через ${days} ${ruDays(days)}, ${date}.`,
    body: 'Если класс вам подходит, ничего делать не нужно. Когда пробный период закончится, Polar будет списывать $9 в месяц, если вы не отмените подписку до этого.',
    priceTitle: 'Teacher Pro за $9 в месяц',
    price: 'Неограниченное число классов, словесные игры в реальном времени и панель успеваемости. Отменить можно в любой момент.',
    cta: 'Оставить Teacher Pro',
    ask: `Если не подходит, ответьте и расскажите почему. Я читаю каждое письмо: ${CONTACT}`,
    signoff: 'Охад, создатель LexiClash',
    dir: 'ltr',
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
