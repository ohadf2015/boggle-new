'use client';

import { isCheckoutRedirectPending } from '@/lib/education/checkoutReturn';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { polarTrialDaysLeft } from '@/lib/education/polarTrial';
import { TeacherProCheckoutButton } from '@/components/teacher/TeacherProCheckoutButton';
import { cn } from '@/lib/utils';
import { NB_DIALOG_BODY, NB_DIALOG_FOOTER, NB_DIALOG_TITLE, NB_OVERLAY_LAYER, NB_OVERLAY_PANEL, nbDialogHeaderClass } from '@/components/teacher/nb/nbDialogStyles';
import { NB_BLOCK, NB_SECONDARY, NB_STICKER } from '@/components/teacher/nb/nbStyles';

/** The checkout button takes no className; restyle it from here as this sheet's one lime action. */
const LIME_CTA = '[&>button]:min-h-14 [&>button]:w-full [&>button]:rounded-neo-lg [&>button]:border-[3px] [&>button]:border-neo-black [&>button]:bg-neo-lime [&>button]:text-lg [&>button]:text-neo-black [&>button]:shadow-hard-xl';

/**
 * HQ welcome after Polar opens the 14-day Teacher Pro trial.
 *
 * Distinct from `ProWelcomeCelebration` (paid / grant). Days remaining + the
 * same paid Polar checkout CTA the lifecycle banner uses — convert now, or
 * dismiss and keep using Pro for the rest of the trial.
 */
export function TeacherTrialWelcome({ trialExpires, onReturnPage = false }: { trialExpires: string | null; onReturnPage?: boolean }) {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(
    () => onReturnPage || typeof window === 'undefined' || !isCheckoutRedirectPending(window.sessionStorage, window.location.pathname),
  );
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
      className={NB_OVERLAY_LAYER}
      data-testid="teacher-trial-welcome"
      data-days={days === null ? '' : String(days)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="teacher-trial-welcome-title"
        dir={isRTL ? 'rtl' : 'ltr'}
        className={cn(NB_OVERLAY_PANEL, 'sm:max-w-md', isRTL && 'rtl')}
      >
        <div className={nbDialogHeaderClass('lime')}>
          <div className="min-w-0 flex-1">
            <h2 id="teacher-trial-welcome-title" className={NB_DIALOG_TITLE}>
              {t('teacher.proWelcome.title')}
            </h2>
            <p data-testid="teacher-trial-welcome-days" className={cn(NB_STICKER, NB_BLOCK.cream, 'mt-2 text-sm')}>
              {daysLabel}
            </p>
          </div>
        </div>
        <div className={NB_DIALOG_BODY}>
          <p className="font-neo-body text-base font-semibold leading-relaxed text-neo-cream/90">
            {t('teacher.subscription.trialLifecycleBody')}
          </p>
        </div>
        <div className={NB_DIALOG_FOOTER}>
          <button type="button" data-testid="teacher-trial-welcome-dismiss" onClick={close} className={NB_SECONDARY}>
            {t('teacher.proWelcome.cta')}
          </button>
          <span className={cn('flex', LIME_CTA)}>
            <TeacherProCheckoutButton source="dashboard_trial_lifecycle" testId="teacher-trial-welcome-upgrade">
              {t('teacher.subscription.trialLifecycleCta')}
            </TeacherProCheckoutButton>
          </span>
        </div>
      </div>
    </div>
  );
}
