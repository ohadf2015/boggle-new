/**
 * Teacher Pro ask for a teacher whose free 14-day access trial has ENDED.
 *
 * They already had their free trial, so there is no second one: the checkout is a
 * straight $9/mo subscription (polarTrialPlan -> days 0) and the copy carries no
 * trial wording. Self-contained per locale, same pattern as keepAfterTrialCopy.
 */
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import { TRIAL_COPY_RTL, trialCopyBase } from '@/lib/education/pro/trialCtaCopy';

export type TrialEndedCopy = {
  /** Card / panel heading. */
  title: string;
  /** Primary button. */
  cta: string;
  /** Line under the button. */
  note: string;
  /** Short badge on the Pro plan card. */
  badge: string;
};

const LRI = '\u2066';
const PDI = '\u2069';

const COPY: Record<string, TrialEndedCopy> = {
  en: {
    title: 'Your free trial has ended: continue with Teacher Pro',
    cta: 'Continue with Teacher Pro',
    note: '{price}/mo · Cancel anytime',
    badge: 'Free trial ended',
  },
  he: {
    title: 'תקופת הניסיון החינמית הסתיימה: ממשיכים עם פרו למורים',
    cta: 'להמשיך עם פרו למורים',
    note: '{price} לחודש · ביטול בכל עת',
    badge: 'תקופת הניסיון הסתיימה',
  },
  es: {
    title: 'Tu prueba gratis ha terminado: continúa con Teacher Pro',
    cta: 'Continuar con Teacher Pro',
    note: '{price}/mes · Cancela cuando quieras',
    badge: 'Prueba gratis terminada',
  },
  sv: {
    title: 'Din gratisperiod har tagit slut: fortsätt med Teacher Pro',
    cta: 'Fortsätt med Teacher Pro',
    note: '{price}/mån · Avsluta när du vill',
    badge: 'Gratisperioden har slutat',
  },
  ja: {
    title: '無料トライアルは終了しました：Teacher Proを続けましょう',
    cta: 'Teacher Proを続ける',
    note: '月{price} · いつでも解約できます',
    badge: '無料トライアル終了',
  },
  ru: {
    title: 'Бесплатный период закончился: продолжите с Teacher Pro',
    cta: 'Продолжить с Teacher Pro',
    note: '{price}/мес · Отмена в любой момент',
    badge: 'Бесплатный период закончился',
  },
};

export function trialEndedCopy(locale: string): TrialEndedCopy {
  const l = trialCopyBase(locale);
  const raw = COPY[l] ?? COPY.en;
  const price = TRIAL_COPY_RTL.has(l) ? `${LRI}$${TEACHER_PRO_PRICE_USD}${PDI}` : `$${TEACHER_PRO_PRICE_USD}`;
  const fill = (s: string) => s.replace(/\{price\}/g, price);
  return { title: fill(raw.title), cta: fill(raw.cta), note: fill(raw.note), badge: fill(raw.badge) };
}

export const TRIAL_ENDED_LOCALES = Object.keys(COPY);
