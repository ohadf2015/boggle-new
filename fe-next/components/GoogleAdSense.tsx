'use client';

import { useState, useEffect } from 'react';
import Script from 'next/script';
import { hasConsent, onConsentChange } from '@/utils/cookieConsent';

const ADSENSE_CLIENT_ID = 'ca-pub-1896836706464880';

/**
 * Google AdSense component — consent-gated.
 *
 * Only loads the AdSense script when:
 * 1. User has granted advertising consent via cookie banner
 * 2. Not in development / localhost
 *
 * Uses Google Consent Mode v2 — even when script loads, ad personalization
 * is controlled by consent state (non-personalized ads when denied).
 *
 * @see /components/CookieConsent.tsx for consent management
 * @see /utils/cookieConsent.ts for Google Consent Mode v2
 */
export function GoogleAdSense() {
  const [allowed, setAllowed] = useState(() => hasConsent('advertising'));

  useEffect(() => {
    return onConsentChange((state) => {
      setAllowed(state.advertising);
    });
  }, []);

  // Skip AdSense in development
  if (process.env.NODE_ENV === 'development') return null;

  // Don't load on localhost
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') return null;

  // Don't load without advertising consent
  if (!allowed) return null;

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
