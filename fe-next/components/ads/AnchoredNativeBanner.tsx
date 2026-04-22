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

// Paths where GlobalBottomNav is hidden — on these, the banner can sit flush at the bottom.
// Kept in sync with pathsWithOwnNav in GlobalBottomNav.
const PATHS_WITH_OWN_NAV = [
  '/multiplayer',
  '/singleplayer',
  '/daily',
  '/adventure',
  '/education',
  '/student',
  '/teacher',
  '/admin',
  '/brain',
  '/challenge',
  '/custom',
  '/join',
];

// Matches h-16 on GlobalBottomNav (64px). Safe-area padding is absorbed by the
// AdMob plugin at BOTTOM_CENTER, so the margin only needs to clear the nav's content.
const GLOBAL_BOTTOM_NAV_HEIGHT = 64;

function isAllowedRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  const path = pathname.replace(/^\/(en|he|sv|ja|es)/, '') || '/';
  return !GAME_ROUTES.some((r) => path.startsWith(r));
}

function hasGlobalBottomNav(pathname: string | null): boolean {
  if (!pathname) return false;
  const path = pathname.replace(/^\/(en|he|sv|ja|es)/, '') || '/';
  return !PATHS_WITH_OWN_NAV.some((r) => path.startsWith(r));
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
      // Banner sits ABOVE the GlobalBottomNav (when present) so the nav stays flush
      // at the viewport bottom. Plugin auto-excludes iOS safe-area, so margin only
      // needs to clear the nav's visible height; on pages without the nav, margin=0.
      const margin = hasGlobalBottomNav(pathname) ? GLOBAL_BOTTOM_NAV_HEIGHT : 0;
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
  }, [pathname, showBanner, hideBanner]);

  return null;
}
