'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Dynamically imports @capacitor-community/admob only on native platforms.
 * This avoids bundling native code in the web build.
 */
async function getAdMob() {
  const { AdMob } = await import('@capacitor-community/admob');
  return AdMob;
}

/** Returns true when running inside a Capacitor native shell */
function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  try {
     
    const cap = (window as any).Capacitor;
    return cap?.isNativePlatform?.() ?? false;
  } catch {
    return false;
  }
}

/** Removes an array of pending AdMob plugin listeners */
async function removeListeners(listeners: Array<Promise<{ remove: () => void }>>) {
  for (const p of listeners) {
    try { (await Promise.resolve(p)).remove(); } catch { /* already removed */ }
  }
}

export type AdMobStatus = 'uninitialized' | 'ready' | 'error';

// Test ad unit IDs from Google — safe to use during development
const TEST_REWARDED_ID = 'ca-app-pub-3940256099942544/5224354917';
const TEST_BANNER_ID = 'ca-app-pub-3940256099942544/6300978111';
const TEST_INTERSTITIAL_ID = 'ca-app-pub-3940256099942544/1033173712';
const TEST_REWARDED_INTERSTITIAL_ID = 'ca-app-pub-3940256099942544/5354046379';

// Replace with real IDs after AdMob approval
const ADMOB_REWARDED_ID = process.env.NEXT_PUBLIC_ADMOB_REWARDED_ID || TEST_REWARDED_ID;
const ADMOB_BANNER_ID = process.env.NEXT_PUBLIC_ADMOB_BANNER_ID || TEST_BANNER_ID;
const ADMOB_INTERSTITIAL_ID = process.env.NEXT_PUBLIC_ADMOB_INTERSTITIAL_ID || TEST_INTERSTITIAL_ID;
const ADMOB_REWARDED_INTERSTITIAL_ID = process.env.NEXT_PUBLIC_ADMOB_REWARDED_INTERSTITIAL_ID || TEST_REWARDED_INTERSTITIAL_ID;

interface UseAdMobReturn {
  /** Whether AdMob is available (native platform + initialized) */
  isAvailable: boolean;
  /** Current initialization status */
  status: AdMobStatus;
  /** Show a rewarded video ad */
  showRewarded: (callbacks: {
    onReward: () => void;
    onDismiss?: () => void;
    onError?: (error: string) => void;
  }) => Promise<void>;
  /** Show a banner ad */
  showBanner: () => Promise<void>;
  /** Hide the banner ad */
  hideBanner: () => Promise<void>;
  /** Show an interstitial ad */
  showInterstitial: (callbacks?: {
    onDismiss?: () => void;
    onError?: (error: string) => void;
  }) => Promise<void>;
  /** Show a rewarded interstitial ad (full-page ad that rewards user) */
  showRewardedInterstitial: (callbacks: {
    onReward: () => void;
    onDismiss?: () => void;
    onError?: (error: string) => void;
  }) => Promise<void>;
}

const WEB_NOOP: UseAdMobReturn = {
  isAvailable: false,
  status: 'uninitialized',
  showRewarded: async () => {},
  showBanner: async () => {},
  hideBanner: async () => {},
  showInterstitial: async () => {},
  showRewardedInterstitial: async () => {},
};

/**
 * Hook for AdMob ads in Capacitor native apps.
 * Returns no-ops on web — only activates on native platforms.
 */
export function useAdMob(): UseAdMobReturn {
  const [isNative, setIsNative] = useState(false);
  const [status, setStatus] = useState<AdMobStatus>('uninitialized');
  const initializedRef = useRef(false);

  // Detect native platform after mount (avoids SSR/hydration mismatch)
  useEffect(() => {
    setIsNative(isNativePlatform());
  }, []);

  useEffect(() => {
    if (!isNative || initializedRef.current) return;
    initializedRef.current = true;

    (async () => {
      try {
        const AdMob = await getAdMob();
        await AdMob.initialize({
          initializeForTesting: process.env.NODE_ENV === 'development',
        });
        setStatus('ready');
      } catch (err) {
        console.error('[AdMob] Init failed:', err);
        setStatus('error');
      }
    })();
  }, [isNative]);

  const showRewarded = useCallback(async (callbacks: {
    onReward: () => void;
    onDismiss?: () => void;
    onError?: (error: string) => void;
  }) => {
    if (!isNative || status !== 'ready') {
      callbacks.onError?.('AdMob not available');
      return;
    }

    const listeners: Array<Promise<{ remove: () => void }>> = [];
    try {
      const AdMob = await getAdMob();
      const { RewardAdPluginEvents } = await import('@capacitor-community/admob');

      listeners.push(
        Promise.resolve(AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
          callbacks.onReward();
        })),
        Promise.resolve(AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
          callbacks.onDismiss?.();
          removeListeners(listeners);
        })),
        Promise.resolve(AdMob.addListener(RewardAdPluginEvents.FailedToLoad, (error: { message?: string }) => {
          callbacks.onError?.(error.message || 'Ad failed to load');
          removeListeners(listeners);
        })),
      );

      await AdMob.prepareRewardVideoAd({ adId: ADMOB_REWARDED_ID } as Parameters<typeof AdMob.prepareRewardVideoAd>[0]);
      await AdMob.showRewardVideoAd();
    } catch (err) {
      await removeListeners(listeners);
      callbacks.onError?.(err instanceof Error ? err.message : 'Ad error');
    }
  }, [isNative, status]);

  const showBanner = useCallback(async () => {
    if (!isNative || status !== 'ready') return;
    try {
      const AdMob = await getAdMob();
      const { BannerAdSize, BannerAdPosition } = await import('@capacitor-community/admob');
      await AdMob.showBanner({
        adId: ADMOB_BANNER_ID,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        isTesting: process.env.NODE_ENV === 'development',
      });
    } catch (err) {
      console.error('[AdMob] Banner error:', err);
    }
  }, [isNative, status]);

  const hideBanner = useCallback(async () => {
    if (!isNative) return;
    try {
      const AdMob = await getAdMob();
      await AdMob.hideBanner();
    } catch { /* banner may not exist */ }
  }, [isNative]);

  const showInterstitial = useCallback(async (callbacks?: {
    onDismiss?: () => void;
    onError?: (error: string) => void;
  }) => {
    if (!isNative || status !== 'ready') {
      callbacks?.onError?.('AdMob not available');
      return;
    }

    const listeners: Array<Promise<{ remove: () => void }>> = [];
    try {
      const AdMob = await getAdMob();
      const { InterstitialAdPluginEvents } = await import('@capacitor-community/admob');

      listeners.push(
        Promise.resolve(AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
          callbacks?.onDismiss?.();
          removeListeners(listeners);
        })),
        Promise.resolve(AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, (error: { message?: string }) => {
          callbacks?.onError?.(error.message || 'Interstitial failed to load');
          removeListeners(listeners);
        })),
      );

      await AdMob.prepareInterstitial({
        adId: ADMOB_INTERSTITIAL_ID,
        isTesting: process.env.NODE_ENV === 'development',
      });
      await AdMob.showInterstitial();
    } catch (err) {
      await removeListeners(listeners);
      callbacks?.onError?.(err instanceof Error ? err.message : 'Ad error');
    }
  }, [isNative, status]);

  const showRewardedInterstitial = useCallback(async (callbacks: {
    onReward: () => void;
    onDismiss?: () => void;
    onError?: (error: string) => void;
  }) => {
    if (!isNative || status !== 'ready') {
      callbacks.onError?.('AdMob not available');
      return;
    }

    const listeners: Array<Promise<{ remove: () => void }>> = [];
    try {
      const AdMob = await getAdMob();
      const { RewardInterstitialAdPluginEvents } = await import('@capacitor-community/admob');

      listeners.push(
        Promise.resolve(AdMob.addListener(RewardInterstitialAdPluginEvents.Rewarded, () => {
          callbacks.onReward();
        })),
        Promise.resolve(AdMob.addListener(RewardInterstitialAdPluginEvents.Dismissed, () => {
          callbacks.onDismiss?.();
          removeListeners(listeners);
        })),
        Promise.resolve(AdMob.addListener(RewardInterstitialAdPluginEvents.FailedToLoad, (error: { message?: string }) => {
          callbacks.onError?.(error.message || 'Rewarded interstitial failed to load');
          removeListeners(listeners);
        })),
      );

      await AdMob.prepareRewardInterstitialAd({ adId: ADMOB_REWARDED_INTERSTITIAL_ID });
      await AdMob.showRewardInterstitialAd();
    } catch (err) {
      await removeListeners(listeners);
      callbacks.onError?.(err instanceof Error ? err.message : 'Ad error');
    }
  }, [isNative, status]);

  // Return no-ops on web
  if (!isNative) return WEB_NOOP;

  return {
    isAvailable: status === 'ready',
    status,
    showRewarded,
    showBanner,
    hideBanner,
    showInterstitial,
    showRewardedInterstitial,
  };
}

export default useAdMob;
