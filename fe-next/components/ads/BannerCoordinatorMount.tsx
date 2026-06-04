'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { AdMob, BannerAdPluginEvents, BannerAdPosition } from '@capacitor-community/admob';
import { useAdMob } from '@/hooks/useAdMob';
import { useAppLifecycle } from '@/hooks/useAppLifecycle';
import { bannerController } from '@/lib/native/bannerController';

/**
 * Lifecycle host for the single banner coordinator. Rendered once (next to
 * AnchoredNativeBanner). Wires the plugin's show/hide and load/fail/foreground
 * signals into the module-singleton `bannerController` so the two banner owners
 * (AnchoredNativeBanner + InlineBannerAd) can declare intent without racing.
 * Renders nothing.
 */
export default function BannerCoordinatorMount() {
  const { showBanner, hideBanner } = useAdMob();

  // App foreground: a backgrounded WebView can drop the banner's GPU surface —
  // re-assert so it repaints (no-op when no owner currently wants a banner).
  useAppLifecycle({ onForeground: () => void bannerController.reassert() });

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    bannerController.setOps({
      show: (margin, variant) =>
        showBanner(BannerAdPosition.BOTTOM_CENTER, margin, { variant }),
      hide: () => hideBanner(),
    });

    const removers: Array<() => void> = [];
    const onLoaded = () => bannerController.notifyLoaded();
    // Loaded/SizeChanged ⇒ a banner is on screen → clear any retry budget.
    // FailedToLoad ⇒ initial no-fill destroyed the AdView → bounded re-show.
    AdMob.addListener(BannerAdPluginEvents.Loaded, onLoaded)
      .then((h) => removers.push(() => h.remove()))
      .catch(() => {});
    AdMob.addListener(BannerAdPluginEvents.SizeChanged, onLoaded)
      .then((h) => removers.push(() => h.remove()))
      .catch(() => {});
    AdMob.addListener(BannerAdPluginEvents.FailedToLoad, () => bannerController.notifyFailed())
      .then((h) => removers.push(() => h.remove()))
      .catch(() => {});

    const onVisible = () => {
      if (document.visibilityState === 'visible') void bannerController.reassert();
    };
    document.addEventListener('visibilitychange', onVisible);
    removers.push(() => document.removeEventListener('visibilitychange', onVisible));

    // Single drawer-suppress owner. The native banner is a SurfaceView that
    // composites ABOVE the WebView, so an open side menu can't cover it with
    // z-index. HeaderMobileMenu flags <html>.mobile-drawer-open; we map that to
    // a global suppress so BOTH banner owners (anchor + slot) hide uniformly —
    // previously only the anchor cleared, leaving the slot banner (results
    // pages) composited on top of the open menu.
    const syncDrawer = () =>
      void bannerController.setSuppressed(
        document.documentElement.classList.contains('mobile-drawer-open'),
      );
    syncDrawer(); // reflect any drawer already open at mount
    const drawerObserver = new MutationObserver(syncDrawer);
    drawerObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    removers.push(() => drawerObserver.disconnect());

    // Periodic refresh so the banner doesn't sit on one stale creative. AdMob's
    // own refresh can stall when the WebView is backgrounded/throttled, so we
    // force a reload every ~45 min (within the 30–60 min ask). reassert()
    // force-reshows the active request (= a fresh creative) and is a no-op when
    // no owner wants the banner. Skip while hidden — onForeground re-asserts.
    const REFRESH_MS = 45 * 60 * 1000;
    const refreshTimer = setInterval(() => {
      if (document.visibilityState === 'visible') void bannerController.reassert();
    }, REFRESH_MS);
    removers.push(() => clearInterval(refreshTimer));

    return () => {
      removers.forEach((r) => r());
      void bannerController.setOps(null);
    };
  }, [showBanner, hideBanner]);

  return null;
}
