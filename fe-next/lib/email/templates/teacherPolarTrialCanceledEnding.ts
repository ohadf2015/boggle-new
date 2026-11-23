import { firstName, teacherEmailUrl } from './teacherEmailLayout';
import type { TeacherLocale } from '@/lib/education/types';
import { renderNeoEmail } from '@/lib/email/kit/neoEmail';

const CONTACT = 'lexiclash.game@gmail.com';

const DATE_LOCALE: Record<TeacherLocale, string> = {
  en: 'en-US', he: 'he-IL', sv: 'sv-SE', ja: 'ja-JP', es: 'es-ES', ru: 'ru-RU',
};

interface Copy {
  headline: string;
  greeting: (n: string) => string;
  subject: (date: string) => string;
  preheader: string;
  lead: (date: string) => string;
  body: string;
  cta: string;
  ask: string;
  signoff: string;
  dir: 'ltr' | 'rtl';
}

const COPY: Record<TeacherLocale, Copy> = {
  en: {
    headline: 'Your Teacher Pro ends soon',
    greeting: (n) => `Hi ${n},`,
    subject: (date) => `Your Teacher Pro ends on ${date}`,
    preheader: "You cancelled, so there's no charge. Here's what changes.",
    lead: (date) => `You cancelled your trial, so your card won't be charged. Teacher Pro stays on until ${date}, and then your classes move to the free plan.`,
    body: 'Your classes, students and game history all stay. What goes is the Pro part: the report by student and word, spaced practice of missed words, parent report links, and adding more than 3 classes.',
    cta: 'Keep Teacher Pro',
    ask: `Could you tell me why it wasn't worth it? Just reply, one line is plenty. I read every answer: ${CONTACT}`,
    signoff: 'Ohad, who built LexiClash',
    dir: 'ltr',
  },
  he: {
    headline: 'Teacher Pro שלכם מסתיים בקרוב',
    greeting: (n) => `שלום ${n},`,
    subject: (date) => `Teacher Pro שלכם מסתיים ב-${date}`,
    preheader: 'ביטלתם, אז אין חיוב. הנה מה שמשתנה.',
    lead: (date) => `ביטלתם את הניסיון, אז הכרטיס לא יחויב. Teacher Pro נשאר פעיל עד ${date}, ואחר כך הכיתות עוברות למסלול החינמי.`,
    body: 'הכיתות, התלמידים והיסטוריית המשחקים נשארים. מה שנעלם זה החלק של Pro: הדוח לפי תלמיד ומילה, תרגול חוזר של מילים שהתפספסו, קישורי דוחות להורים, ופתיחה של יותר מ-3 כיתות.',
    cta: 'להשאיר את Teacher Pro',
    ask: `תוכלו לספר לי למה זה לא היה שווה את זה? פשוט השיבו למייל, שורה אחת מספיקה. אני קורא כל תשובה: ${CONTACT}`,
    signoff: 'אוהד, שבנה את LexiClash',
    dir: 'rtl',
  },
  sv: {
    headline: 'Ditt Teacher Pro tar snart slut',
    greeting: (n) => `Hej ${n},`,
    subject: (date) => `Ditt Teacher Pro tar slut den ${date}`,
    preheader: 'Du har avslutat, så inget dras. Så här blir det.',
    lead: (date) => `Du avslutade din provperiod, så ditt kort debiteras inte. Teacher Pro är kvar till ${date}, sedan går dina klasser över till gratisplanen.`,
    body: 'Dina klasser, elever och spelhistorik finns kvar. Det som försvinner är Pro-delen: rapporten per elev och ord, repetition av missade ord, föräldrarapporter och möjligheten att ha fler än 3 klasser.',
    cta: 'Behåll Teacher Pro',
    ask: `Vill du berätta varför det inte var värt det? Svara bara på mejlet, en rad räcker. Jag läser alla svar: ${CONTACT}`,
    signoff: 'Ohad, som byggde LexiClash',
    dir: 'ltr',
  },
  ja: {
    headline: 'Teacher Pro はまもなく終了します',
    greeting: (n) => `${n}さん、こんにちは。`,
    subject: (date) => `Teacher Pro は${date}に終了します`,
    preheader: '解約済みのため請求はありません。変わる点をお知らせします。',
    lead: (date) => `トライアルを解約されたため、カードへの請求はありません。Teacher Pro は${date}までご利用いただけ、その後クラスは無料プランに移ります。`,
    body: 'クラス、生徒、ゲームの履歴はそのまま残ります。なくなるのは Pro の機能です。生徒ごと・単語ごとのレポート、間違えた単語の反復練習、保護者向けレポートのリンク、4つ目以降のクラスの追加です。',
    cta: 'Teacher Pro を続ける',
    ask: `よろしければ、続けなかった理由を教えていただけますか。このメールに一行返信していただくだけで十分です。いただいた返信にはすべて目を通しています：${CONTACT}`,
    signoff: 'LexiClash を作った Ohad より',
    dir: 'ltr',
  },
  es: {
    headline: 'Tu Teacher Pro termina pronto',
    greeting: (n) => `Hola, ${n}:`,
    subject: (date) => `Tu Teacher Pro termina el ${date}`,
    preheader: 'Cancelaste, así que no hay cobro. Esto es lo que cambia.',
    lead: (date) => `Cancelaste tu prueba, así que no se cobrará nada en tu tarjeta. Teacher Pro sigue activo hasta el ${date} y después tus clases pasan al plan gratis.`,
    body: 'Tus clases, alumnos e historial de juegos se quedan. Lo que se va es la parte Pro: el informe por alumno y palabra, la práctica espaciada de las palabras falladas, los enlaces de informes para familias y poder tener más de 3 clases.',
    cta: 'Seguir con Teacher Pro',
    ask: `¿Me cuentas por qué no te compensó? Solo responde a este email, con una línea basta. Leo todas las respuestas: ${CONTACT}`,
    signoff: 'Ohad, el creador de LexiClash',
    dir: 'ltr',
  },
  ru: {
    headline: 'Teacher Pro скоро закончится',
    greeting: (n) => `Здравствуйте, ${n}!`,
    subject: (date) => `Teacher Pro закончится ${date}`,
    preheader: 'Вы отменили подписку, поэтому списания не будет. Вот что изменится.',
    lead: (date) => `Вы отменили пробный период, поэтому с карты ничего не спишется. Teacher Pro работает до ${date}, а потом ваши классы перейдут на бесплатный тариф.`,
    body: 'Классы, ученики и история игр останутся. Пропадёт только то, что даёт Pro: отчёт по каждому ученику и слову, интервальное повторение пропущенных слов, ссылки на отчёты для родителей и возможность вести больше 3 классов.',
    cta: 'Оставить Teacher Pro',
    ask: `Расскажете, почему не подошло? Просто ответьте на письмо, одной строки достаточно. Я читаю каждое письмо: ${CONTACT}`,
    signoff: 'Охад, создатель LexiClash',
    dir: 'ltr',
  },
};

/** A card trial the teacher cancelled, a few days before Pro ends: no charge, what goes, keep it, and why. */
export function teacherPolarTrialCanceledEnding({ full_name, locale, endsAt }: { full_name: string; locale: TeacherLocale; endsAt: string }) {
  const c = COPY[locale] || COPY.en;
  const date = new Date(endsAt).toLocaleDateString(DATE_LOCALE[locale] || 'en-US', { month: 'long', day: 'numeric' });

  const html = renderNeoEmail({
    lang: locale,
    dir: c.dir,
    preheader: c.preheader,
    accent: 'cyan',
    art: 'hourglass',
    kicker: 'Teacher Pro',
    headline: c.headline,
    greeting: c.greeting(firstName(full_name) || full_name),
    blocks: [
      { type: 'p', text: c.lead(date), strong: true },
      { type: 'p', text: c.body },
      { type: 'p', text: c.ask },
    ],
    cta: { label: c.cta, href: teacherEmailUrl(locale, '/teacher/upgrade', 'polar_trial_canceled_ending') },
    signoff: c.signoff,
  });

  return { subject: c.subject(date), html };
}
