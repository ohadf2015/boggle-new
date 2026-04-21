'use client';

import { createContext, useContext, useEffect, useRef, useMemo, type ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { AdMob } from '@capacitor-community/admob';
import { getAdmobConfig, type AdmobConfig, type AdPlatform } from '@/lib/admob-config';

interface AdMobContextValue {
  recordGameEnd: () => void;
  shouldShowInterstitial: () => boolean;
  hasNoAds: () => boolean;
  getConfig: () => AdmobConfig | null;
  whenReady: () => Promise<void>;
}

const AdMobContext = createContext<AdMobContextValue | null>(null);

export function AdMobProvider({ children }: { children: ReactNode }) {
  const isNative = useMemo(() => Capacitor.isNativePlatform(), []);
  const platform = useMemo(() => Capacitor.getPlatform() as AdPlatform, []);
  const totalGameEnds = useRef(0);
  const initPromise = useRef<Promise<void> | null>(null);

  if (initPromise.current === null) {
    initPromise.current = isNative
      ? AdMob.initialize({ initializeForTesting: process.env.NODE_ENV !== 'production' })
          .then(() => undefined)
          .catch(() => undefined)
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

  function shouldShowInterstitial(): boolean {
    if (hasNoAds()) return false;
    if (totalGameEnds.current <= 3) return false;
    const postWarmupCount = totalGameEnds.current - 3;
    return postWarmupCount % 3 === 0;
  }

  function getConfig(): AdmobConfig | null {
    if (!isNative) return null;
    return getAdmobConfig(platform);
  }

  return (
    <AdMobContext.Provider value={{ recordGameEnd, shouldShowInterstitial, hasNoAds, getConfig, whenReady }}>
      {children}
    </AdMobContext.Provider>
  );
}

export function useAdMobContext(): AdMobContextValue {
  const ctx = useContext(AdMobContext);
  if (!ctx) throw new Error('useAdMobContext must be used within AdMobProvider');
  return ctx;
}
