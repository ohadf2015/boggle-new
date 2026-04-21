'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { AdMob, BannerAdPluginEvents, BannerAdPosition } from '@capacitor-community/admob';
import { useAdMob } from '@/hooks/useAdMob';

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

    if (isAllowedRoute(pathname)) {
      showBanner(BannerAdPosition.BOTTOM_CENTER);
    } else {
      hideBanner();
      document.documentElement.style.setProperty('--admob-banner-height', '0px');
    }
  }, [pathname, showBanner, hideBanner]);

  return null;
}
