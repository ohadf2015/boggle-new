'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { polarTrialDaysLeft, polarTrialDaysTitle } from '@/lib/education/polarTrial';
import { ProBanner } from './pro/ProBanner';
import { TeacherProCheckoutButton } from '@/components/teacher/TeacherProCheckoutButton';

/**
 * Live Polar Teacher Pro trial — days remaining + paid checkout CTA.
 *
 * Distinct from the access-trial `TrialUrgencyBanner` and from the expired
 * `TeacherProTrialEndedBanner`. CTA POSTs /api/subscription/checkout (Polar
 * Teacher Pro $9/mo) — same till as the upgrade page, not a second handler.
 */
export function TeacherProTrialLifecycleBanner({
  trialExpires,
}: {
  trialExpires: string | null;
}) {
  const { t } = useLanguage();
  const [nowMs] = useState(() => Date.now());
  const daysLeft = polarTrialDaysLeft(trialExpires, nowMs);
  const urgent = daysLeft !== null && daysLeft <= 3;
  const title = polarTrialDaysTitle(t, daysLeft);

  return (
    <ProBanner
      testId="teacher-pro-trial-lifecycle"
      data={{ 'data-days': daysLeft === null ? '' : String(daysLeft) }}
      tone={urgent ? 'urgent' : 'calm'}
      proLabel={t('eduShell.nav.pro')}
      title={title}
      body={t('teacher.subscription.trialLifecycleBody')}
      action={
        <TeacherProCheckoutButton source="dashboard_trial_lifecycle" testId="teacher-pro-trial-lifecycle-cta">
          {t('teacher.subscription.trialLifecycleCta')}
        </TeacherProCheckoutButton>
      }
    />
  );
}
