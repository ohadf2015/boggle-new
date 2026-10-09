'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { polarTrialDaysLeft, polarTrialExpiring } from '@/lib/education/polarTrial';
import posthog from '@/lib/analytics/lazyPosthog';

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
  onDismiss?: () => void;
}

/**
 * Trial-expiring conversion surface for Teacher HQ.
 *
 * Shown from Day-10 of the 14-day trial — `trial_days_remaining <= 4`.
 * Highlights days left and features lost without Pro.
 * Primary CTA goes DIRECTLY to paid checkout (POST /api/subscription/checkout
 * without the trial flag), landing in Polar checkout in one click.
 *
 * Fires PostHog telemetry:
 * - `teacher_trial_expiring_shown` (once per display, with `days_remaining`)
 * - `teacher_upgrade_clicked` (on CTA click, with `days_remaining`)
 */
export function TeacherProTrialExpiringBanner({
  trialExpires,
  onDismiss,
}: TeacherProTrialExpiringBannerProps) {
  const { t, language } = useLanguage();
  const [nowMs] = useState(() => Date.now());
  const [isDismissed, setIsDismissed] = useState(false);
  const [pending, setPending] = useState(false);
  const shownRef = useRef(false);

  const daysRemaining = polarTrialDaysLeft(trialExpires, nowMs);
  const isExpiring = polarTrialExpiring(daysRemaining);

  useEffect(() => {
    if (!isExpiring || isDismissed) return;
    if (shownRef.current) return;
    shownRef.current = true;
    safeCapture('teacher_trial_expiring_shown', { days_remaining: daysRemaining });
  }, [isExpiring, isDismissed, daysRemaining]);

  const handleUpgrade = useCallback(async () => {
    if (pending || daysRemaining === null) return;
    safeCapture('teacher_upgrade_clicked', { days_remaining: daysRemaining });
    setPending(true);
    try {
      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trial: false, locale: language }),
      });
      if (!response.ok) {
        if (response.status === 503) {
          toast.error(t('teacher.subscription.checkoutUnavailable'));
          return;
        }
        toast.error(t('teacher.subscription.checkoutError'));
        return;
      }
      const { url } = await response.json();
      if (typeof url === 'string' && url) {
        window.location.href = url;
        return;
      }
      toast.error(t('teacher.subscription.checkoutError'));
    } catch {
      toast.error(t('teacher.subscription.checkoutError'));
    } finally {
      setPending(false);
    }
  }, [pending, daysRemaining, t, language]);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  // daysRemaining === null is already covered by polarTrialExpiring; the
  // explicit guard restores the narrowing the inline check used to provide.
  if (!isExpiring || isDismissed || daysRemaining === null) {
    return null;
  }

  const title =
    daysRemaining <= 0
      ? t('teacher.subscription.trialLifecycleTitleToday')
      : daysRemaining === 1
        ? t('teacher.subscription.trialLifecycleTitleOne')
        : t('teacher.subscription.trialLifecycleTitle', { count: String(daysRemaining) });

  const lossDescription =
    t('teacher.subscription.trialExpiringLoss') ||
    t('teacher.subscription.trialLifecycleBody');

  return (
    <aside
      data-testid="teacher-pro-trial-expiring"
      data-days={String(daysRemaining)}
      className="border-b-3 border-black bg-neo-pink px-4 py-3"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-neo-display text-sm font-black leading-tight text-black">
            {title}
          </p>
          <p className="mt-0.5 font-neo-body text-xs font-bold text-black/80">
            {lossDescription}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            data-testid="teacher-pro-trial-expiring-cta"
            disabled={pending}
            onClick={() => void handleUpgrade()}
            className="inline-flex items-center justify-center rounded-neo border-2 border-black bg-neo-black px-4 py-2 font-neo-display text-sm font-black text-white shadow-hard hover:-translate-y-0.5 disabled:opacity-60"
          >
            {pending ? t('common.loading') : t('teacher.subscription.trialLifecycleCta')}
          </button>
          <button
            type="button"
            data-testid="teacher-pro-trial-expiring-dismiss"
            onClick={handleDismiss}
            aria-label={t('common.close')}
            className="inline-flex size-10 items-center justify-center rounded-neo border-2 border-black bg-neo-pink text-black hover:bg-neo-black hover:text-white focus:outline-hidden focus-visible:ring-2 focus-visible:ring-black"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}
