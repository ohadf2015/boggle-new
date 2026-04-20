'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAdMob } from '@/hooks/useAdMob';

/**
 * Shows an AdMob banner ad on native (Capacitor) platforms.
 * Renders a spacer div on native so the OS-layer overlay doesn't cover content.
 * Returns null on web. Automatically shows on mount and hides on unmount.
 */
export function NativeBannerAd() {
  const { showBanner, hideBanner } = useAdMob();
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    showBanner();
    return () => { hideBanner(); };
  }, [showBanner, hideBanner]);

  if (!isNative) return null;

  return <div style={{ height: 60 }} aria-hidden="true" />;
}

export default NativeBannerAd;
