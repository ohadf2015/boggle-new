'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { isAllowedAdBannerRoute } from '@/lib/admob-routes';
import { isMonetagAllowedSurface } from '@/lib/ads/monetagAds';
import {
  shouldShowMonetagWebBanner,
  isMonetagBannerConfigured,
  loadMonetagBannerSdk,
} from '@/lib/ads/monetagBanner';
import { useSocialCapabilities } from '@/hooks/useSocialCapabilities';
import { shouldSuppressAdsForTier } from '@/lib/families/adPolicy';

/**
 * MonetagWebBanner — the WEB analog of the native AdMob anchored banner
 * (AnchoredNativeBanner). On web we let Monetag's own anchored/in-page banner
 * format position itself, so this renders nothing — it only decides WHEN the
 * banner zone may load, mirroring the native banner's gates:
 *   web top-frame · allowed route · not suppressed · not declared-child.
 *
 * Ships dark until NEXT_PUBLIC_MONETAG_BANNER_ZONE_ID (+ the enabled flag) is set
 * to a real BANNER zone — see lib/ads/monetagBanner.ts.
 */

/** Mirrors the native bannerController suppression signals (drawer/modal/onboarding/in-game). */
function isBannerSuppressed(): boolean {
  if (typeof document === 'undefined') return false;
  const html = document.documentElement;
  const body = document.body;
  return (
    html.classList.contains('mobile-drawer-open') ||
    html.classList.contains('modal-open') ||
    html.classList.contains('onboarding-active') ||
    (body?.classList.contains('screen-fit-locked') ?? false)
  );
}

export default function MonetagWebBanner() {
  const pathname = usePathname();
  const { tier } = useSocialCapabilities();
  const childTier = shouldSuppressAdsForTier(tier);
  const [suppressed, setSuppressed] = useState(false);

  // Re-evaluate suppression when a drawer/modal/onboarding/in-game class toggles.
  useEffect(() => {
    const update = () => setSuppressed(isBannerSuppressed());
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    if (document.body) obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // location.search (not useSearchParams) keeps this null-render mount from
    // forcing client-side rendering on every static page — `classroom` is fixed
    // at page entry, same rationale as AnchoredNativeBanner.
    const search = new URLSearchParams(window.location.search);
    const show = shouldShowMonetagWebBanner({
      enabled: isMonetagBannerConfigured(),
      surfaceAllowed: isMonetagAllowedSurface(),
      routeAllowed: isAllowedAdBannerRoute(pathname, search),
      suppressed,
      childTier,
    });
    if (show) {
      // Idempotent: injects the banner zone once; the format auto-displays.
      void loadMonetagBannerSdk().catch(() => {});
    }
  }, [pathname, suppressed, childTier]);

  return null;
}
