'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    adBreak?: (o: Record<string, unknown>) => void;
    adConfig?: (o: Record<string, unknown>) => void;
  }
}

interface PlacementInfo {
  breakStatus: 'viewed' | 'dismissed' | 'notReady' | 'frequencyCapped' | 'other';
}

function isDev(): boolean {
  if (process.env.NODE_ENV === 'development') return true;
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') return true;
  return false;
}

export function useAdPlacement() {
  const [isReady, setIsReady] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (isDev() || checkedRef.current) return;
    checkedRef.current = true;

    const check = () => {
      if (typeof window.adBreak === 'function') {
        setIsReady(true);
        return true;
      }
      return false;
    };

    if (check()) return;

    // Poll briefly for API availability
    let attempts = 0;
    const id = setInterval(() => {
      attempts++;
      if (check() || attempts >= 20) clearInterval(id);
    }, 250);

    return () => clearInterval(id);
  }, []);

  const updateSound = useCallback((on: boolean) => {
    if (isDev() || !window.adConfig) return;
    window.adConfig({ sound: on ? 'on' : 'off' });
  }, []);

  const showInterstitial = useCallback(
    (name: string, callbacks?: { beforeAd?: () => void; afterAd?: () => void }) => {
      if (isDev() || !window.adBreak) return;
      window.adBreak({
        type: 'next',
        name,
        beforeAd: callbacks?.beforeAd,
        afterAd: callbacks?.afterAd,
        adBreakDone: (_info: PlacementInfo) => { /* no-op */ },
      });
    },
    [],
  );

  const showRewarded = useCallback(
    (
      name: string,
      callbacks: { onReward: () => void; onDismiss?: () => void },
    ) => {
      if (isDev() || !window.adBreak) {
        // In dev, grant reward immediately for testing
        callbacks.onReward();
        return;
      }
      window.adBreak({
        type: 'reward',
        name,
        beforeReward: (showAdFn: () => void) => showAdFn(),
        adDismissed: () => callbacks.onDismiss?.(),
        adViewed: () => callbacks.onReward(),
        adBreakDone: (_info: PlacementInfo) => { /* no-op */ },
      });
    },
    [],
  );

  return { isReady, showInterstitial, showRewarded, updateSound };
}
