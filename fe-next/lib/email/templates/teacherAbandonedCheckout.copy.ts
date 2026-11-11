import type { TeacherLocale } from '@/lib/education/types';
import type { AbandonedCheckoutEmailMode } from './teacherAbandonedCheckout';

export interface ModeCopy {
  subject: string;
  preheader: string;
  headline: string;
  lead: string;
  cta: string;
}

export interface AbandonedCheckoutCopy {
  kicker: string;
  greeting: (n: string) => string;
  modes: Record<AbandonedCheckoutEmailMode, ModeCopy>;
  body: string;
  priceTitle: string;
  price: string;
  ask: string;
  signoff: string;
  dir: 'ltr' | 'rtl';
}

// Inside-trial `keep` and after-trial `ended` never mention a 14-day trial: they already had theirs.
export const ABANDONED_CHECKOUT_COPY: Partial<Record<TeacherLocale, AbandonedCheckoutCopy>> & { en: AbandonedCheckoutCopy } = {
  en: {
    kicker: 'Teacher Pro',
    greeting: (n) => `Hi ${n},`,
    modes: {
      paid: {
        subject: 'Finish your Teacher Pro checkout',
        preheader: 'Your checkout stopped halfway. Here is a fresh link.',
        headline: 'Your checkout stopped halfway',
        lead: "You started upgrading to Teacher Pro but didn't get to the end of checkout.",
        cta: 'Finish checkout',
      },
      trial: {
        subject: 'Your free Teacher Pro trial is one step away',
        preheader: 'One more step and the 14 days start.',
        headline: 'One step from your free trial',
        lead: "You started a free 14-day Teacher Pro trial but didn't finish signing up.",
        cta: 'Start my free trial',
      },
      keep: {
        subject: 'Keep Teacher Pro after your free trial',
        preheader: 'Nothing is charged until your free trial is over.',
        headline: 'Keep Pro after your trial',
        lead: "You started setting up Teacher Pro to keep after your free trial, but didn't finish. $9/mo starts only when your free trial ends.",
        cta: 'Keep Teacher Pro after my trial',
      },
      ended: {
        subject: 'Your free trial has ended: continue with Teacher Pro',
        preheader: 'You were partway through setting up Teacher Pro.',
        headline: 'Pick up where you stopped',
        lead: "Your free trial has ended, and you started setting up Teacher Pro but didn't finish. You can continue for $9/mo and cancel whenever you like.",
        cta: 'Continue with Teacher Pro',
      },
    },
    body: 'If something went wrong on the payment page, this is a fresh link. It takes less than a minute.',
    priceTitle: 'Teacher Pro, $9 a month',
    price: 'Unlimited classrooms, live word games and the progress dashboard. You can cancel any time.',
    ask: 'Ran into a problem or have a question? Just reply to this email. I read every one.',
    signoff: 'Ohad, who built LexiClash',
    dir: 'ltr',
  },
  he: {
    kicker: 'Teacher Pro',
    greeting: (n) => `שלום ${n},`,
    modes: {
      paid: {
        subject: 'לסיים את השדרוג ל-Teacher Pro',
        preheader: 'התשלום נעצר באמצע. הנה קישור חדש.',
        headline: 'התשלום נעצר באמצע',
        lead: 'התחלת לשדרג ל-Teacher Pro, אבל התשלום לא הושלם.',
        cta: 'לסיים את השדרוג',
      },
      trial: {
        subject: 'עוד צעד אחד לניסיון החינמי של Teacher Pro',
        preheader: 'עוד צעד אחד, ו-14 הימים מתחילים.',
        headline: 'צעד אחד מהניסיון החינמי',
        lead: 'התחלת תקופת ניסיון חינמית של 14 יום ל-Teacher Pro, אבל ההרשמה לא הושלמה.',
        cta: 'להתחיל את תקופת הניסיון',
      },
      keep: {
        subject: 'ממשיכים עם Teacher Pro אחרי תקופת הניסיון',
        preheader: 'אין שום חיוב עד שתקופת הניסיון נגמרת.',
        headline: 'להמשיך עם Pro אחרי הניסיון',
        lead: 'התחלת להגדיר את Teacher Pro להמשך אחרי תקופת הניסיון החינמית, אבל זה לא הושלם. התשלום של 9$ לחודש מתחיל רק כשתקופת הניסיון מסתיימת.',
        cta: 'להמשיך עם Teacher Pro אחרי הניסיון',
      },
      ended: {
        subject: 'תקופת הניסיון הסתיימה: ממשיכים עם Teacher Pro',
        preheader: 'עצרת באמצע ההגדרה של Teacher Pro.',
        headline: 'להמשיך מאיפה שעצרת',
        lead: 'תקופת הניסיון החינמית הסתיימה, והתחלת להגדיר את Teacher Pro אבל זה לא הושלם. אפשר להמשיך ב-9$ לחודש ולבטל מתי שרוצים.',
        cta: 'להמשיך עם Teacher Pro',
      },
    },
    body: 'אם משהו השתבש בדף התשלום, זה קישור חדש. זה לוקח פחות מדקה.',
    priceTitle: 'Teacher Pro ב-9$ לחודש',
    price: 'כיתות ללא הגבלה, משחקי מילים חיים ולוח מעקב התקדמות. אפשר לבטל בכל רגע.',
    ask: 'נתקעתם או שיש שאלה? אפשר פשוט להשיב למייל הזה. אני קורא כל תשובה.',
    signoff: 'אוהד, שבנה את LexiClash',
    dir: 'rtl',
  },
  sv: {
    kicker: 'Teacher Pro',
    greeting: (n) => `Hej ${n},`,
    modes: {
      paid: {
        subject: 'Slutför ditt köp av Teacher Pro',
        preheader: 'Köpet stannade halvvägs. Här är en ny länk.',
        headline: 'Köpet stannade halvvägs',
        lead: 'Du började uppgradera till Teacher Pro men kom inte hela vägen genom betalningen.',
        cta: 'Slutför köpet',
      },
      trial: {
        subject: 'Din gratis provperiod av Teacher Pro är nära',
        preheader: 'Ett steg kvar, sedan börjar de 14 dagarna.',
        headline: 'Ett steg från provperioden',
        lead: 'Du började en gratis 14 dagars provperiod av Teacher Pro men slutförde inte registreringen.',
        cta: 'Starta min gratis provperiod',
      },
      keep: {
        subject: 'Behåll Teacher Pro efter din gratisperiod',
        preheader: 'Inget dras förrän din gratisperiod är slut.',
        headline: 'Behåll Pro efter gratisperioden',
        lead: 'Du började ställa in Teacher Pro för att behålla det efter gratisperioden, men blev inte klar. $9/mån börjar först när din gratisperiod slutar.',
        cta: 'Behåll Teacher Pro efter min provperiod',
      },
      ended: {
        subject: 'Gratisperioden är slut: fortsätt med Teacher Pro',
        preheader: 'Du var halvvägs med att ställa in Teacher Pro.',
        headline: 'Fortsätt där du slutade',
        lead: 'Din gratisperiod har tagit slut, och du började ställa in Teacher Pro men blev inte klar. Du kan fortsätta för $9/mån och avsluta när du vill.',
        cta: 'Fortsätt med Teacher Pro',
      },
    },
    body: 'Om något gick fel på betalsidan är det här en ny länk. Det tar mindre än en minut.',
    priceTitle: 'Teacher Pro, $9 i månaden',
    price: 'Obegränsat med klasser, ordspel i realtid och översikt över elevernas framsteg. Du kan avsluta när du vill.',
    ask: 'Stötte du på problem eller har du en fråga? Svara bara på det här mejlet. Jag läser alla.',
    signoff: 'Ohad, som byggde LexiClash',
    dir: 'ltr',
  },
  es: {
    kicker: 'Teacher Pro',
    greeting: (n) => `Hola, ${n}:`,
    modes: {
      paid: {
        subject: 'Termina tu compra de Teacher Pro',
        preheader: 'El pago se quedó a medias. Aquí tienes un enlace nuevo.',
        headline: 'El pago se quedó a medias',
        lead: 'Empezaste a pasarte a Teacher Pro, pero el pago no llegó a completarse.',
        cta: 'Terminar el pago',
      },
      trial: {
        subject: 'Tu prueba gratis de Teacher Pro está a un paso',
        preheader: 'Un paso más y empiezan tus 14 días.',
        headline: 'A un paso de tu prueba',
        lead: 'Empezaste una prueba gratis de 14 días de Teacher Pro, pero no terminaste el registro.',
        cta: 'Empezar mi prueba gratis',
      },
      keep: {
        subject: 'Sigue con Teacher Pro después de tu prueba',
        preheader: 'No se cobra nada hasta que termine tu prueba gratis.',
        headline: 'Sigue con Pro tras la prueba',
        lead: 'Empezaste a configurar Teacher Pro para seguir después de tu prueba gratis, pero no lo terminaste. Los $9/mes empiezan solo cuando termina tu prueba gratis.',
        cta: 'Seguir con Teacher Pro después de mi prueba',
      },
      ended: {
        subject: 'Tu prueba gratis terminó: sigue con Teacher Pro',
        preheader: 'Te quedaste a mitad de configurar Teacher Pro.',
        headline: 'Sigue donde lo dejaste',
        lead: 'Tu prueba gratis ha terminado, y empezaste a configurar Teacher Pro sin llegar a terminar. Puedes continuar por $9/mes y cancelar cuando quieras.',
        cta: 'Continuar con Teacher Pro',
      },
    },
    body: 'Si algo falló en la página de pago, este es un enlace nuevo. Se hace en menos de un minuto.',
    priceTitle: 'Teacher Pro, $9 al mes',
    price: 'Clases ilimitadas, juegos de palabras en directo y el panel de progreso. Puedes cancelar cuando quieras.',
    ask: '¿Te has topado con algún problema o tienes una pregunta? Responde a este correo. Los leo todos.',
    signoff: 'Ohad, creador de LexiClash',
    dir: 'ltr',
  },
  ja: {
    kicker: 'Teacher Pro',
    greeting: (n) => `${n}様`,
    modes: {
      paid: {
        subject: 'Teacher Proのお手続きが途中で止まっています',
        preheader: '新しいリンクをお送りします。1分ほどで完了します。',
        headline: 'お手続きが途中のままです',
        lead: 'Teacher Proへのアップグレードを始められましたが、お支払いが完了していません。',
        cta: 'お手続きを完了する',
      },
      trial: {
        subject: 'Teacher Proの無料トライアルまであと一歩です',
        preheader: 'あと一歩で14日間のトライアルが始まります。',
        headline: '無料トライアルまであと一歩',
        lead: 'Teacher Proの14日間無料トライアルを始められましたが、登録が完了していません。',
        cta: '無料トライアルを始める',
      },
      keep: {
        subject: '無料トライアル後もTeacher Proを続けませんか',
        preheader: '無料トライアルが終わるまで料金はかかりません。',
        headline: 'トライアル後もProを続ける',
        lead: '無料トライアル後もTeacher Proを続ける設定を始められましたが、完了していません。月$9のお支払いは無料トライアルの終了後に始まります。',
        cta: 'トライアル後もTeacher Proを続ける',
      },
      ended: {
        subject: '無料トライアルが終了しました：Teacher Proのご案内',
        preheader: 'Teacher Proの設定が途中のままです。',
        headline: '途中から再開できます',
        lead: '無料トライアルは終了しました。Teacher Proの設定を始められましたが、完了していません。月$9で続けられ、いつでも解約できます。',
        cta: 'Teacher Proを続ける',
      },
    },
    body: 'お支払いページで問題があった場合は、こちらの新しいリンクをお使いください。1分もかかりません。',
    priceTitle: 'Teacher Pro 月$9',
    price: 'クラス数無制限、リアルタイムの単語ゲーム、進捗ダッシュボードが使えます。いつでも解約できます。',
    ask: '問題やご質問があれば、このメールにそのまま返信してください。すべて私が読んでいます。',
    signoff: 'Ohad（LexiClash作者）',
    dir: 'ltr',
  },
  ru: {
    kicker: 'Teacher Pro',
    greeting: (n) => `Здравствуйте, ${n}!`,
    modes: {
      paid: {
        subject: 'Завершите оформление Teacher Pro',
        preheader: 'Оплата остановилась на полпути. Вот новая ссылка.',
        headline: 'Оплата остановилась на полпути',
        lead: 'Вы начали переход на Teacher Pro, но оплата так и не завершилась.',
        cta: 'Завершить оплату',
      },
      trial: {
        subject: 'Остался один шаг до пробного Teacher Pro',
        preheader: 'Ещё один шаг, и начнутся ваши 14 дней.',
        headline: 'Один шаг до пробного периода',
        lead: 'Вы начали бесплатный 14-дневный пробный период Teacher Pro, но не завершили регистрацию.',
        cta: 'Начать бесплатный период',
      },
      keep: {
        subject: 'Сохраните Teacher Pro после бесплатного периода',
        preheader: 'Деньги не спишутся, пока не закончится бесплатный период.',
        headline: 'Pro после бесплатного периода',
        lead: 'Вы начали оформлять Teacher Pro, чтобы продолжить после бесплатного периода, но не закончили. Оплата $9/мес начнётся только когда закончится бесплатный период.',
        cta: 'Сохранить Teacher Pro после пробного периода',
      },
      ended: {
        subject: 'Бесплатный период закончился: продолжите с Pro',
        preheader: 'Вы остановились на середине оформления Teacher Pro.',
        headline: 'Продолжите с того же места',
        lead: 'Ваш бесплатный период закончился, а оформление Teacher Pro осталось незавершённым. Можно продолжить за $9/мес и отменить в любой момент.',
        cta: 'Продолжить с Teacher Pro',
      },
    },
    body: 'Если на странице оплаты что-то пошло не так, вот новая ссылка. Это займёт меньше минуты.',
    priceTitle: 'Teacher Pro, $9 в месяц',
    price: 'Безлимитные классы, словесные игры в реальном времени и панель прогресса. Отменить можно в любой момент.',
    ask: 'Возникла проблема или вопрос? Просто ответьте на это письмо. Я читаю все ответы.',
    signoff: 'Охад, автор LexiClash',
    dir: 'ltr',
  },
};
