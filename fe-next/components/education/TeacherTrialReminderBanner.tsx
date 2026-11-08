'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { PRO_BANNER_CTA, ProBanner, ProCountdownTile, ProShine } from '@/components/teacher/pro/ProBanner';

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
    <ProBanner
      testId="teacher-trial-reminder-banner"
      role="status"
      tone="urgent"
      proLabel={t('eduShell.nav.pro')}
      lead={<ProCountdownTile count={count} unit={t(unitKey)} tone="urgent" />}
      title={<span data-testid="trial-title">{t('education.trial.urgent_title')}</span>}
      body={t('education.trial.body', { date: dateStr, days: trial.daysLeft })}
      onDismiss={handleDismiss}
      dismissLabel={t('common.close')}
      dismissTestId="teacher-trial-reminder-dismiss"
      action={
        <button
          type="button"
          data-testid="teacher-trial-reminder-cta"
          disabled={pending}
          onClick={() => void handleUpgrade()}
          className={PRO_BANNER_CTA}
        >
          <ProShine />
          {pending ? t('common.loading') : ctaText}
        </button>
      }
    />
  );
}
