'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useSocialCapabilities } from '@/hooks/useSocialCapabilities';
import { useOnboardingActive } from '@/hooks/useOnboardingActive';
import { shouldSuppressAdsForTier } from '@/lib/families/adPolicy';
import { hasConsent, onConsentChange } from '@/utils/cookieConsent';
import { getAdSenseClient, isAdSenseConfigured, shouldLoadAdSense } from '@/lib/ads/adSensePolicy';

/**
 * Direct Google AdSense (Auto-Ads) loader for the WEB app — replaces the externally-injected
 * PurpleAds layer. Injects the official adsbygoogle.js for our publisher id; with Auto-Ads
 * enabled in the AdSense dashboard, Google then auto-places display units page-wide (no manual
 * slot ids needed). For specific placements, add manual <ins class="adsbygoogle"> units later.
 *
 * Renders nothing unless: the integration is enabled (NEXT_PUBLIC_ADSENSE_ENABLED — dark by
 * default), advertising consent is granted (Consent Mode v2 — reactive), it's the web (not
 * native/CrazyGames), and the user isn't a known child. Mounted once in app/[locale]/layout.tsx.
 */
export function AdSenseLoader() {
  const { tier } = useSocialCapabilities();
  const crazyGames = useCrazyGames();
  const onboardingActive = useOnboardingActive();
  const [adConsent, setAdConsent] = useState(false);

  useEffect(() => {
    // Read once on mount (client-only — SSR has no consent), then stay reactive.
    setAdConsent(hasConsent('advertising'));
    return onConsentChange((state) => setAdConsent(state.advertising));
  }, []);

  const load = shouldLoadAdSense({
    enabled: isAdSenseConfigured(),
    hasAdConsent: adConsent,
    isNative: Capacitor.isNativePlatform(),
    isCrazyGames: crazyGames?.isOnCrazyGamesPlatform === true,
    suppressedByTier: shouldSuppressAdsForTier(tier),
    // Keep the FTUE ad-free: withhold the script while the onboarding overlay is up.
    onboardingActive,
  });

  // Inject the AdSense loader as a plain <script> instead of next/script.
  // next/script stamps a `data-nscript` attribute on the tag, which AdSense's
  // adsbygoogle.js rejects ("AdSense head tag doesn't support the data-nscript
  // attribute" — a Sentry warning). A raw async script tag is the integration
  // Google documents. Idempotent (id guard) and consent-gated via `load`.
  useEffect(() => {
    if (!load) return;
    const client = getAdSenseClient();
    if (!client) return;
    if (document.getElementById('adsbygoogle-init')) return;
    const s = document.createElement('script');
    s.id = 'adsbygoogle-init';
    s.async = true;
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
    s.crossOrigin = 'anonymous';
    document.head.appendChild(s);
  }, [load]);

  return null;
}

export default AdSenseLoader;
