'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { AdMob, BannerAdPluginEvents, BannerAdPosition } from '@capacitor-community/admob';
import { useAdMob } from '@/hooks/useAdMob';
import { useSafeArea } from '@/hooks/useSafeArea';

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
      // Absorb safe-area into var: on iOS, plugin anchors banner above home indicator,
      // so nav must offset by bannerH + safeArea to sit flush above banner top edge.
      const total = h > 0 ? h + (safeArea.bottom || 0) : 0;
      document.documentElement.style.setProperty('--admob-banner-height', `${total}px`);
    })
      .then((handle) => {
        removeListener = () => handle.remove();
      })
      .catch(() => {});

    return () => {
      removeListener?.();
      document.documentElement.style.setProperty('--admob-banner-height', '0px');
    };
  }, [safeArea.bottom]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;

    if (isAllowedRoute(pathname)) {
      // Anchor banner at true screen bottom (margin=0; plugin auto-excludes iOS notch).
      // GlobalBottomNav reads --admob-banner-height CSS var (set via SizeChanged)
      // and offsets itself up, so nav stacks flush above banner without magic constants.
      (async () => {
        await hideBanner();
        if (cancelled) return;
        await showBanner(BannerAdPosition.BOTTOM_CENTER, 0);
      })();
    } else {
      hideBanner();
      document.documentElement.style.setProperty('--admob-banner-height', '0px');
    }

    return () => {
      cancelled = true;
    };
  }, [pathname, showBanner, hideBanner]);

  return null;
}
