/**
 * Copy for the Teacher Home trial-ending card (placement=trial_ending_card).
 *
 * In the free access trial: days left + keep class reports for $9/mo, and
 * "Keep Teacher Pro after your free trial" (no second trial). Trial already
 * ended: straight $9/mo. Never had a trial: the 14-day trial. Self-contained
 * per locale, same pattern as keepAfterTrialCopy.
 */
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import { TRIAL_COPY_RTL, trialCopyBase, resultsTrialCopy } from '@/lib/education/pro/trialCtaCopy';
import { keepAfterTrialCopy } from '@/lib/education/pro/keepAfterTrialCopy';
import { trialEndedCopy } from '@/lib/education/pro/trialEndedCopy';

export type TrialEndingCardCopy = {
  title: string;
  body: string;
  cta: string;
  note: string;
};

const LRI = '\u2066';
const PDI = '\u2069';

type EndingForms = { today: string; tomorrow: string; later: string; body: string; cta: string };

const ENDING: Record<string, EndingForms> = {
  en: {
    today: 'Your trial ends today',
    tomorrow: 'Your trial ends tomorrow',
    later: 'Your trial ends in {n} days',
    body: 'Keep class reports for {price}/mo.',
    cta: 'Keep Teacher Pro after your free trial',
  },
  he: {
    today: 'תקופת הניסיון נגמרת היום',
    tomorrow: 'תקופת הניסיון נגמרת מחר',
    later: 'תקופת הניסיון נגמרת בעוד {n} ימים',
    body: 'דוחות הכיתה נשארים בפרו למורים ב-{price} לחודש.',
    cta: 'להמשיך עם פרו למורים אחרי תקופת הניסיון',
  },
  es: {
    today: 'Tu prueba termina hoy',
    tomorrow: 'Tu prueba termina mañana',
    later: 'Tu prueba termina en {n} días',
    body: 'Sigue con los informes de la clase por {price}/mes.',
    cta: 'Seguir con Teacher Pro después de tu prueba gratis',
  },
  sv: {
    today: 'Din provperiod slutar idag',
    tomorrow: 'Din provperiod slutar imorgon',
    later: 'Din provperiod slutar om {n} dagar',
    body: 'Behåll klassrapporterna för {price}/mån.',
    cta: 'Behåll Teacher Pro efter din gratisperiod',
  },
  ja: {
    today: 'トライアルは今日までです',
    tomorrow: 'トライアルは明日までです',
    later: 'トライアルはあと{n}日です',
    body: 'クラスのレポートは月{price}のTeacher Proで続けられます。',
    cta: '無料トライアル後もTeacher Proを続ける',
  },
  ru: {
    today: 'Пробный период заканчивается сегодня',
    tomorrow: 'Пробный период заканчивается завтра',
    later: 'Пробный период закончится через {n} дн.',
    body: 'Отчёты класса останутся с Teacher Pro за {price}/мес.',
    cta: 'Сохранить Teacher Pro после бесплатного периода',
  },
};

const ENDED: Record<string, { title: string; body: string }> = {
  en: {
    title: 'Your free trial has ended, continue with Teacher Pro for {price}/mo',
    body: 'Class reports stay with Teacher Pro.',
  },
  he: {
    title: 'תקופת הניסיון החינמית הסתיימה, ממשיכים עם פרו למורים ב-{price} לחודש',
    body: 'דוחות הכיתה נשארים בפרו למורים.',
  },
  es: {
    title: 'Tu prueba gratis ha terminado, continúa con Teacher Pro por {price}/mes',
    body: 'Los informes de la clase siguen en Teacher Pro.',
  },
  sv: {
    title: 'Din gratisperiod har tagit slut, fortsätt med Teacher Pro för {price}/mån',
    body: 'Klassrapporterna stannar med Teacher Pro.',
  },
  ja: {
    title: '無料トライアルは終了しました。Teacher Proを月{price}で続けましょう',
    body: 'クラスのレポートはTeacher Proで続きます。',
  },
  ru: {
    title: 'Бесплатный период закончился, продолжите с Teacher Pro за {price}/мес',
    body: 'Отчёты класса останутся с Teacher Pro.',
  },
};

function wrapPrice(locale: string): string {
  const raw = `$${TEACHER_PRO_PRICE_USD}`;
  return TRIAL_COPY_RTL.has(locale) ? `${LRI}${raw}${PDI}` : raw;
}

function fill(s: string, vars: Record<string, string>): string {
  return s.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);
}

/**
 * In a live access trial: days left, keep reports for $9/mo, no second trial.
 * `daysLeft` is rounded up the same way as teacherTrialStatus: 1 = last 24 hours.
 */
export function trialEndingLiveCopy(locale: string, daysLeft: number, accessTrialEndsAt: string): TrialEndingCardCopy {
  const l = trialCopyBase(locale);
  const forms = ENDING[l] ?? ENDING.en;
  const keep = keepAfterTrialCopy(locale, accessTrialEndsAt);
  const price = wrapPrice(l);
  const title =
    daysLeft <= 1 ? forms.today : daysLeft === 2 ? forms.tomorrow : fill(forms.later, { n: String(daysLeft) });
  return {
    title,
    body: fill(forms.body, { price }),
    cta: forms.cta,
    note: keep.note,
  };
}

/** Access trial already ended: straight $9/mo, no trial wording. */
export function trialEndingEndedCopy(locale: string): TrialEndingCardCopy {
  const l = trialCopyBase(locale);
  const ended = ENDED[l] ?? ENDED.en;
  const paid = trialEndedCopy(locale);
  const price = wrapPrice(l);
  return {
    title: fill(ended.title, { price }),
    body: ended.body,
    cta: paid.cta,
    note: paid.note,
  };
}

/** Never had a trial: the 14-day Teacher Pro trial. */
export function trialEndingNeverCopy(locale: string): TrialEndingCardCopy {
  const base = resultsTrialCopy(locale);
  return {
    title: base.title,
    body: base.body,
    cta: base.trialCta,
    note: base.trialNote,
  };
}

export const TRIAL_ENDING_CARD_PLACEMENT = 'trial_ending_card' as const;
export const TRIAL_ENDING_COPY_LOCALES = Object.keys(ENDING);
