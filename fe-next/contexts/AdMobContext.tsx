'use client';

import { createContext, useContext, useEffect, useRef, useMemo, type ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { AdMob, AdmobConsentStatus } from '@capacitor-community/admob';
import { getAdmobConfig, type AdmobConfig, type AdPlatform } from '@/lib/admob-config';

interface AdMobContextValue {
  recordGameEnd: () => void;
  shouldShowInterstitial: () => boolean;
  recordInterstitialShown: () => void;
  hasNoAds: () => boolean;
  getConfig: () => AdmobConfig | null;
  whenReady: () => Promise<void>;
  /**
   * Warm the next interstitial so `showInterstitial` is zero-latency.
   * Idempotent, dedupes concurrent loads, and is a no-op when ads are
   * unavailable, the session cap is reached, or we're still in warmup.
   * AdMob interstitials expire (~1h); callers re-warm after each show.
   */
  prepareInterstitial: () => Promise<void>;
  /** True when a preloaded interstitial is ready to show without a cold load. */
  isInterstitialReady: () => boolean;
  /** Mark the warm interstitial consumed (call right before showing it). */
  consumeInterstitial: () => void;
}

// Defensive cap. Prevents new interstitial trigger sites (mission-claim, streak-save, etc.)
// from compounding into ad fatigue within a single session.
const MAX_INTERSTITIALS_PER_SESSION = 4;

// AdMob interstitials expire ~1h after load (Google: "reload every hour").
// Treat a preloaded ad older than this as not-ready so it cold-reloads before
// showing — otherwise a stale-but-"ready" ad would be consumed + recorded, then
// fail to render, burning a session slot via the expiry door. 50min < 60min
// gives margin for the show to complete before the SDK's own expiry.
const INTERSTITIAL_TTL_MS = 50 * 60 * 1000;

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
  // Interstitial preload state (app-scoped, resets per provider). A "warm" ad
  // shows with zero latency; `inFlight` dedupes concurrent prepares.
  const interstitialReady = useRef(false);
  const interstitialReadyAt = useRef(0);
  const interstitialInFlight = useRef<Promise<void> | null>(null);

  if (initPromise.current === null) {
    // EU/GDPR: gather UMP consent BEFORE initialize. The plugin itself geo-gates
    // (returns NOT_REQUIRED outside EEA), so no client-side EEA check needed.
    // Errors in the consent flow must NOT block ads — fall through to initialize
    // either way so non-EEA traffic stays unaffected if UMP backend is flaky.
    const consentReady = isAvailable
      ? AdMob.requestConsentInfo()
          .then(async (info) => {
            if (
              info.status === AdmobConsentStatus.REQUIRED &&
              info.isConsentFormAvailable
            ) {
              await AdMob.showConsentForm();
            }
          })
          .catch((err) => {
            console.warn('[AdMob] UMP consent flow failed', err);
          })
      : Promise.resolve();

    initPromise.current = consentReady.then(() =>
      isAvailable
        ? AdMob.initialize({ initializeForTesting: process.env.NODE_ENV !== 'production' })
            .then(() => undefined)
            .catch((err) => {
              // warn (not error) so Sentry's captureConsole doesn't treat expected
              // plugin-missing failures as errors.
              console.warn('[AdMob] initialize failed', err);
            })
        : undefined
    );
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

  // Whether it's worth holding a warm interstitial right now: ads on, under the
  // session cap, and past warmup (the first eligible interstitial is game 6, so
  // warming at the warmup edge — game 3 — keeps that first one instant too).
  function shouldPreloadInterstitial(): boolean {
    if (hasNoAds()) return false;
    if (interstitialsShown.current >= MAX_INTERSTITIALS_PER_SESSION) return false;
    return totalGameEnds.current >= 3;
  }

  function isInterstitialReady(): boolean {
    // Warm AND fresh — a preloaded ad older than the TTL is treated as not-ready
    // so the show path cold-reloads it before consuming a slot.
    return interstitialReady.current && Date.now() - interstitialReadyAt.current < INTERSTITIAL_TTL_MS;
  }

  function consumeInterstitial(): void {
    interstitialReady.current = false;
  }

  function prepareInterstitial(): Promise<void> {
    if (!shouldPreloadInterstitial()) return Promise.resolve();
    if (isInterstitialReady()) return Promise.resolve(); // fresh & warm — skip (stale falls through to reload)
    if (interstitialInFlight.current) return interstitialInFlight.current;
    const config = getConfig();
    if (!config) return Promise.resolve();
    const p = (async () => {
      try {
        await whenReady();
        await AdMob.prepareInterstitial({ adId: config.interstitialAdId });
        interstitialReady.current = true;
        interstitialReadyAt.current = Date.now();
      } catch {
        // No fill / load error — leave un-warmed; showInterstitial will retry
        // a cold load and, failing that, skip showing without burning a slot.
        interstitialReady.current = false;
      } finally {
        interstitialInFlight.current = null;
      }
    })();
    interstitialInFlight.current = p;
    return p;
  }

  return (
    <AdMobContext.Provider value={{ recordGameEnd, shouldShowInterstitial, recordInterstitialShown, hasNoAds, getConfig, whenReady, prepareInterstitial, isInterstitialReady, consumeInterstitial }}>
      {children}
    </AdMobContext.Provider>
  );
}

export function useAdMobContext(): AdMobContextValue {
  const ctx = useContext(AdMobContext);
  if (!ctx) throw new Error('useAdMobContext must be used within AdMobProvider');
  return ctx;
}
