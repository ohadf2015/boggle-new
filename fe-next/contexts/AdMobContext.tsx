'use client';

import { createContext, useContext, useEffect, useRef, useMemo, type ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { AdMob } from '@capacitor-community/admob';
import { getAdmobConfig, type AdmobConfig, type AdPlatform } from '@/lib/admob-config';

interface AdMobContextValue {
  recordGameEnd: () => void;
  shouldShowInterstitial: () => boolean;
  recordInterstitialShown: () => void;
  hasNoAds: () => boolean;
  getConfig: () => AdmobConfig | null;
  whenReady: () => Promise<void>;
}

// Defensive cap. Prevents new interstitial trigger sites (mission-claim, streak-save, etc.)
// from compounding into ad fatigue within a single session.
const MAX_INTERSTITIALS_PER_SESSION = 4;

const AdMobContext = createContext<AdMobContextValue | null>(null);

export function AdMobProvider({ children }: { children: ReactNode }) {
  // `isPluginAvailable` is stricter than `isNativePlatform` — in some Android WebView
  // contexts the bridge reports native but the AdMob plugin isn't registered,
  // which throws UNIMPLEMENTED on any AdMob call.
  const isAvailable = useMemo(
    () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('AdMob'),
    []
  );
  const platform = useMemo(() => Capacitor.getPlatform() as AdPlatform, []);
  const totalGameEnds = useRef(0);
  const interstitialsShown = useRef(0);
  const initPromise = useRef<Promise<void> | null>(null);

  if (initPromise.current === null) {
    initPromise.current = isAvailable
      ? AdMob.initialize({ initializeForTesting: process.env.NODE_ENV !== 'production' })
          .then(() => undefined)
          .catch((err) => {
            // warn (not error) so Sentry's captureConsole doesn't treat expected
            // plugin-missing failures as errors.
            console.warn('[AdMob] initialize failed', err);
          })
      : Promise.resolve();
  }

  useEffect(() => {
    void initPromise.current;
  }, []);

  function whenReady(): Promise<void> {
    return initPromise.current ?? Promise.resolve();
  }

  function hasNoAds(): boolean {
    return false;
  }

  function recordGameEnd() {
    totalGameEnds.current += 1;
  }

  function recordInterstitialShown() {
    interstitialsShown.current += 1;
  }

  function shouldShowInterstitial(): boolean {
    if (hasNoAds()) return false;
    if (interstitialsShown.current >= MAX_INTERSTITIALS_PER_SESSION) return false;
    if (totalGameEnds.current <= 3) return false;
    const postWarmupCount = totalGameEnds.current - 3;
    return postWarmupCount % 3 === 0;
  }

  function getConfig(): AdmobConfig | null {
    if (!isAvailable) return null;
    return getAdmobConfig(platform);
  }

  return (
    <AdMobContext.Provider value={{ recordGameEnd, shouldShowInterstitial, recordInterstitialShown, hasNoAds, getConfig, whenReady }}>
      {children}
    </AdMobContext.Provider>
  );
}

export function useAdMobContext(): AdMobContextValue {
  const ctx = useContext(AdMobContext);
  if (!ctx) throw new Error('useAdMobContext must be used within AdMobProvider');
  return ctx;
}
