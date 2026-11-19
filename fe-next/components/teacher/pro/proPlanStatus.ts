import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import { polarTrialDaysLeft } from '@/lib/education/polarTrial';

export interface ProPlanStatusInput {
  t: (key: string, params?: Record<string, string | number>) => string;
  language: string;
  nowMs: number;
  status?: string | null;
  source?: string | null;
  trialExpires?: string | null;
  periodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
}

function formatDate(iso: string | null | undefined, language: string): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return new Intl.DateTimeFormat(language, { day: 'numeric', month: 'long', year: 'numeric' }).format(ms);
}

/** One sentence for a Pro teacher: what the plan does next. */
export function proPlanStatusLine({ t, language, nowMs, status, source, trialExpires, periodEnd, cancelAtPeriodEnd }: ProPlanStatusInput): string {
  const price = `$${TEACHER_PRO_PRICE_USD}`;
  const date = formatDate(periodEnd, language);
  if (source === 'admin_grant') return date ? t('eduPlans.manage.gifted', { date }) : t('eduPlans.manage.giftedOpen');
  if (cancelAtPeriodEnd && date) return t('eduPlans.manage.ends', { date });
  if (status === 'trialing') return t('eduPlans.manage.trialing', { days: polarTrialDaysLeft(trialExpires ?? periodEnd, nowMs) ?? 0, price });
  if (status === 'canceled' && date) return t('eduPlans.manage.ends', { date });
  if (status === 'past_due') return t('eduPlans.manage.pastDue');
  return date ? t('eduPlans.manage.renews', { date, price }) : t('eduPlans.manage.active', { price });
}
