'use client';

import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useSafeArea } from '@/hooks/useSafeArea';
import { AdPlaceholder } from './AdPlaceholder';
import { bannerController, BANNER_OWNER } from '@/lib/native/bannerController';
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
  const safeArea = useSafeArea();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const el = slotRef.current;
    if (!el) return;

    let cancelled = false;
    let currentMargin = -1; // -1 = no active slot request

    // Declare the in-flow slot's intent — BUT only while the slot is actually
    // on-screen. A native banner paints at BOTTOM_CENTER lifted by `margin`, so
    // it overlaps the slot's footprint ONLY when that footprint is inside the
    // viewport. When the slot is below the fold (tall results page) the old
    // `max(0, innerHeight - bottom)` clamped to 0, degrading the "in-flow" banner
    // into a viewport-bottom overlay that covered whatever fixed CTA sat there
    // (the results-screen occlusion). So instead of pinning to the bottom, we
    // WITHDRAW the slot's request when it isn't visible; the coordinator falls
    // back to the anchor (if it wants the banner) or shows nothing. The banner
    // therefore only ever appears where it genuinely reserves space.
    const apply = () => {
      if (cancelled) return;
      const rect = el.getBoundingClientRect();
      // Footprint fully within the viewport: bottom not past the fold, and the
      // banner's top (bottom − height) not scrolled above the top.
      const onScreen = rect.bottom <= window.innerHeight && rect.bottom >= reservedHeight;
      if (!onScreen) {
        if (currentMargin !== -1) {
          currentMargin = -1;
          void bannerController.clearRequest(BANNER_OWNER.slot.key);
        }
        return;
      }
      const isAndroid = Capacitor.getPlatform() === 'android';
      // Android SDK already adds the safe-area offset, so subtract it so the
      // banner lines up with the slot rather than sitting above it.
      const safeBottom = isAndroid ? safeArea.bottom || 0 : 0;
      const margin = Math.max(0, window.innerHeight - rect.bottom - safeBottom);
      if (margin === currentMargin) return; // cheap local dedup before the coordinator's
      currentMargin = margin;
      void bannerController.setRequest(BANNER_OWNER.slot.key, {
        margin,
        variant,
        priority: BANNER_OWNER.slot.priority,
      });
    };

    apply();
    window.addEventListener('resize', apply, { passive: true });
    window.addEventListener('scroll', apply, { passive: true });

    return () => {
      cancelled = true;
      window.removeEventListener('resize', apply);
      window.removeEventListener('scroll', apply);
      // Release the slot — the coordinator falls back to the anchor (if it wants
      // the banner) instead of leaving the screen blank.
      void bannerController.clearRequest(BANNER_OWNER.slot.key);
    };
  }, [safeArea.bottom, variant, reservedHeight]);

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
