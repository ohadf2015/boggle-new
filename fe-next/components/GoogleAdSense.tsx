'use client';

import Script from 'next/script';

const ADSENSE_CLIENT_ID = 'ca-pub-1896836706464880';

/**
 * Google AdSense component
 *
 * Loads the AdSense script with async loading strategy to prevent
 * blocking page render. The client ID is configured for the LexiClash
 * AdSense account.
 *
 * Note: Actual ad units are rendered via the AdPlaceholder component
 * in AdSense-compliant zones (lobby, between-rounds, content pages).
 *
 * @see /components/ads/AdPlaceholder.tsx for ad placement zones
 * @see /docs/ADSENSE_COMPLIANCE.md for compliance guidelines
 */
export function GoogleAdSense() {
  // Skip AdSense in development to avoid policy violations
  if (process.env.NODE_ENV === 'development') {
    return null;
  }

  // Don't load AdSense on localhost
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return null;
  }

  return (
    <Script
      id="google-adsense"
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
      crossOrigin="anonymous"
      strategy="lazyOnload"
    />
  );
}

export default GoogleAdSense;
