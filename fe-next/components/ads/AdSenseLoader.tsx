'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
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

  if (!load) return null;

  const client = getAdSenseClient();
  return (
    <Script
      id="adsbygoogle-init"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`}
      strategy="afterInteractive"
      crossOrigin="anonymous"
    />
  );
}

export default AdSenseLoader;
