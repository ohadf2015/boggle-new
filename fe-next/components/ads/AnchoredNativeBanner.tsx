'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { AdMob, BannerAdPluginEvents, BannerAdPosition } from '@capacitor-community/admob';
import { useAdMob } from '@/hooks/useAdMob';
import { useSafeArea } from '@/hooks/useSafeArea';
import { isAllowedAdBannerRoute } from '@/lib/admob-routes';

export default function AnchoredNativeBanner() {
  const pathname = usePathname();
  const { showBanner, hideBanner } = useAdMob();
  const safeArea = useSafeArea();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const removers: Array<() => void> = [];

    const isAndroid = Capacitor.getPlatform() === 'android';
    const resetVar = () => {
      document.documentElement.style.setProperty('--admob-banner-height', '0px');
    };

    AdMob.addListener(BannerAdPluginEvents.SizeChanged, (info: { height: number }) => {
      const h = info?.height ?? 0;
      // Var = banner clearance from viewport bottom (used by in-game content that
      // hides the bottom nav). Android plugin margin adds safe-area; iOS plugin
      // adds safeAreaLayoutGuide internally. Nav-related lift is NOT in this var —
      // pages with the nav use `has-global-bottom-nav` for their own clearance.
      const total = h > 0 ? h + (isAndroid ? (safeArea.bottom || 0) : 0) : 0;
      document.documentElement.style.setProperty('--admob-banner-height', `${total}px`);
    })
      .then((handle) => { removers.push(() => handle.remove()); })
      .catch(() => {});

    // Without these, a failed/closed banner leaves the var inflated from a prior
    // SizeChanged event → in-game content floats mid-screen above empty space.
    AdMob.addListener(BannerAdPluginEvents.FailedToLoad, resetVar)
      .then((handle) => { removers.push(() => handle.remove()); })
      .catch(() => {});

    AdMob.addListener(BannerAdPluginEvents.Closed, resetVar)
      .then((handle) => { removers.push(() => handle.remove()); })
      .catch(() => {});

    return () => {
      removers.forEach((r) => r());
      resetVar();
    };
  }, [safeArea.bottom]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;

    if (isAllowedAdBannerRoute(pathname)) {
      // Banner is lifted above GlobalBottomNav (when present) via plugin `margin`,
      // so the nav stays flush at viewport bottom and the banner sits directly above.
      // Game pages hide the nav (NavigationContext.isInGame); banner then falls back
      // to safe-area-only margin (Android) or 0 (iOS, plugin handles safeAreaLayoutGuide).
      const isAndroid = Capacitor.getPlatform() === 'android';
      const safeBottom = safeArea.bottom || 0;
      const navEl = document.querySelector<HTMLElement>('[data-global-bottom-nav]');
      const navHeight = navEl ? Math.round(navEl.getBoundingClientRect().height) : 0;
      // Android: nav.offsetHeight already includes safe-area via paddingBottom, so margin = navHeight ≥ safeBottom.
      // iOS: plugin re-adds safe-area, subtract to avoid double-count; floor at 0.
      const margin = isAndroid
        ? Math.max(navHeight, safeBottom)
        : Math.max(0, navHeight - safeBottom);
      (async () => {
        await hideBanner();
        if (cancelled) return;
        // AnchoredNativeBanner renders only on non-game surfaces (profile,
        // leaderboard, blog, glossary, etc.) per isAllowedAdBannerRoute, so
        // we tag this as the 'content' variant for separate eCPM optimization.
        await showBanner(BannerAdPosition.BOTTOM_CENTER, margin, { variant: 'content' });
      })();
    } else {
      hideBanner();
      document.documentElement.style.setProperty('--admob-banner-height', '0px');
    }

    return () => {
      cancelled = true;
    };
  }, [pathname, showBanner, hideBanner, safeArea.bottom]);

  return null;
}
