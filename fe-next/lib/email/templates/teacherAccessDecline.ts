import type { TeacherLocale } from '@/lib/education/types';
import { EMAIL_SITE, renderNeoEmail, type NeoBlock } from '@/lib/email/kit/neoEmail';
import { firstName } from './teacherEmailLayout';

interface Args { full_name: string; locale: TeacherLocale; reason?: string; }

interface Copy {
  subject: string;
  preheader: string;
  kicker: string;
  headline: string;
  greeting: (n: string) => string;
  lead: string;
  reasonTitle: string;
  play: string;
  cta: string;
  reapply: string;
  secondary: string;
  signoff: string;
  dir: 'ltr' | 'rtl';
}

const COPY: Record<TeacherLocale, Copy> = {
  en: {
    subject: 'About your LexiClash teacher access request',
    preheader: "I couldn't approve it this time, but you can apply again.",
    kicker: 'Teacher access',
    headline: 'Not approved this time',
    greeting: (n) => `Hi ${n},`,
    lead: "Thanks for applying for teacher access. I went through your request and I can't approve it right now.",
    reasonTitle: 'Why:',
    play: 'The regular game is still free for you and your friends, no teacher account needed.',
    cta: 'Play LexiClash',
    reapply: 'If you can tell me a bit more about your school and your class, you can apply again any time.',
    secondary: 'Apply again',
    signoff: 'Ohad, who built LexiClash',
    dir: 'ltr',
  },
  he: {
    subject: 'לגבי הבקשה שלך לגישת מורה ב-LexiClash',
    preheader: 'הפעם לא יכולתי לאשר, אבל אפשר להגיש שוב.',
    kicker: 'גישת מורה',
    headline: 'הפעם הבקשה לא אושרה',
    greeting: (n) => `היי ${n},`,
    lead: 'תודה על הבקשה לגישת מורה. עברתי עליה, וכרגע אני לא יכול לאשר אותה.',
    reasonTitle: 'הסיבה:',
    play: 'המשחק הרגיל נשאר חינמי, ואפשר לשחק בו עם חברים גם בלי חשבון מורה.',
    cta: 'לשחק ב-LexiClash',
    reapply: 'אם אפשר לספר לי קצת יותר על בית הספר ועל הכיתה, מוזמנים להגיש בקשה חדשה מתי שנוח.',
    secondary: 'להגיש בקשה שוב',
    signoff: 'אוהד, שבנה את LexiClash',
    dir: 'rtl',
  },
  sv: {
    subject: 'Om din ansökan om lärarbehörighet på LexiClash',
    preheader: 'Jag kunde inte godkänna den nu, men du kan söka igen.',
    kicker: 'Lärarbehörighet',
    headline: 'Inte godkänd den här gången',
    greeting: (n) => `Hej ${n},`,
    lead: 'Tack för din ansökan om lärarbehörighet. Jag har gått igenom den och kan tyvärr inte godkänna den just nu.',
    reasonTitle: 'Varför:',
    play: 'Det vanliga spelet är fortfarande gratis för dig och dina vänner, inget lärarkonto behövs.',
    cta: 'Spela LexiClash',
    reapply: 'Om du kan berätta lite mer om din skola och din klass får du gärna söka igen när du vill.',
    secondary: 'Sök igen',
    signoff: 'Ohad, som byggde LexiClash',
    dir: 'ltr',
  },
  ja: {
    subject: 'LexiClash教師アクセスの申請について',
    preheader: '今回は承認できませんでしたが、再申請はいつでも可能です。',
    kicker: '教師アクセス',
    headline: '今回は承認を見送りました',
    greeting: (n) => `${n}様`,
    lead: '教師アクセスへのお申し込みありがとうございます。内容を確認しましたが、今回は承認できませんでした。',
    reasonTitle: '理由：',
    play: '通常のゲームは引き続き無料で、教師アカウントがなくてもお友達と遊べます。',
    cta: 'LexiClashで遊ぶ',
    reapply: '学校やクラスについてもう少し詳しく教えていただければ、いつでも再申請できます。',
    secondary: 'もう一度申請する',
    signoff: 'LexiClash作者 Ohad',
    dir: 'ltr',
  },
  es: {
    subject: 'Sobre tu solicitud de acceso docente en LexiClash',
    preheader: 'Esta vez no pude aprobarla, pero puedes volver a solicitarlo.',
    kicker: 'Acceso docente',
    headline: 'Esta vez no fue aprobada',
    greeting: (n) => `Hola, ${n}:`,
    lead: 'Gracias por solicitar el acceso docente. He revisado tu solicitud y ahora mismo no puedo aprobarla.',
    reasonTitle: 'Motivo:',
    play: 'El juego normal sigue siendo gratis para ti y tus amigos, sin necesidad de cuenta docente.',
    cta: 'Jugar a LexiClash',
    reapply: 'Si me cuentas un poco más sobre tu centro y tu clase, puedes volver a solicitarlo cuando quieras.',
    secondary: 'Solicitar de nuevo',
    signoff: 'Ohad, creador de LexiClash',
    dir: 'ltr',
  },
  ru: {
    subject: 'О вашей заявке на доступ учителя в LexiClash',
    preheader: 'В этот раз я не смог её одобрить, но можно подать снова.',
    kicker: 'Доступ учителя',
    headline: 'В этот раз заявка не одобрена',
    greeting: (n) => `Здравствуйте, ${n}!`,
    lead: 'Спасибо за заявку на доступ учителя. Я её посмотрел и пока не могу одобрить.',
    reasonTitle: 'Причина:',
    play: 'Обычная игра остаётся бесплатной для вас и ваших друзей, аккаунт учителя для неё не нужен.',
    cta: 'Играть в LexiClash',
    reapply: 'Если расскажете чуть подробнее о школе и классе, подать заявку снова можно в любое время.',
    secondary: 'Подать заявку снова',
    signoff: 'Охад, автор LexiClash',
    dir: 'ltr',
  },
};

export function teacherAccessDecline({ full_name, locale, reason }: Args) {
  const c = COPY[locale] || COPY.en;
  const why = (reason || '').trim();
  const blocks: NeoBlock[] = [
    { type: 'p', text: c.lead, strong: true },
    ...(why ? [{ type: 'callout' as const, title: c.reasonTitle, text: why }] : []),
    { type: 'p', text: c.reapply },
    { type: 'p', text: c.play },
  ];
  const html = renderNeoEmail({
    lang: locale,
    dir: c.dir,
    preheader: c.preheader,
    accent: 'orange',
    art: 'miss-you',
    kicker: c.kicker,
    headline: c.headline,
    greeting: c.greeting(firstName(full_name) || full_name),
    blocks,
    cta: { label: c.cta, href: `${EMAIL_SITE}/${locale}/multiplayer` },
    secondary: { label: c.secondary, href: `${EMAIL_SITE}/${locale}/education/access` },
    signoff: c.signoff,
  });
  return { subject: c.subject, html };
}
