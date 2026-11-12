import type { TeacherLocale } from '@/lib/education/types';
import { renderNeoEmail } from '@/lib/email/kit/neoEmail';
import { firstName, teacherEmailUrl } from './teacherEmailLayout';

/**
 * Sent when an admin grants a teacher a complimentary Pro period by email
 * (see lib/education/proGrantServer.ts). `pending: true` means no account has
 * this address yet: Pro is reserved and switches on when they sign up with it.
 */

interface Args {
  full_name: string;
  locale: TeacherLocale;
  /** Personal line from the admin. Escaped; newlines kept. */
  note?: string | null;
  /** ISO deadline the email promises. */
  expiresAt: string;
  /** No account with this email yet — tell them to sign up with it. */
  pending: boolean;
}

const SITE = 'https://www.lexiclash.live';
const CONTACT = 'lexiclash.game@gmail.com';

const DATE_LOCALE: Record<TeacherLocale, string> = {
  en: 'en-US', he: 'he-IL', sv: 'sv-SE', ja: 'ja-JP', es: 'es-ES', ru: 'ru-RU',
};

interface Copy {
  subject: string;
  preheader: string;
  kicker: string;
  headline: string;
  greeting: (n: string) => string;
  lead: string;
  noteTitle: string;
  until: (date: string) => string;
  includedTitle: string;
  included: string[];
  noCard: string;
  pendingLead: string;
  pendingCta: string;
  cta: string;
  ask: string;
  signoff: string;
  dir: 'ltr' | 'rtl';
}

const COPY: Record<TeacherLocale, Copy> = {
  en: {
    subject: 'Your LexiClash Teacher Pro is on, my treat',
    preheader: 'No card, no trial, nothing to claim.',
    kicker: 'A gift for your class',
    headline: 'Teacher Pro, on me',
    greeting: (n) => `Hi ${n},`,
    lead: "Teacher Pro is switched on for your account. There's nothing to claim, no card, and no trial that quietly turns into a bill.",
    noteTitle: 'A note for you',
    until: (date) => `Yours until ${date}.`,
    includedTitle: "What's included",
    included: [
      'Analytics after every game: which words the class struggled with, and who struggled',
      'Printable class and student reports',
      'Unlimited classes',
    ],
    noCard: "When it ends, you simply go back to the free plan. You'll never be charged unless you choose to be.",
    pendingLead: "There's no LexiClash account with this address yet. Sign up with this exact email and Pro switches on by itself the moment you log in.",
    pendingCta: 'Create your account',
    cta: 'Open my teacher dashboard',
    ask: `If anything is broken, confusing or missing, just reply. It comes straight to me and I read every single one (${CONTACT}).`,
    signoff: 'Ohad, who built LexiClash',
    dir: 'ltr',
  },
  he: {
    subject: 'Teacher Pro של LexiClash הופעל עבורך, עליי',
    preheader: 'בלי כרטיס, בלי ניסיון, אין מה לממש.',
    kicker: 'מתנה לכיתה',
    headline: 'Teacher Pro, עליי',
    greeting: (n) => `היי ${n},`,
    lead: 'Teacher Pro הופעל בחשבון שלך. אין מה לממש, אין צורך בכרטיס אשראי, ואין ניסיון שהופך בשקט לחיוב.',
    noteTitle: 'כמה מילים בשבילך',
    until: (date) => `בתוקף עד ${date}.`,
    includedTitle: 'מה כלול',
    included: [
      'אנליטיקה אחרי כל משחק: אילו מילים היו קשות לכיתה, ולמי',
      'דוחות כיתה ותלמיד להדפסה',
      'כיתות ותלמידים ללא הגבלה',
    ],
    noCard: 'כשזה מסתיים, פשוט חוזרים לתוכנית החינמית. לא יהיה שום חיוב בלי שבוחרים בזה.',
    pendingLead: 'עדיין אין חשבון LexiClash עם הכתובת הזו. נרשמים עם אותו אימייל בדיוק, ו-Pro מופעל מעצמו ברגע ההתחברות.',
    pendingCta: 'ליצור חשבון',
    cta: 'לפתוח את לוח המורה שלי',
    ask: `אם משהו שבור, מבלבל או חסר, אפשר פשוט להשיב למייל הזה. הוא מגיע ישירות אליי ואני קורא כל תשובה (${CONTACT}).`,
    signoff: 'אוהד, שבנה את LexiClash',
    dir: 'rtl',
  },
  es: {
    subject: 'Tu Teacher Pro de LexiClash ya está activo',
    preheader: 'Sin tarjeta, sin prueba y nada que canjear.',
    kicker: 'Un regalo para tu clase',
    headline: 'Teacher Pro, invito yo',
    greeting: (n) => `Hola ${n}:`,
    lead: 'Teacher Pro ya está activado en tu cuenta. No hay nada que canjear, no hace falta tarjeta y no hay ninguna prueba que acabe en factura.',
    noteTitle: 'Unas palabras para ti',
    until: (date) => `Es tuyo hasta el ${date}.`,
    includedTitle: 'Qué incluye',
    included: [
      'Analíticas después de cada partida: qué palabras le costaron a la clase, y a quién',
      'Informes imprimibles de clase y de alumno',
      'Clases y alumnos ilimitados',
    ],
    noCard: 'Cuando termine, vuelves al plan gratuito sin más. Nunca se te cobrará nada a menos que tú lo elijas.',
    pendingLead: 'Todavía no hay una cuenta de LexiClash con esta dirección. Regístrate con este mismo correo y Pro se activará solo al iniciar sesión.',
    pendingCta: 'Crear mi cuenta',
    cta: 'Abrir mi panel de profesor',
    ask: `Si algo falla, confunde o falta, responde a este correo. Me llega directamente y leo todos (${CONTACT}).`,
    signoff: 'Ohad, creador de LexiClash',
    dir: 'ltr',
  },
  sv: {
    subject: 'Teacher Pro i LexiClash är på, det bjuder jag på',
    preheader: 'Inget kort, ingen provperiod och inget du behöver lösa in.',
    kicker: 'En present till din klass',
    headline: 'Teacher Pro, det bjuder jag på',
    greeting: (n) => `Hej ${n},`,
    lead: 'Teacher Pro är aktiverat på ditt konto. Du behöver inte lösa in något eller ange något kort, och det finns ingen provperiod som i tysthet blir en faktura.',
    noteTitle: 'Några rader till dig',
    until: (date) => `Det gäller till ${date}.`,
    includedTitle: 'Det här ingår',
    included: [
      'Analys efter varje spel: vilka ord klassen hade svårt med, och vem som hade det',
      'Utskrivbara rapporter för klassen och för varje elev',
      'Obegränsat antal klasser',
    ],
    noCard: 'När perioden tar slut går du helt enkelt tillbaka till gratisplanen. Du debiteras aldrig om du inte själv väljer det.',
    pendingLead: 'Det finns inget LexiClash-konto med den här adressen än. Registrera dig med exakt den här mejladressen, så slås Pro på av sig självt när du loggar in.',
    pendingCta: 'Skapa ditt konto',
    cta: 'Öppna min lärarpanel',
    ask: `Om något är trasigt, krångligt eller saknas, svara bara på mejlet. Det kommer direkt till mig och jag läser varenda svar (${CONTACT}).`,
    signoff: 'Ohad, som har byggt LexiClash',
    dir: 'ltr',
  },
  ja: {
    subject: 'LexiClashのTeacher Proを有効にしました。費用はいただきません',
    preheader: 'カードの登録も、お試し期間も、受け取りの手続きもありません。',
    kicker: 'クラスへのプレゼント',
    headline: 'Teacher Proをお贈りします',
    greeting: (n) => `${n}さん、こんにちは。`,
    lead: 'あなたのアカウントでTeacher Proを有効にしました。受け取りの手続きもカードの登録も不要で、知らないうちに有料に切り替わるお試し期間でもありません。',
    noteTitle: 'あなたへのメッセージ',
    until: (date) => `${date}までご利用いただけます。`,
    includedTitle: '含まれる機能',
    included: [
      '毎回のゲーム後の分析：クラスがどの単語でつまずいたか、誰がつまずいたか',
      '印刷できるクラス別・生徒別のレポート',
      'クラス数は無制限',
    ],
    noCard: '期間が終わると、そのまま無料プランに戻ります。ご自身で選ばない限り、料金が発生することはありません。',
    pendingLead: 'このメールアドレスのLexiClashアカウントはまだありません。このアドレスで登録していただければ、ログインした時点でProが自動的に有効になります。',
    pendingCta: 'アカウントを作成する',
    cta: '教師用ダッシュボードを開く',
    ask: `不具合や分かりにくい点、足りない機能があれば、このメールに返信してください。私に直接届きますし、いただいたお返事はすべて読んでいます（${CONTACT}）。`,
    signoff: 'Ohad（LexiClash開発者）',
    dir: 'ltr',
  },
  ru: {
    subject: 'Teacher Pro в LexiClash включён, это подарок от меня',
    preheader: 'Без карты и пробного периода, активировать ничего не нужно.',
    kicker: 'Подарок для вашего класса',
    headline: 'Teacher Pro в подарок от меня',
    greeting: (n) => `Здравствуйте, ${n}!`,
    lead: 'Teacher Pro уже включён в вашем аккаунте. Ничего не нужно активировать, карта не нужна, и это не пробный период, который потом незаметно превратится в платёж.',
    noteTitle: 'Несколько слов для вас',
    until: (date) => `Действует до ${date}.`,
    includedTitle: 'Что входит',
    included: [
      'Аналитика после каждой игры: какие слова дались классу труднее всего и кому именно',
      'Отчёты по классу и по каждому ученику, готовые к печати',
      'Неограниченное число классов',
    ],
    noCard: 'Когда срок закончится, вы просто вернётесь на бесплатный тариф. Деньги не спишутся, если вы сами этого не решите.',
    pendingLead: 'Аккаунта LexiClash с этим адресом пока нет. Зарегистрируйтесь именно с этой почтой, и Pro включится сам, как только вы войдёте.',
    pendingCta: 'Создать аккаунт',
    cta: 'Открыть мою панель учителя',
    ask: `Если что-то не работает, непонятно или чего-то не хватает, просто ответьте на это письмо. Оно приходит прямо ко мне, и я читаю каждый ответ (${CONTACT}).`,
    signoff: 'Охад, создатель LexiClash',
    dir: 'ltr',
  },
};

export function teacherProGift({ full_name, locale, note, expiresAt, pending }: Args) {
  const c = COPY[locale] || COPY.en;
  const dateStr = new Date(expiresAt).toLocaleDateString(DATE_LOCALE[locale] || 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const ctaHref = pending ? `${SITE}/${locale}/education/access` : teacherEmailUrl(locale, '/teacher', 'pro_gift');
  const trimmedNote = (note || '').trim();

  const html = renderNeoEmail({
    lang: locale,
    dir: c.dir,
    preheader: c.preheader,
    accent: 'purple',
    art: 'gift',
    kicker: c.kicker,
    headline: c.headline,
    greeting: c.greeting(firstName(full_name) || full_name),
    blocks: [
      { type: 'p', text: pending ? c.pendingLead : c.lead, strong: true },
      ...(trimmedNote ? [{ type: 'callout' as const, title: c.noteTitle, text: trimmedNote }] : []),
      { type: 'p', text: c.until(dateStr), strong: true },
      { type: 'p', text: c.includedTitle },
      { type: 'steps', items: c.included },
      { type: 'p', text: c.noCard },
      { type: 'p', text: c.ask },
    ],
    cta: { label: pending ? c.pendingCta : c.cta, href: ctaHref },
    signoff: c.signoff,
  });

  return { subject: c.subject, html };
}
