/**
 * Copy for the approved-never-tried Teacher Pro recall.
 *
 * Self-contained per locale, same reason as the other Teacher Pro banners:
 * a partial catalogue must not render a raw key on the money path.
 * English is the measured line — do not paraphrase it.
 */
import { TRIAL_COPY_RTL, trialCopyBase } from '@/lib/education/pro/trialCtaCopy';

export const TEACHER_WINBACK_BODY_EN =
  'Your 14-day free Teacher Pro trial is waiting — set up your first class in 2 minutes';

export type TeacherWinbackCopy = {
  title: string;
  cta: string;
  dismiss: string;
  dir?: 'rtl';
};

const COPY: Record<string, Omit<TeacherWinbackCopy, 'dir'>> = {
  en: {
    title: TEACHER_WINBACK_BODY_EN,
    cta: 'Start 14-day free trial',
    dismiss: 'Not now',
  },
  he: {
    title: 'ניסיון הפרו למורים ל-14 יום מחכה — הקימו כיתה ראשונה ב-2 דקות',
    cta: 'התחילו 14 יום בחינם',
    dismiss: 'לא עכשיו',
  },
  es: {
    title: 'Tu prueba gratis de 14 días de Teacher Pro te espera — crea tu primera clase en 2 minutos',
    cta: 'Empieza 14 días gratis',
    dismiss: 'Ahora no',
  },
  sv: {
    title: 'Din 14-dagars gratisperiod av Teacher Pro väntar — skapa din första klass på 2 minuter',
    cta: 'Starta 14 dagars gratis provperiod',
    dismiss: 'Inte nu',
  },
  ja: {
    title: '14日間の無料Teacher Proトライアルが待っています — 2分で最初のクラスを作りましょう',
    cta: '14日間の無料トライアルを開始',
    dismiss: '今はしない',
  },
  ru: {
    title: 'Ваш 14-дневный бесплатный период Teacher Pro ждёт — создайте первый класс за 2 минуты',
    cta: 'Начать 14 дней бесплатно',
    dismiss: 'Не сейчас',
  },
};

export function teacherWinbackCopy(locale: string): TeacherWinbackCopy {
  const base = trialCopyBase(locale);
  const row = COPY[base] ?? COPY.en;
  return { ...row, dir: TRIAL_COPY_RTL.has(base) ? 'rtl' : undefined };
}
