'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { polarTrialDaysLeft, polarTrialDaysTitle, isPolarTrialDay10Expiring } from '@/lib/education/polarTrial';
import posthog from '@/lib/analytics/lazyPosthog';
import { ProBanner } from './pro/ProBanner';
import { TeacherProManageLink } from './TeacherProManageLink';

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
  portalUrl?: string | null;
  onDismiss?: () => void;
}

/**
 * Last days of a card trial on Teacher HQ (4 or fewer days left, day 10 of 14).
 *
 * The trial converts to $9/mo on the card they added, so the banner says when and
 * links to the Polar portal to manage or cancel. It used to start a paid checkout,
 * which for a teacher already trialing is a second subscription.
 *
 * Fires `teacher_trial_expiring_shown` once per display with `days_remaining`.
 */
export function TeacherProTrialExpiringBanner({
  trialExpires,
  portalUrl = null,
  onDismiss,
}: TeacherProTrialExpiringBannerProps) {
  const { t } = useLanguage();
  const [nowMs] = useState(() => Date.now());
  const [isDismissed, setIsDismissed] = useState(false);
  const shownRef = useRef(false);

  const daysRemaining = polarTrialDaysLeft(trialExpires, nowMs);
  const isExpiring = isPolarTrialDay10Expiring(daysRemaining);

  useEffect(() => {
    if (!isExpiring || isDismissed) return;
    if (shownRef.current) return;
    shownRef.current = true;
    safeCapture('teacher_trial_expiring_shown', { days_remaining: daysRemaining });
  }, [isExpiring, isDismissed, daysRemaining]);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  if (daysRemaining === null || !isExpiring || isDismissed) {
    return null;
  }

  return (
    <ProBanner
      testId="teacher-pro-trial-expiring"
      data={{ 'data-days': String(daysRemaining) }}
      tone="urgent"
      proLabel={t('eduShell.nav.pro')}
      title={polarTrialDaysTitle(t, daysRemaining)}
      body={t('teacher.subscription.trialAutoRenewBody')}
      onDismiss={handleDismiss}
      dismissLabel={t('common.close')}
      dismissTestId="teacher-pro-trial-expiring-dismiss"
      action={
        <TeacherProManageLink portalUrl={portalUrl} testId="teacher-pro-trial-expiring-cta">
          {t('teacher.subscription.trialManageCta')}
        </TeacherProManageLink>
      }
    />
  );
}
