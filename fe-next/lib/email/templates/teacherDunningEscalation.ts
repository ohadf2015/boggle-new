import { firstName } from './teacherEmailLayout';
import type { TeacherLocale } from '@/lib/education/types';
import { renderNeoEmail } from '@/lib/email/kit/neoEmail';

interface Args {
  full_name: string;
  locale: TeacherLocale;
  /** Signed recover link. Click mints a Polar session and opens the card form. */
  portalUrl: string;
}

interface Copy {
  subject: string;
  preheader: string;
  kicker: string;
  headline: string;
  greeting: (n: string) => string;
  lead: string;
  safeTitle: string;
  safe: string;
  body: string;
  cta: string;
  ask: string;
  signoff: string;
  dir: 'ltr' | 'rtl';
}

const CONTACT = 'lexiclash.game@gmail.com';

const COPY: Record<TeacherLocale, Copy> = {
  en: {
    subject: 'Teacher Pro is still unpaid',
    preheader: 'One click opens the card update. Your classroom is still there.',
    kicker: 'Billing',
    headline: 'Update the card to keep Teacher Pro',
    greeting: (n) => `Hi ${n},`,
    lead: 'The $9 Teacher Pro renewal is still unpaid. One click opens the payment page, with no extra sign-in.',
    safeTitle: 'Nothing is lost',
    safe: 'Your classroom is untouched. Students, lessons and reports are all still there.',
    body: 'If the card is not updated, Teacher Pro lapses and the account goes back to the free tier (3 classes, no reports).',
    cta: 'Update my card',
    ask: `Already updated the card, or would you rather cancel? Reply and I'll sort it out myself: ${CONTACT}`,
    signoff: 'Ohad, who built LexiClash',
    dir: 'ltr',
  },
  he: {
    subject: 'Teacher Pro עדיין לא שולם',
    preheader: 'לחיצה אחת פותחת את עדכון הכרטיס. הכיתה עדיין שם.',
    kicker: 'חיוב',
    headline: 'עדכנו את הכרטיס כדי להשאיר את Teacher Pro',
    greeting: (n) => `שלום ${n},`,
    lead: 'חידוש המנוי ל-Teacher Pro (9$) עדיין לא שולם. לחיצה אחת פותחת את דף התשלום, בלי התחברות נוספת.',
    safeTitle: 'שום דבר לא אבד',
    safe: 'הכיתה שלך לא נפגעה. התלמידים, השיעורים והדוחות עדיין שם.',
    body: 'אם הכרטיס לא יעודכן, Teacher Pro יפקע והחשבון יחזור לתוכנית החינמית (3 כיתות, בלי דוחות).',
    cta: 'לעדכן את הכרטיס',
    ask: `הכרטיס כבר עודכן, או שעדיף לבטל? אפשר להשיב למייל ואסדר את זה בעצמי: ${CONTACT}`,
    signoff: 'אוהד, שבנה את LexiClash',
    dir: 'rtl',
  },
  sv: {
    subject: 'Teacher Pro är fortfarande obetald',
    preheader: 'Ett klick öppnar kortuppdateringen. Klassrummet finns kvar.',
    kicker: 'Betalning',
    headline: 'Uppdatera kortet för att behålla Teacher Pro',
    greeting: (n) => `Hej ${n},`,
    lead: 'Förnyelsen av Teacher Pro för $9 är fortfarande obetald. Ett klick öppnar betalningssidan, utan extra inloggning.',
    safeTitle: 'Inget har försvunnit',
    safe: 'Ditt klassrum är orört. Elever, lektioner och rapporter finns kvar precis som förut.',
    body: 'Om kortet inte uppdateras upphör Teacher Pro och kontot går tillbaka till gratisnivån (3 klasser, inga rapporter).',
    cta: 'Uppdatera mitt kort',
    ask: `Har du redan bytt kort, eller vill du hellre avsluta? Svara på mejlet så ordnar jag det själv: ${CONTACT}`,
    signoff: 'Ohad, som byggde LexiClash',
    dir: 'ltr',
  },
  ja: {
    subject: 'Teacher Pro の更新がまだ完了していません',
    preheader: 'ワンクリックでカード更新が開きます。クラスはそのまま残っています。',
    kicker: 'お支払い',
    headline: 'カードを更新して Teacher Pro を続ける',
    greeting: (n) => `${n}さん、こんにちは。`,
    lead: 'Teacher Pro（$9）の更新がまだ完了していません。ワンクリックで決済ページが開き、追加のログインは不要です。',
    safeTitle: 'データは失われていません',
    safe: 'クラスはそのままです。生徒、授業、レポートもすべて残っています。',
    body: 'カードが更新されないと Teacher Pro は終了し、アカウントは無料プラン（3クラスまで、レポートなし）に戻ります。',
    cta: 'カードを更新する',
    ask: `すでにカードを更新された場合や、解約をご希望の場合は、このメールにご返信ください。私が対応します：${CONTACT}`,
    signoff: 'LexiClash を作った Ohad より',
    dir: 'ltr',
  },
  es: {
    subject: 'Teacher Pro sigue sin pagarse',
    preheader: 'Un clic abre la actualización de la tarjeta. Tu clase sigue ahí.',
    kicker: 'Facturación',
    headline: 'Actualiza la tarjeta para conservar Teacher Pro',
    greeting: (n) => `Hola, ${n}:`,
    lead: 'La renovación de Teacher Pro de $9 sigue sin pagarse. Un clic abre la página de pago, sin un inicio de sesión extra.',
    safeTitle: 'No se ha perdido nada',
    safe: 'Tu clase sigue intacta. Los alumnos, las lecciones y los informes siguen ahí.',
    body: 'Si no se actualiza la tarjeta, Teacher Pro vencerá y la cuenta volverá al plan gratuito (3 clases, sin informes).',
    cta: 'Actualizar mi tarjeta',
    ask: `¿Ya actualizaste la tarjeta o prefieres cancelar? Responde a este correo y lo resuelvo yo mismo: ${CONTACT}`,
    signoff: 'Ohad, el creador de LexiClash',
    dir: 'ltr',
  },
  ru: {
    subject: 'Teacher Pro всё ещё не оплачен',
    preheader: 'Одно нажатие открывает обновление карты. Класс на месте.',
    kicker: 'Оплата',
    headline: 'Обновите карту, чтобы сохранить Teacher Pro',
    greeting: (n) => `Здравствуйте, ${n}!`,
    lead: 'Продление Teacher Pro за $9 всё ещё не оплачено. Одно нажатие открывает страницу оплаты, без дополнительного входа.',
    safeTitle: 'Ничего не потеряно',
    safe: 'Ваш класс на месте. Ученики, уроки и отчёты никуда не делись.',
    body: 'Если карту не обновить, Teacher Pro отключится и аккаунт вернётся на бесплатный тариф (3 класса, без отчётов).',
    cta: 'Обновить карту',
    ask: `Уже обновили карту или хотите отменить подписку? Ответьте на это письмо, и я сам всё улажу: ${CONTACT}`,
    signoff: 'Охад, создатель LexiClash',
    dir: 'ltr',
  },
};

/** Day-5 escalation. The CTA is the signed recover link, not the login-gated portal route. */
export function teacherDunningEscalation({ full_name, locale, portalUrl }: Args) {
  const c = COPY[locale] || COPY.en;
  const html = renderNeoEmail({
    lang: locale,
    dir: c.dir,
    preheader: c.preheader,
    accent: 'pink',
    art: 'card-oops',
    kicker: c.kicker,
    headline: c.headline,
    greeting: c.greeting(firstName(full_name) || full_name),
    blocks: [
      { type: 'p', text: c.lead, strong: true },
      { type: 'callout', title: c.safeTitle, text: c.safe },
      { type: 'p', text: c.body },
      { type: 'p', text: c.ask },
    ],
    cta: { label: c.cta, href: portalUrl },
    signoff: c.signoff,
  });
  return { subject: c.subject, html };
}
