import type { TeacherLocale } from '@/lib/education/types';
import { teacherTrialStatus } from '@/lib/education/trial';
import { resolveProOffer } from '@/lib/education/pro/proOfferCopy';
import { resultsTrialCopy } from '@/lib/education/pro/trialCtaCopy';
import { EMAIL_SITE, NEO_ACCENTS, NEO_COLORS, escapeHtml, renderNeoEmail, type NeoBlock } from '@/lib/email/kit/neoEmail';
import { firstName, teacherEmailUrl } from './teacherEmailLayout';

interface Args {
  full_name: string;
  locale: TeacherLocale;
  message?: string;
  /** ISO trial deadline — when present the email mentions the trial window in one line. */
  trialExpiresAt?: string | null;
}

const SITE = EMAIL_SITE;
const CONTACT = 'lexiclash.game@gmail.com';

/** Source tag for the Teacher Pro line; the click goes through a cookie-free server hop. */
export const APPROVAL_EMAIL_PRO_SOURCE = 'approval_email';

/**
 * Teacher Pro link in the approval email. It goes through /api/education/email-click,
 * which records `edu_pro_email_clicked` server-side (no cookies in an email client) and
 * redirects to /{locale}/teacher/upgrade?source=approval_email, the page that decides
 * trial vs. keep-after-trial vs. paid against the live entitlement.
 */
export function approvalEmailProHref(locale: string): string {
  return `${SITE}/api/education/email-click?c=${APPROVAL_EMAIL_PRO_SOURCE}&l=${encodeURIComponent(locale)}`;
}

interface Copy {
  subject: string;
  preheader: string;
  kicker: string;
  headline: string;
  greeting: (n: string) => string;
  intro: string;
  whatTitle: string;
  features: string[];
  /** One line on the trial window: informational, no urgency framing. */
  trialLine: (date: string) => string;
  cta: string;
  /** The feedback/feature-request ask naming the contact address. */
  ask: string;
  signoff: string;
  messageLabel: string;
  dir: 'ltr' | 'rtl';
}

const DATE_LOCALE: Record<TeacherLocale, string> = {
  en: 'en-US', he: 'he-IL', sv: 'sv-SE', ja: 'ja-JP', es: 'es-ES', ru: 'ru-RU',
};

// From Ohad, not "the team". Approval is instant on form submit, so the copy says "it's live", never "we'll review".
const COPY: Record<TeacherLocale, Copy> = {
  en: {
    subject: 'Your LexiClash teacher access is live',
    preheader: 'You can run your first word game with your class today.',
    kicker: 'Teacher access',
    headline: "You're in. Welcome!",
    greeting: (n) => `Hi ${n},`,
    intro: "I'm Ohad, the creator of LexiClash. Thanks for joining as a teacher. Your access is live right now, so you can try it with a class today.",
    whatTitle: 'What you can do',
    features: [
      'Host live classroom word games on the projector while students join from any phone or laptop.',
      'Run vocabulary duels and drills built around the words you teach.',
      'See how every student is doing in your Teacher Dashboard.',
    ],
    trialLine: (date) => `Your free trial runs until ${date}.`,
    cta: 'Open Teacher Dashboard',
    ask: `Got feedback or a feature request? Write to me at ${CONTACT}. I read everything, and teachers' ideas are what I build next.`,
    signoff: 'Ohad, who built LexiClash',
    messageLabel: 'A note from me',
    dir: 'ltr',
  },
  he: {
    subject: 'גישת המורה שלך ב-LexiClash פעילה',
    preheader: 'אפשר להריץ את משחק המילים הראשון עם הכיתה כבר היום.',
    kicker: 'גישת מורה',
    headline: 'נכנסת. ברוכים הבאים!',
    greeting: (n) => `היי ${n},`,
    intro: 'אני אוהד, שבנה את LexiClash. תודה שהצטרפת כמורה. הגישה פעילה כבר עכשיו, כך שאפשר לנסות עם כיתה עוד היום.',
    whatTitle: 'מה אפשר לעשות',
    features: [
      'להריץ משחקי מילים חיים בכיתה על המקרן, והתלמידים מצטרפים מכל טלפון או מחשב.',
      'לקיים דו-קרבות אוצר מילים ותרגולים סביב המילים שמלמדים.',
      'לראות איך כל תלמיד מתקדם בלוח הבקרה למורה.',
    ],
    trialLine: (date) => `תקופת הניסיון בחינם נמשכת עד ${date}.`,
    cta: 'לפתוח את לוח הבקרה',
    ask: `יש משוב או רעיון לפיצ׳ר? אפשר לכתוב לי ל-${CONTACT}. אני קורא הכול, ומה שמורים מבקשים זה מה שאני בונה בהמשך.`,
    signoff: 'אוהד, שבנה את LexiClash',
    messageLabel: 'כמה מילים ממני',
    dir: 'rtl',
  },
  sv: {
    subject: 'Din lärarbehörighet på LexiClash är aktiv',
    preheader: 'Du kan köra ditt första ordspel med klassen redan i dag.',
    kicker: 'Lärarbehörighet',
    headline: 'Du är med. Välkommen!',
    greeting: (n) => `Hej ${n},`,
    intro: 'Jag heter Ohad och har byggt LexiClash. Tack för att du gick med som lärare. Din behörighet är aktiv nu, så du kan testa med en klass redan i dag.',
    whatTitle: 'Det här kan du göra',
    features: [
      'Kör ordspel live i klassrummet på projektorn medan eleverna går med från mobil eller dator.',
      'Kör orddueller och övningar kring orden ni jobbar med.',
      'Se hur det går för varje elev i din lärarpanel.',
    ],
    trialLine: (date) => `Din gratisperiod löper till ${date}.`,
    cta: 'Öppna lärarpanelen',
    ask: `Har du feedback eller en idé på en funktion? Skriv till mig på ${CONTACT}. Jag läser allt, och lärarnas idéer är det jag bygger härnäst.`,
    signoff: 'Ohad, som byggde LexiClash',
    messageLabel: 'Några ord från mig',
    dir: 'ltr',
  },
  ja: {
    subject: 'LexiClashの教師アクセスが有効になりました',
    preheader: '今日からクラスで単語ゲームを始められます。',
    kicker: '教師アクセス',
    headline: 'ようこそ、準備完了です',
    greeting: (n) => `${n}様`,
    intro: 'LexiClashを作っているOhadです。教師としてご参加いただきありがとうございます。アクセスはすでに有効なので、今日からクラスで試せます。',
    whatTitle: 'できること',
    features: [
      'プロジェクターでクラス全員のライブ単語ゲームを開催できます。生徒はスマホやパソコンから参加します。',
      '授業で扱う単語を使った語彙対戦やドリルができます。',
      '教師ダッシュボードで生徒一人ひとりの様子を確認できます。',
    ],
    trialLine: (date) => `無料トライアルは${date}までです。`,
    cta: '教師ダッシュボードを開く',
    ask: `ご意見や欲しい機能があれば、${CONTACT} まで直接お送りください。すべて読んでいますし、先生方のアイデアを次の開発に活かしています。`,
    signoff: 'LexiClash作者 Ohad',
    messageLabel: '私からのひとこと',
    dir: 'ltr',
  },
  es: {
    subject: 'Tu acceso docente en LexiClash ya está activo',
    preheader: 'Puedes jugar tu primer juego de palabras con la clase hoy mismo.',
    kicker: 'Acceso docente',
    headline: '¡Ya estás dentro!',
    greeting: (n) => `Hola, ${n}:`,
    intro: 'Soy Ohad, el creador de LexiClash. Gracias por unirte como docente. Tu acceso ya está activo, así que puedes probarlo con una clase hoy mismo.',
    whatTitle: 'Qué puedes hacer',
    features: [
      'Organizar juegos de palabras en vivo en el proyector mientras tus estudiantes se unen desde el móvil o el portátil.',
      'Hacer duelos de vocabulario y ejercicios con las palabras que estás enseñando.',
      'Ver cómo va cada estudiante en tu panel de profesor.',
    ],
    trialLine: (date) => `Tu prueba gratuita dura hasta el ${date}.`,
    cta: 'Abrir panel de profesor',
    ask: `¿Tienes comentarios o una función que te gustaría? Escríbeme a ${CONTACT}. Lo leo todo, y las ideas de los docentes son lo próximo que construyo.`,
    signoff: 'Ohad, creador de LexiClash',
    messageLabel: 'Unas palabras mías',
    dir: 'ltr',
  },
  ru: {
    subject: 'Ваш доступ учителя в LexiClash уже активен',
    preheader: 'Первую игру в слова с классом можно провести уже сегодня.',
    kicker: 'Доступ учителя',
    headline: 'Готово, добро пожаловать!',
    greeting: (n) => `Здравствуйте, ${n}!`,
    intro: 'Меня зовут Охад, я создатель LexiClash. Спасибо, что присоединились как учитель. Доступ уже активен, так что попробовать с классом можно сегодня.',
    whatTitle: 'Что можно делать',
    features: [
      'Проводить живые игры в слова на проекторе, пока ученики подключаются с телефона или ноутбука.',
      'Устраивать словесные дуэли и упражнения на слова, которые вы проходите.',
      'Смотреть, как идут дела у каждого ученика, в панели учителя.',
    ],
    trialLine: (date) => `Бесплатный пробный период продлится до ${date}.`,
    cta: 'Открыть панель учителя',
    ask: `Есть отзыв или идея для новой функции? Напишите мне на ${CONTACT}. Я читаю всё, и именно идеи учителей я делаю дальше.`,
    signoff: 'Охад, автор LexiClash',
    messageLabel: 'Пара слов от меня',
    dir: 'ltr',
  },
};

function adminMessage(label: string, message: string, dir: 'ltr' | 'rtl'): string {
  const align = dir === 'rtl' ? 'right' : 'left';
  const side = dir === 'rtl' ? 'left' : 'right';
  const text = escapeHtml(message).replace(/\r?\n/g, '<br>');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px 0;background:${NEO_COLORS.white};border:3px solid ${NEO_COLORS.black};border-${side}-width:5px;border-bottom-width:5px;border-radius:8px;">
<tr><td id="admin-message" dir="${dir}" align="${align}" style="padding:14px 18px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:${NEO_COLORS.ink};text-align:${align};"><div style="font-weight:700;margin:0 0 6px 0;color:${NEO_COLORS.ink};"><span style="background:${NEO_ACCENTS.purple};padding:2px 6px;">${escapeHtml(label)}</span></div>${text}</td></tr></table>`;
}

export function teacherAccessConfirmation({ full_name, locale, message, trialExpiresAt }: Args) {
  const c = COPY[locale] || COPY.en;
  const trimmed = (message || '').trim();
  const trial = teacherTrialStatus(trialExpiresAt, Date.now());

  // An approved teacher is inside the free access trial, so the Pro line asks to keep Pro after it (with the date);
  // an ended trial goes straight to paid; no date known falls back to the standard trial wording.
  const accessEnd = trial ? new Date(trial.expiresAt).toISOString() : null;
  const offer = resolveProOffer(
    locale,
    { known: true, trialUsed: false, accessTrialExpires: accessEnd, accessTrialEnded: Boolean(trial?.isExpired) },
    resultsTrialCopy(locale),
  );

  const blocks: NeoBlock[] = [{ type: 'p', text: c.intro, strong: true }];
  if (trial && !trial.isExpired) {
    const date = new Date(trial.expiresAt).toLocaleDateString(DATE_LOCALE[locale] || 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    blocks.push({ type: 'callout', text: c.trialLine(date) });
  }
  blocks.push({ type: 'p', text: c.whatTitle, strong: true }, { type: 'steps', items: c.features });
  if (trimmed) blocks.push({ type: 'html', html: adminMessage(c.messageLabel, trimmed, c.dir) });
  blocks.push({ type: 'p', text: c.ask });

  const html = renderNeoEmail({
    lang: locale,
    dir: c.dir,
    preheader: c.preheader,
    accent: 'lime',
    art: 'welcome',
    kicker: c.kicker,
    headline: c.headline,
    greeting: c.greeting(firstName(full_name) || full_name),
    blocks,
    cta: { label: c.cta, href: teacherEmailUrl(locale, '/teacher', 'access_approved') },
    secondary: { label: offer.label, href: approvalEmailProHref(locale) },
    signoff: c.signoff,
    footnote: offer.note,
  });

  return { subject: c.subject, html };
}
