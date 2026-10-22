'use client';

import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { goToPolarCheckout, postTeacherProCheckout } from '@/lib/education/postTeacherProCheckout';
import { trackTrialCtaTap, type TrialCtaSource } from '@/lib/education/proFunnelTelemetry';

type T = (key: string) => string;

/** The 14-day Polar trial checkout, same till and errors as the HQ trial banner. */
export function useStartTeacherProTrial(t: T, language: string, source: TrialCtaSource) {
  const [pending, setPending] = useState(false);
  const start = useCallback(async () => {
    if (pending) return;
    try {
      trackTrialCtaTap({ source });
    } catch {
      /* analytics must never block the till */
    }
    setPending(true);
    try {
      const result = await postTeacherProCheckout(fetch, { trial: true, locale: language, placement: source });
      if (!result.ok) {
        toast.error(
          t(
            result.status === 401
              ? 'teacher.subscription.signInRequired'
              : result.status === 503
                ? 'teacher.subscription.checkoutUnavailable'
                : 'teacher.subscription.checkoutError',
          ),
        );
        return;
      }
      goToPolarCheckout(result.url);
    } catch {
      toast.error(t('teacher.subscription.checkoutError'));
    } finally {
      setPending(false);
    }
  }, [pending, t, language, source]);
  return { start, pending };
}
