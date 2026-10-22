'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  markResumeCheckoutIntent,
  clearResumeCheckoutIntent,
  consumeResumeCheckoutIntent,
  consumeResumeTrialFlag,
} from '@/lib/teacher/resumeCheckout';
import {
  trackTrialCtaTap,
  trackTeacherProUpgradeClick,
  trackTeacherProCheckoutStarted,
  trackTeacherProCheckoutRedirect,
  trackEduProCheckoutFailed,
} from '@/lib/education/proFunnelTelemetry';
import { resumeDecision } from '@/lib/education/pro/resumeDecision';

type T = (key: string, params?: Record<string, string | number>) => string;

interface Args {
  t: T;
  language: string;
  user: unknown;
  authLoading: boolean;
  proLoading: boolean;
  known: boolean | undefined;
  hasPro: boolean;
  offerTrial: boolean;
}

/**
 * The plan page's checkout: posts the Polar checkout, opens sign-in on a 401 and resumes the
 * remembered intent once the entitlement is read (a Pro account is never sent to buy Pro again).
 */
export function useUpgradeCheckout({ t, language, user, authLoading, proLoading, known, hasPro, offerTrial }: Args) {
  const [pending, setPending] = useState<null | 'trial' | 'paid'>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleUpgrade = useCallback(async (trial: boolean) => {
    setPending(trial ? 'trial' : 'paid');
    if (trial) {
      try {
        trackTrialCtaTap({ source: 'upgrade_page' });
      } catch {
        /* analytics must never block the till */
      }
    }
    try {
      trackTeacherProUpgradeClick({
        page: typeof window !== 'undefined' ? window.location.pathname : `/${language}/teacher/upgrade`,
        locale: language,
        placement: 'teacher_upgrade',
      });
      trackTeacherProCheckoutStarted({ trial, signed_in: Boolean(user) });
    } catch {
      /* analytics must never block the till */
    }
    try {
      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trial, locale: language }),
      });
      if (!response.ok) {
        if (response.status === 401) {
          // Designed anon gate: open sign-in and resume. Not a failed checkout.
          toast.error(t('teacher.subscription.signInRequired'));
          markResumeCheckoutIntent({ trial });
          setShowAuthModal(true);
          return;
        }
        // 503 is the server's own "till is shut": retrying cannot fix it, so say where to go instead.
        if (response.status === 503) {
          toast.error(
            <span>
              {t('eg2Pro.upgrade.checkoutOffline')}{' '}
              <a href={`/${language}/contact`} className="font-black underline">{t('eg2Pro.upgrade.contactUs')}</a>
            </span>,
            { duration: 8000 },
          );
          return;
        }
        toast.error(t('teacher.subscription.checkoutError'));
        return;
      }
      clearResumeCheckoutIntent();
      const { url } = await response.json();
      try {
        trackTeacherProCheckoutRedirect({ trial });
      } catch {
        /* analytics must never block the till */
      }
      window.location.href = url;
    } catch {
      try {
        trackEduProCheckoutFailed({ reason: 'network', placement: 'teacher_upgrade', trial });
      } catch {
        /* analytics must never block the till */
      }
      toast.error(t('teacher.subscription.checkoutError'));
    } finally {
      setPending(null);
    }
  }, [t, language, user]);

  // Resume after sign-in only once the entitlement is read: the server turns an ineligible
  // trial into a paid checkout, and a Pro account must not be sent to buy Pro again.
  useEffect(() => {
    if (authLoading || !user || proLoading || known !== true) return;
    if (!consumeResumeCheckoutIntent()) return;
    const trial = consumeResumeTrialFlag();
    setShowAuthModal(false);
    const decision = resumeDecision({ trial, proLoading, known: true, hasPro, offerTrial });
    if (decision === 'checkout-trial') void handleUpgrade(true);
    else if (decision === 'checkout-paid') void handleUpgrade(false);
    else if (decision === 'trial-used') toast(t('eg2Pro.upgrade.trialUsed'));
    else if (decision === 'already-pro') toast.success(t('eg2Pro.upgrade.alreadyPro'));
  }, [user, authLoading, proLoading, known, hasPro, offerTrial, handleUpgrade, t]);

  return { pending, handleUpgrade, showAuthModal, setShowAuthModal };
}
