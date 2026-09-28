'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { TeacherProCheckoutButton } from '@/components/teacher/TeacherProCheckoutButton';

/**
 * Polar Teacher Pro trial has ended. One pay CTA — POSTs the existing
 * /api/subscription/checkout till. Not another free trial, and not the
 * access-trial `TrialUrgencyBanner`.
 */
export function TeacherProTrialEndedBanner() {
  const { t } = useLanguage();

  return (
    <aside
      data-testid="teacher-pro-trial-ended"
      className="border-b-3 border-black bg-neo-pink px-4 py-3"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-neo-display text-sm font-black leading-tight text-black">
            {t('teacher.subscription.trialEndedTitle')}
          </p>
          <p className="mt-0.5 font-neo-body text-xs font-bold text-black/80">
            {t('teacher.subscription.trialEndedBody')}
          </p>
        </div>
        <TeacherProCheckoutButton
          source="dashboard_trial_ended"
          testId="teacher-pro-trial-ended-cta"
        >
          {t('teacher.subscription.trialEndedCta')}
        </TeacherProCheckoutButton>
      </div>
    </aside>
  );
}
