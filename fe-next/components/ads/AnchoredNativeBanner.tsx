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
    let lastMargin = -1;
    const isAndroid = Capacitor.getPlatform() === 'android';
    const safeBottom = safeArea.bottom || 0;

    if (!isAllowedAdBannerRoute(pathname)) {
      hideBanner();
      document.documentElement.style.setProperty('--admob-banner-height', '0px');
      return () => { cancelled = true; };
    }

    const computeMargin = (): number => {
      const navEl = document.querySelector<HTMLElement>('[data-global-bottom-nav]');
      const navHeight = navEl ? Math.round(navEl.getBoundingClientRect().height) : 0;
      // Android: nav.offsetHeight already includes safe-area via paddingBottom, so margin = navHeight ≥ safeBottom.
      // iOS: plugin re-adds safe-area, subtract to avoid double-count; floor at 0.
      return isAndroid
        ? Math.max(navHeight, safeBottom)
        : Math.max(0, navHeight - safeBottom);
    };

    const applyBanner = async (margin: number) => {
      if (cancelled || margin === lastMargin) return;
      lastMargin = margin;
      await hideBanner();
      if (cancelled) return;
      // AnchoredNativeBanner renders only on non-game surfaces (profile,
      // leaderboard, blog, glossary, etc.) per isAllowedAdBannerRoute, so
      // we tag this as the 'content' variant for separate eCPM optimization.
      await showBanner(BannerAdPosition.BOTTOM_CENTER, margin, { variant: 'content' });
    };

    // Initial sync call preserves test contract (margin reflects nav present at mount).
    applyBanner(computeMargin());

    // Re-measure after paint — nav DOM may not be laid out on first effect tick
    // (sibling render/effect race between essential-providers and layout).
    const rafId = requestAnimationFrame(() => {
      if (!cancelled) applyBanner(computeMargin());
    });

    // Re-measure when nav resizes (orientation, font load, safe-area shift).
    const navEl = document.querySelector<HTMLElement>('[data-global-bottom-nav]');
    let resizeObserver: ResizeObserver | null = null;
    if (navEl && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => applyBanner(computeMargin()));
      resizeObserver.observe(navEl);
    }

    // Re-measure when nav appears/disappears (NavigationContext.isInGame toggles
    // `has-global-bottom-nav` on <html>). Without this, leaving a game leaves the
    // banner with stale 0-margin, sitting on top of the just-shown nav.
    const classObserver = new MutationObserver(() => applyBanner(computeMargin()));
    classObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      classObserver.disconnect();
    };
  }, [pathname, showBanner, hideBanner, safeArea.bottom]);

  return null;
}
