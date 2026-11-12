import type { TeacherLocale } from '@/lib/education/types';
import {
  polarTrialExpiryUpgradeUrl,
  type PolarTrialExpiryBucket,
} from '@/lib/education/polarTrialExpiryJourney';
import { renderNeoEmail, type NeoAccent, type NeoArt } from '@/lib/email/kit/neoEmail';

export interface WinbackStats {
  classrooms: number;
  gamesLast30d: number;
}

interface Args {
  full_name: string;
  locale: TeacherLocale;
  bucket: PolarTrialExpiryBucket;
  trialExpiresAt: string;
  stats?: WinbackStats | null;
}

type WinbackBucket = 't+14' | 't+30';

const DATE_LOCALE: Record<TeacherLocale, string> = {
  en: 'en-US', he: 'he-IL', sv: 'sv-SE', ja: 'ja-JP', es: 'es-ES', ru: 'ru-RU',
};

const LOOK: Record<PolarTrialExpiryBucket, { accent: NeoAccent; art: NeoArt }> = {
  't-0': { accent: 'orange', art: 'hourglass' },
  't+3': { accent: 'purple', art: 'report' },
  't+14': { accent: 'pink', art: 'miss-you' },
  't+30': { accent: 'cyan', art: 'miss-you' },
};

interface BucketCopy {
  subject: (date: string) => string;
  preheader: string;
  headline: string;
  lead: (date: string) => string;
  cta: string;
}

interface WinbackCopy {
  subjectWithClasses: Record<WinbackBucket, string>;
  subjectGeneric: Record<WinbackBucket, string>;
  preheader: string;
  headlineWithClasses: string;
  headlineGeneric: string;
  classes: (n: number) => string;
  games: (n: number) => string;
  ended: (date: string) => string;
  body: string;
  cta: string;
}

interface Copy {
  kicker: string;
  greeting: (n: string) => string;
  buckets: Record<'t-0' | 't+3', BucketCopy>;
  winback: WinbackCopy;
  body: string;
  priceTitle: string;
  price: string;
  ask: string;
  signoff: string;
  dir: 'ltr' | 'rtl';
}

const CONTACT = 'lexiclash.game@gmail.com';

const COPY: Record<TeacherLocale, Copy> = {
  en: {
    kicker: 'Teacher Pro',
    greeting: (n) => `Hi ${n},`,
    buckets: {
      't-0': {
        subject: () => 'Your Teacher Pro trial ends today',
        preheader: 'Last day of the trial. Here is what happens next.',
        headline: 'Last day of your trial',
        lead: (date) => `Your 14-day Teacher Pro trial ends today, ${date}.`,
        cta: 'Keep Teacher Pro',
      },
      't+3': {
        subject: () => 'Want your Teacher Pro reports back?',
        preheader: 'Your trial ended a few days ago. Here is how to pick it back up.',
        headline: 'Your reports are paused',
        lead: (date) => `Your Teacher Pro trial ended on ${date}.`,
        cta: 'Reactivate Teacher Pro',
      },
    },
    winback: {
      subjectWithClasses: { 't+14': 'Your classes are still here', 't+30': 'Your classes are still waiting' },
      subjectGeneric: {
        't+14': 'Your Teacher Pro trial ended two weeks ago',
        't+30': 'A month since your Teacher Pro trial',
      },
      preheader: 'Nothing was deleted. Pick it up whenever suits you.',
      headlineWithClasses: 'Your classes are still here',
      headlineGeneric: 'Whenever you are ready',
      classes: (n) =>
        n === 1
          ? 'Your class is still on LexiClash, with every student and word list where you left it.'
          : `Your ${n} classes are still on LexiClash, with every student and word list where you left them.`,
      games: (n) =>
        n === 1
          ? 'Your students played 1 live game in the last 30 days.'
          : `Your students played ${n} live games in the last 30 days.`,
      ended: (date) => `Your Teacher Pro trial ended on ${date}.`,
      body: 'Nothing was deleted, so you can pick up where you left off whenever you are ready.',
      cta: 'Reactivate Teacher Pro',
    },
    body: 'The weekly numbers on your dashboard come from the classroom you already ran. With Teacher Pro the reports and unlimited classes keep going.',
    priceTitle: 'Teacher Pro, $9 a month',
    price: 'Unlimited classrooms, live word games and the progress dashboard. You can cancel any time.',
    ask: `If it's not the right fit, reply and tell me why. I read every one: ${CONTACT}`,
    signoff: 'Ohad, who built LexiClash',
    dir: 'ltr',
  },
  he: {
    kicker: 'Teacher Pro',
    greeting: (n) => `שלום ${n},`,
    buckets: {
      't-0': {
        subject: () => 'תקופת הניסיון של Teacher Pro מסתיימת היום',
        preheader: 'היום האחרון של הניסיון. ככה זה ממשיך.',
        headline: 'היום האחרון של הניסיון',
        lead: (date) => `תקופת הניסיון של 14 יום ל-Teacher Pro מסתיימת היום, ${date}.`,
        cta: 'להמשיך עם Teacher Pro',
      },
      't+3': {
        subject: () => 'רוצה את הדוחות של Teacher Pro בחזרה?',
        preheader: 'הניסיון נגמר לפני כמה ימים. ככה חוזרים אליו.',
        headline: 'הדוחות שלך בהשהיה',
        lead: (date) => `תקופת הניסיון של Teacher Pro הסתיימה ב-${date}.`,
        cta: 'להפעיל מחדש את Teacher Pro',
      },
    },
    winback: {
      subjectWithClasses: { 't+14': 'הכיתות שלך עדיין כאן', 't+30': 'הכיתות שלך עדיין מחכות' },
      subjectGeneric: {
        't+14': 'תקופת הניסיון של Teacher Pro הסתיימה לפני שבועיים',
        't+30': 'עבר חודש מאז תקופת הניסיון של Teacher Pro',
      },
      preheader: 'שום דבר לא נמחק. אפשר לחזור מתי שנוח.',
      headlineWithClasses: 'הכיתות שלך עדיין כאן',
      headlineGeneric: 'מתי שנוח לך',
      classes: (n) =>
        n === 1
          ? 'הכיתה שלך עדיין ב-LexiClash, עם כל התלמידים ורשימות המילים בדיוק איפה שהשארת אותם.'
          : `${n} הכיתות שלך עדיין ב-LexiClash, עם כל התלמידים ורשימות המילים בדיוק איפה שהשארת אותם.`,
      games: (n) =>
        n === 1
          ? 'התלמידים שלך שיחקו משחק חי אחד ב-30 הימים האחרונים.'
          : `התלמידים שלך שיחקו ${n} משחקים חיים ב-30 הימים האחרונים.`,
      ended: (date) => `תקופת הניסיון של Teacher Pro הסתיימה ב-${date}.`,
      body: 'שום דבר לא נמחק, אז אפשר להמשיך מאיפה שעצרת מתי שנוח לך.',
      cta: 'להפעיל מחדש את Teacher Pro',
    },
    body: 'המספרים השבועיים בלוח מגיעים מהכיתה שכבר הרצת. עם Teacher Pro הדוחות והכיתות ללא הגבלה ממשיכים לעבוד.',
    priceTitle: 'Teacher Pro ב-9$ לחודש',
    price: 'כיתות ללא הגבלה, משחקי מילים חיים ולוח מעקב התקדמות. אפשר לבטל בכל רגע.',
    ask: `אם זה לא מתאים, אפשר להשיב ולספר לי למה. אני קורא כל תשובה: ${CONTACT}`,
    signoff: 'אוהד, שבנה את LexiClash',
    dir: 'rtl',
  },
  sv: {
    kicker: 'Teacher Pro',
    greeting: (n) => `Hej ${n},`,
    buckets: {
      't-0': {
        subject: () => 'Din provperiod med Teacher Pro tar slut i dag',
        preheader: 'Sista dagen av provperioden. Så här fortsätter det.',
        headline: 'Sista dagen av din provperiod',
        lead: (date) => `Din provperiod på 14 dagar med Teacher Pro tar slut i dag, ${date}.`,
        cta: 'Behåll Teacher Pro',
      },
      't+3': {
        subject: () => 'Vill du ha tillbaka dina rapporter i Teacher Pro?',
        preheader: 'Provperioden tog slut för några dagar sedan. Så här kommer du igång igen.',
        headline: 'Dina rapporter är pausade',
        lead: (date) => `Din provperiod med Teacher Pro tog slut den ${date}.`,
        cta: 'Aktivera Teacher Pro igen',
      },
    },
    winback: {
      subjectWithClasses: { 't+14': 'Dina klasser finns kvar', 't+30': 'Dina klasser väntar fortfarande på dig' },
      subjectGeneric: {
        't+14': 'Din provperiod med Teacher Pro tog slut för två veckor sedan',
        't+30': 'Det har gått en månad sedan din provperiod med Teacher Pro',
      },
      preheader: 'Inget har raderats. Fortsätt när det passar dig.',
      headlineWithClasses: 'Dina klasser finns kvar',
      headlineGeneric: 'När du känner dig redo',
      classes: (n) =>
        n === 1
          ? 'Din klass finns kvar på LexiClash, med alla elever och ordlistor precis där du lämnade dem.'
          : `Dina ${n} klasser finns kvar på LexiClash, med alla elever och ordlistor precis där du lämnade dem.`,
      games: (n) =>
        n === 1
          ? 'Dina elever spelade 1 livespel de senaste 30 dagarna.'
          : `Dina elever spelade ${n} livespel de senaste 30 dagarna.`,
      ended: (date) => `Din provperiod med Teacher Pro tog slut den ${date}.`,
      body: 'Inget har raderats, så du kan fortsätta där du slutade när du vill.',
      cta: 'Aktivera Teacher Pro igen',
    },
    body: 'Veckosiffrorna på din översikt kommer från klassrummet du redan har kört. Med Teacher Pro fortsätter rapporterna och du får obegränsat med klasser.',
    priceTitle: 'Teacher Pro, 9 $ i månaden',
    price: 'Obegränsat med klassrum, ordspel i realtid och översikten över elevernas framsteg. Du kan säga upp när du vill.',
    ask: `Om det inte passar dig får du gärna svara och berätta varför. Jag läser varje svar: ${CONTACT}`,
    signoff: 'Ohad, som byggde LexiClash',
    dir: 'ltr',
  },
  ja: {
    kicker: 'Teacher Pro',
    greeting: (n) => `${n} 様`,
    buckets: {
      't-0': {
        subject: () => 'Teacher Pro の無料体験は本日で終了します',
        preheader: '無料体験の最終日です。このあとの流れをご案内します。',
        headline: '無料体験は本日が最終日です',
        lead: (date) => `14日間の Teacher Pro 無料体験は本日 ${date} で終了します。`,
        cta: 'Teacher Pro を続ける',
      },
      't+3': {
        subject: () => 'Teacher Pro のレポートをまた使いませんか？',
        preheader: '無料体験は数日前に終了しました。再開の方法をご案内します。',
        headline: 'レポートは一時停止中です',
        lead: (date) => `Teacher Pro の無料体験は ${date} に終了しました。`,
        cta: 'Teacher Pro を再開する',
      },
    },
    winback: {
      subjectWithClasses: { 't+14': 'クラスはそのまま残っています', 't+30': 'クラスは今もそのままお待ちしています' },
      subjectGeneric: {
        't+14': 'Teacher Pro の無料体験が終了して2週間が経ちました',
        't+30': 'Teacher Pro の無料体験から1か月が経ちました',
      },
      preheader: 'データは何も削除されていません。ご都合のよいときに再開できます。',
      headlineWithClasses: 'クラスはそのまま残っています',
      headlineGeneric: 'ご準備ができたときにいつでも',
      classes: (n) =>
        n === 1
          ? 'クラスは LexiClash にそのまま残っていて、生徒も単語リストも前回のままです。'
          : `${n} 件のクラスは LexiClash にそのまま残っていて、生徒も単語リストも前回のままです。`,
      games: (n) => `この30日間で、生徒の皆さんはライブゲームを ${n} 回プレイしました。`,
      ended: (date) => `Teacher Pro の無料体験は ${date} に終了しました。`,
      body: 'データは何も削除されていないので、ご準備ができたらいつでも前回の続きから始められます。',
      cta: 'Teacher Pro を再開する',
    },
    body: 'ダッシュボードの週ごとの数字は、すでに実施されたクラスのものです。Teacher Pro なら、レポートも無制限のクラスもそのまま使い続けられます。',
    priceTitle: 'Teacher Pro 月額 9 ドル',
    price: 'クラス数は無制限、ライブの単語ゲームと学習の進み具合がわかるダッシュボードが使えます。解約はいつでもできます。',
    ask: `もし合わないと感じられたら、このメールに返信して理由を教えていただけるとうれしいです。いただいた返信はすべて読んでいます: ${CONTACT}`,
    signoff: 'LexiClash 開発者 Ohad',
    dir: 'ltr',
  },
  es: {
    kicker: 'Teacher Pro',
    greeting: (n) => `Hola, ${n}:`,
    buckets: {
      't-0': {
        subject: () => 'Tu prueba de Teacher Pro termina hoy',
        preheader: 'Es el último día de la prueba. Te cuento qué pasa ahora.',
        headline: 'Último día de tu prueba',
        lead: (date) => `Tu prueba de 14 días de Teacher Pro termina hoy, ${date}.`,
        cta: 'Seguir con Teacher Pro',
      },
      't+3': {
        subject: () => '¿Quieres recuperar tus informes de Teacher Pro?',
        preheader: 'Tu prueba terminó hace unos días. Así puedes retomarla.',
        headline: 'Tus informes están en pausa',
        lead: (date) => `Tu prueba de Teacher Pro terminó el ${date}.`,
        cta: 'Reactivar Teacher Pro',
      },
    },
    winback: {
      subjectWithClasses: { 't+14': 'Tus clases siguen aquí', 't+30': 'Tus clases te siguen esperando' },
      subjectGeneric: {
        't+14': 'Tu prueba de Teacher Pro terminó hace dos semanas',
        't+30': 'Ya pasó un mes desde tu prueba de Teacher Pro',
      },
      preheader: 'No se borró nada. Puedes retomarlo cuando te venga bien.',
      headlineWithClasses: 'Tus clases siguen aquí',
      headlineGeneric: 'Cuando quieras',
      classes: (n) =>
        n === 1
          ? 'Tu clase sigue en LexiClash, con todos tus alumnos y listas de palabras tal como los dejaste.'
          : `Tus ${n} clases siguen en LexiClash, con todos tus alumnos y listas de palabras tal como los dejaste.`,
      games: (n) =>
        n === 1
          ? 'Tus alumnos jugaron 1 partida en vivo en los últimos 30 días.'
          : `Tus alumnos jugaron ${n} partidas en vivo en los últimos 30 días.`,
      ended: (date) => `Tu prueba de Teacher Pro terminó el ${date}.`,
      body: 'No se borró nada, así que puedes seguir donde lo dejaste cuando quieras.',
      cta: 'Reactivar Teacher Pro',
    },
    body: 'Las cifras semanales de tu panel salen de la clase que ya hiciste. Con Teacher Pro sigues teniendo los informes y clases ilimitadas.',
    priceTitle: 'Teacher Pro, 9 $ al mes',
    price: 'Aulas ilimitadas, juegos de palabras en vivo y el panel de progreso. Puedes cancelar cuando quieras.',
    ask: `Si no te encaja, respóndeme y cuéntame por qué. Leo todas las respuestas: ${CONTACT}`,
    signoff: 'Ohad, el creador de LexiClash',
    dir: 'ltr',
  },
  ru: {
    kicker: 'Teacher Pro',
    greeting: (n) => `Здравствуйте, ${n}!`,
    buckets: {
      't-0': {
        subject: () => 'Пробный период Teacher Pro заканчивается сегодня',
        preheader: 'Сегодня последний день пробного периода. Рассказываю, что будет дальше.',
        headline: 'Последний день пробного периода',
        lead: (date) => `Ваш 14-дневный пробный период Teacher Pro заканчивается сегодня, ${date}.`,
        cta: 'Оставить Teacher Pro',
      },
      't+3': {
        subject: () => 'Хотите вернуть отчёты Teacher Pro?',
        preheader: 'Пробный период закончился несколько дней назад. Вот как к нему вернуться.',
        headline: 'Ваши отчёты на паузе',
        lead: (date) => `Пробный период Teacher Pro закончился ${date}.`,
        cta: 'Снова включить Teacher Pro',
      },
    },
    winback: {
      subjectWithClasses: { 't+14': 'Ваши классы на месте', 't+30': 'Ваши классы всё ещё ждут вас' },
      subjectGeneric: {
        't+14': 'Пробный период Teacher Pro закончился две недели назад',
        't+30': 'Прошёл месяц с вашего пробного периода Teacher Pro',
      },
      preheader: 'Ничего не удалено. Можно вернуться, когда вам удобно.',
      headlineWithClasses: 'Ваши классы на месте',
      headlineGeneric: 'Когда будете готовы',
      classes: (n) =>
        n === 1
          ? 'Ваш класс по-прежнему в LexiClash, все ученики и списки слов там, где вы их оставили.'
          : `Ваши классы (${n}) по-прежнему в LexiClash, все ученики и списки слов там, где вы их оставили.`,
      games: (n) => `За последние 30 дней ваши ученики сыграли живых игр: ${n}.`,
      ended: (date) => `Пробный период Teacher Pro закончился ${date}.`,
      body: 'Ничего не удалено, так что вы можете продолжить с того же места, когда будете готовы.',
      cta: 'Снова включить Teacher Pro',
    },
    body: 'Недельные цифры на вашей панели взяты из урока, который вы уже провели. С Teacher Pro отчёты продолжают приходить, а число классов не ограничено.',
    priceTitle: 'Teacher Pro, 9 $ в месяц',
    price: 'Неограниченное число классов, словесные игры в реальном времени и панель прогресса учеников. Отменить можно в любой момент.',
    ask: `Если вам это не подходит, ответьте на письмо и расскажите почему. Я читаю каждый ответ: ${CONTACT}`,
    signoff: 'Охад, создатель LexiClash',
    dir: 'ltr',
  },
};

interface Rendered {
  subject: string;
  preheader: string;
  headline: string;
  lead: string;
  paragraphs: string[];
  cta: string;
}

function renderCopy(c: Copy, bucket: PolarTrialExpiryBucket, dateStr: string, stats: WinbackStats | null): Rendered {
  if (bucket === 't-0' || bucket === 't+3') {
    const b = c.buckets[bucket];
    return { subject: b.subject(dateStr), preheader: b.preheader, headline: b.headline, lead: b.lead(dateStr), paragraphs: [c.body], cta: b.cta };
  }
  const w = c.winback;
  const hasClasses = (stats?.classrooms ?? 0) > 0;
  if (!hasClasses) {
    return { subject: w.subjectGeneric[bucket], preheader: w.preheader, headline: w.headlineGeneric, lead: w.ended(dateStr), paragraphs: [w.body], cta: w.cta };
  }
  const paragraphs = stats!.gamesLast30d > 0 ? [w.games(stats!.gamesLast30d), w.body] : [w.body];
  return {
    subject: w.subjectWithClasses[bucket],
    preheader: w.preheader,
    headline: w.headlineWithClasses,
    lead: w.classes(stats!.classrooms),
    paragraphs,
    cta: w.cta,
  };
}

export function teacherPolarTrialExpiry({ full_name, locale, bucket, trialExpiresAt, stats = null }: Args) {
  const c = COPY[locale] || COPY.en;
  const dateStr = new Date(trialExpiresAt).toLocaleDateString(DATE_LOCALE[locale] || 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const r = renderCopy(c, bucket, dateStr, stats);

  const html = renderNeoEmail({
    lang: locale,
    dir: c.dir,
    preheader: r.preheader,
    ...LOOK[bucket],
    kicker: c.kicker,
    headline: r.headline,
    greeting: c.greeting(full_name),
    blocks: [
      { type: 'p', text: r.lead, strong: true },
      ...r.paragraphs.map((text) => ({ type: 'p' as const, text })),
      { type: 'callout', title: c.priceTitle, text: c.price },
      { type: 'p', text: c.ask },
    ],
    cta: { label: r.cta, href: polarTrialExpiryUpgradeUrl(locale, bucket) },
    signoff: c.signoff,
  });

  return { subject: r.subject, html };
}
