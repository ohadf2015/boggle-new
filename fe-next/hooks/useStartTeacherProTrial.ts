'use client';

import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { goToPolarCheckout, postTeacherProCheckout, checkoutFailureKey } from '@/lib/education/postTeacherProCheckout';
import { trackTrialCtaTap, type TrialCtaSource } from '@/lib/education/proFunnelTelemetry';

type T = (key: string) => string;

/** The 14-day Polar trial checkout, same till and errors as the HQ trial banner. */
export function useStartTeacherProTrial(
  t: T,
  language: string,
  source: TrialCtaSource,
  /** `trial: false` is the straight $9/mo checkout (access trial already ended). The server still caps trial days. */
  options: { trial?: boolean } = {},
) {
  const trial = options.trial !== false;
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
      const result = await postTeacherProCheckout(fetch, { trial, locale: language, placement: source });
      if (!result.ok) {
        toast.error(t(checkoutFailureKey(result)));
        return;
      }
      goToPolarCheckout(result.url);
    } catch {
      toast.error(t('teacher.subscription.checkoutError'));
    } finally {
      setPending(false);
    }
  }, [pending, t, language, source, trial]);
  return { start, pending };
}
