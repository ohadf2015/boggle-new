'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  isTrialReminderWindow,
  trialCountdownUnit,
  type TrialStatus,
} from '@/lib/education/trial';
import {
  goToPolarCheckout,
  postTeacherProCheckout,
  checkoutFailureKey,
} from '@/lib/education/postTeacherProCheckout';
import {
  trackEduTrialReminderShown,
  trackEduTrialReminderCtaClick,
} from '@/lib/education/proFunnelTelemetry';
import { teacherProUpgradeCtaLabel } from '@/components/education/TeacherProCheckoutCta';

interface TeacherTrialReminderBannerProps {
  trial: TrialStatus | null | undefined;
  onDismiss?: () => void;
}

/**
 * Access trial urgent reminder banner for Teacher HQ.
 *
 * Shown when an active access trial has <= 3 days remaining.
 * Highlights the days left before the trial window expires.
 * Primary CTA starts the existing Polar trial checkout directly (POST /api/subscription/checkout
 * with trial: true), measuring the conversion with edu_trial_reminder events.
 */
export function TeacherTrialReminderBanner({
  trial,
  onDismiss,
}: TeacherTrialReminderBannerProps) {
  const { t, language } = useLanguage();
  const [isDismissed, setIsDismissed] = useState(false);
  const [pending, setPending] = useState(false);
  const shownRef = useRef(false);

  const isEligible = isTrialReminderWindow(trial);

  useEffect(() => {
    if (!isEligible || isDismissed || !trial) return;
    if (shownRef.current) return;
    shownRef.current = true;
    trackEduTrialReminderShown({ days_remaining: trial.daysLeft });
  }, [isEligible, isDismissed, trial]);

  const handleUpgrade = useCallback(async () => {
    if (pending || !trial) return;
    trackEduTrialReminderCtaClick({ days_remaining: trial.daysLeft });
    setPending(true);
    try {
      const result = await postTeacherProCheckout(fetch, {
        trial: true,
        locale: language,
        placement: 'dashboard_trial_reminder',
      });
      if (!result.ok) {
        toast.error(t(checkoutFailureKey(result)));
        return;
      }
      goToPolarCheckout(result.url);
    } catch {
      toast.error(t('teacher.subscription.checkoutError'));
    } finally {
      setPending(false);
    }
  }, [pending, trial, t, language]);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  if (!trial || !isEligible || isDismissed) {
    return null;
  }

  const { key: unitKey, count } = trialCountdownUnit(trial, language);
  const dateStr = new Date(trial.expiresAt).toLocaleDateString(language, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const ctaText = teacherProUpgradeCtaLabel(language) || t('teacher.subscription.upgradeNow');

  return (
    <aside
      data-testid="teacher-trial-reminder-banner"
      role="status"
      className="rounded-neo border-neo bg-neo-pink p-4 text-neo-white shadow-hard"
    >
      <div className="flex items-start gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="shrink-0 rounded-neo border-neo border-neo-cream/40 bg-neo-navy px-3 py-2 text-center text-neo-white shadow-hard-sm">
            <div data-testid="trial-count" className="text-2xl font-black font-neo-display leading-none">
              {count}
            </div>
            <div data-testid="trial-unit" className="mt-0.5 text-xs font-bold uppercase tracking-wide">
              {t(unitKey)}
            </div>
          </div>
          <div className="min-w-0 text-start">
            <h3 data-testid="trial-title" className="text-lg font-black font-neo-display">
              {t('education.trial.urgent_title')}
            </h3>
            <p className="mt-0.5 text-sm font-semibold">
              {t('education.trial.body', { date: dateStr, days: trial.daysLeft })}
            </p>
          </div>
        </div>
        <button
          type="button"
          data-testid="teacher-trial-reminder-dismiss"
          onClick={handleDismiss}
          aria-label={t('common.close')}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-neo border-2 border-neo-black bg-neo-pink text-neo-white hover:bg-neo-black hover:text-neo-white focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-white"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          data-testid="teacher-trial-reminder-cta"
          disabled={pending}
          onClick={() => void handleUpgrade()}
          className="inline-flex items-center justify-center rounded-neo border-neo border-neo-cream/40 bg-neo-navy px-4 py-2 font-bold text-neo-white shadow-hard-sm transition hover:shadow-hard active:shadow-hard-pressed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-black"
        >
          {pending ? t('common.loading') : ctaText}
        </button>
      </div>
    </aside>
  );
}
