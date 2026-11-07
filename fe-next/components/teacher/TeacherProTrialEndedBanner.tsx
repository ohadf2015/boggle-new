'use client';

import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ProBanner } from './pro/ProBanner';
import { TeacherProCheckoutButton } from '@/components/teacher/TeacherProCheckoutButton';
import { TrialRecapLine, type TrialRecap } from '@/components/education/TrialRecapLine';
import { trackTrialExpiredShown } from '@/lib/education/proFunnelTelemetry';

/**
 * Polar Teacher Pro trial has ended. One pay CTA — POSTs the existing
 * /api/subscription/checkout till. Not another free trial, and not the
 * access-trial `TrialUrgencyBanner`. Dismiss is a week-long "not now".
 */
export function TeacherProTrialEndedBanner({ onDismiss, recap }: { onDismiss?: () => void; recap?: TrialRecap | null }) {
  const { t } = useLanguage();

  useEffect(() => {
    try {
      trackTrialExpiredShown({ source: 'dashboard_trial_ended' });
    } catch {
      /* analytics must never block the till */
    }
  }, []);

  return (
    <ProBanner
      testId="teacher-pro-trial-ended"
      tone="urgent"
      proLabel={t('eduShell.nav.pro')}
      title={t('teacher.subscription.trialEndedTitle')}
      body={t('teacher.subscription.trialEndedBody')}
      onDismiss={onDismiss}
      dismissLabel={t('common.close')}
      dismissTestId="teacher-pro-trial-ended-dismiss"
      action={
        <TeacherProCheckoutButton source="dashboard_trial_ended" testId="teacher-pro-trial-ended-cta">
          {t('teacher.subscription.trialReactivateCta')}
        </TeacherProCheckoutButton>
      }
    >
      <TrialRecapLine recap={recap} className="mt-1 font-neo-body text-sm font-black text-neo-cream" />
    </ProBanner>
  );
}
