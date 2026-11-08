'use client';

import { PRO_BANNER_CTA, ProBanner, ProShine } from './pro/ProBanner';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { polarTrialDaysLeft, polarTrialDaysTitle, isPolarTrialDay10Expiring } from '@/lib/education/polarTrial';
import posthog from '@/lib/analytics/lazyPosthog';
import { goToPolarCheckout, postTeacherProCheckout, checkoutFailureKey } from '@/lib/education/postTeacherProCheckout';

type Capture = (event: string, props?: Record<string, unknown>) => void;

function safeCapture(event: string, props: Record<string, unknown>): void {
  try {
    (posthog.capture as unknown as Capture)(event, props);
  } catch {
    /* analytics must never block user action or throw */
  }
}

interface TeacherProTrialExpiringBannerProps {
  trialExpires: string | null;
  onDismiss?: () => void;
}

/**
 * Trial-expiring conversion surface for Teacher HQ.
 *
 * Shown when Teacher Pro trial has <= 4 days remaining (day 10 of 14).
 * Highlights days left and features lost without Pro.
 * Primary CTA goes DIRECTLY to paid checkout (POST /api/subscription/checkout
 * without the trial flag), landing in Polar checkout in one click.
 *
 * Fires PostHog telemetry:
 * - `teacher_trial_expiring_shown` (once per display, with `days_remaining`)
 * - `teacher_upgrade_clicked` (on CTA click, with `days_remaining`)
 */
export function TeacherProTrialExpiringBanner({
  trialExpires,
  onDismiss,
}: TeacherProTrialExpiringBannerProps) {
  const { t, language } = useLanguage();
  const [nowMs] = useState(() => Date.now());
  const [isDismissed, setIsDismissed] = useState(false);
  const [pending, setPending] = useState(false);
  const shownRef = useRef(false);

  const daysRemaining = polarTrialDaysLeft(trialExpires, nowMs);
  const isExpiring = isPolarTrialDay10Expiring(daysRemaining);

  useEffect(() => {
    if (!isExpiring || isDismissed) return;
    if (shownRef.current) return;
    shownRef.current = true;
    safeCapture('teacher_trial_expiring_shown', { days_remaining: daysRemaining });
  }, [isExpiring, isDismissed, daysRemaining]);

  const handleUpgrade = useCallback(async () => {
    if (pending || daysRemaining === null) return;
    safeCapture('teacher_upgrade_clicked', { days_remaining: daysRemaining });
    setPending(true);
    try {
      const result = await postTeacherProCheckout(fetch, {
        trial: false,
        locale: language,
        placement: 'dashboard_trial_expiring',
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
  }, [pending, daysRemaining, t, language]);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  if (daysRemaining === null || !isExpiring || isDismissed) {
    return null;
  }

  const title = polarTrialDaysTitle(t, daysRemaining);

  const lossDescription =
    t('teacher.subscription.trialExpiringLoss') ||
    t('teacher.subscription.trialLifecycleBody');

  return (
    <ProBanner
      testId="teacher-pro-trial-expiring"
      data={{ 'data-days': String(daysRemaining) }}
      tone="urgent"
      proLabel={t('eduShell.nav.pro')}
      title={title}
      body={lossDescription}
      onDismiss={handleDismiss}
      dismissLabel={t('common.close')}
      dismissTestId="teacher-pro-trial-expiring-dismiss"
      action={
        <button
          type="button"
          data-testid="teacher-pro-trial-expiring-cta"
          disabled={pending}
          onClick={() => void handleUpgrade()}
          className={PRO_BANNER_CTA}
        >
          <ProShine />
          {pending ? t('common.loading') : t('teacher.subscription.trialLifecycleCta')}
        </button>
      }
    />
  );
}
