/**
 * Copy for the Teacher Home trial-ending card (placement=trial_ending_card).
 *
 * In the free access trial: days left + keep class reports for $9/mo, and
 * "Keep Teacher Pro after your free trial" (no second trial). Trial already
 * ended: straight $9/mo. Never had a trial: the 14-day trial. Never ran a class game:
 * the 14 days start at the first class game (trialEndingWaitingCopy). Self-contained
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

const WAITING: Record<string, TrialEndingCardCopy> = {
  en: {
    title: 'Your 14-day free trial starts at your first class game',
    body: 'Run a live game with your class and Teacher Pro is free for 14 days from that moment.',
    cta: 'Start a class game',
    note: 'Keep Teacher Pro after your free trial for {price}/mo, or stay on the free plan.',
  },
  he: {
    title: '14 ימי הניסיון החינמיים מתחילים במשחק הכיתתי הראשון שלך',
    body: 'מריצים משחק חי עם הכיתה, ו-Teacher Pro חינם ל-14 יום מאותו רגע.',
    cta: 'להתחיל משחק כיתתי',
    note: 'אחרי תקופת הניסיון אפשר להמשיך עם Teacher Pro ב-{price} לחודש, או להישאר בתוכנית החינמית.',
  },
  es: {
    title: 'Tu prueba gratis de 14 días empieza con tu primera partida en clase',
    body: 'Juega una partida en vivo con tu clase y Teacher Pro es gratis durante 14 días desde ese momento.',
    cta: 'Empezar una partida en clase',
    note: 'Sigue con Teacher Pro después de tu prueba gratis por {price}/mes, o quédate en el plan gratuito.',
  },
  sv: {
    title: 'Din 14 dagar långa gratisperiod börjar med din första klassmatch',
    body: 'Kör en livematch med klassen så är Teacher Pro gratis i 14 dagar från det ögonblicket.',
    cta: 'Starta en klassmatch',
    note: 'Behåll Teacher Pro efter din gratisperiod för {price}/mån, eller stanna på gratisplanen.',
  },
  ja: {
    title: '14日間の無料トライアルは、最初のクラスゲームから始まります',
    body: 'クラスでライブゲームを始めると、その時点から14日間Teacher Proを無料で使えます。',
    cta: 'クラスゲームを始める',
    note: '無料トライアル後もTeacher Proを月{price}で続けるか、無料プランのまま使えます。',
  },
  ru: {
    title: 'Ваши 14 бесплатных дней начнутся с первой игры с классом',
    body: 'Запустите живую игру с классом, и Teacher Pro будет бесплатным 14 дней с этого момента.',
    cta: 'Начать игру с классом',
    note: 'Сохраните Teacher Pro после бесплатного периода за {price}/мес или оставайтесь на бесплатном плане.',
  },
};

/**
 * Never ran a class game: the free 14 days start at the first one (live or already-ended
 * window alike), so no countdown and no "ended". The action is the class game itself.
 */
export function trialEndingWaitingCopy(locale: string): TrialEndingCardCopy {
  const l = trialCopyBase(locale);
  const w = WAITING[l] ?? WAITING.en;
  return { ...w, note: fill(w.note, { price: wrapPrice(l) }) };
}

export const TRIAL_ENDING_CARD_PLACEMENT = 'trial_ending_card' as const;
export const TRIAL_ENDING_COPY_LOCALES = Object.keys(ENDING);
