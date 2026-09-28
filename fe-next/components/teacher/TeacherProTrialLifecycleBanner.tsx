'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { polarTrialDaysLeft } from '@/lib/education/polarTrial';
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
  const title =
    daysLeft === null
      ? t('teacher.plan.trialActive')
      : daysLeft <= 0
        ? t('teacher.subscription.trialLifecycleTitleToday')
        : daysLeft === 1
          ? t('teacher.subscription.trialLifecycleTitleOne')
          : t('teacher.subscription.trialLifecycleTitle', { count: String(daysLeft) });

  return (
    <aside
      data-testid="teacher-pro-trial-lifecycle"
      data-days={daysLeft === null ? '' : String(daysLeft)}
      className={`border-b-3 border-black px-4 py-3 ${urgent ? 'bg-neo-pink' : 'bg-neo-lime'}`}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-neo-display text-sm font-black leading-tight text-black">
            {title}
          </p>
          <p className="mt-0.5 font-neo-body text-xs font-bold text-black/80">
            {t('teacher.subscription.trialLifecycleBody')}
          </p>
        </div>
        <TeacherProCheckoutButton
          source="dashboard_trial_lifecycle"
          testId="teacher-pro-trial-lifecycle-cta"
        >
          {t('teacher.subscription.trialLifecycleCta')}
        </TeacherProCheckoutButton>
      </div>
    </aside>
  );
}
