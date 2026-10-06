'use client';

import { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  goToPolarCheckout,
  postTeacherProCheckout,
} from '@/lib/education/postTeacherProCheckout';
import {
  trackTrialCtaTap,
  trackTrialCtaView,
} from '@/lib/education/proFunnelTelemetry';

/**
 * Visibility for the Polar 14-day Teacher Pro trial on HQ.
 *
 * PR #1143 already POSTs `{ trial: true }` from /teacher/upgrade. Teachers
 * never opened that page (0 trials / 65 approved). One primary action hits
 * the same till via postTeacherProCheckout({ trial: true }). Dismiss is a
 * week-long "not now", not a permanent hide.
 */
export function TeacherProTrialOfferBanner({ onDismiss }: { onDismiss?: () => void }) {
  const { t, language } = useLanguage();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    try {
      trackTrialCtaView({ source: 'dashboard_trial_offer' });
    } catch {
      /* analytics must never block the till */
    }
  }, []);

  const startTrial = useCallback(async () => {
    if (pending) return;
    try {
      trackTrialCtaTap({ source: 'dashboard_trial_offer' });
    } catch {
      /* analytics must never block the till */
    }
    setPending(true);
    try {
      const result = await postTeacherProCheckout(fetch, { trial: true, locale: language });
      if (!result.ok) {
        if (result.status === 401) {
          toast.error(t('teacher.subscription.signInRequired'));
        } else if (result.status === 503) {
          toast.error(t('teacher.subscription.checkoutUnavailable'));
        } else {
          toast.error(t('teacher.subscription.checkoutError'));
        }
        return;
      }
      goToPolarCheckout(result.url);
    } catch {
      toast.error(t('teacher.subscription.checkoutError'));
    } finally {
      setPending(false);
    }
  }, [pending, t, language]);

  return (
    <aside
      data-testid="teacher-pro-trial-offer"
      className="border-b-3 border-black bg-neo-cyan px-4 py-3"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-neo-display text-sm font-black leading-tight text-black">
            {t('teacher.subscription.trialOfferTitle')}
          </p>
          <p className="mt-0.5 font-neo-body text-xs font-bold text-black/80">
            {t('teacher.subscription.trialOfferBody')}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            data-testid="teacher-pro-trial-offer-cta"
            disabled={pending}
            onClick={() => void startTrial()}
            className="inline-flex items-center justify-center rounded-neo border-2 border-black bg-neo-black px-4 py-2 font-neo-display text-sm font-black text-white shadow-hard hover:-translate-y-0.5 disabled:opacity-60"
          >
            {pending ? t('common.loading') : t('teacher.subscription.startTrial')}
          </button>
          {onDismiss ? (
            <button
              type="button"
              data-testid="teacher-pro-trial-offer-dismiss"
              onClick={onDismiss}
              aria-label={t('common.close')}
              className="inline-flex size-10 items-center justify-center rounded-neo border-2 border-black bg-neo-cyan text-black hover:bg-neo-black hover:text-white focus:outline-hidden focus-visible:ring-2 focus-visible:ring-black"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
