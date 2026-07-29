import Script from 'next/script';

/**
 * Initializes Google Consent Mode v2 defaults via an inline script.
 *
 * MUST render BEFORE GoogleAnalytics in the component tree.
 * Uses strategy="afterInteractive" in root layout — loads early enough
 * to set consent defaults before any Google tags fire.
 *
 * The inline script is a static string constant (no user input / no XSS risk).
 *
 * Required for GDPR compliance in EU/EEA regions.
 * @see https://developers.google.com/tag-platform/security/guides/consent
 */

// Static consent initialization script — reads stored consent from localStorage
// and sets Google Consent Mode v2 defaults before any Google tags load.
// Content is a hardcoded constant — safe for dangerouslySetInnerHTML.
const CONSENT_INIT_SCRIPT = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
var stored = null;
try {
  var raw = localStorage.getItem('cookie-consent-v2');
  if (raw) stored = JSON.parse(raw);
} catch(e) {}
var ad = stored && stored.advertising ? 'granted' : 'denied';
var an = stored && stored.analytics ? 'granted' : 'denied';
gtag('consent', 'default', {
  ad_storage: ad,
  ad_user_data: ad,
  ad_personalization: ad,
  analytics_storage: an,
  functionality_storage: 'granted',
  personalization_storage: 'granted',
  security_storage: 'granted',
  wait_for_update: 500
});
`;

export function GoogleConsentMode() {
  return (
    <Script
      id="google-consent-mode"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: CONSENT_INIT_SCRIPT }}
    />
  );
}

export default GoogleConsentMode;
