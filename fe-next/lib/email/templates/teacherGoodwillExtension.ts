import type { TeacherLocale } from '@/lib/education/types';
import { renderNeoEmail } from '@/lib/email/kit/neoEmail';
import { firstName, teacherEmailUrl } from './teacherEmailLayout';

/**
 * The apology-and-extension email: the dashboard button reloaded the page
 * instead of opening the dashboard, so every approved teacher got 14 more days.
 */

interface Args {
  full_name: string;
  locale: TeacherLocale;
  /** ISO deadline AFTER the extension — the date the email promises. */
  newExpiresAt: string;
}

const CONTACT = 'lexiclash.game@gmail.com';

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

const COPY: Record<TeacherLocale, Copy> = {
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
  sv: {
    subject: 'Förlåt för strulet. Du får 14 dagar till av mig',
    preheader: 'Knappen till lärarpanelen fungerar nu, och din provperiod är längre.',
    kicker: 'Från Ohad',
    headline: 'Förlåt, här är 14 dagar till',
    greeting: (n) => `Hej ${n},`,
    lead: 'Du klickade på "Öppna lärarpanelen" och sidan laddades bara om i stället för att öppnas. Det var min bugg, inte något du gjorde, och jag är ledsen att det tog din tid.',
    what: 'Nu är det fixat, och panelen öppnas direkt när du klickar.',
    badge: '14 gratisdagar, redan tillagda',
    gift: (date) => `Du förlorade dagar av provperioden på en trasig knapp, så jag har lagt till 14 dagar på ditt konto. Du behöver inte göra något, de finns redan där: provperioden gäller nu till ${date}.`,
    cta: 'Öppna mitt klassrum',
    ask: `Och om du har två minuter: vad skulle göra LexiClash riktigt användbart i ditt klassrum? Svara bara på det här mejlet. Det kommer direkt till mig och jag läser varenda svar (${CONTACT}).`,
    signoff: 'Ohad, som har byggt LexiClash',
    dir: 'ltr',
  },
  ja: {
    subject: 'ご迷惑をおかけしました。お試し期間を14日間延長しました',
    preheader: 'ダッシュボードのボタンを修正し、お試し期間も延長しました。',
    kicker: 'Ohadより',
    headline: '申し訳ありません。14日間を追加しました',
    greeting: (n) => `${n}さん、こんにちは。`,
    lead: '「教師用ダッシュボードを開く」を押しても、ページが再読み込みされるだけで開かなかったと思います。原因は私の側の不具合で、操作の問題ではありません。お時間を取らせてしまい、申し訳ありませんでした。',
    what: '現在は修正済みで、ボタンを押すとすぐにダッシュボードが開きます。',
    badge: '無料の14日間を追加済みです',
    gift: (date) => `ボタンの不具合でお試し期間を無駄にさせてしまったので、アカウントに14日間を追加しました。お手続きは不要で、すでに反映されています。お試し期間は${date}までご利用いただけます。`,
    cta: '自分のクラスを開く',
    ask: `もし2分ほどお時間があれば、LexiClashが授業で本当に役立つものになるには何が必要か、教えていただけませんか。このメールに返信していただければ私に直接届きますし、いただいたお返事はすべて読んでいます（${CONTACT}）。`,
    signoff: 'Ohad（LexiClash開発者）',
    dir: 'ltr',
  },
  ru: {
    subject: 'Извините за сбой. Дарю вам ещё 14 дней',
    preheader: 'Кнопка панели учителя исправлена, а ваш пробный период стал длиннее.',
    kicker: 'От Охада',
    headline: 'Извините, и вот ещё 14 дней',
    greeting: (n) => `Здравствуйте, ${n}!`,
    lead: 'Вы нажали «Открыть панель учителя», а страница просто перезагрузилась вместо того, чтобы открыться. Это была моя ошибка, а не ваша, и мне жаль, что вы потеряли из-за неё время.',
    what: 'Сейчас всё исправлено: панель открывается сразу, как только вы нажимаете кнопку.',
    badge: '14 бесплатных дней уже добавлены',
    gift: (date) => `Из-за сломанной кнопки вы потеряли часть пробного периода, поэтому я добавил на ваш аккаунт ещё 14 дней. Ничего активировать не нужно, они уже начислены: теперь пробный период действует до ${date}.`,
    cta: 'Открыть мой класс',
    ask: `И если у вас есть пара минут: что сделало бы LexiClash по-настоящему полезным на ваших уроках? Просто ответьте на это письмо. Оно приходит прямо ко мне, и я читаю каждый ответ (${CONTACT}).`,
    signoff: 'Охад, создатель LexiClash',
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
