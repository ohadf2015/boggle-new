import { firstName } from './teacherEmailLayout';
import type { TeacherLocale } from '@/lib/education/types';
import { escapeHtml, renderNeoEmail } from '@/lib/email/kit/neoEmail';

interface Args {
  full_name: string;
  locale: TeacherLocale;
  /**
   * Polar customer-portal URL (update the card in one click). When the portal
   * session could not be created this is the teacher dashboard instead, which
   * carries the same Manage Subscription entry point — never a dead link.
   */
  portalUrl: string;
  /** ISO renewal date that failed — rendered as a date in the teacher's locale. */
  renewalDate: string | null;
}

const DATE_LOCALE: Record<TeacherLocale, string> = {
  en: 'en-US', he: 'he-IL', sv: 'sv-SE', ja: 'ja-JP', es: 'es-ES', ru: 'ru-RU',
};

interface Copy {
  subject: string;
  preheader: string;
  kicker: string;
  headline: string;
  greeting: (n: string) => string;
  lead: (date: string | null) => string;
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
    subject: 'Your Teacher Pro payment did not go through',
    preheader: 'Your classroom is fine. The card just needs a quick update.',
    kicker: 'Billing',
    headline: 'Your card needs a quick look',
    greeting: (n) => `Hi ${n},`,
    lead: (date) =>
      date
        ? `Your card declined the $9 Teacher Pro renewal on ${date}. This happens a lot with expired or replaced cards.`
        : 'Your card declined the $9 Teacher Pro renewal. This happens a lot with expired or replaced cards.',
    safeTitle: 'Nothing is lost',
    safe: 'Your classroom is untouched. Students, lessons and reports are all still there.',
    body: 'If the card keeps declining, Teacher Pro lapses and the account goes back to the free tier (3 classes, no reports). Updating the card takes less than a minute.',
    cta: 'Update my card',
    ask: `Already updated the card, or would you rather cancel? Reply and I'll sort it out myself: ${CONTACT}`,
    signoff: 'Ohad, who built LexiClash',
    dir: 'ltr',
  },
  he: {
    subject: 'התשלום על Teacher Pro לא עבר',
    preheader: 'הכיתה בסדר. צריך רק לעדכן את הכרטיס.',
    kicker: 'חיוב',
    headline: 'צריך לעדכן את הכרטיס',
    greeting: (n) => `שלום ${n},`,
    lead: (date) =>
      date
        ? `חידוש המנוי ל-Teacher Pro (9$) ב-${date} נדחה על ידי כרטיס האשראי. זה קורה הרבה כשכרטיס פג תוקף או הוחלף.`
        : 'חידוש המנוי ל-Teacher Pro (9$) נדחה על ידי כרטיס האשראי. זה קורה הרבה כשכרטיס פג תוקף או הוחלף.',
    safeTitle: 'שום דבר לא אבד',
    safe: 'הכיתה שלך לא נפגעה. התלמידים, השיעורים והדוחות עדיין שם.',
    body: 'אם הכרטיס ימשיך לדחות את החיוב, המנוי יפקע והחשבון יחזור לתוכנית החינמית (3 כיתות, בלי דוחות). עדכון הכרטיס לוקח פחות מדקה.',
    cta: 'לעדכן את הכרטיס',
    ask: `הכרטיס כבר עודכן, או שעדיף לבטל? אפשר להשיב למייל ואסדר את זה בעצמי: ${CONTACT}`,
    signoff: 'אוהד, שבנה את LexiClash',
    dir: 'rtl',
  },
  sv: {
    subject: 'Betalningen för Teacher Pro gick inte igenom',
    preheader: 'Ditt klassrum är kvar som det var. Kortet behöver bara uppdateras.',
    kicker: 'Betalning',
    headline: 'Ditt kort behöver ses över',
    greeting: (n) => `Hej ${n},`,
    lead: (date) =>
      date
        ? `Ditt kort nekade förnyelsen av Teacher Pro för $9 den ${date}. Det händer ofta när ett kort har gått ut eller bytts ut.`
        : 'Ditt kort nekade förnyelsen av Teacher Pro för $9. Det händer ofta när ett kort har gått ut eller bytts ut.',
    safeTitle: 'Inget har försvunnit',
    safe: 'Ditt klassrum är orört. Elever, lektioner och rapporter finns kvar precis som förut.',
    body: 'Om kortet fortsätter att nekas upphör Teacher Pro och kontot går tillbaka till gratisnivån (3 klasser, inga rapporter). Det tar mindre än en minut att uppdatera kortet.',
    cta: 'Uppdatera mitt kort',
    ask: `Har du redan bytt kort, eller vill du hellre avsluta? Svara på mejlet så ordnar jag det själv: ${CONTACT}`,
    signoff: 'Ohad, som byggde LexiClash',
    dir: 'ltr',
  },
  ja: {
    subject: 'Teacher Pro のお支払いが完了しませんでした',
    preheader: 'クラスはそのまま残っています。カード情報の更新だけお願いします。',
    kicker: 'お支払い',
    headline: 'カード情報をご確認ください',
    greeting: (n) => `${n}さん、こんにちは。`,
    lead: (date) =>
      date
        ? `${date}の Teacher Pro（$9）の更新で、カードの決済が承認されませんでした。カードの有効期限切れや切り替えのときによくあることです。`
        : 'Teacher Pro（$9）の更新で、カードの決済が承認されませんでした。カードの有効期限切れや切り替えのときによくあることです。',
    safeTitle: 'データは失われていません',
    safe: 'クラスはそのままです。生徒、授業、レポートもすべて残っています。',
    body: 'カードの決済が承認されない状態が続くと、Teacher Pro は終了し、アカウントは無料プラン（3クラスまで、レポートなし）に戻ります。カードの更新は1分もかかりません。',
    cta: 'カード情報を更新する',
    ask: `すでにカードを更新された場合や、解約をご希望の場合は、このメールにご返信ください。私が対応します：${CONTACT}`,
    signoff: 'LexiClash を作った Ohad より',
    dir: 'ltr',
  },
  es: {
    subject: 'No se pudo cobrar tu Teacher Pro',
    preheader: 'Tu clase está bien. Solo hace falta actualizar la tarjeta.',
    kicker: 'Facturación',
    headline: 'Échale un vistazo a tu tarjeta',
    greeting: (n) => `Hola, ${n}:`,
    lead: (date) =>
      date
        ? `Tu tarjeta rechazó la renovación de Teacher Pro de $9 el ${date}. Pasa mucho cuando una tarjeta caducó o se cambió por otra.`
        : 'Tu tarjeta rechazó la renovación de Teacher Pro de $9. Pasa mucho cuando una tarjeta caducó o se cambió por otra.',
    safeTitle: 'No se ha perdido nada',
    safe: 'Tu clase sigue intacta. Los alumnos, las lecciones y los informes siguen ahí.',
    body: 'Si la tarjeta sigue rechazando el cobro, Teacher Pro vencerá y la cuenta volverá al plan gratuito (3 clases, sin informes). Actualizar la tarjeta lleva menos de un minuto.',
    cta: 'Actualizar mi tarjeta',
    ask: `¿Ya actualizaste la tarjeta o prefieres cancelar? Responde a este correo y lo resuelvo yo mismo: ${CONTACT}`,
    signoff: 'Ohad, el creador de LexiClash',
    dir: 'ltr',
  },
  ru: {
    subject: 'Не удалось оплатить Teacher Pro',
    preheader: 'С вашим классом всё в порядке. Нужно только обновить карту.',
    kicker: 'Оплата',
    headline: 'Проверьте, пожалуйста, карту',
    greeting: (n) => `Здравствуйте, ${n}!`,
    lead: (date) =>
      date
        ? `${date} не прошло продление Teacher Pro за $9: карта отклонила платёж. Так часто бывает, когда у карты истёк срок или её заменили.`
        : 'Не прошло продление Teacher Pro за $9: карта отклонила платёж. Так часто бывает, когда у карты истёк срок или её заменили.',
    safeTitle: 'Ничего не потеряно',
    safe: 'Ваш класс на месте. Ученики, уроки и отчёты никуда не делись.',
    body: 'Если карта и дальше будет отклонять платёж, Teacher Pro отключится и аккаунт вернётся на бесплатный тариф (3 класса, без отчётов). Обновить карту можно меньше чем за минуту.',
    cta: 'Обновить карту',
    ask: `Уже обновили карту или хотите отменить подписку? Ответьте на это письмо, и я сам всё улажу: ${CONTACT}`,
    signoff: 'Охад, создатель LexiClash',
    dir: 'ltr',
  },
};

export function teacherPaymentFailed({ full_name, locale, portalUrl, renewalDate }: Args) {
  const c = COPY[locale] || COPY.en;
  const dateStr = renewalDate
    ? new Date(renewalDate).toLocaleDateString(DATE_LOCALE[locale] || 'en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null;

  const html = renderNeoEmail({
    lang: locale,
    dir: c.dir,
    preheader: c.preheader,
    accent: 'cyan',
    art: 'card-oops',
    kicker: c.kicker,
    headline: c.headline,
    greeting: c.greeting(firstName(full_name) || full_name),
    blocks: [
      { type: 'p', text: c.lead(dateStr), strong: true },
      { type: 'callout', title: c.safeTitle, text: c.safe },
      { type: 'p', text: c.body },
      { type: 'p', text: c.ask },
    ],
    cta: { label: c.cta, href: portalUrl },
    signoff: c.signoff,
  });

  return { subject: c.subject, html };
}
