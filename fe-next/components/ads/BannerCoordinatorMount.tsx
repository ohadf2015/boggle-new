'use client';

import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { AdMob, BannerAdPluginEvents, BannerAdPosition } from '@capacitor-community/admob';
import { useAdMob } from '@/hooks/useAdMob';
import { useAppLifecycle } from '@/hooks/useAppLifecycle';
import { bannerController, shouldSuppressBanner } from '@/lib/native/bannerController';

/**
 * Lifecycle host for the single banner coordinator. Rendered once (next to
 * AnchoredNativeBanner). Wires the plugin's show/hide and load/fail/foreground
 * signals into the module-singleton `bannerController` so the two banner owners
 * (AnchoredNativeBanner + InlineBannerAd) can declare intent without racing.
 * Renders nothing.
 */
export default function BannerCoordinatorMount() {
  const { showBanner, hideBanner } = useAdMob();

  // Capture showBanner/hideBanner in stable refs so the setup effect runs ONCE
  // (deps=[]) without churning on each render. This prevents setOps from being
  // called repeatedly on navigation, which was causing:
  // - Native listener re-registration (3 add/3 remove cycles)
  // - setOps(null) + setOps(newOps) churn resetting applied.visible
  // - MutationObserver teardown leaving drawer unobserved
  const showRef = useRef(showBanner);
  const hideRef = useRef(hideBanner);

  useEffect(() => {
    showRef.current = showBanner;
    hideRef.current = hideBanner;
  }, [showBanner, hideBanner]);

  // App foreground: a backgrounded WebView can drop the banner's GPU surface —
  // re-assert so it repaints (no-op when no owner currently wants a banner).
  useAppLifecycle({ onForeground: () => void bannerController.reassert() });

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    bannerController.setOps({
      show: async (margin, variant) => {
        // The native hideBanner() sets the AdView GONE; the re-show path
        // (updateExistingAdView) only reloads the ad and does NOT restore
        // visibility — so a suppress→release (drawer open→close) cycle would
        // leave the banner permanently hidden. resumeBanner() is the native
        // inverse (setVisibility(VISIBLE) + resume()) and resolves cleanly; it's
        // a no-op when no AdView exists, so it's safe on the initial show too.
        // Restore visibility FIRST, then showBanner() handles create / size /
        // margin for the fresh + reload cases.
        await AdMob.resumeBanner().catch(() => {});
        return showRef.current(BannerAdPosition.BOTTOM_CENTER, margin, { variant });
      },
      hide: () => hideRef.current(),
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

    // Orientation / resize: an adaptive banner is sized to the screen WIDTH at
    // show time, so on portrait↔landscape rotation it keeps the stale width and
    // mis-anchors. reassert() bumps the generation so reconcile re-shows the
    // active request at the current width. Debounced — rotation fires a burst of
    // resize events. Only the InlineBannerAd 'slot' self-heals on resize today;
    // the anchor never re-asserted on rotation, so anchor-only surfaces stayed
    // stale. NOTE: full WIDTH re-negotiation also needs the native patch to
    // recreate (not reuse) the AdView on a width change — that's release-gated;
    // this JS reassert is necessary but not sufficient until the native rebuild
    // ships. It still fixes the margin/anchor + CSS-band (--admob-banner-height
    // re-reported via SizeChanged) on rotation.
    let orientationTimer: ReturnType<typeof setTimeout> | null = null;
    const onOrientationOrResize = () => {
      if (orientationTimer) clearTimeout(orientationTimer);
      orientationTimer = setTimeout(() => {
        orientationTimer = null;
        void bannerController.reassert();
      }, 250);
    };
    window.addEventListener('orientationchange', onOrientationOrResize);
    window.addEventListener('resize', onOrientationOrResize, { passive: true });
    removers.push(() => {
      if (orientationTimer) clearTimeout(orientationTimer);
      window.removeEventListener('orientationchange', onOrientationOrResize);
      window.removeEventListener('resize', onOrientationOrResize);
    });

    // Single global-suppress owner. The native banner is a SurfaceView that
    // composites ABOVE the WebView, so neither an open side menu nor in-game
    // bottom controls can cover it with z-index — we hide it outright instead.
    // Two independent signals drive a global suppress that covers BOTH banner
    // owners (anchor + slot) uniformly:
    //   - <html>.mobile-drawer-open (HeaderMobileMenu) — side menu is open.
    //   - <body>.screen-fit-locked (NavigationContext, isInGame) — fullscreen
    //     gameplay. Suppress by DEFAULT (opt-out) so any game — including new
    //     modes never added to the route blocklist (word-craft, word-tower) —
    //     never composites an ad over its bottom controls. A screen that truly
    //     reserves banner room opts back in via <html>.banner-allow-in-game
    //     (only /adventure today; set by AdventureWheelGame which reserves
    //     --admob-banner-height).
    // NOTE: the two classes live on DIFFERENT nodes (drawer/opt-in on <html>,
    // game-lock on <body>), so we observe both.
    const syncSuppress = () =>
      void bannerController.setSuppressed(
        shouldSuppressBanner({
          drawerOpen: document.documentElement.classList.contains('mobile-drawer-open'),
          inGame: document.body.classList.contains('screen-fit-locked'),
          allowInGame: document.documentElement.classList.contains('banner-allow-in-game'),
        }),
      );
    syncSuppress(); // reflect any drawer/game state already active at mount
    const suppressObserver = new MutationObserver(syncSuppress);
    suppressObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    suppressObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    });
    removers.push(() => suppressObserver.disconnect());

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
  }, []);

  return null;
}
