'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { AdMob, BannerAdPluginEvents, BannerAdPosition } from '@capacitor-community/admob';
import { useAdMob } from '@/hooks/useAdMob';
import { useSafeArea } from '@/hooks/useSafeArea';

// GlobalBottomNav height (h-16 = 64px). Keep in sync if nav height changes.
const NAV_HEIGHT_PX = 64;

const GAME_ROUTES = [
  '/multiplayer',
  '/singleplayer',
  '/adventure',
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

    let removeListener: (() => void) | undefined;

    AdMob.addListener(BannerAdPluginEvents.SizeChanged, (info: { height: number }) => {
      const h = info?.height ?? 0;
      document.documentElement.style.setProperty('--admob-banner-height', `${h}px`);
    })
      .then((handle) => {
        removeListener = () => handle.remove();
      })
      .catch(() => {});

    return () => {
      removeListener?.();
      document.documentElement.style.setProperty('--admob-banner-height', '0px');
    };
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;

    if (isAllowedRoute(pathname)) {
      // Stack banner above GlobalBottomNav: margin = nav height + safe-area bottom.
      // Plugin ignores margin on re-show of existing banner, so hide first.
      const margin = NAV_HEIGHT_PX + (safeArea.bottom || 0);
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
