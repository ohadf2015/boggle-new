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
  const [isTestMode, setIsTestMode] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') return;
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return;

    if ((window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()) return;

    const isProdHost = hostname === 'lexiclash.live' || hostname === 'www.lexiclash.live';
    setIsTestMode(!isProdHost);
    setShouldRender(true);
  }, []);

  if (!shouldRender) return null;

  return (
    <>
      <Script id="ad-placement-shim" strategy="afterInteractive">
        {`window.adsbygoogle = window.adsbygoogle || [];
          window.adBreak = window.adConfig = function(o) { window.adsbygoogle.push(o); };`}
      </Script>
      <Script
        id="google-adsense"
        async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`}
        crossOrigin="anonymous"
        strategy="afterInteractive"
        data-ad-client={ADSENSE_PUBLISHER_ID}
        data-ad-frequency-hint="30s"
        {...(isTestMode ? { 'data-adbreak-test': 'on' } : {})}
      />
    </>
  );
}

export default GoogleAdSense;
