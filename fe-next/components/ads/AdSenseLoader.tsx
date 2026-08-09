'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useSocialCapabilities } from '@/hooks/useSocialCapabilities';
import { useOnboardingActive } from '@/hooks/useOnboardingActive';
import { shouldSuppressAdsForTier } from '@/lib/families/adPolicy';
import { hasConsent, onConsentChange } from '@/utils/cookieConsent';
import { trackGrowthEvent } from '@/utils/growthTracking';
import {
  getAdSenseClient,
  isAdSenseConfigured,
  shouldLoadAdSense,
  summarizeAdSenseFill,
} from '@/lib/ads/adSensePolicy';

/** Grace period for Auto-Ads to scan the page and place units before we audit. */
const FILL_AUDIT_DELAY_MS = 12_000;

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

  // Loading adsbygoogle.js proves NOTHING about revenue: if the publisher id can't
  // serve web inventory, or Auto-Ads is off for the site, the script loads fine and
  // places zero units. That silent no-op ran from 2026-06-08 (PurpleAds removed →
  // direct AdSense) with the whole web surface — ~5x the native session volume —
  // monetizing at ₪0, and no signal anywhere. Audit once per load so it can't
  // happen again unnoticed. `units: 0` = Auto-Ads placed nothing at all.
  useEffect(() => {
    if (!load) return;
    const timer = setTimeout(() => {
      trackGrowthEvent('web_ads_fill_audit', {
        ...summarizeAdSenseFill(document),
        client: getAdSenseClient(),
        // Auto-Ads legitimately places nothing on some routes, so a bare stream of
        // `units: 0` can't distinguish "AdSense is dead" from "no placement here".
        path: window.location.pathname,
      });
    }, FILL_AUDIT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [load]);

  return null;
}

export default AdSenseLoader;
