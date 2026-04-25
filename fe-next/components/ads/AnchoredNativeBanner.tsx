'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { AdMob, BannerAdPluginEvents, BannerAdPosition } from '@capacitor-community/admob';
import { useAdMob } from '@/hooks/useAdMob';
import { useSafeArea } from '@/hooks/useSafeArea';

// Routes where the AdMob anchored banner is NOT shown.
// `/adventure` is intentionally allowed to show the banner — adventure mode
// runs real banner ads during gameplay (layout reserves space via the
// --admob-banner-height CSS var so buttons are never covered).
const GAME_ROUTES = [
  '/multiplayer',
  '/singleplayer',
  '/daily',
  '/challenge',
  '/join',
  '/brain',
  '/custom',
  '/party-screen',
  '/teacher',
  '/student',
  '/auth/callback',
  '/hebrew-multiplayer-word-game',
  '/friends',
  '/profile',
];

function isAllowedRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  const path = pathname.replace(/^\/(en|he|sv|ja|es)/, '') || '/';
  return !GAME_ROUTES.some((r) => path.startsWith(r));
}

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
      // Var = total vertical space banner occupies from viewport bottom.
      // Android: plugin margin adds safe-area, so total = h + safeArea.
      // iOS: plugin uses safeAreaLayoutGuide (home indicator excluded automatically), total = h.
      const total = h > 0 ? h + (isAndroid ? (safeArea.bottom || 0) : 0) : 0;
      document.documentElement.style.setProperty('--admob-banner-height', `${total}px`);
    })
      .then((handle) => { removers.push(() => handle.remove()); })
      .catch(() => {});

    // Without these, a failed/closed banner leaves the var inflated from a prior
    // SizeChanged event → GlobalBottomNav floats mid-screen above empty space.
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

    if (isAllowedRoute(pathname)) {
      // Banner pins flush at webview bottom. GlobalBottomNav floats above it via
      // the --admob-banner-height CSS var (set by SizeChanged above). On Android,
      // margin lifts the banner above the gesture bar; iOS uses safeAreaLayoutGuide.
      const isAndroid = Capacitor.getPlatform() === 'android';
      const margin = isAndroid ? (safeArea.bottom || 0) : 0;
      (async () => {
        await hideBanner();
        if (cancelled) return;
        await showBanner(BannerAdPosition.BOTTOM_CENTER, margin);
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
