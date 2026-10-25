/**
 * Teacher Pro ask for a teacher who is INSIDE the free 14-day access trial.
 *
 * They already have the trial, so offering "Start your 14-day Teacher Pro trial"
 * read as a second, unrelated trial behind a card form. This asks once: keep Pro
 * when the free trial ends, $9/mo from that day, cancel anytime. The checkout it
 * leads to runs its Polar trial only to the end of the access window
 * (polarTrialPlan), so the copy and the first charge date agree.
 *
 * Self-contained per locale, same pattern as trialCtaCopy.
 */
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import { TRIAL_COPY_RTL, trialCopyBase } from '@/lib/education/pro/trialCtaCopy';

export type KeepAfterTrialCopy = {
  /** Card / panel heading. */
  title: string;
  /** Primary button. */
  cta: string;
  /** Line under the button: when billing starts. */
  note: string;
  /** Short badge on the Pro plan card. */
  badge: string;
};

const LRI = '\u2066';
const PDI = '\u2069';

const COPY: Record<string, KeepAfterTrialCopy> = {
  en: {
    title: 'Keep Teacher Pro after your free trial',
    cta: 'Keep Teacher Pro after my trial',
    note: '{price}/mo starts when your trial ends ({date}) · Cancel anytime',
    badge: 'Free until {date}',
  },
  he: {
    title: 'ממשיכים עם פרו למורים אחרי תקופת הניסיון',
    cta: 'להמשיך עם פרו למורים אחרי הניסיון',
    note: '{price} לחודש מתחיל כשתקופת הניסיון מסתיימת ({date}) · ביטול בכל עת',
    badge: 'חינם עד {date}',
  },
  es: {
    title: 'Sigue con Teacher Pro después de tu prueba gratis',
    cta: 'Seguir con Teacher Pro después de mi prueba',
    note: '{price}/mes empieza cuando termina tu prueba ({date}) · Cancela cuando quieras',
    badge: 'Gratis hasta el {date}',
  },
  sv: {
    title: 'Behåll Teacher Pro efter din gratisperiod',
    cta: 'Behåll Teacher Pro efter min provperiod',
    note: '{price}/mån börjar när provperioden slutar ({date}) · Avsluta när du vill',
    badge: 'Gratis till {date}',
  },
  ja: {
    title: '無料トライアル後もTeacher Proを続ける',
    cta: 'トライアル後もTeacher Proを続ける',
    note: '月{price}はトライアル終了日（{date}）から · いつでも解約できます',
    badge: '{date}まで無料',
  },
  ru: {
    title: 'Сохраните Teacher Pro после бесплатного периода',
    cta: 'Сохранить Teacher Pro после пробного периода',
    note: '{price}/мес начнётся, когда закончится пробный период ({date}) · Отмена в любой момент',
    badge: 'Бесплатно до {date}',
  },
};

/** Short local date, e.g. "Nov 7" / "7 нояб." — falls back to the ISO day. */
export function formatTrialEnd(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  try {
    return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(d);
  } catch {
    return iso.slice(0, 10);
  }
}

export function keepAfterTrialCopy(locale: string, accessTrialEndsAt: string): KeepAfterTrialCopy {
  const l = trialCopyBase(locale);
  const raw = COPY[l] ?? COPY.en;
  const rtl = TRIAL_COPY_RTL.has(l);
  const wrap = (s: string) => (rtl ? `${LRI}${s}${PDI}` : s);
  const params: Record<string, string> = {
    price: wrap(`$${TEACHER_PRO_PRICE_USD}`),
    date: wrap(formatTrialEnd(accessTrialEndsAt, COPY[l] ? l : 'en')),
  };
  const fill = (s: string) => s.replace(/\{(\w+)\}/g, (m, k: string) => params[k] ?? m);
  return {
    title: fill(raw.title),
    cta: fill(raw.cta),
    note: fill(raw.note),
    badge: fill(raw.badge),
  };
}

/** The access trial is live (end in the future) — the only time the keep copy applies. */
export function accessTrialLive(accessTrialEndsAt: string | null | undefined, nowMs = Date.now()): accessTrialEndsAt is string {
  if (!accessTrialEndsAt) return false;
  const end = Date.parse(accessTrialEndsAt);
  return Number.isFinite(end) && end > nowMs;
}

export const KEEP_AFTER_TRIAL_LOCALES = Object.keys(COPY);
