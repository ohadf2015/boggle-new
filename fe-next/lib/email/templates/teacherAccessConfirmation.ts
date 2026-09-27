import type { TeacherLocale } from '@/lib/education/types';
import { teacherTrialStatus } from '@/lib/education/trial';

interface Args {
  full_name: string;
  locale: TeacherLocale;
  message?: string;
  /** ISO trial deadline — when present the email mentions the trial window in one line. */
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
const CONTACT = 'ohadf2015@gmail.com';

interface Copy {
  subject: string;
  greeting: (n: string) => string;
  /** "I'm Ohad, the creator of LexiClash — your access is live." */
  intro: string;
  whatTitle: string;
  /** 3 short bullets — the same feature list as the original email, trimmed. */
  features: string[];
  /** One line on the trial window — informational, no urgency framing. */
  trialLine: (date: string) => string;
  cta: string;
  /** The explicit feedback/feature-request ask naming the contact address. */
  ask: string;
  signoff: string;
  messageLabel: string;
  dir: 'ltr' | 'rtl';
}

// Locale -> BCP-47 tag for date formatting (TeacherLocale tags are already valid).
const DATE_LOCALE: Record<TeacherLocale, string> = {
  en: 'en-US', he: 'he-IL', sv: 'sv-SE', ja: 'ja-JP', es: 'es-ES', ru: 'ru-RU',
};

// Short and personal: this email is from Ohad the creator, not "the team".
// Approval is instant on form submit, so the copy is "it's live", never
// "we'll review". Keep every locale under ~120 words of body copy.
const COPY: Record<TeacherLocale, Copy> = {
  en: {
    subject: 'Your LexiClash teacher access is live 🎉',
    greeting: (n) => `Hi ${n},`,
    intro: "I'm Ohad, the creator of LexiClash — thanks for joining as a teacher. Your access is live right now.",
    whatTitle: 'What you can do',
    features: [
      'Host live classroom word games — students join from any device',
      'Run vocabulary duels & drills built for learning',
      'Track progress in your Teacher Dashboard',
    ],
    trialLine: (date) => `Your free trial runs until ${date}.`,
    cta: 'Open Teacher Dashboard',
    ask: `Feedback or a feature request? Write me directly: ${CONTACT} — I read everything.`,
    signoff: '— Ohad',
    messageLabel: 'A note from our team',
    dir: 'ltr',
  },
  he: {
    subject: 'הגישה שלך כמורה ב-LexiClash פעילה 🎉',
    greeting: (n) => `שלום ${n},`,
    intro: 'אני אוהד, היוצר של LexiClash — תודה שהצטרפת כמורה. הגישה שלך פעילה עכשיו.',
    whatTitle: 'מה אפשר לעשות',
    features: [
      'להפעיל משחקי מילים חיים בכיתה — התלמידים מצטרפים מכל מכשיר',
      'דו-קרבות אוצר מילים ותרגולים שבנויים ללמידה',
      'לעקוב אחר ההתקדמות בלוח הבקרה למורה',
    ],
    trialLine: (date) => `תקופת הניסיון בחינם נמשכת עד ${date}.`,
    cta: 'פתח/י את לוח הבקרה למורה',
    ask: `משוב או בקשת פיצ׳ר? כתוב/י לי ישירות: ${CONTACT} — אני קורא הכל.`,
    signoff: '— אוהד',
    messageLabel: 'הערה מהצוות שלנו',
    dir: 'rtl',
  },
  sv: {
    subject: 'Din lärarbehörighet på LexiClash är live 🎉',
    greeting: (n) => `Hej ${n},`,
    intro: 'Jag är Ohad, skaparen av LexiClash — tack för att du gick med som lärare. Din behörighet är live nu.',
    whatTitle: 'Vad du kan göra',
    features: [
      'Kör live-ordspel i klassrummet — eleverna ansluter från valfri enhet',
      'Orddueller och övningar byggda för lärande',
      'Följ framstegen i din lärarpanel',
    ],
    trialLine: (date) => `Din gratisperiod löper till ${date}.`,
    cta: 'Öppna lärarpanelen',
    ask: `Feedback eller en funktionsönskan? Skriv direkt till mig: ${CONTACT} — jag läser allt.`,
    signoff: '— Ohad',
    messageLabel: 'En hälsning från vårt team',
    dir: 'ltr',
  },
  ja: {
    subject: 'LexiClash 教師アクセスが有効になりました 🎉',
    greeting: (n) => `${n}様、`,
    intro: 'LexiClashの作者、Ohadです。教師としてご参加いただきありがとうございます。アクセスは有効になっています。',
    whatTitle: 'できること',
    features: [
      'クラスでライブ単語ゲームを開催 — 生徒はどの端末からでも参加',
      '学習のための語彙対戦とドリル',
      '教師ダッシュボードで進捗を確認',
    ],
    trialLine: (date) => `無料トライアルは${date}までです。`,
    cta: '教師ダッシュボードを開く',
    ask: `フィードバックや機能のリクエストは、${CONTACT} まで直接どうぞ。すべて読んでいます。`,
    signoff: '— Ohad',
    messageLabel: '私たちのチームより',
    dir: 'ltr',
  },
  es: {
    subject: 'Tu acceso de profesor en LexiClash está activo 🎉',
    greeting: (n) => `Hola ${n},`,
    intro: 'Soy Ohad, el creador de LexiClash — gracias por unirte como profesor. Tu acceso ya está activo.',
    whatTitle: 'Qué puedes hacer',
    features: [
      'Organiza juegos de palabras en vivo — los estudiantes se unen desde cualquier dispositivo',
      'Duelos de vocabulario y ejercicios pensados para aprender',
      'Sigue el progreso en tu panel de profesor',
    ],
    trialLine: (date) => `Tu prueba gratuita dura hasta el ${date}.`,
    cta: 'Abrir panel de profesor',
    ask: `¿Comentarios o una función que te gustaría? Escríbeme directamente: ${CONTACT} — lo leo todo.`,
    signoff: '— Ohad',
    messageLabel: 'Un mensaje de nuestro equipo',
    dir: 'ltr',
  },
  ru: {
    subject: 'Ваш доступ учителя в LexiClash активен 🎉',
    greeting: (n) => `Здравствуйте, ${n}!`,
    intro: 'Я Охад, создатель LexiClash — спасибо, что присоединились как учитель. Ваш доступ уже активен.',
    whatTitle: 'Что можно делать',
    features: [
      'Проводите живые словесные игры в классе — ученики подключаются с любого устройства',
      'Словесные дуэли и упражнения, созданные для обучения',
      'Отслеживайте прогресс в панели учителя',
    ],
    trialLine: (date) => `Бесплатный пробный период — до ${date}.`,
    cta: 'Открыть панель учителя',
    ask: `Отзыв или идея функции? Напишите мне напрямую: ${CONTACT} — я читаю всё.`,
    signoff: '— Охад',
    messageLabel: 'Заметка от нашей команды',
    dir: 'ltr',
  },
};

export function teacherAccessConfirmation({ full_name, locale, message, trialExpiresAt }: Args) {
  const c = COPY[locale] || COPY.en;
  const align = c.dir === 'rtl' ? 'right' : 'left';
  const trimmed = (message || '').trim();

  // One informational trial line — no countdown box, no urgency. Shown only
  // while the trial is actually active.
  const trial = teacherTrialStatus(trialExpiresAt, Date.now());
  const trialLine = trial && !trial.isExpired
    ? (() => {
        const dateStr = new Date(trial.expiresAt).toLocaleDateString(DATE_LOCALE[locale] || 'en-US', {
          year: 'numeric', month: 'long', day: 'numeric',
        });
        return `<p style="font-size:15px;line-height:1.6;margin:0 0 20px 0;">${escape(c.trialLine(dateStr))}</p>`;
      })()
    : '';

  const features = c.features
    .map((f) => `<li style="margin:0 0 6px 0;">${escape(f)}</li>`)
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
          ${trialLine}
          <p style="font-size:15px;font-weight:700;margin:0 0 8px 0;">${escape(c.whatTitle)}</p>
          <ul style="font-size:15px;line-height:1.5;margin:0 0 20px 0;padding-${align === 'right' ? 'right' : 'left'}:20px;">${features}</ul>
          <p style="font-size:15px;line-height:1.6;margin:0 0 20px 0;">${escape(c.ask)}</p>
        </td></tr>
        <tr><td dir="${c.dir}" align="${align}" style="padding:0 28px;text-align:${align};">${messageBlock}</td></tr>
        <tr><td align="center" style="padding:8px 28px 28px 28px;">
          <a href="${SITE}/${locale}/teacher" style="background:#BFFF00;color:#1a1a2e;font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:16px;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block;border:2px solid #1a1a2e;">${escape(c.cta)}</a>
        </td></tr>
        <tr><td dir="${c.dir}" align="${align}" style="padding:0 28px 28px 28px;font-family:Arial,Helvetica,sans-serif;color:#6b7280;font-size:13px;text-align:${align};">
          ${escape(c.signoff)}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject: c.subject, html };
}
