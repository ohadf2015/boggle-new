'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Capacitor } from '@capacitor/core';
import { InlineBannerAd } from '@/components/ads';
import { useMobilePortrait } from '@/hooks/useMobilePortrait';

const CrazyGamesBanner = dynamic(() => import('@/components/CrazyGamesBanner'), { ssr: false });

/**
 * The homepage's in-content web ad slot, moved between sections 5 and 6 on the
 * fresh page (not deleted). Same rules as the returning tree's slot: space is
 * reserved in SSR (hidden/sm:block, no JS viewport branch → no CLS), nothing on
 * native (it would hijack the anchored native banner), and the ad itself
 * mounts only after hydration.
 */
export function FreshAdSlot() {
  const isMobilePortrait = useMobilePortrait();
  const [isNativeApp, setIsNativeApp] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setIsNativeApp(Capacitor.isNativePlatform());
    setMounted(true);
  }, []);

  if (isNativeApp) return null;
  return (
    <div className="mx-auto hidden min-h-[122px] w-full max-w-4xl px-4 sm:block sm:px-6 lg:px-8">
      {mounted && !isMobilePortrait && (
        <>
          <InlineBannerAd webZone="menu" className="my-4" />
          <CrazyGamesBanner size="728x90" className="my-4" />
        </>
      )}
    </div>
  );
}
