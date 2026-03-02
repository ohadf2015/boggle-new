'use client';

import { useEffect } from 'react';
import { initGoogleConsentMode } from '@/utils/cookieConsent';

/**
 * Initializes Google Consent Mode v2 defaults.
 *
 * MUST render BEFORE GoogleAnalytics and GoogleAdSense in the component tree.
 * Sets consent defaults to "denied" until user interacts with cookie banner,
 * then CookieConsent updates consent state via gtag('consent', 'update', ...).
 *
 * Required for AdSense approval in EU/EEA regions.
 * @see https://developers.google.com/tag-platform/security/guides/consent
 */
export function GoogleConsentMode() {
  useEffect(() => {
    initGoogleConsentMode();
  }, []);

  return null;
}

export default GoogleConsentMode;
