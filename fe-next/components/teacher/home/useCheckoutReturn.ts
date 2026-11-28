'use client';

import { useEffect, useRef, useState } from 'react';
import { isFreshCheckoutLanding } from '@/lib/education/checkoutReturn';
import type { useTeacherPro } from '@/hooks/useTeacherPro';
import { polarCheckoutWelcomeKind } from '@/lib/education/polarTrial';
import { checkoutReturnBeaconPromise, trackEduProCheckoutReturnLanded } from '@/lib/education/proFunnelTelemetry';

type Pro = ReturnType<typeof useTeacherPro>;

/** Back from Polar checkout: the webhook can land after the redirect, so Pro is re-read until it shows. */
export function useCheckoutReturn(landedFromCheckout: boolean, pro: Pro) {
  const { hasPro, loading: proLoading, refresh: refreshPro } = pro;
  const [fresh] = useState(
    () => typeof window === 'undefined' || isFreshCheckoutLanding(window.localStorage, window.location.search),
  );
  const checkoutSuccess = landedFromCheckout && fresh;

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
    let cancelled = false;
    let tries = 0;
    let id: ReturnType<typeof setInterval> | undefined;
    const startPolling = () => {
      if (cancelled) return;
      void refreshPro();
      id = setInterval(() => {
        tries += 1;
        void refreshPro();
        if (tries >= 8) clearInterval(id);
      }, 2000);
    };
    const beacon = checkoutReturnBeaconPromise();
    if (beacon) void beacon.finally(startPolling);
    else startPolling();
    return () => {
      cancelled = true;
      if (id) clearInterval(id);
    };
  }, [checkoutSuccess, proLoading, hasPro, refreshPro]);

  return polarCheckoutWelcomeKind({
    checkoutSuccess,
    hasPro,
    source: pro.source,
    status: pro.status ?? 'active',
  });
}
