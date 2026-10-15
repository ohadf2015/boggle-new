'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Crown, Loader2, Lock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { useStartTeacherProTrial } from '@/hooks/useStartTeacherProTrial';
import { useTeacherProCheckout } from '@/hooks/useTeacherProCheckout';
import { polarTrialUx } from '@/lib/education/polarTrial';
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import { TEACHER_PRO_TRIAL_DAYS } from '@/lib/education/pro/trialDays';
import { trackProGateViewed } from '@/lib/education/proFunnelTelemetry';
import { ProFeaturePreview } from './ProFeaturePreview';
import { TEACHER_PRO_CHECKOUT_PATH } from '@/components/education/TeacherProCheckoutCta';

const CTA =
  'mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-neo border-3 border-neo-black bg-neo-yellow px-5 font-neo-display text-base font-black text-neo-navy shadow-hard-sm transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.97] disabled:opacity-60 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan';

/**
 * Reports-tab teaser for a free teacher: a blurred sample report (never the teacher's own rows)
 * and one action. Trial-eligible accounts start the trial; everyone else gets the paid checkout.
 */
export function ReportsProTeaser() {
  const { t, language } = useLanguage();
  const { hasPro, loading, known, status, source, trialUsed } = useTeacherPro();
  const trial = useStartTeacherProTrial(t, language, 'reports_teaser');
  const paid = useTeacherProCheckout('pro_gate_reports');
  const visible = !loading && !hasPro;
  const offerTrial =
    known === true && polarTrialUx({ hasPro, status: status ?? 'active', source, trialUsed: trialUsed === true }).offerTrial;
  const action = offerTrial ? trial : paid;

  useEffect(() => {
    if (!visible) return;
    try {
      trackProGateViewed({ feature: 'reports' });
    } catch {
      /* analytics never blocks the page */
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <section
      data-testid="reports-pro-teaser"
      aria-labelledby="reports-teaser-title"
      className="mt-8 grid items-center gap-5 rounded-neo border-3 border-neo-cream/40 bg-neo-navy-light p-4 shadow-hard sm:p-6 md:grid-cols-2"
    >
      <div className="relative">
        <div data-testid="reports-teaser-preview" aria-hidden="true" className="pointer-events-none select-none blur-[2px]">
          <ProFeaturePreview feature="reports" />
        </div>
        <span aria-hidden="true" className="absolute inset-0 grid place-items-center">
          <span className="grid size-12 place-items-center rounded-full border-3 border-neo-black bg-neo-yellow shadow-hard-sm">
            <Lock className="size-5 text-neo-navy" strokeWidth={2.5} />
          </span>
        </span>
      </div>
      <div className="text-center md:text-start">
        <p className="inline-flex items-center gap-1 font-neo-display text-xs font-black uppercase tracking-wide text-neo-yellow">
          <Crown className="size-3.5" aria-hidden="true" />
          {t('teacher.subscription.proPlanName')}
        </p>
        <h2 id="reports-teaser-title" className="mt-1 font-neo-display text-xl font-black text-neo-white sm:text-2xl">
          {t('eduPlans.reports.title')}
        </h2>
        <p className="mt-2 text-sm font-bold leading-relaxed text-neo-white/80">{t('eduPlans.reports.body')}</p>
        {known !== true ? (
          // Status read failed: the plan page re-checks trial eligibility instead of guessing a paid checkout.
          <Link href={`/${language}${TEACHER_PRO_CHECKOUT_PATH}`} data-testid="reports-teaser-cta" className={CTA}>
            <Crown className="size-5" aria-hidden="true" />
            {t('eduShell.pro.cta')}
          </Link>
        ) : (
          <button
            type="button"
            data-testid="reports-teaser-cta"
            disabled={action.pending}
            aria-busy={action.pending || undefined}
            onClick={() => void action.start()}
            className={CTA}
          >
            {action.pending ? <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Crown className="size-5" aria-hidden="true" />}
            {offerTrial
              ? t('eduPlans.reports.trialCta', { days: TEACHER_PRO_TRIAL_DAYS })
              : t('eduPlans.reports.buyCta', { price: `$${TEACHER_PRO_PRICE_USD}` })}
          </button>
        )}
        <p className="mt-2 text-xs font-bold text-neo-white/60">
          {offerTrial
            ? t('eduPlans.reports.trialFine', { days: TEACHER_PRO_TRIAL_DAYS, price: `$${TEACHER_PRO_PRICE_USD}` })
            : t('teacher.subscription.trustCancel')}
        </p>
      </div>
    </section>
  );
}
