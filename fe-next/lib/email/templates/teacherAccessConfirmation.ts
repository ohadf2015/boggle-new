import type { TeacherLocale } from '@/lib/education/types';
import { teacherTrialStatus } from '@/lib/education/trial';

interface Args {
  full_name: string;
  locale: TeacherLocale;
  message?: string;
  /** ISO trial deadline — when present the email leads with activation urgency. */
  trialExpiresAt?: string | null;
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

// Escape, then turn newlines into <br> so an admin's multi-line note keeps its shape.
function escapeMultiline(s: string): string {
  return escape(s).replace(/\r?\n/g, '<br/>');
}

const SITE = 'https://www.lexiclash.live';
const HERO = `${SITE}/email/teacher-welcome.jpg`;

interface Copy {
  subject: string;
  /** Subject used when the approval carries a trial window (urgency framing). */
  trialSubject: string;
  greeting: (n: string) => string;
  intro: string;
  whatTitle: string;
  features: string[];
  cta: string;
  fromTeam: string;
  messageLabel: string;
  /** Trial countdown block copy. */
  trialBadge: (days: number) => string;
  trialTitle: string;
  trialBody: (days: number, date: string) => string;
  dir: 'ltr' | 'rtl';
}

// Locale -> BCP-47 tag for date formatting (TeacherLocale tags are already valid).
const DATE_LOCALE: Record<TeacherLocale, string> = {
  en: 'en-US', he: 'he-IL', sv: 'sv-SE', ja: 'ja-JP', es: 'es-ES',
};

const COPY: Record<TeacherLocale, Copy> = {
  en: {
    subject: "You're approved — welcome to LexiClash teaching",
    trialSubject: 'Your LexiClash teacher trial just started',
    greeting: (n) => `Hi ${n},`,
    intro: 'Great news — your teacher access is approved! Teacher mode turns LexiClash into a classroom tool: run live word games with your students, track their progress, and keep vocabulary practice fun.',
    whatTitle: 'What you can do now',
    features: [
      'Host Classroom Games — launch a live word battle your whole class joins from any device.',
      'Run Vocabulary Duels & Brain Drills tuned for learning, not just play.',
      'See student progress and results in your Teacher Dashboard.',
    ],
    cta: 'Open Teacher Dashboard',
    fromTeam: '— The LexiClash Team',
    messageLabel: 'A note from our team',
    trialBadge: (d) => `${d}-day free trial — active now`,
    trialTitle: 'Your trial clock has started ⏳',
    trialBody: (d, date) => `Your full teacher access is unlocked for the next ${d} days — until ${date}. Don't let it slip by: set up your first class today and run a live game this week while it's free. Once the trial ends you'll need to renew to keep classroom mode.`,
    dir: 'ltr',
  },
  he: {
    subject: 'אישרנו אותך — ברוך/ה הבא/ה למצב מורה ב-LexiClash',
    trialSubject: 'תקופת הניסיון שלך כמורה ב-LexiClash התחילה',
    greeting: (n) => `שלום ${n},`,
    intro: 'חדשות טובות — הגישה שלך כמורה אושרה! מצב מורה הופך את LexiClash לכלי כיתתי: הפעל/י משחקי מילים חיים עם התלמידים, עקוב/י אחר ההתקדמות שלהם, ושמור/י על תרגול אוצר מילים מהנה.',
    whatTitle: 'מה אפשר לעשות עכשיו',
    features: [
      'לארח משחק כיתתי — להפעיל קרב מילים חי שכל הכיתה מצטרפת אליו מכל מכשיר.',
      'להריץ דו-קרב אוצר מילים ותרגולי מוח המותאמים ללמידה.',
      'לראות את התקדמות ותוצאות התלמידים בלוח הבקרה למורה.',
    ],
    cta: 'פתח/י לוח בקרה למורה',
    fromTeam: '— צוות LexiClash',
    messageLabel: 'הערה מהצוות שלנו',
    trialBadge: (d) => `ניסיון חינם ל-${d} ימים — פעיל עכשיו`,
    trialTitle: 'שעון הניסיון שלך התחיל לתקתק ⏳',
    trialBody: (d, date) => `הגישה המלאה למורה פתוחה עבורך ל-${d} הימים הקרובים — עד ${date}. אל תפספס/י: הקם/י את הכיתה הראשונה שלך עוד היום והפעל/י משחק חי השבוע בזמן שזה חינם. בסיום תקופת הניסיון יהיה צורך לחדש כדי לשמור על מצב הכיתה.`,
    dir: 'rtl',
  },
  sv: {
    subject: 'Du är godkänd — välkommen till LexiClash för lärare',
    trialSubject: 'Din lärarprövoperiod på LexiClash har börjat',
    greeting: (n) => `Hej ${n},`,
    intro: 'Bra nyheter — din lärarbehörighet är godkänd! Lärarläget gör LexiClash till ett klassrumsverktyg: kör live-ordspel med dina elever, följ deras framsteg och håll ordträningen rolig.',
    whatTitle: 'Vad du kan göra nu',
    features: [
      'Var värd för Klassrumsspel — starta en live-orddust som hela klassen ansluter till från valfri enhet.',
      'Kör Ordduellerna och Hjärnträning anpassade för lärande.',
      'Se elevernas framsteg och resultat i din lärarpanel.',
    ],
    cta: 'Öppna lärarpanelen',
    fromTeam: '— LexiClash-teamet',
    messageLabel: 'En hälsning från vårt team',
    trialBadge: (d) => `${d} dagars gratis prövoperiod — aktiv nu`,
    trialTitle: 'Din prövoklocka har börjat ticka ⏳',
    trialBody: (d, date) => `Din fulla lärarbehörighet är upplåst de kommande ${d} dagarna — till ${date}. Låt den inte rinna ut: skapa din första klass idag och kör ett live-spel den här veckan medan det är gratis. När prövoperioden tar slut behöver du förnya för att behålla klassrumsläget.`,
    dir: 'ltr',
  },
  ja: {
    subject: '承認されました — LexiClash 教師モードへようこそ',
    trialSubject: 'LexiClash 教師トライアルが始まりました',
    greeting: (n) => `${n}様、`,
    intro: '朗報です — 教師アクセスが承認されました！教師モードでは LexiClash が教室ツールになります。生徒とライブの単語ゲームを行い、進捗を確認し、語彙練習を楽しく続けられます。',
    whatTitle: '今すぐできること',
    features: [
      '教室ゲームをホスト — クラス全員がどの端末からでも参加できるライブ単語バトルを開始。',
      '学習向けに調整された語彙対戦・脳トレを実施。',
      '教師ダッシュボードで生徒の進捗と結果を確認。',
    ],
    cta: '教師ダッシュボードを開く',
    fromTeam: '— LexiClash チーム',
    messageLabel: '私たちのチームより',
    trialBadge: (d) => `${d}日間の無料トライアル — 現在有効`,
    trialTitle: 'トライアルのカウントダウンが始まりました ⏳',
    trialBody: (d, date) => `教師アクセスはこれから${d}日間（${date}まで）フルに利用できます。お見逃しなく：今日のうちに最初のクラスを作成し、無料のうちに今週ライブゲームを実施しましょう。トライアル終了後は、教室モードを続けるには更新が必要です。`,
    dir: 'ltr',
  },
  es: {
    subject: 'Estás aprobado — bienvenido al modo profesor de LexiClash',
    trialSubject: 'Tu prueba de profesor en LexiClash acaba de empezar',
    greeting: (n) => `Hola ${n},`,
    intro: 'Buenas noticias — ¡tu acceso de profesor ha sido aprobado! El modo profesor convierte LexiClash en una herramienta de aula: organiza juegos de palabras en vivo con tus estudiantes, sigue su progreso y mantén divertida la práctica de vocabulario.',
    whatTitle: 'Lo que puedes hacer ahora',
    features: [
      'Organiza Juegos de Aula — inicia una batalla de palabras en vivo a la que se une toda la clase desde cualquier dispositivo.',
      'Ejecuta Duelos de Vocabulario y Entrenamiento Cerebral pensados para aprender.',
      'Consulta el progreso y los resultados de los estudiantes en tu panel de profesor.',
    ],
    cta: 'Abrir panel de profesor',
    fromTeam: '— El equipo de LexiClash',
    messageLabel: 'Un mensaje de nuestro equipo',
    trialBadge: (d) => `Prueba gratis de ${d} días — activa ahora`,
    trialTitle: 'Tu cuenta atrás de prueba ya empezó ⏳',
    trialBody: (d, date) => `Tu acceso completo de profesor está desbloqueado durante los próximos ${d} días — hasta el ${date}. No lo dejes pasar: crea tu primera clase hoy y organiza un juego en vivo esta semana mientras es gratis. Cuando termine la prueba tendrás que renovar para conservar el modo aula.`,
    dir: 'ltr',
  },
};

export function teacherAccessConfirmation({ full_name, locale, message, trialExpiresAt }: Args) {
  const c = COPY[locale];
  const align = c.dir === 'rtl' ? 'right' : 'left';
  const trimmed = (message || '').trim();

  // Trial urgency block — only when the approval carries a deadline. Day count
  // is rounded up so "13 days and 23 hours left" still reads as the full window.
  const trial = teacherTrialStatus(trialExpiresAt, Date.now());
  const trialBlock = trial
    ? (() => {
        const dateStr = new Date(trial.expiresAt).toLocaleDateString(DATE_LOCALE[locale], {
          year: 'numeric', month: 'long', day: 'numeric',
        });
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
        <tr><td id="trial-urgency" style="background:#fff7d6;border:2px solid #1a1a2e;border-radius:8px;padding:16px;font-size:15px;line-height:1.55;color:#1a1a2e;">
          <div style="display:inline-block;background:#BFFF00;border:2px solid #1a1a2e;border-radius:999px;padding:3px 12px;font-weight:800;font-size:13px;margin-bottom:10px;">${escape(c.trialBadge(trial.daysLeft))}</div>
          <div style="font-weight:800;font-size:16px;margin-bottom:6px;">${escape(c.trialTitle)}</div>
          <div>${escape(c.trialBody(trial.daysLeft, dateStr))}</div>
        </td></tr>
      </table>`;
      })()
    : '';

  const features = c.features
    .map((f) => `<li style="margin:0 0 8px 0;">${escape(f)}</li>`)
    .join('');

  const messageBlock = trimmed
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
        <tr><td id="admin-message" style="background:#f4f7ff;border:2px solid #1a1a2e;border-radius:8px;padding:16px;font-size:15px;line-height:1.5;color:#1a1a2e;">
          <div style="font-weight:700;margin-bottom:6px;">${escape(c.messageLabel)}</div>
          <div>${escapeMultiline(trimmed)}</div>
        </td></tr>
      </table>`
    : '';

  const html = `<!doctype html>
<html dir="${c.dir}" lang="${locale}">
<body style="margin:0;padding:0;background:#0e1430;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0e1430;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:3px solid #1a1a2e;">
        <tr><td style="background:#1a1a2e;padding:0;">
          <img src="${HERO}" width="600" alt="Welcome, Teacher!" style="display:block;width:100%;height:auto;border:0;" />
        </td></tr>
        <tr><td dir="${c.dir}" align="${align}" style="padding:28px 28px 8px 28px;font-family:Arial,Helvetica,sans-serif;color:#1a1a2e;text-align:${align};">
          <p style="font-size:18px;font-weight:700;margin:0 0 12px 0;">${c.greeting(escape(full_name))}</p>
          <p style="font-size:15px;line-height:1.6;margin:0 0 20px 0;">${escape(c.intro)}</p>
          <p style="font-size:16px;font-weight:700;margin:0 0 10px 0;">${escape(c.whatTitle)}</p>
          <ul style="font-size:15px;line-height:1.5;margin:0 0 8px 0;padding-${align === 'right' ? 'right' : 'left'}:20px;">${features}</ul>
        </td></tr>
        <tr><td dir="${c.dir}" align="${align}" style="padding:0 28px;text-align:${align};">${trialBlock}</td></tr>
        <tr><td dir="${c.dir}" align="${align}" style="padding:0 28px;text-align:${align};">${messageBlock}</td></tr>
        <tr><td align="center" style="padding:8px 28px 28px 28px;">
          <a href="${SITE}/${locale}/teacher" style="background:#BFFF00;color:#1a1a2e;font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:16px;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block;border:2px solid #1a1a2e;">${escape(c.cta)}</a>
        </td></tr>
        <tr><td dir="${c.dir}" align="${align}" style="padding:0 28px 28px 28px;font-family:Arial,Helvetica,sans-serif;color:#6b7280;font-size:13px;text-align:${align};">
          ${escape(c.fromTeam)}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject: trial ? c.trialSubject : c.subject, html };
}
