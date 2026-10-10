'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { TeacherProCheckoutButton } from '@/components/teacher/TeacherProCheckoutButton';
import { trackTrialExpiredShown } from '@/lib/education/proFunnelTelemetry';

/**
 * Polar Teacher Pro trial has ended. One pay CTA — POSTs the existing
 * /api/subscription/checkout till. Not another free trial, and not the
 * access-trial `TrialUrgencyBanner`. Dismiss is a week-long "not now".
 */
export function TeacherProTrialEndedBanner({ onDismiss }: { onDismiss?: () => void }) {
  const { t } = useLanguage();

  useEffect(() => {
    try {
      trackTrialExpiredShown({ source: 'dashboard_trial_ended' });
    } catch {
      /* analytics must never block the till */
    }
  }, []);

  return (
    <aside
      data-testid="teacher-pro-trial-ended"
      className="border-b-3 border-black bg-neo-pink px-4 py-3"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-neo-display text-sm font-black leading-tight text-black">
            {t('teacher.subscription.trialEndedTitle')}
          </p>
          <p className="mt-0.5 font-neo-body text-xs font-bold text-black/80">
            {t('teacher.subscription.trialEndedBody')}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <TeacherProCheckoutButton
            source="dashboard_trial_ended"
            testId="teacher-pro-trial-ended-cta"
          >
            {t('teacher.subscription.trialReactivateCta')}
          </TeacherProCheckoutButton>
          {onDismiss ? (
            <button
              type="button"
              data-testid="teacher-pro-trial-ended-dismiss"
              onClick={onDismiss}
              aria-label={t('common.close')}
              className="inline-flex size-10 items-center justify-center rounded-neo border-2 border-black bg-neo-pink text-black hover:bg-neo-black hover:text-white focus:outline-hidden focus-visible:ring-2 focus-visible:ring-black"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
