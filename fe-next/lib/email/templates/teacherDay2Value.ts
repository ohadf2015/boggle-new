import type { TeacherLocale } from '@/lib/education/types';
import { day2ReportUrl, day2UpgradeUrl } from '@/lib/education/day2ValueEmail';

interface Args {
  fullName: string;
  locale: TeacherLocale;
  studentsJoined: number;
  gamesPlayed: number;
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface Copy {
  subject: (n: number, m: number) => string;
  greeting: (name: string) => string;
  /** English must keep the phrase "N students joined, M games played". */
  lead: (n: number, m: number) => string;
  report: string;
  pro: string;
  price: string;
  ask: string;
  signoff: string;
  dir: 'ltr' | 'rtl';
}

const CONTACT = 'ohadf2015@gmail.com';

const COPY: Partial<Record<TeacherLocale, Copy>> & { en: Copy } = {
  en: {
    subject: (n, m) => `Your class, 2 days in: ${n} students, ${m} games`,
    greeting: (name) => `Hi ${name},`,
    lead: (n, m) => `${n} students joined, ${m} games played in your class.`,
    report: 'Open the progress report',
    pro: 'Unlock Teacher Pro — $9/mo',
    price: 'Teacher Pro is $9/month: unlimited classes and the full progress report. Cancel any time.',
    ask: 'Hit a problem or have a question? Just reply to this email — I read every one.',
    signoff: '— Ohad, the creator of LexiClash',
    dir: 'ltr',
  },
  he: {
    subject: (n, m) => `יומיים לכיתה: ${n} תלמידים, ${m} משחקים`,
    greeting: (name) => `שלום ${name},`,
    lead: (n, m) => `${n} תלמידים הצטרפו, ${m} משחקים שוחקו בכיתה שלך.`,
    report: 'לפתוח את דוח ההתקדמות',
    pro: 'לשדרג ל-Teacher Pro — 9$ לחודש',
    price: 'Teacher Pro עולה 9$ לחודש: כיתות ללא הגבלה ודוח התקדמות מלא. אפשר לבטל בכל רגע.',
    ask: 'נתקעת או שיש לך שאלה? פשוט השב/י למייל הזה — אני קורא הכול.',
    signoff: '— אוהד, היוצר של LexiClash',
    dir: 'rtl',
  },
  sv: {
    subject: (n, m) => `Din klass efter 2 dagar: ${n} elever, ${m} spel`,
    greeting: (name) => `Hej ${name},`,
    lead: (n, m) => `${n} elever har gått med och ${m} spel har spelats i din klass.`,
    report: 'Öppna framstegsrapporten',
    pro: 'Lås upp Teacher Pro — $9/mån',
    price: 'Teacher Pro kostar $9/månad: obegränsade klasser och hela framstegsrapporten. Avsluta när du vill.',
    ask: 'Fastnade du eller har du en fråga? Svara på det här mejlet — jag läser alla.',
    signoff: '— Ohad, skaparen av LexiClash',
    dir: 'ltr',
  },
  ja: {
    subject: (n, m) => `クラス開始2日目: 生徒${n}人、ゲーム${m}回`,
    greeting: (name) => `${name} 先生`,
    lead: (n, m) => `クラスに生徒が${n}人参加し、ゲームが${m}回プレイされました。`,
    report: '進捗レポートを開く',
    pro: 'Teacher Proを解除 — 月額$9',
    price: 'Teacher Proは月額$9です。クラス数無制限と完全な進捗レポート。いつでも解約できます。',
    ask: '困ったことや質問があれば、このメールに返信してください。すべて読みます。',
    signoff: '— LexiClashの作者、Ohad',
    dir: 'ltr',
  },
  es: {
    subject: (n, m) => `Tu clase a los 2 días: ${n} estudiantes, ${m} juegos`,
    greeting: (name) => `Hola ${name},`,
    lead: (n, m) => `${n} estudiantes se unieron y se jugaron ${m} juegos en tu clase.`,
    report: 'Abrir el informe de progreso',
    pro: 'Activa Teacher Pro — $9/mes',
    price: 'Teacher Pro cuesta $9 al mes: clases ilimitadas y el informe de progreso completo. Cancela cuando quieras.',
    ask: '¿Algo falló o tienes una pregunta? Responde a este correo — los leo todos.',
    signoff: '— Ohad, el creador de LexiClash',
    dir: 'ltr',
  },
  ru: {
    subject: (n, m) => `Ваш класс через 2 дня: ${n} учеников, ${m} игр`,
    greeting: (name) => `Здравствуйте, ${name}!`,
    lead: (n, m) => `${n} учеников присоединились, ${m} игр сыграно в вашем классе.`,
    report: 'Открыть отчёт о прогрессе',
    pro: 'Подключить Teacher Pro — $9/мес',
    price: 'Teacher Pro стоит $9 в месяц: неограниченные классы и полный отчёт о прогрессе. Отмена в любой момент.',
    ask: 'Что-то не так или есть вопрос? Просто ответьте на это письмо — я читаю каждое.',
    signoff: '— Охад, автор LexiClash',
    dir: 'ltr',
  },
};

function copyFor(locale: TeacherLocale): Copy {
  return COPY[locale] ?? COPY.en;
}

export function teacherDay2Value({ fullName, locale, studentsJoined, gamesPlayed }: Args): {
  subject: string;
  html: string;
  replyTo: string;
} {
  const copy = copyFor(locale);
  const n = Math.max(0, Math.floor(studentsJoined));
  const m = Math.max(0, Math.floor(gamesPlayed));
  const name = escape(fullName || 'Teacher');
  const report = day2ReportUrl(locale);
  const upgrade = day2UpgradeUrl(locale);
  const html = `<!DOCTYPE html><html><body dir="${copy.dir}" style="font-family:Arial,Helvetica,sans-serif;color:#0b1220;line-height:1.5">
<p>${escape(copy.greeting(fullName || 'Teacher'))}</p>
<p>${escape(copy.lead(n, m))}</p>
<p><a href="${report}" style="display:inline-block;background:#7CFF6B;color:#0b1220;font-weight:800;padding:12px 20px;text-decoration:none;border-radius:8px">${escape(copy.report)}</a></p>
<p>${escape(copy.price)}</p>
<p><a href="${upgrade}" style="display:inline-block;background:#ff4d8d;color:#0b1220;font-weight:800;padding:12px 20px;text-decoration:none;border-radius:8px">${escape(copy.pro)}</a></p>
<p>${escape(copy.ask)}</p>
<p>${escape(copy.signoff)}</p>
</body></html>`;
  return { subject: copy.subject(n, m), html, replyTo: CONTACT };
}

export const TEACHER_DAY2_REPORT_PATH = '/teacher/reports';
export const TEACHER_DAY2_UPGRADE_PATH = '/teacher/upgrade';
