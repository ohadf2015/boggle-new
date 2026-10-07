'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { useTeacherAccess } from '@/lib/education/useTeacherAccess';
import { polarTrialDaysLeft, polarTrialUx } from '@/lib/education/polarTrial';
import { shouldShowTeacherTrialUpgradeStatus } from '@/lib/education/trial';
import {
  goToPolarCheckout,
  postTeacherProCheckout,
} from '@/lib/education/postTeacherProCheckout';
import {
  trackTeacherTrialUpgradeCtaClicked,
  trackTeacherTrialUpgradeCtaViewed,
} from '@/lib/education/proFunnelTelemetry';
import { teacherProUpgradeCtaLabel } from '@/components/education/TeacherProCheckoutCta';

/**
 * Persistent Teacher HQ trial chrome: days remaining + Upgrade-to-Teacher-Pro
 * CTA that POSTs Polar checkout. Not dismissible. Hidden while a pinned Polar
 * banner already owns the deck (`suppressed`).
 */
export function TeacherTrialUpgradeStatus({ suppressed = false }: { suppressed?: boolean }) {
  const { t, language } = useLanguage();
  const { trial, isLoading: accessLoading } = useTeacherAccess();
  const {
    hasPro,
    loading: proLoading,
    status,
    source,
    trialUsed,
    trialExpires,
    periodEnd,
  } = useTeacherPro();
  const [nowMs] = useState(() => Date.now());
  const [pending, setPending] = useState(false);

  const polar = polarTrialUx({
    hasPro,
    status: status ?? 'active',
    source,
    trialUsed: trialUsed === true,
  });
  const polarDays = polarTrialDaysLeft(trialExpires ?? periodEnd, nowMs);
  const show = shouldShowTeacherTrialUpgradeStatus({
    trial,
    hasPro,
    proLoading,
    accessLoading,
    polarTrialing: polar.showLifecycleBanner,
    suppressed,
  });
  const days = polar.showLifecycleBanner ? polarDays : (trial?.daysLeft ?? null);
  const startPolarTrial = polar.offerTrial;

  useEffect(() => {
    if (!show || days === null) return;
    try {
      trackTeacherTrialUpgradeCtaViewed({ trial_days_remaining: days });
    } catch {
      /* analytics must never block the till */
    }
  }, [show, days]);

  const start = useCallback(async () => {
    if (pending) return;
    try {
      if (days !== null) {
        trackTeacherTrialUpgradeCtaClicked({ trial_days_remaining: days });
      }
    } catch {
      /* analytics must never block the till */
    }
    setPending(true);
    try {
      const result = await postTeacherProCheckout(
        fetch,
        startPolarTrial ? { trial: true } : {},
      );
      if (!result.ok) {
        if (result.status === 401) {
          toast.error(t('teacher.subscription.signInRequired'));
        } else if (result.status === 503) {
          toast.error(t('teacher.subscription.checkoutUnavailable'));
        } else {
          toast.error(t('teacher.subscription.checkoutError'));
        }
        return;
      }
      goToPolarCheckout(result.url);
    } catch {
      toast.error(t('teacher.subscription.checkoutError'));
    } finally {
      setPending(false);
    }
  }, [pending, days, startPolarTrial, t]);

  if (!show) return null;

  const daysLabel =
    days === null
      ? t('teacher.plan.trialActive')
      : days <= 0
        ? t('teacher.plan.trialEndsToday')
        : days === 1
          ? t('teacher.plan.trialDayLeft')
          : t('teacher.plan.trialDaysLeft', { count: String(days) });

  return (
    <aside
      data-testid="teacher-trial-upgrade-status"
      data-days={days === null ? '' : String(days)}
      className="sm:col-span-full [@media(orientation:landscape)_and_(max-height:500px)]:col-span-full border-2 border-black bg-neo-lime px-3 py-2 shadow-hard-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          data-testid="teacher-trial-upgrade-status-days"
          className="min-w-0 font-neo-display text-sm font-black text-black"
        >
          {daysLabel}
        </p>
        <button
          type="button"
          data-testid="teacher-trial-upgrade-status-cta"
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={() => {
            void start();
          }}
          className="inline-flex shrink-0 items-center justify-center rounded-neo border-2 border-black bg-neo-black px-4 py-2 font-neo-display text-sm font-black text-white shadow-hard hover:-translate-y-0.5 disabled:opacity-60"
        >
          {pending ? t('common.loading') : teacherProUpgradeCtaLabel(language)}
        </button>
      </div>
    </aside>
  );
}
