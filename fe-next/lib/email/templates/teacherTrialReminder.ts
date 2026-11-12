import type { TeacherLocale } from '@/lib/education/types';
import type { TrialReminderBucket } from '@/lib/education/trialReminders';
import { renderNeoEmail, type NeoAccent } from '@/lib/email/kit/neoEmail';
import { firstName, teacherEmailUrl } from './teacherEmailLayout';

interface Args {
  full_name: string;
  locale: TeacherLocale;
  bucket: TrialReminderBucket;
  /** ISO trial deadline — rendered as a date in the teacher's locale. */
  trialExpiresAt: string;
}

const DATE_LOCALE: Record<TeacherLocale, string> = {
  en: 'en-US', he: 'he-IL', sv: 'sv-SE', ja: 'ja-JP', es: 'es-ES', ru: 'ru-RU',
};

const ACCENT: Record<TrialReminderBucket, NeoAccent> = { 't-3': 'purple', 't-0': 'orange', 't+3': 'pink' };

interface BucketCopy {
  subject: (date: string) => string;
  preheader: string;
  headline: string;
  lead: (date: string) => string;
  body: string;
  cta: string;
}

interface Copy {
  greeting: (n: string) => string;
  kicker: string;
  buckets: Record<TrialReminderBucket, BucketCopy>;
  askTitle: string;
  /** Soft on purpose: a "no" with a reason is worth more than a pushed sale. */
  ask: string;
  classroom: string;
  signoff: string;
  footnote: string;
  dir: 'ltr' | 'rtl';
}

const COPY: Record<TeacherLocale, Copy> = {
  en: {
    greeting: (n) => (n ? `Hi ${n},` : 'Hi there,'),
    kicker: 'For teachers',
    buckets: {
      't-3': {
        subject: (date) => `Your LexiClash trial ends on ${date}`,
        preheader: 'The date your access ends, and one honest question.',
        headline: 'Your free access ends soon',
        lead: (date) => `Your free teacher access ends on ${date}.`,
        body: "If LexiClash has earned a spot in your lessons, Teacher Pro keeps everything going for $9 a month, and you can cancel whenever you like. If it hasn't, that's useful for me to know too.",
        cta: 'Keep Teacher Pro',
      },
      't-0': {
        subject: () => 'Your LexiClash trial ends today',
        preheader: 'A quick note before your free access runs out.',
        headline: 'Your free access ends today',
        lead: () => 'Your free teacher access ends today.',
        body: "If you'd like to keep playing with your class, Teacher Pro is $9 a month and you can cancel any time.",
        cta: 'Keep Teacher Pro',
      },
      't+3': {
        subject: () => 'Your LexiClash trial has ended',
        preheader: 'Thanks for giving it a go. One quick question.',
        headline: 'Thanks for trying LexiClash',
        lead: (date) => `Thanks for trying LexiClash. Your free teacher access ended on ${date}.`,
        body: "If you'd like to bring it back for your class, Teacher Pro is $9 a month and you can cancel any time.",
        cta: 'See Teacher Pro',
      },
    },
    askTitle: 'One question',
    ask: "Not the right fit? Reply and tell me what was missing or what got in the way. I read every reply myself.",
    classroom: 'Open my classroom',
    signoff: 'Thanks, Ohad (I build LexiClash)',
    footnote: 'You get this because you started free teacher access on LexiClash.',
    dir: 'ltr',
  },
  he: {
    greeting: (n) => (n ? `שלום ${n},` : 'שלום,'),
    kicker: 'למורים',
    buckets: {
      't-3': {
        subject: (date) => `תקופת הניסיון ב-LexiClash מסתיימת ב-${date}`,
        preheader: 'מתי הגישה מסתיימת, ושאלה אחת כנה.',
        headline: 'הגישה החינמית מסתיימת בקרוב',
        lead: (date) => `הגישה החינמית שלך למורים מסתיימת ב-${date}.`,
        body: 'אם LexiClash מצא מקום בשיעורים שלך, אפשר להמשיך עם Teacher Pro ב-9$ לחודש ולבטל מתי שרוצים. ואם לא, גם את זה חשוב לי לדעת.',
        cta: 'להמשיך עם Teacher Pro',
      },
      't-0': {
        subject: () => 'תקופת הניסיון ב-LexiClash מסתיימת היום',
        preheader: 'מילה קצרה לפני שהגישה החינמית נגמרת.',
        headline: 'הגישה החינמית נגמרת היום',
        lead: () => 'הגישה החינמית שלך למורים מסתיימת היום.',
        body: 'אם רוצים להמשיך לשחק עם הכיתה, Teacher Pro עולה 9$ לחודש ואפשר לבטל בכל רגע.',
        cta: 'להמשיך עם Teacher Pro',
      },
      't+3': {
        subject: () => 'תקופת הניסיון ב-LexiClash הסתיימה',
        preheader: 'תודה שניסית. שאלה קצרה אחת.',
        headline: 'תודה שניסית את LexiClash',
        lead: (date) => `תודה שניסית את LexiClash. הגישה החינמית שלך למורים הסתיימה ב-${date}.`,
        body: 'אם בא לך להחזיר את המשחק לכיתה, Teacher Pro עולה 9$ לחודש ואפשר לבטל בכל רגע.',
        cta: 'ל-Teacher Pro',
      },
    },
    askTitle: 'שאלה אחת',
    ask: 'אם זה לא התאים, אשמח לדעת מה היה חסר או מה הפריע. אפשר פשוט להשיב למייל הזה, הוא מגיע ישירות אליי ואני קורא כל תשובה.',
    classroom: 'לכיתה שלי',
    signoff: 'תודה, אוהד (אני בונה את LexiClash)',
    footnote: 'המייל הזה נשלח כי התחלת גישת מורים חינמית ב-LexiClash.',
    dir: 'rtl',
  },
  sv: {
    greeting: (n) => (n ? `Hej ${n},` : 'Hej,'),
    kicker: 'För lärare',
    buckets: {
      't-3': {
        subject: (date) => `Din LexiClash-provperiod slutar ${date}`,
        preheader: 'När tillgången slutar, och en ärlig fråga.',
        headline: 'Din tillgång slutar snart',
        lead: (date) => `Din kostnadsfria lärartillgång slutar ${date}.`,
        body: 'Om LexiClash har fått en plats i dina lektioner kan du fortsätta med Teacher Pro för 9 $ i månaden och avsluta när du vill. Om inte vill jag gärna veta det också.',
        cta: 'Behåll Teacher Pro',
      },
      't-0': {
        subject: () => 'Din LexiClash-provperiod slutar i dag',
        preheader: 'En kort hälsning innan din kostnadsfria tillgång tar slut.',
        headline: 'Din tillgång slutar i dag',
        lead: () => 'Din kostnadsfria lärartillgång slutar i dag.',
        body: 'Vill du fortsätta spela med klassen kostar Teacher Pro 9 $ i månaden, och du kan avsluta när du vill.',
        cta: 'Behåll Teacher Pro',
      },
      't+3': {
        subject: () => 'Din LexiClash-provperiod har slutat',
        preheader: 'Tack för att du testade. En snabb fråga.',
        headline: 'Tack för att du testade',
        lead: (date) => `Tack för att du provade LexiClash. Din kostnadsfria lärartillgång slutade ${date}.`,
        body: 'Vill du ta tillbaka det till klassen kostar Teacher Pro 9 $ i månaden, och du kan avsluta när du vill.',
        cta: 'Se Teacher Pro',
      },
    },
    askTitle: 'En fråga',
    ask: 'Om det inte passade vill jag veta vad som saknades eller vad som stod i vägen. Svara bara på det här mejlet, det kommer direkt till mig.',
    classroom: 'Öppna mitt klassrum',
    signoff: 'Tack, Ohad (jag bygger LexiClash)',
    footnote: 'Du får det här för att du startade kostnadsfri lärartillgång på LexiClash.',
    dir: 'ltr',
  },
  ja: {
    greeting: (n) => (n ? `${n}さん、こんにちは。` : 'こんにちは。'),
    kicker: '先生向け',
    buckets: {
      't-3': {
        subject: (date) => `LexiClashの無料体験は${date}で終了します`,
        preheader: '無料アクセスの終了日のお知らせと、率直な質問がひとつあります。',
        headline: '無料期間がまもなく終わります',
        lead: (date) => `先生向けの無料アクセスは${date}で終了します。`,
        body: 'LexiClashが授業で役に立っているようでしたら、Teacher Proで引き続きお使いいただけます。月額9ドルで、いつでも解約できます。もしお役に立てていなかったなら、それも教えていただけるとありがたいです。',
        cta: 'Teacher Proを続ける',
      },
      't-0': {
        subject: () => 'LexiClashの無料体験は本日で終了します',
        preheader: '無料アクセスが終わる前に、ひとことお知らせです。',
        headline: '無料期間は本日までです',
        lead: () => '先生向けの無料アクセスは本日で終了します。',
        body: 'これからもクラスで遊びたい場合は、Teacher Proを月額9ドルでご利用いただけます。解約はいつでもできます。',
        cta: 'Teacher Proを続ける',
      },
      't+3': {
        subject: () => 'LexiClashの無料体験が終了しました',
        preheader: 'お試しいただきありがとうございました。ひとつだけ質問させてください。',
        headline: 'お試しいただきありがとうございました',
        lead: (date) => `LexiClashをお試しいただきありがとうございました。先生向けの無料アクセスは${date}で終了しました。`,
        body: 'またクラスで使いたくなりましたら、Teacher Proを月額9ドルでご利用いただけます。解約はいつでもできます。',
        cta: 'Teacher Proを見る',
      },
    },
    askTitle: 'ひとつ質問です',
    ask: '合わなかった場合は、何が足りなかったのか、何が使いにくかったのかを教えていただけませんか。このメールにそのまま返信してください。いただいた返信はすべて私が自分で読んでいます。',
    classroom: '自分のクラスを開く',
    signoff: 'ありがとうございます。Ohad（LexiClashを作っています）',
    footnote: 'LexiClashで先生向けの無料アクセスを始められた方にお送りしています。',
    dir: 'ltr',
  },
  es: {
    greeting: (n) => (n ? `Hola, ${n}:` : 'Hola:'),
    kicker: 'Para docentes',
    buckets: {
      't-3': {
        subject: (date) => `Tu prueba de LexiClash termina el ${date}`,
        preheader: 'Cuándo termina tu acceso, y una pregunta sincera.',
        headline: 'Tu acceso gratuito termina pronto',
        lead: (date) => `Tu acceso gratuito para docentes termina el ${date}.`,
        body: 'Si LexiClash se ha ganado un lugar en tus clases, con Teacher Pro puedes seguir usándolo por 9 dólares al mes y cancelar cuando quieras. Si no ha sido así, también me sirve saberlo.',
        cta: 'Seguir con Teacher Pro',
      },
      't-0': {
        subject: () => 'Tu prueba de LexiClash termina hoy',
        preheader: 'Una nota rápida antes de que termine tu acceso gratuito.',
        headline: 'Tu acceso gratuito termina hoy',
        lead: () => 'Tu acceso gratuito para docentes termina hoy.',
        body: 'Si quieres seguir jugando con tu clase, Teacher Pro cuesta 9 dólares al mes y puedes cancelar en cualquier momento.',
        cta: 'Seguir con Teacher Pro',
      },
      't+3': {
        subject: () => 'Tu prueba de LexiClash ha terminado',
        preheader: 'Gracias por probarlo. Solo una pregunta rápida.',
        headline: 'Gracias por probar LexiClash',
        lead: (date) => `Gracias por probar LexiClash. Tu acceso gratuito para docentes terminó el ${date}.`,
        body: 'Si quieres volver a usarlo con tu clase, Teacher Pro cuesta 9 dólares al mes y puedes cancelar en cualquier momento.',
        cta: 'Ver Teacher Pro',
      },
    },
    askTitle: 'Una pregunta',
    ask: '¿No terminó de encajar? Respóndeme y cuéntame qué faltó o qué te lo puso difícil. Leo cada respuesta yo mismo.',
    classroom: 'Abrir mi clase',
    signoff: 'Gracias, Ohad (soy quien hace LexiClash)',
    footnote: 'Te llega este correo porque activaste el acceso gratuito para docentes en LexiClash.',
    dir: 'ltr',
  },
  ru: {
    greeting: (n) => (n ? `Здравствуйте, ${n}!` : 'Здравствуйте!'),
    kicker: 'Для учителей',
    buckets: {
      't-3': {
        subject: (date) => `Пробный период LexiClash закончится ${date}`,
        preheader: 'Когда заканчивается доступ, и один честный вопрос.',
        headline: 'Бесплатный доступ скоро закончится',
        lead: (date) => `Ваш бесплатный доступ для учителей закончится ${date}.`,
        body: 'Если LexiClash прижился на ваших уроках, с Teacher Pro всё будет работать дальше за 9 долларов в месяц, а отменить подписку можно когда угодно. Если не прижился, мне это тоже полезно знать.',
        cta: 'Продолжить с Teacher Pro',
      },
      't-0': {
        subject: () => 'Пробный период LexiClash заканчивается сегодня',
        preheader: 'Короткое письмо, пока бесплатный доступ ещё действует.',
        headline: 'Бесплатный доступ заканчивается сегодня',
        lead: () => 'Ваш бесплатный доступ для учителей заканчивается сегодня.',
        body: 'Если хотите и дальше играть с классом, Teacher Pro стоит 9 долларов в месяц, и отменить его можно в любой момент.',
        cta: 'Продолжить с Teacher Pro',
      },
      't+3': {
        subject: () => 'Пробный период LexiClash закончился',
        preheader: 'Спасибо, что попробовали. И один короткий вопрос.',
        headline: 'Спасибо, что попробовали LexiClash',
        lead: (date) => `Спасибо, что попробовали LexiClash. Ваш бесплатный доступ для учителей закончился ${date}.`,
        body: 'Если захотите вернуть игру в класс, Teacher Pro стоит 9 долларов в месяц, и отменить его можно в любой момент.',
        cta: 'Посмотреть Teacher Pro',
      },
    },
    askTitle: 'Один вопрос',
    ask: 'Не подошло? Ответьте на это письмо и расскажите, чего не хватило или что мешало. Я сам читаю каждый ответ.',
    classroom: 'Открыть мой класс',
    signoff: 'Спасибо, Охад (я делаю LexiClash)',
    footnote: 'Вы получили это письмо, потому что подключили бесплатный доступ для учителей в LexiClash.',
    dir: 'ltr',
  },
};

export function teacherTrialReminder({ full_name, locale, bucket, trialExpiresAt }: Args) {
  const lang: TeacherLocale = locale in COPY ? locale : 'en';
  const c = COPY[lang];
  const b = c.buckets[bucket];
  const dateStr = new Date(trialExpiresAt).toLocaleDateString(DATE_LOCALE[lang], {
    month: 'long', day: 'numeric',
  });

  const html = renderNeoEmail({
    lang,
    dir: c.dir,
    preheader: b.preheader,
    accent: ACCENT[bucket],
    art: 'hourglass',
    kicker: c.kicker,
    headline: b.headline,
    greeting: c.greeting(firstName(full_name)),
    blocks: [
      { type: 'p', text: b.lead(dateStr), strong: true },
      { type: 'p', text: b.body },
      { type: 'callout', title: c.askTitle, text: c.ask },
    ],
    cta: { label: b.cta, href: teacherEmailUrl(lang, '/teacher/upgrade', `trial_${bucket}`) },
    secondary: { label: c.classroom, href: teacherEmailUrl(lang, '/teacher', `trial_${bucket}`) },
    signoff: c.signoff,
    footnote: c.footnote,
  });

  return { subject: b.subject(dateStr), html };
}
