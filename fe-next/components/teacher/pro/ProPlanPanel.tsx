'use client';

import { useState } from 'react';
import { Check, Crown, ExternalLink } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import { polarTrialDaysLeft } from '@/lib/education/polarTrial';

export interface ProPlanPanelProps {
  status?: string | null;
  source?: string | null;
  trialExpires?: string | null;
  periodEnd?: string | null;
  portalUrl?: string | null;
  included: string[];
}

function formatDate(iso: string | null | undefined, language: string): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return new Intl.DateTimeFormat(language, { day: 'numeric', month: 'long', year: 'numeric' }).format(ms);
}

/** "You're on Pro": what the plan is, when it renews or ends, and where billing lives. No pitch. */
export function ProPlanPanel({ status, source, trialExpires, periodEnd, portalUrl, included }: ProPlanPanelProps) {
  const { t, language } = useLanguage();
  const [nowMs] = useState(() => Date.now());
  const price = `$${TEACHER_PRO_PRICE_USD}`;
  const gifted = source === 'admin_grant';
  const date = formatDate(periodEnd, language);

  let line: string;
  if (gifted) line = date ? t('eduPlans.manage.gifted', { date }) : t('eduPlans.manage.giftedOpen');
  else if (status === 'trialing') line = t('eduPlans.manage.trialing', { days: polarTrialDaysLeft(trialExpires ?? periodEnd, nowMs) ?? 0, price });
  else if (status === 'canceled' && date) line = t('eduPlans.manage.ends', { date });
  else if (status === 'past_due') line = t('eduPlans.manage.pastDue');
  else line = date ? t('eduPlans.manage.renews', { date, price }) : t('eduPlans.manage.active', { price });

  return (
    <section data-testid="pro-plan-panel" aria-labelledby="pro-plan-title" className="rounded-neo border-3 border-neo-black bg-neo-yellow p-4 text-neo-navy shadow-hard sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p id="pro-plan-title" data-testid="pricing-pro-current" className="inline-flex items-center gap-2 font-neo-display text-2xl font-black">
            <Crown className="size-6" strokeWidth={2.5} aria-hidden="true" />
            {t('eg2Pro.plans.youArePro')}
          </p>
          <p data-testid="pro-plan-status" className="mt-1 text-sm font-bold text-neo-navy/85">{line}</p>
        </div>
        {portalUrl && !gifted ? (
          <a
            href={portalUrl}
            className="inline-flex min-h-11 items-center gap-2 rounded-neo border-3 border-neo-cream/40 bg-neo-navy px-4 font-neo-display text-sm font-black text-neo-yellow shadow-hard-sm transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.97] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
          >
            {t('eg2Pro.plans.manageBilling')}
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        ) : null}
      </div>
      {gifted ? <p className="mt-2 text-xs font-bold text-neo-navy/75">{t('eduPlans.manage.giftedNote')}</p> : null}
      <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
        {included.map((label) => (
          <li key={label} className="flex items-start gap-2 text-sm font-bold">
            <Check className="mt-0.5 size-4 shrink-0" strokeWidth={3} aria-hidden="true" />
            {label}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PlanCardsSkeleton() {
  return (
    <div data-testid="plan-cards-skeleton" aria-hidden="true" className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-80 animate-pulse rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light motion-reduce:animate-none" />
      ))}
    </div>
  );
}
