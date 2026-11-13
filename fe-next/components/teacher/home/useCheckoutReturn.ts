'use client';

import { useEffect, useRef } from 'react';
import type { useTeacherPro } from '@/hooks/useTeacherPro';
import { polarCheckoutWelcomeKind } from '@/lib/education/polarTrial';
import { trackEduProCheckoutReturnLanded } from '@/lib/education/proFunnelTelemetry';

type Pro = ReturnType<typeof useTeacherPro>;

/** Back from Polar checkout: the webhook can land after the redirect, so Pro is re-read until it shows. */
export function useCheckoutReturn(checkoutSuccess: boolean, pro: Pro) {
  const { hasPro, loading: proLoading, refresh: refreshPro } = pro;

  // Fires whether or not entitlement lands: "webhook broken" (this fires, checkout_complete never does)
  // vs "abandoned on Polar" (neither fires).
  const returnLandedTracked = useRef(false);
  useEffect(() => {
    if (!checkoutSuccess || returnLandedTracked.current) return;
    returnLandedTracked.current = true;
    trackEduProCheckoutReturnLanded();
  }, [checkoutSuccess]);

  useEffect(() => {
    if (!checkoutSuccess || proLoading || hasPro || !refreshPro) return;
    let tries = 0;
    const id = setInterval(() => {
      tries += 1;
      void refreshPro();
      if (tries >= 8) clearInterval(id);
    }, 2000);
    return () => clearInterval(id);
  }, [checkoutSuccess, proLoading, hasPro, refreshPro]);

  return polarCheckoutWelcomeKind({
    checkoutSuccess,
    hasPro,
    source: pro.source,
    status: pro.status ?? 'active',
  });
}
