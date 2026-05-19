'use client';

import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { BannerAdPosition } from '@capacitor-community/admob';
import { useAdMob } from '@/hooks/useAdMob';
import { useSafeArea } from '@/hooks/useSafeArea';
import { AdPlaceholder } from './AdPlaceholder';
import type { BannerVariant } from '@/lib/admob-config';

interface InlineBannerAdProps {
  /** Zone label used for the dev-only web placeholder. */
  webZone?: 'lobby' | 'between-rounds' | 'content-page' | 'post-game' | 'menu';
  /** Reserved height (px) for the native overlay slot. Matches adaptive banner height. */
  reservedHeight?: number;
  /** Banner unit variant — 'game' (in-flow) or 'content' (results/hub/non-game). */
  variant?: BannerVariant;
  className?: string;
}

/**
 * InlineBannerAd — page-level banner slot. On native platforms it reserves a
 * fixed-height placeholder and positions the AdMob banner so it visually sits
 * on top of the slot (plugin banners are native overlays and cannot be placed
 * in-flow). On web it renders the dev-only AdPlaceholder (null in production).
 */
export default function InlineBannerAd({
  webZone = 'content-page',
  reservedHeight = 60,
  variant = 'game',
  className,
}: InlineBannerAdProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const { showBanner, hideBanner } = useAdMob();
  const safeArea = useSafeArea();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const el = slotRef.current;
    if (!el) return;

    let cancelled = false;
    let currentMargin = -1;

    const computeMargin = () => {
      const rect = el.getBoundingClientRect();
      // Distance from the slot's bottom to the viewport's bottom — plugin's
      // `margin` lifts the banner by this many px from the webview bottom.
      const distanceFromBottom = Math.max(0, window.innerHeight - rect.bottom);
      const isAndroid = Capacitor.getPlatform() === 'android';
      const safeBottom = isAndroid ? safeArea.bottom || 0 : 0;
      // Android SDK already adds the safe-area offset, so subtract it so the
      // banner lines up with the slot rather than sitting above it.
      return Math.max(0, distanceFromBottom - safeBottom);
    };

    const show = async () => {
      if (cancelled) return;
      const margin = computeMargin();
      if (margin === currentMargin) return;
      currentMargin = margin;
      await hideBanner();
      if (cancelled) return;
      await showBanner(BannerAdPosition.BOTTOM_CENTER, margin, { variant });
      // Final reconcile: if cleanup ran during showBanner (route change mid-
      // flight), explicitly hide. Otherwise the plugin paints the banner on
      // the destination — visible on game routes that disallow banners.
      if (cancelled) await hideBanner();
    };

    void show();
    window.addEventListener('resize', show, { passive: true });
    window.addEventListener('scroll', show, { passive: true });

    return () => {
      cancelled = true;
      window.removeEventListener('resize', show);
      window.removeEventListener('scroll', show);
      void hideBanner();
    };
  }, [showBanner, hideBanner, safeArea.bottom, variant]);

  // Native: reserved slot (banner overlays this div's footprint).
  // Slot gets neo-navy bg so the gap stays brand-themed when:
  //   1. AdMob native banner view paints a white loading rect before fetch
  //      resolves — until then, only the slot's bg is visible.
  //   2. AdMob fails to fill (no-fill / network / mediation miss) — slot
  //      remains visible with no overlay. Without bg, OS chrome can leak
  //      white through the bottom safe-area band.
  if (Capacitor.isNativePlatform()) {
    return (
      <div
        ref={slotRef}
        aria-hidden
        className={className}
        style={{ height: reservedHeight, width: '100%', backgroundColor: 'var(--neo-navy)' }}
        data-ad-slot="inline-banner"
      />
    );
  }

  // Web: dev-only placeholder (null in production).
  return <AdPlaceholder zone={webZone} className={className} />;
}
