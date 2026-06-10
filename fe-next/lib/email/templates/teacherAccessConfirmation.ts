import type { TeacherLocale } from '@/lib/education/types';

interface Args { full_name: string; locale: TeacherLocale; message?: string; }

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
  greeting: (n: string) => string;
  intro: string;
  whatTitle: string;
  features: string[];
  cta: string;
  fromTeam: string;
  messageLabel: string;
  dir: 'ltr' | 'rtl';
}

const COPY: Record<TeacherLocale, Copy> = {
  en: {
    subject: 'Your LexiClash teacher access is approved 🎉',
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
    dir: 'ltr',
  },
  he: {
    subject: 'הגישה שלך כמורה ב-LexiClash אושרה 🎉',
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
    dir: 'rtl',
  },
  sv: {
    subject: 'Din lärarbehörighet på LexiClash är godkänd 🎉',
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
    dir: 'ltr',
  },
  ja: {
    subject: 'LexiClash 教師アクセスが承認されました 🎉',
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
    dir: 'ltr',
  },
  es: {
    subject: 'Tu acceso de profesor en LexiClash ha sido aprobado 🎉',
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
    dir: 'ltr',
  },
};

export function teacherAccessConfirmation({ full_name, locale, message }: Args) {
  const c = COPY[locale];
  const align = c.dir === 'rtl' ? 'right' : 'left';
  const trimmed = (message || '').trim();

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

  return { subject: c.subject, html };
}
