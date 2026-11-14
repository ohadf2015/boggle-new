'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { polarTrialDaysLeft, polarTrialDaysTitle } from '@/lib/education/polarTrial';
import { ProBanner } from './pro/ProBanner';
import { TeacherProManageLink } from './TeacherProManageLink';

/**
 * Live Polar Teacher Pro trial: days remaining, and what happens at the end.
 *
 * The trial started with a card and converts to $9/mo on its own, so the banner
 * says so and links to the Polar portal to manage or cancel. It never starts a
 * second (paid) checkout. Distinct from the access-trial `TrialUrgencyBanner`.
 */
export function TeacherProTrialLifecycleBanner({
  trialExpires,
  portalUrl = null,
}: {
  trialExpires: string | null;
  portalUrl?: string | null;
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
      body={t('teacher.subscription.trialAutoRenewBody')}
      action={
        <TeacherProManageLink portalUrl={portalUrl} testId="teacher-pro-trial-lifecycle-cta">
          {t('teacher.subscription.trialManageCta')}
        </TeacherProManageLink>
      }
    />
  );
}
