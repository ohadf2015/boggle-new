'use client';

import Script from 'next/script';
import { ADSENSE_PUBLISHER_ID } from '@/lib/adsense';

/**
 * Google AdSense script loader.
 *
 * Always loads in production — Consent Mode v2 controls ad personalization.
 * When consent is denied, Google still serves non-personalized ads,
 * preserving revenue while respecting user privacy.
 *
 * Skipped only in development / localhost to avoid console errors.
 *
 * @see /components/GoogleConsentMode.tsx for consent defaults
 * @see /components/CookieConsent.tsx for consent management
 */
export function GoogleAdSense() {
  // Skip AdSense in development
  if (process.env.NODE_ENV === 'development') return null;

  // Don't load on localhost
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') return null;

  return (
    <Script
      id="google-adsense"
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`}
      crossOrigin="anonymous"
      strategy="lazyOnload"
    />
  );
}

export default GoogleAdSense;
