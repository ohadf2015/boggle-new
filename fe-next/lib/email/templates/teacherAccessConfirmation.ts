import type { TeacherLocale } from '@/lib/education/types';

interface Args { full_name: string; locale: TeacherLocale; }

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

const COPY: Record<TeacherLocale, { subject: string; greeting: (n: string) => string; body: string; cta: string }> = {
  en: {
    subject: 'Your LexiClash teacher access is approved',
    greeting: (n) => `Hi ${n},`,
    body: 'Great news — your teacher access is approved. You can now use Classroom Game, Vocabulary Duels, Brain Drills, and all the teacher tools in your dashboard.',
    cta: 'Open Teacher Dashboard',
  },
  he: {
    subject: 'הגישה שלך כמורה ב-LexiClash אושרה',
    greeting: (n) => `שלום ${n},`,
    body: 'חדשות טובות — הגישה שלך כמורה אושרה. כעת תוכל/י להשתמש במשחק כיתתי, דו-קרב אוצר מילים, תרגולי מוח וכל כלי המורה.',
    cta: 'פתח/י לוח בקרה למורה',
  },
  sv: {
    subject: 'Din lärarbehörighet på LexiClash är godkänd',
    greeting: (n) => `Hej ${n},`,
    body: 'Bra nyheter — din lärarbehörighet är godkänd. Du kan nu använda Klassrumsspel, Ordduellerna, Hjärnträning och alla lärarverktyg.',
    cta: 'Öppna lärarpanelen',
  },
  ja: {
    subject: 'LexiClash 教師アクセスが承認されました',
    greeting: (n) => `${n}様、`,
    body: '朗報です — 教師アクセスが承認されました。教室ゲーム、語彙対戦、脳トレーニング、すべての教師ツールをご利用いただけます。',
    cta: '教師ダッシュボードを開く',
  },
  es: {
    subject: 'Tu acceso de profesor en LexiClash ha sido aprobado',
    greeting: (n) => `Hola ${n},`,
    body: 'Buenas noticias — tu acceso de profesor ha sido aprobado. Ya puedes usar Juego de Aula, Duelos de Vocabulario, Entrenamiento Cerebral y todas las herramientas para profesores.',
    cta: 'Abrir panel de profesor',
  },
};

export function teacherAccessConfirmation({ full_name, locale }: Args) {
  const c = COPY[locale];
  return {
    subject: c.subject,
    html: `<p>${c.greeting(escape(full_name))}</p>
<p>${c.body}</p>
<p><a href="https://lexiclash.com/${locale}/teacher" style="background:#0a0e27;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">${c.cta}</a></p>
<p>— LexiClash Team</p>`,
  };
}
