'use client';

import { useState, useEffect } from 'react';
import Script from 'next/script';
import { ADSENSE_PUBLISHER_ID } from '@/lib/adsense';

/**
 * Google AdSense script loader.
 *
 * Always loads in production — Consent Mode v2 controls ad personalization.
 * When consent is denied, Google still serves non-personalized ads,
 * preserving revenue while respecting user privacy.
 *
 * Skipped in development, on localhost, and inside native WebView apps.
 *
 * @see /components/GoogleConsentMode.tsx for consent defaults
 * @see /components/CookieConsent.tsx for consent management
 */
export function GoogleAdSense() {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Skip AdSense in development
    if (process.env.NODE_ENV === 'development') return;
    // Only check in browser — avoids SSR rendering the script for native WebViews
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return;

     
    if ((window as any).Capacitor?.isNativePlatform?.()) return;

    setShouldRender(true);
  }, []);

  if (!shouldRender) return null;

  return (
    <>
      <Script
        id="google-adsense"
        async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`}
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
      <Script id="ad-placement-init" strategy="afterInteractive">
        {`window.adsbygoogle = window.adsbygoogle || [];
          window.adBreak = window.adConfig = function(o) { adsbygoogle.push(o); };`}
      </Script>
    </>
  );
}

export default GoogleAdSense;
