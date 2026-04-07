'use client';

import { useEffect } from 'react';
import { useAdMob } from '@/hooks/useAdMob';

/**
 * Shows an AdMob banner ad on native (Capacitor) platforms.
 * Renders nothing on web. Automatically shows on mount and hides on unmount.
 */
export function NativeBannerAd() {
  const { isAvailable, showBanner, hideBanner } = useAdMob();

  useEffect(() => {
    if (!isAvailable) return;
    showBanner();
    return () => { hideBanner(); };
  }, [isAvailable, showBanner, hideBanner]);

  // Native banner is rendered by the OS overlay — no DOM element needed
  return null;
}

export default NativeBannerAd;
