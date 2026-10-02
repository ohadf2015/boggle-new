import { TEACHER_PRO_TRIAL_DAYS } from '@/lib/education/pro/trialDays';
import { FREE_TIER_LIMITS, TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import { MAX_PLAYERS_PER_ROOM } from '@/shared/constants/gameConstants';

export const UPGRADE_FAQ_KEYS = ['trial', 'cancel', 'downgrade', 'players', 'students', 'schoolPays', 'tax'] as const;

export type FaqParams = Record<string, string | number>;

export function upgradeFaqParams(): FaqParams {
  return {
    days: TEACHER_PRO_TRIAL_DAYS,
    price: `$${TEACHER_PRO_PRICE_USD}`,
    players: MAX_PLAYERS_PER_ROOM,
    classes: FREE_TIER_LIMITS.classes,
    students: FREE_TIER_LIMITS.studentsPerClass,
  };
}

export function fillParams(text: string, params: FaqParams): string {
  return text.replace(/\{\{?(\w+)\}?\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}

export function buildUpgradeFaqEntries(dict: Record<string, unknown>): Array<{ question: string; answer: string }> {
  const faq = ((dict?.eg2Pro as Record<string, unknown> | undefined)?.faq ?? {}) as Record<string, unknown>;
  const params = upgradeFaqParams();
  return UPGRADE_FAQ_KEYS.flatMap((key) => {
    const q = faq[`${key}Q`];
    const a = faq[`${key}A`];
    return typeof q === 'string' && typeof a === 'string' && q && a
      ? [{ question: fillParams(q, params), answer: fillParams(a, params) }]
      : [];
  });
}
