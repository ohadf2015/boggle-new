'use client';

import { isCheckoutRedirectPending } from '@/lib/education/checkoutReturn';
import { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { polarTrialDaysLeft } from '@/lib/education/polarTrial';
import { cn } from '@/lib/utils';
import { NB_DIALOG_BODY, NB_DIALOG_FOOTER, NB_DIALOG_TITLE, NB_OVERLAY_LAYER, NB_OVERLAY_PANEL, nbDialogHeaderClass } from '@/components/teacher/nb/nbDialogStyles';
import { NB_BLOCK, NB_PRIMARY, NB_STICKER } from '@/components/teacher/nb/nbStyles';
import { planEndDate } from '@/components/teacher/TeacherProTrialCanceledBanner';

/**
 * HQ welcome after Polar opens the 14-day Teacher Pro trial.
 *
 * Distinct from `ProWelcomeCelebration` (paid / grant). The trial was started
 * with a card and converts on its own, so there is nothing to buy here: a
 * second checkout would be a second subscription.
 */
export function TeacherTrialWelcome({
  trialExpires,
  onReturnPage = false,
  nextHref,
  nextLabelKey,
  onEngage,
  onAbandon,
}: {
  trialExpires: string | null;
  onReturnPage?: boolean;
  /** Current activation step. Deep-links into an existing flow. */
  nextHref?: string;
  nextLabelKey?: string;
  onEngage?: () => void;
  /** Welcome closed without taking the step. */
  onAbandon?: () => void;
}) {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(
    () => onReturnPage || typeof window === 'undefined' || !isCheckoutRedirectPending(window.sessionStorage, window.location.pathname),
  );
  const [nowMs] = useState(() => Date.now());
  const days = polarTrialDaysLeft(trialExpires, nowMs);
  const isRTL = language === 'he';

  const close = (abandoned: boolean) => {
    setOpen(false);
    if (abandoned) onAbandon?.();
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('checkout');
      window.history.replaceState(null, '', url);
    }
  };
  // One lime primary. The step link and the no-step dismiss are mutually exclusive.
  const primary = NB_PRIMARY;

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
          <p data-testid="teacher-trial-welcome-billing" className="font-neo-body text-base font-semibold leading-relaxed text-neo-cream/90">
            {t('teacher.proWelcome.noChargeUntil', { date: planEndDate(trialExpires, language) })}
          </p>
          <p data-testid="teacher-trial-welcome-try" className="mt-2 font-neo-body text-sm leading-relaxed text-neo-cream/80">
            {t('teacher.proWelcome.tryFirst')}
          </p>
        </div>
        <div className={NB_DIALOG_FOOTER}>
          {nextHref ? (
            <Link
              href={nextHref}
              data-testid="teacher-trial-welcome-step"
              onClick={() => {
                onEngage?.();
                close(false);
              }}
              className={primary}
            >
              {t(nextLabelKey ?? 'teacher.proWelcome.cta')}
            </Link>
          ) : (
            <button type="button" data-testid="teacher-trial-welcome-dismiss" onClick={() => close(false)} className={primary}>
              {t('teacher.proWelcome.cta')}
            </button>
          )}
          {nextHref ? (
            <button type="button" data-testid="teacher-trial-welcome-dismiss" onClick={() => close(true)} className="mt-2 min-h-11 font-neo-body text-sm font-bold text-neo-cream/80 underline underline-offset-4">
              {t('eduShell.firstSession.later')}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
