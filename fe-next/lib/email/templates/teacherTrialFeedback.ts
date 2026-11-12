import type { TeacherLocale } from '@/lib/education/types';
import { renderNeoEmail } from '@/lib/email/kit/neoEmail';
import { firstName, teacherEmailUrl } from './teacherEmailLayout';

// A soft check-in with no price and no upgrade button; the trial-ending emails carry the offer later.

interface Args {
  full_name: string;
  locale: TeacherLocale;
  /** ISO end of the free access, rendered as a date in the teacher's locale. */
  trialExpiresAt: string;
}

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
  askTitle: string;
  ask: string;
  access: (date: string) => string;
  cta: string;
  signoff: string;
  footnote: string;
  dir: 'ltr' | 'rtl';
}

const COPY: Record<TeacherLocale, Copy> = {
  en: {
    subject: 'How is LexiClash going with your class?',
    preheader: "A quick check-in from the person who built it.",
    kicker: 'For teachers',
    headline: 'How is it going so far?',
    greeting: (n) => (n ? `Hi ${n},` : 'Hi there,'),
    lead: "You've had LexiClash for a few days now, and I wanted to check in.",
    askTitle: 'Tell me straight',
    ask: "If something broke, confused your students or just doesn't fit your class, I want to know. Just reply to this email; it comes straight to me.",
    access: (date) => `Your free access runs until ${date}, and no card is needed.`,
    cta: 'Open my classroom',
    signoff: 'Thanks, Ohad (I build LexiClash)',
    footnote: 'You get this because you started free teacher access on LexiClash.',
    dir: 'ltr',
  },
  he: {
    subject: 'איך הולך עם LexiClash בכיתה?',
    preheader: 'בדיקה קצרה ממי שבנה את המשחק.',
    kicker: 'למורים',
    headline: 'איך הולך עד עכשיו?',
    greeting: (n) => (n ? `שלום ${n},` : 'שלום,'),
    lead: 'עברו כמה ימים מאז שהתחלת להשתמש ב-LexiClash, ורציתי לשאול איך הולך.',
    askTitle: 'אפשר לכתוב בגלוי',
    ask: 'אם משהו לא עבד, בלבל את התלמידים או פשוט לא מתאים לכיתה שלך, אשמח לשמוע. אפשר להשיב למייל הזה, הוא מגיע ישירות אליי.',
    access: (date) => `הגישה החינמית שלך פעילה עד ${date}, ולא צריך כרטיס אשראי.`,
    cta: 'לכיתה שלי',
    signoff: 'תודה, אוהד (אני בונה את LexiClash)',
    footnote: 'המייל הזה נשלח כי התחלת גישת מורים חינמית ב-LexiClash.',
    dir: 'rtl',
  },
  sv: {
    subject: 'Hur går det med LexiClash i klassen?',
    preheader: 'En kort avstämning från den som byggde det.',
    kicker: 'För lärare',
    headline: 'Hur har det gått hittills?',
    greeting: (n) => (n ? `Hej ${n},` : 'Hej,'),
    lead: 'Du har haft LexiClash i några dagar nu, och jag ville höra hur det går.',
    askTitle: 'Säg som det är',
    ask: 'Om något inte fungerade, förvirrade eleverna eller helt enkelt inte passar din klass vill jag veta det. Svara bara på det här mejlet, det kommer direkt till mig.',
    access: (date) => `Din kostnadsfria tillgång gäller till ${date}, och inget kort behövs.`,
    cta: 'Öppna mitt klassrum',
    signoff: 'Tack, Ohad (jag bygger LexiClash)',
    footnote: 'Du får det här för att du startade kostnadsfri lärartillgång på LexiClash.',
    dir: 'ltr',
  },
  ja: {
    subject: 'LexiClash、クラスでの様子はいかがですか？',
    preheader: 'LexiClashを作った本人から、近況をうかがうご連絡です。',
    kicker: '先生向け',
    headline: 'ここまでの使い心地はいかがですか？',
    greeting: (n) => (n ? `${n}さん、こんにちは。` : 'こんにちは。'),
    lead: 'LexiClashを使い始めて数日たちましたので、様子をうかがいたくてご連絡しました。',
    askTitle: '率直に教えてください',
    ask: 'うまく動かなかったこと、生徒さんが戸惑ったこと、クラスに合わないと感じたことがあれば、ぜひ知りたいです。このメールに返信していただければ、私に直接届きます。',
    access: (date) => `無料アクセスは${date}までご利用いただけます。カードの登録は必要ありません。`,
    cta: '自分のクラスを開く',
    signoff: 'ありがとうございます。Ohad（LexiClashを作っています）',
    footnote: 'LexiClashで先生向けの無料アクセスを始められた方にお送りしています。',
    dir: 'ltr',
  },
  es: {
    subject: '¿Qué tal va LexiClash con tu clase?',
    preheader: 'Un mensaje rápido de quien lo creó.',
    kicker: 'Para docentes',
    headline: '¿Cómo te está yendo?',
    greeting: (n) => (n ? `Hola, ${n}:` : 'Hola:'),
    lead: 'Ya llevas unos días con LexiClash y quería saber cómo te va.',
    askTitle: 'Dímelo sin rodeos',
    ask: 'Si algo falló, confundió a tus alumnos o simplemente no encaja con tu clase, quiero saberlo. Solo responde a este correo, que me llega directamente a mí.',
    access: (date) => `Tu acceso gratuito dura hasta el ${date} y no necesitas tarjeta.`,
    cta: 'Abrir mi clase',
    signoff: 'Gracias, Ohad (soy quien hace LexiClash)',
    footnote: 'Te llega este correo porque activaste el acceso gratuito para docentes en LexiClash.',
    dir: 'ltr',
  },
  ru: {
    subject: 'Как идут дела с LexiClash в вашем классе?',
    preheader: 'Короткое письмо от того, кто сделал игру.',
    kicker: 'Для учителей',
    headline: 'Как вам пока?',
    greeting: (n) => (n ? `Здравствуйте, ${n}!` : 'Здравствуйте!'),
    lead: 'Вы пользуетесь LexiClash уже несколько дней, и мне хотелось узнать, как всё проходит.',
    askTitle: 'Скажите честно',
    ask: 'Если что-то не работало, запутало учеников или просто не подходит вашему классу, я хочу об этом знать. Просто ответьте на это письмо, оно придёт прямо ко мне.',
    access: (date) => `Бесплатный доступ действует до ${date}, и карта не нужна.`,
    cta: 'Открыть мой класс',
    signoff: 'Спасибо, Охад (я делаю LexiClash)',
    footnote: 'Вы получили это письмо, потому что подключили бесплатный доступ для учителей в LexiClash.',
    dir: 'ltr',
  },
};

export function teacherTrialFeedback({ full_name, locale, trialExpiresAt }: Args) {
  const lang: TeacherLocale = locale in COPY ? locale : 'en';
  const c = COPY[lang];
  const dateStr = new Date(trialExpiresAt).toLocaleDateString(DATE_LOCALE[lang], {
    month: 'long', day: 'numeric',
  });

  const html = renderNeoEmail({
    lang,
    dir: c.dir,
    preheader: c.preheader,
    accent: 'cyan',
    art: 'report',
    kicker: c.kicker,
    headline: c.headline,
    greeting: c.greeting(firstName(full_name)),
    blocks: [
      { type: 'p', text: c.lead, strong: true },
      { type: 'callout', title: c.askTitle, text: c.ask },
      { type: 'p', text: c.access(dateStr) },
    ],
    cta: { label: c.cta, href: teacherEmailUrl(lang, '/teacher', 'trial_feedback') },
    signoff: c.signoff,
    footnote: c.footnote,
  });

  return { subject: c.subject, html };
}
