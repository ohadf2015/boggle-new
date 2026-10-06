'use client';

import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  goToPolarCheckout,
  postTeacherProCheckout,
} from '@/lib/education/postTeacherProCheckout';
import {
  trackEduProUpgradeClicked,
  type ProUpgradeSource,
} from '@/lib/education/proFunnelTelemetry';

/**
 * Dashboard trial / expired-trial CTA — POSTs the existing Polar checkout.
 * Click tracking is the one step the server cannot see. 503 is Polar env
 * missing: surface it, never fake a URL.
 */
export function useTeacherProCheckout(source: ProUpgradeSource) {
  const { t, language } = useLanguage();
  const [pending, setPending] = useState(false);

  const start = useCallback(async () => {
    if (pending) return;
    try {
      trackEduProUpgradeClicked({ source });
    } catch {
      /* analytics must never block the till */
    }
    setPending(true);
    try {
      const result = await postTeacherProCheckout(fetch, { trial: false, locale: language });
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
  }, [pending, source, t, language]);

  return { pending, start };
}
