'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { polarTrialDaysLeft } from '@/lib/education/polarTrial';
import { TeacherProCheckoutButton } from '@/components/teacher/TeacherProCheckoutButton';
import { cn } from '@/lib/utils';

/**
 * HQ welcome after Polar opens the 14-day Teacher Pro trial.
 *
 * Distinct from `ProWelcomeCelebration` (paid / grant). Days remaining + the
 * same paid Polar checkout CTA the lifecycle banner uses — convert now, or
 * dismiss and keep using Pro for the rest of the trial.
 */
export function TeacherTrialWelcome({ trialExpires }: { trialExpires: string | null }) {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(true);
  const [nowMs] = useState(() => Date.now());
  const days = polarTrialDaysLeft(trialExpires, nowMs);
  const isRTL = language === 'he';

  const close = () => {
    setOpen(false);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('checkout');
      window.history.replaceState(null, '', url);
    }
  };

  if (!open) return null;

  const daysLabel =
    days === null
      ? t('teacher.plan.trialActive')
      : days <= 0
        ? t('teacher.plan.trialEndsToday')
        : days === 1
          ? t('teacher.plan.trialDayLeft')
          : t('teacher.plan.trialDaysLeft', { count: String(days) });

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-neo-navy/85 p-4"
      data-testid="teacher-trial-welcome"
      data-days={days === null ? '' : String(days)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="teacher-trial-welcome-title"
        className={cn(
          'relative w-full max-w-md rounded-neo border-3 border-black bg-neo-cream p-6 shadow-hard-lg',
          isRTL && 'rtl text-right',
        )}
      >
        <h2
          id="teacher-trial-welcome-title"
          className="text-center font-neo-display text-2xl font-black text-black"
        >
          {t('teacher.proWelcome.title')}
        </h2>
        <p
          data-testid="teacher-trial-welcome-days"
          className="mt-2 text-center font-neo-display text-lg font-black text-black"
        >
          {daysLabel}
        </p>
        <p className="mt-2 text-center text-sm font-bold text-black/70">
          {t('teacher.subscription.trialLifecycleBody')}
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <TeacherProCheckoutButton
            source="dashboard_trial_lifecycle"
            testId="teacher-trial-welcome-upgrade"
          >
            {t('teacher.subscription.trialLifecycleCta')}
          </TeacherProCheckoutButton>
          <button
            type="button"
            data-testid="teacher-trial-welcome-dismiss"
            onClick={close}
            className="w-full rounded-neo border-3 border-black bg-neo-white py-3 font-neo-display text-base font-black text-black shadow-hard hover:-translate-y-0.5"
          >
            {t('teacher.proWelcome.cta')}
          </button>
        </div>
      </div>
    </div>
  );
}
