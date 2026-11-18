import { firstName } from './teacherEmailLayout';
import type { TeacherLocale } from '@/lib/education/types';
import { renderNeoEmail } from '@/lib/email/kit/neoEmail';

interface Args {
  full_name: string;
  locale: TeacherLocale;
  /**
   * Polar customer-portal URL (one-click card update).
   */
  portalUrl: string;
}

interface Copy {
  subject: string;
  preheader: string;
  kicker: string;
  headline: string;
  greeting: (n: string) => string;
  lead: string;
  warningTitle: string;
  warning: string;
  body: string;
  cta: string;
  ask: string;
  signoff: string;
  dir: 'ltr' | 'rtl';
}

const CONTACT = 'lexiclash.game@gmail.com';

const COPY: Record<TeacherLocale, Copy> = {
  en: {
    subject: 'Urgent: Teacher Pro access pauses in 2 days',
    preheader: 'Your card still needs an update. 48 hours left to keep unlimited classes.',
    kicker: 'Urgent · Billing',
    headline: 'Teacher Pro pauses in 2 days',
    greeting: (n) => `Hi ${n},`,
    lead: 'We tried charging your card again for Teacher Pro, but the payment is still failing. Your 7-day grace period ends in 48 hours.',
    warningTitle: 'What happens in 2 days',
    warning: 'Teacher Pro will pause and your account will revert to the free plan (3 classes, no progress reports or export).',
    body: 'Your existing classes and students will not be deleted, but you will not be able to run unlimited classes until the card is updated.',
    cta: 'Update my payment method',
    ask: `Need help or need to update school billing? Reply directly to this email: ${CONTACT}`,
    signoff: 'Ohad, who built LexiClash',
    dir: 'ltr',
  },
  he: {
    subject: 'דחוף: גישת Teacher Pro תוקפא בעוד יומיים',
    preheader: 'הכרטיס עדיין דורש עדכון. נותרו 48 שעות לשמירה על כיתות ללא הגבלה.',
    kicker: 'דחוף · חיוב',
    headline: 'מנוי Teacher Pro יוקפא בעוד יומיים',
    greeting: (n) => `שלום ${n},`,
    lead: 'ניסינו לחייב שוב את כרטיס האשראי עבור Teacher Pro, אך התשלום עדיין לא עבר. תקופת החסד של 7 ימים מסתיימת בעוד 48 שעות.',
    warningTitle: 'מה יקרה בעוד יומיים',
    warning: 'מנוי ה-Pro יוקפא והחשבון יחזור לתוכנית החינמית (3 כיתות, ללא דוחות התקדמות או ייצוא).',
    body: 'הכיתות והתלמידים הקיימים לא יימחקו, אך לא ניתן יהיה להפעיל כיתות ללא הגבלה עד לעדכון הכרטיס.',
    cta: 'לעדכון אמצעי התשלום',
    ask: `צריכים עזרה או עדכון חיוב מול בית הספר? אפשר להשיב ישירות למייל זה: ${CONTACT}`,
    signoff: 'אוהד, שבנה את LexiClash',
    dir: 'rtl',
  },
  sv: {
    subject: 'Brådskande: Teacher Pro pausas om 2 dagar',
    preheader: 'Ditt kort behöver fortfarande uppdateras. 48 timmar kvar att behålla obegränsade klasser.',
    kicker: 'Brådskande · Betalning',
    headline: 'Teacher Pro pausas om 2 dagar',
    greeting: (n) => `Hej ${n},`,
    lead: 'Vi försökte debitera ditt kort igen för Teacher Pro, men betalningen misslyckas fortfarande. Din 7-dagars frist löper ut om 48 timmar.',
    warningTitle: 'Vad händer om 2 dagar',
    warning: 'Teacher Pro pausas och kontot återgår till gratisplanen (3 klasser, inga framstegsrapporter).',
    body: 'Dina befintliga klasser och elever raderas inte, men obegränsade klasser pausas tills kortet är uppdaterat.',
    cta: 'Uppdatera betalmetod',
    ask: `Behöver du hjälp med skolans fakturering? Svara direkt på detta mejl: ${CONTACT}`,
    signoff: 'Ohad, som byggde LexiClash',
    dir: 'ltr',
  },
  ja: {
    subject: '重要：Teacher Pro のご利用が2日後に一時停止します',
    preheader: 'カード情報の更新が必要です。無制限クラスを維持できるのは残り48時間です。',
    kicker: '重要 · お支払い',
    headline: 'Teacher Pro は2日後に停止します',
    greeting: (n) => `${n}さん、こんにちは。`,
    lead: 'Teacher Pro のお支払いを再度試行しましたが、カード決済が完了しませんでした。7日間の猶予期間は残り48時間で終了します。',
    warningTitle: '2日後に起こること',
    warning: 'Teacher Pro は一時停止され、アカウントは無料プラン（3クラスまで、レポートなし）に戻ります。',
    body: '既存のクラスや生徒データは削除されませんが、カード情報が更新されるまで無制限クラスはご利用いただけません。',
    cta: 'お支払い方法を更新する',
    ask: `学校の経理処理などでお困りの場合は、このメールに直接ご返信ください：${CONTACT}`,
    signoff: 'LexiClash を作った Ohad より',
    dir: 'ltr',
  },
  es: {
    subject: 'Urgente: el acceso a Teacher Pro se pausará en 2 días',
    preheader: 'Tu tarjeta aún requiere actualización. Quedan 48 horas para conservar clases ilimitadas.',
    kicker: 'Urgente · Facturación',
    headline: 'Teacher Pro se pausará en 2 días',
    greeting: (n) => `Hola, ${n}:`,
    lead: 'Intentamos realizar el cobro de Teacher Pro nuevamente, pero la tarjeta sigue siendo rechazada. Tu período de gracia de 7 días finaliza en 48 horas.',
    warningTitle: 'Qué sucederá en 2 días',
    warning: 'Teacher Pro se pausará y tu cuenta volverá al plan gratuito (3 clases, sin informes de progreso).',
    body: 'Tus clases y alumnos actuales no se eliminarán, pero no podrás gestionar clases ilimitadas hasta que actualices tu tarjeta.',
    cta: 'Actualizar método de pago',
    ask: `¿Necesitas ayuda o gestionar la facturación del colegio? Responde directamente a este correo: ${CONTACT}`,
    signoff: 'Ohad, el creador de LexiClash',
    dir: 'ltr',
  },
  ru: {
    subject: 'Срочно: доступ к Teacher Pro приостановится через 2 дня',
    preheader: 'Карту всё ещё нужно обновить. Осталось 48 часов для сохранения безлимитных классов.',
    kicker: 'Срочно · Оплата',
    headline: 'Teacher Pro приостановится через 2 дня',
    greeting: (n) => `Здравствуйте, ${n}!`,
    lead: 'Мы повторили попытку списания за Teacher Pro, но платёж снова был отклонён. Ваш 7-дневный льготный период истекает через 48 часов.',
    warningTitle: 'Что произойдёт через 2 дня',
    warning: 'Teacher Pro будет приостановлен, и аккаунт перейдёт на бесплатный тариф (3 класса, без отчётов).',
    body: 'Ваши классы и ученики не исчезнут, но проводить неограниченное число классов можно будет только после обновления карты.',
    cta: 'Обновить способ оплаты',
    ask: `Нужна помощь или счёт для школы? Ответьте прямо на это письмо: ${CONTACT}`,
    signoff: 'Охад, создатель LexiClash',
    dir: 'ltr',
  },
};

export function teacherPaymentFailedDay5({ full_name, locale, portalUrl }: Args) {
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
      { type: 'callout', title: c.warningTitle, text: c.warning },
      { type: 'p', text: c.body },
      { type: 'p', text: c.ask },
    ],
    cta: { label: c.cta, href: portalUrl },
    signoff: c.signoff,
  });

  return { subject: c.subject, html };
}
