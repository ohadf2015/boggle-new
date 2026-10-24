/**
 * Self-contained, per-locale Teacher Pro trial + school quote copy.
 * Used by the classroom results card and the /education landing Pro CTA, so the
 * trial ask reads the same everywhere and never renders raw i18n keys when a
 * partial catalogue is loaded (same pattern as TeacherProCheckoutCta).
 */
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import { TEACHER_PRO_TRIAL_DAYS } from '@/lib/education/pro/trialDays';
import { SCHOOL_PRICING } from '@/lib/education/pro/schoolPricing';

export type ResultsTrialCopy = {
  title: string;
  body: string;
  trialCta: string;
  upgradeCta: string;
  trialNote: string;
  upgradeNote: string;
  quoteCta: string;
  quoteNote: string;
};

const LRI = '\u2066';
const PDI = '\u2069';
const ltr = (s: string) => `${LRI}${s}${PDI}`;

const COPY: Record<string, ResultsTrialCopy> = {
  en: {
    title: 'Keep this class going with Teacher Pro',
    body: 'Unlimited classes, who-struggled reports after every round, and printable progress.',
    trialCta: 'Start your {days}-day Teacher Pro trial',
    upgradeCta: 'Upgrade to Teacher Pro — {price}/mo',
    trialNote: 'Then {price}/mo · Cancel anytime',
    upgradeNote: 'Cancel anytime · Free plan stays free',
    quoteCta: 'Get a school quote',
    quoteNote: '{schoolPrice} per teacher / year for {minTeachers}+ teachers, by invoice',
  },
  he: {
    title: 'ממשיכים עם הכיתה הזו בפרו למורים',
    body: 'כיתות ללא הגבלה, דוח "מי התקשה" אחרי כל סבב ודוחות התקדמות להדפסה.',
    trialCta: 'התחילו ניסיון של {days} ימים בפרו למורים',
    upgradeCta: 'שדרגו לפרו למורים — {price} לחודש',
    trialNote: 'אחר כך {price} לחודש · ביטול בכל עת',
    upgradeNote: 'ביטול בכל עת · התוכנית החינמית נשארת חינמית',
    quoteCta: 'קבלו הצעת מחיר לבית הספר',
    quoteNote: '{schoolPrice} למורה לשנה, מ־{minTeachers} מורים ומעלה, בחשבונית',
  },
  es: {
    title: 'Sigue con esta clase con Teacher Pro',
    body: 'Clases ilimitadas, informe de quién tuvo dificultades tras cada ronda y progreso imprimible.',
    trialCta: 'Empieza tu prueba de {days} días de Teacher Pro',
    upgradeCta: 'Mejora a Teacher Pro — {price}/mes',
    trialNote: 'Después {price}/mes · Cancela cuando quieras',
    upgradeNote: 'Cancela cuando quieras · El plan gratis sigue gratis',
    quoteCta: 'Pide un presupuesto para tu escuela',
    quoteNote: '{schoolPrice} por docente / año desde {minTeachers} docentes, con factura',
  },
  sv: {
    title: 'Fortsätt med klassen i Teacher Pro',
    body: 'Obegränsade klasser, rapport om vem som hade svårt efter varje runda och utskrivbar progression.',
    trialCta: 'Starta din {days} dagars provperiod av Teacher Pro',
    upgradeCta: 'Uppgradera till Teacher Pro — {price}/mån',
    trialNote: 'Sedan {price}/mån · Avsluta när du vill',
    upgradeNote: 'Avsluta när du vill · Gratisplanen förblir gratis',
    quoteCta: 'Få en offert för skolan',
    quoteNote: '{schoolPrice} per lärare / år från {minTeachers} lärare, mot faktura',
  },
  ja: {
    title: 'Teacher Proでこのクラスを続けましょう',
    body: 'クラス無制限、毎ラウンド後の「つまずいた生徒」レポート、印刷できる進捗。',
    trialCta: 'Teacher Proの{days}日間無料トライアルを始める',
    upgradeCta: 'Teacher Proにアップグレード — 月{price}',
    trialNote: 'その後は月{price} · いつでも解約できます',
    upgradeNote: 'いつでも解約できます · 無料プランはそのまま',
    quoteCta: '学校向けの見積もりを依頼',
    quoteNote: '教員{minTeachers}名以上で1名あたり年{schoolPrice}、請求書払い',
  },
  ru: {
    title: 'Продолжите с этим классом в Teacher Pro',
    body: 'Безлимитные классы, отчёт «кому было трудно» после каждого раунда и печатный прогресс.',
    trialCta: 'Начните {days}-дневный пробный период Teacher Pro',
    upgradeCta: 'Перейти на Teacher Pro — {price}/мес',
    trialNote: 'Затем {price}/мес · Отмена в любой момент',
    upgradeNote: 'Отмена в любой момент · Бесплатный план остаётся бесплатным',
    quoteCta: 'Запросить предложение для школы',
    quoteNote: '{schoolPrice} за учителя в год от {minTeachers} учителей, по счёту',
  },
};

export const TRIAL_COPY_RTL = new Set(['he']);

export function trialCopyBase(locale: string): string {
  return locale.toLowerCase().split('-')[0];
}

export function resultsTrialCopy(locale: string): ResultsTrialCopy {
  const l = trialCopyBase(locale);
  const raw = COPY[l] ?? COPY.en;
  const wrap = (s: string) => (TRIAL_COPY_RTL.has(l) ? ltr(s) : s);
  const params: Record<string, string> = {
    days: String(TEACHER_PRO_TRIAL_DAYS),
    price: wrap(`$${TEACHER_PRO_PRICE_USD}`),
    schoolPrice: wrap(`$${SCHOOL_PRICING.perTeacherYearUsd}`),
    minTeachers: String(SCHOOL_PRICING.minTeachers),
  };
  const fill = (s: string) => s.replace(/\{(\w+)\}/g, (m, k: string) => params[k] ?? m);
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, fill(v)])) as ResultsTrialCopy;
}

/**
 * Class-created variant: the same card right after a teacher makes a class,
 * before any round has been played, so the title cannot say "keep going".
 * Everything else (CTA, price note, school quote) is the results copy.
 */
const CLASS_CREATED: Record<string, { title: string; dismiss: string }> = {
  en: { title: 'Try Teacher Pro free with your new class', dismiss: 'Not now' },
  he: { title: 'נסו את פרו למורים בחינם עם הכיתה החדשה', dismiss: 'לא עכשיו' },
  es: { title: 'Prueba Teacher Pro gratis con tu nueva clase', dismiss: 'Ahora no' },
  sv: { title: 'Prova Teacher Pro gratis med din nya klass', dismiss: 'Inte nu' },
  ja: { title: '新しいクラスでTeacher Proを無料で試す', dismiss: '今はしない' },
  ru: { title: 'Попробуйте Teacher Pro бесплатно с новым классом', dismiss: 'Не сейчас' },
};

export type ClassCreatedTrialCopy = ResultsTrialCopy & { dismiss: string };

export function classCreatedTrialCopy(locale: string): ClassCreatedTrialCopy {
  const extra = CLASS_CREATED[trialCopyBase(locale)] ?? CLASS_CREATED.en;
  return { ...resultsTrialCopy(locale), title: extra.title, dismiss: extra.dismiss };
}
