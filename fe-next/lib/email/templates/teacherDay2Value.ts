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
  /** Softened free-plan claim. Never the hard line "no card required, nothing renews automatically". */
  reassurance: string;
  price: string;
  /** Quieter lead-in for the secondary Pro link. Not a second button. */
  proLead: string;
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
    reassurance: 'The free plan stays free. No card is needed to keep using it, and you will not be charged unless you choose to upgrade.',
    price: 'Teacher Pro is $9/month: unlimited classes and the full progress report. Cancel any time.',
    proLead: 'If you ever want more, Teacher Pro is here:',
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
    reassurance: 'התוכנית החינמית נשארת חינמית. לא צריך כרטיס אשראי כדי להמשיך להשתמש בה, ולא נחייב אותך אלא אם תבחר/י לשדרג.',
    price: 'Teacher Pro עולה 9$ לחודש: כיתות ללא הגבלה ודוח התקדמות מלא. אפשר לבטל בכל רגע.',
    proLead: 'ואם מתישהו תרצה/י יותר — Teacher Pro כאן בשבילך:',
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
    reassurance: 'Den kostnadsfria planen förblir gratis. Du behöver inget kort för att fortsätta använda den, och vi debiterar dig inte om du inte själv väljer att uppgradera.',
    price: 'Teacher Pro kostar $9/månad: obegränsade klasser och hela framstegsrapporten. Avsluta när du vill.',
    proLead: 'Om du någon gång vill ha mer finns Teacher Pro här:',
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
    reassurance: '無料プランはそのまま無料です。使い続けるのにカードは不要で、アップグレードを選ばない限り請求されることはありません。',
    price: 'Teacher Proは月額$9です。クラス数無制限と完全な進捗レポート。いつでも解約できます。',
    proLead: 'もっと必要になったら、Teacher Proはこちらです。',
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
    reassurance: 'El plan gratuito sigue siendo gratis. No necesitas tarjeta para seguir usándolo, y no te cobraremos a menos que decidas mejorar a Pro.',
    price: 'Teacher Pro cuesta $9 al mes: clases ilimitadas y el informe de progreso completo. Cancela cuando quieras.',
    proLead: 'Si algún día quieres más, Teacher Pro está aquí:',
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
    reassurance: 'Бесплатный план остаётся бесплатным. Карта не нужна, чтобы продолжать им пользоваться, и мы не спишем деньги, пока вы сами не решите перейти на Pro.',
    price: 'Teacher Pro стоит $9 в месяц: неограниченные классы и полный отчёт о прогрессе. Отмена в любой момент.',
    proLead: 'Если когда-нибудь захотите больше — Teacher Pro здесь:',
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
<p id="free-plan-reassurance">${escape(copy.reassurance)}</p>
<p style="font-size:12px;line-height:1.4;margin:16px 0 4px;color:#6b7280;">${escape(copy.price)}</p>
<p style="font-size:14px;line-height:1.5;margin:0;color:#6b7280;">${escape(copy.proLead)} <a id="teacher-pro-line" href="${upgrade}" style="color:#7a1fa2;font-weight:700;text-decoration:underline;">${escape(copy.pro)}</a></p>
<p>${escape(copy.ask)}</p>
<p>${escape(copy.signoff)}</p>
</body></html>`;
  return { subject: copy.subject(n, m), html, replyTo: CONTACT };
}

export const TEACHER_DAY2_REPORT_PATH = '/teacher/reports';
export const TEACHER_DAY2_UPGRADE_PATH = '/teacher/upgrade';
