import type { TeacherLocale } from '@/lib/education/types';
import { day2ReportUrl, day2UpgradeUrl } from '@/lib/education/day2ValueEmail';
import { renderNeoEmail } from '@/lib/email/kit/neoEmail';
import { TEACHER_EMAIL_REPLY_TO, firstName } from './teacherEmailLayout';

interface Args {
  fullName: string;
  locale: TeacherLocale;
  studentsJoined: number;
  gamesPlayed: number;
}

interface Copy {
  subject: (n: number, m: number) => string;
  preheader: string;
  kicker: string;
  headline: string;
  greeting: (name: string) => string;
  /** English must keep the phrase "N students joined, M games played". */
  lead: (n: number, m: number) => string;
  students: string;
  games: string;
  reportWhy: string;
  report: string;
  /** Quiet secondary link to Teacher Pro, never a second button and never carrying the price. */
  pro: string;
  /** Softened free-plan claim. Never the hard line "no card required, nothing renews automatically". */
  reassurance: string;
  price: string;
  signoff: string;
  dir: 'ltr' | 'rtl';
}

const COPY: Record<TeacherLocale, Copy> = {
  en: {
    subject: (n, m) => `Your class, 2 days in: ${n} students, ${m} games`,
    preheader: 'Your first numbers are in. Here is where to see who played.',
    kicker: 'Two days in',
    headline: 'Your class after two days',
    greeting: (name) => `Hi ${name},`,
    lead: (n, m) => `${n} students joined, ${m} games played in your class.`,
    students: 'students joined',
    games: 'games played',
    reportWhy: 'The progress report shows how each student is doing, so you can see who is keeping up before the next lesson.',
    report: 'Open the progress report',
    pro: 'See what Teacher Pro adds',
    reassurance: 'The free plan stays free. No card is needed to keep using it, and you will not be charged unless you choose to upgrade.',
    price: 'Teacher Pro is $9/month: unlimited classes and the full progress report. Cancel any time.',
    signoff: 'Ohad, who built LexiClash. If something got stuck or you have a question, just reply. I read every one.',
    dir: 'ltr',
  },
  he: {
    subject: (n, m) => `יומיים לכיתה: ${n} תלמידים, ${m} משחקים`,
    preheader: 'המספרים הראשונים כבר כאן. ככה רואים מי שיחק.',
    kicker: 'יומיים בפנים',
    headline: 'הכיתה שלך אחרי יומיים',
    greeting: (name) => `היי ${name},`,
    lead: (n, m) => `${n} תלמידים הצטרפו ו-${m} משחקים שוחקו בכיתה שלך.`,
    students: 'תלמידים הצטרפו',
    games: 'משחקים שוחקו',
    reportWhy: 'בדוח ההתקדמות רואים איך כל תלמיד מתקדם, וככה יודעים מי עומד בקצב עוד לפני השיעור הבא.',
    report: 'לפתוח את דוח ההתקדמות',
    pro: 'מה יש ב-Teacher Pro',
    reassurance: 'התוכנית החינמית נשארת חינמית. לא צריך כרטיס אשראי כדי להמשיך להשתמש בה, ואין שום חיוב אלא אם בוחרים לשדרג.',
    price: 'Teacher Pro עולה 9$ לחודש: כיתות ללא הגבלה ודוח התקדמות מלא. אפשר לבטל בכל רגע.',
    signoff: 'אוהד, שבנה את LexiClash. נתקעתם או שיש שאלה? פשוט עונים למייל, אני קורא כל תשובה.',
    dir: 'rtl',
  },
  sv: {
    subject: (n, m) => `Din klass efter 2 dagar: ${n} elever, ${m} spel`,
    preheader: 'De första siffrorna är här. Så ser du vem som har spelat.',
    kicker: 'Två dagar in',
    headline: 'Din klass efter två dagar',
    greeting: (name) => `Hej ${name},`,
    lead: (n, m) => `${n} elever har gått med och ${m} spel har spelats i din klass.`,
    students: 'elever med',
    games: 'spel spelade',
    reportWhy: 'I framstegsrapporten ser du hur det går för varje elev, så du vet vem som hänger med före nästa lektion.',
    report: 'Öppna framstegsrapporten',
    pro: 'Se vad Teacher Pro ger',
    reassurance: 'Den kostnadsfria planen förblir gratis. Du behöver inget kort för att fortsätta använda den, och vi debiterar dig inte om du inte själv väljer att uppgradera.',
    price: 'Teacher Pro kostar $9/månad: obegränsade klasser och hela framstegsrapporten. Avsluta när du vill.',
    signoff: 'Ohad, som byggde LexiClash. Har du fastnat eller undrar något? Svara bara på mejlet, jag läser alla.',
    dir: 'ltr',
  },
  ja: {
    subject: (n, m) => `クラス開始2日目: 生徒${n}人、ゲーム${m}回`,
    preheader: '最初の数字が出ました。誰が遊んだかはここで確認できます。',
    kicker: '開始から2日',
    headline: '2日間のクラスの様子',
    greeting: (name) => `${name} 先生`,
    lead: (n, m) => `クラスに生徒が${n}人参加し、ゲームが${m}回プレイされました。`,
    students: '参加した生徒',
    games: 'プレイ回数',
    reportWhy: '進捗レポートでは生徒一人ひとりの様子が分かるので、次の授業の前に誰がついてきているか確認できます。',
    report: '進捗レポートを開く',
    pro: 'Teacher Proでできること',
    reassurance: '無料プランはそのまま無料です。使い続けるのにカードは不要で、アップグレードを選ばない限り請求されることはありません。',
    price: 'Teacher Proは月額$9です。クラス数無制限と完全な進捗レポート。いつでも解約できます。',
    signoff: 'LexiClash作者のOhadより。困ったことや質問があれば、このメールに返信してください。すべて読んでいます。',
    dir: 'ltr',
  },
  es: {
    subject: (n, m) => `Tu clase a los 2 días: ${n} estudiantes, ${m} juegos`,
    preheader: 'Ya tienes los primeros números. Aquí ves quién ha jugado.',
    kicker: 'Dos días después',
    headline: 'Tu clase tras dos días',
    greeting: (name) => `Hola, ${name}:`,
    lead: (n, m) => `${n} estudiantes se unieron y se jugaron ${m} juegos en tu clase.`,
    students: 'estudiantes',
    games: 'juegos jugados',
    reportWhy: 'En el informe de progreso ves cómo va cada estudiante, así sabes quién sigue el ritmo antes de la próxima clase.',
    report: 'Abrir el informe de progreso',
    pro: 'Ver qué añade Teacher Pro',
    reassurance: 'El plan gratuito sigue siendo gratis. No necesitas tarjeta para seguir usándolo, y no te cobraremos a menos que decidas mejorar a Pro.',
    price: 'Teacher Pro cuesta $9 al mes: clases ilimitadas y el informe de progreso completo. Cancela cuando quieras.',
    signoff: 'Ohad, creador de LexiClash. Si algo se atascó o tienes una pregunta, responde a este correo. Los leo todos.',
    dir: 'ltr',
  },
  ru: {
    subject: (n, m) => `Ваш класс через 2 дня: ${n} учеников, ${m} игр`,
    preheader: 'Первые цифры уже есть. Вот где видно, кто играл.',
    kicker: 'Два дня спустя',
    headline: 'Ваш класс за два дня',
    greeting: (name) => `Здравствуйте, ${name}!`,
    lead: (n, m) => `${n} учеников присоединились, ${m} игр сыграно в вашем классе.`,
    students: 'учеников',
    games: 'игр сыграно',
    reportWhy: 'В отчёте о прогрессе видно, как идут дела у каждого ученика, и можно понять, кто успевает, ещё до следующего урока.',
    report: 'Открыть отчёт о прогрессе',
    pro: 'Что даёт Teacher Pro',
    reassurance: 'Бесплатный план остаётся бесплатным. Карта не нужна, чтобы продолжать им пользоваться, и мы не спишем деньги, пока вы сами не решите перейти на Pro.',
    price: 'Teacher Pro стоит $9 в месяц: неограниченные классы и полный отчёт о прогрессе. Отмена в любой момент.',
    signoff: 'Охад, автор LexiClash. Если что-то не получилось или есть вопрос, просто ответьте на письмо. Я читаю каждое.',
    dir: 'ltr',
  },
};

export function teacherDay2Value({ fullName, locale, studentsJoined, gamesPlayed }: Args): {
  subject: string;
  html: string;
  replyTo: string;
} {
  const c = COPY[locale] ?? COPY.en;
  const n = Math.max(0, Math.floor(studentsJoined));
  const m = Math.max(0, Math.floor(gamesPlayed));
  const html = renderNeoEmail({
    lang: locale,
    dir: c.dir,
    preheader: c.preheader,
    accent: 'cyan',
    art: 'report',
    kicker: c.kicker,
    headline: c.headline,
    greeting: c.greeting(firstName(fullName) || 'Teacher'),
    blocks: [
      { type: 'stats', items: [{ value: String(n), label: c.students }, { value: String(m), label: c.games }] },
      { type: 'p', text: c.lead(n, m) },
      { type: 'p', text: c.reportWhy },
    ],
    cta: { label: c.report, href: day2ReportUrl(locale) },
    secondary: { label: c.pro, href: day2UpgradeUrl(locale) },
    signoff: c.signoff,
    footnote: `${c.reassurance} ${c.price}`,
  });
  return { subject: c.subject(n, m), html, replyTo: TEACHER_EMAIL_REPLY_TO };
}

export const TEACHER_DAY2_REPORT_PATH = '/teacher/reports';
export const TEACHER_DAY2_UPGRADE_PATH = '/teacher/upgrade';
