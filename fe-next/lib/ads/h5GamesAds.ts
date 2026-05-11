/**
 * Google H5 Games Ads SDK loader + typed adBreak/adConfig wrappers.
 *
 * Web surface only. Caller MUST gate on `!isOnCrazyGamesPlatform && !Capacitor.isNativePlatform()`
 * before invoking — H5 must never load inside CG iframe (portal forbids 3rd-party ads)
 * or on Android APK (AdMob native SDK serves there with full SSV).
 *
 * Approval scope: H5 Games Ads program ONLY (NOT AdSense). We therefore use
 * the `adBreak()` API exclusively — no page-level ads / no Auto-Ads anchored
 * banner (those require AdSense approval which we do not have).
 *
 * Script: pagead2.googlesyndication.com/pagead/js/adsbygoogle.js
 * Interstitial:    `adBreak({ type:'next' | 'start' | 'pause' | 'browse' })`
 * Rewarded:        `adBreak({ type:'reward', beforeReward, adViewed, adDismissed, adBreakDone })`
 *
 * No banner — web users see no persistent ad. AdMob banner on Android only.
 */

export type H5BreakStatus =
  | 'viewed'
  | 'dismissed'
  | 'noAdPreloaded'
  | 'frequencyCapped'
  | 'ignored'
  | 'timeout'
  | 'other';

export interface H5PlacementInfo {
  breakName?: string;
  breakFormat?: string;
  breakStatus?: H5BreakStatus;
}

export interface H5AdBreakOptions {
  type: 'start' | 'pause' | 'next' | 'browse' | 'reward';
  name: string;
  beforeAd?: () => void;
  afterAd?: () => void;
  /** Rewarded only: receives a no-arg fn that, when called, shows the rewarded ad. */
  beforeReward?: (showAdFn: () => void) => void;
  adDismissed?: () => void;
  adViewed?: () => void;
  adBreakDone?: (info: H5PlacementInfo) => void;
}

export interface H5AdConfigOptions {
  preloadAdBreaks?: 'auto' | 'on';
  sound?: 'on' | 'off';
  onReady?: () => void;
}

type AdsByGoogleEntry = H5AdBreakOptions | H5AdConfigOptions | Record<string, unknown>;

declare global {
  interface Window {
    adsbygoogle?: AdsByGoogleEntry[] & { loaded?: boolean };
    /** Test-mode override — `?h5ads_test=1` in URL sets this so AdSense returns sandbox ads. */
    __h5AdsTest?: boolean;
  }
}

const SCRIPT_ID = 'h5-games-ads-sdk';
const SCRIPT_SRC = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
const DEFAULT_CLIENT = 'ca-pub-1896836706464880';

let loadPromise: Promise<void> | null = null;
let configured = false;

export function getH5Client(): string {
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_ADSENSE_H5_CLIENT) {
    return process.env.NEXT_PUBLIC_ADSENSE_H5_CLIENT;
  }
  return DEFAULT_CLIENT;
}

/** Idempotent: loads the SDK script once and resolves when ready. */
export function loadH5Sdk(client: string = getH5Client()): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      // Script already injected (HMR, double-mount). Resolve immediately if loaded,
      // otherwise wait for its load event.
      if (window.adsbygoogle && window.adsbygoogle.loaded) { resolve(); return; }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('h5-sdk-script-error')), { once: true });
      return;
    }

    const isTest = typeof window !== 'undefined' && (
      window.__h5AdsTest === true ||
      (typeof location !== 'undefined' && /[?&]h5ads_test=1/.test(location.search))
    );

    window.adsbygoogle = window.adsbygoogle || [];
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `${SCRIPT_SRC}?client=${encodeURIComponent(client)}`;
    if (isTest) script.setAttribute('data-adbreak-test', 'on');
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => {
      loadPromise = null;
      reject(new Error('h5-sdk-script-error'));
    }, { once: true });
    document.head.appendChild(script);
  });

  return loadPromise;
}

/** One-shot adConfig push. Safe to call before the SDK script finishes loading — pushes queue. */
export function adConfig(options: H5AdConfigOptions): void {
  if (typeof window === 'undefined') return;
  window.adsbygoogle = window.adsbygoogle || [];
  window.adsbygoogle.push(options);
}

/** One-shot adBreak push. */
export function adBreak(options: H5AdBreakOptions): void {
  if (typeof window === 'undefined') return;
  window.adsbygoogle = window.adsbygoogle || [];
  window.adsbygoogle.push(options);
}

/**
 * Initialize H5 Games Ads once: load SDK + push adConfig (preload + sound).
 * Idempotent — subsequent calls resolve to the same promise.
 *
 * Does NOT enable page-level ads or any AdSense Auto-Ads format. H5 Games Ads
 * approval only covers `adBreak()` placements (interstitial + rewarded).
 *
 * Tags PostHog with `ad_provider_web: 'h5-games'` super-prop so dashboards can
 * split funnels by ad provider after this session reaches an H5-capable surface.
 * Lazy-imported so non-web bundles (or SSR) don't pull PostHog into the loader.
 */
export function initH5GamesAds(client: string = getH5Client()): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();

  return loadH5Sdk(client).then(() => {
    if (configured) return;
    configured = true;

    adConfig({
      preloadAdBreaks: 'auto',
      sound: 'on',
    });

    void import('@/utils/posthogEngagement')
      .then(({ setPostHogSuperProps }) => {
        setPostHogSuperProps({ ad_provider_web: 'h5-games' });
      })
      .catch(() => { /* analytics is best-effort */ });
  });
}

/** Reset module state. Test-only. */
export function __resetH5SdkForTests(): void {
  loadPromise = null;
  configured = false;
}
