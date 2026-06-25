/**
 * Direct Google AdSense (web) — load policy.
 *
 * Replaces the externally-injected PurpleAds managed layer with a direct, in-repo AdSense
 * integration under our own publisher id (`google.com, pub-1896836706464880, DIRECT` in
 * ads.txt). Pure + testable; the React loader (components/ads/AdSenseLoader.tsx) consults it.
 *
 * Ships DARK: gated on `NEXT_PUBLIC_ADSENSE_ENABLED==='true'` so it cannot double-serve while
 * any legacy PurpleAds tag still exists. Flip on once PurpleAds is removed (GTM tag + ads.txt)
 * AND Auto-Ads is enabled in the AdSense dashboard. See docs/2026-06-08-web-adsense-direct-spec.md.
 *
 * Web only — native (Capacitor) uses AdMob; CrazyGames runs its own ads. Suppressed for the
 * child tier (Families/COPPA) and withheld entirely until advertising consent is granted
 * (Consent Mode v2: we fully gate the script, not just personalization).
 */
const DEFAULT_ADSENSE_CLIENT = 'ca-pub-1896836706464880';

/** The AdSense client id (`ca-pub-…`). Defaults to our direct publisher id; env-overridable. */
export function getAdSenseClient(): string {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_ADSENSE_CLIENT) {
    return process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  }
  return DEFAULT_ADSENSE_CLIENT;
}

/**
 * The `<meta name="google-adsense-account">` content — Google's privacy-neutral
 * site-ownership signal (no script, no cookie, no tracking). Rendered UNCONDITIONALLY
 * in the root layout: it must verify the site even while ad serving is dark, because
 * the AdSense review crawler never grants cookie consent and so never triggers the
 * consent-gated adsbygoogle.js loader. Without this tag the crawler cannot connect
 * the domain to the publisher account, blocking (re-)approval.
 */
export function getAdSenseAccountMeta(): string {
  return getAdSenseClient();
}

/** True only when explicitly enabled (and a client id exists). Dark by default. */
export function isAdSenseConfigured(): boolean {
  return (
    typeof process !== 'undefined' &&
    process.env.NEXT_PUBLIC_ADSENSE_ENABLED === 'true' &&
    getAdSenseClient() !== ''
  );
}

/** Whether to inject the AdSense script for this context. All conditions must hold. */
export function shouldLoadAdSense(ctx: {
  enabled: boolean;
  hasAdConsent: boolean;
  isNative: boolean;
  isCrazyGames: boolean;
  suppressedByTier: boolean;
  /**
   * The FTUE onboarding overlay is open. Onboarding is the highest-leverage
   * conversion funnel; an anchored Auto-Ads banner there covers the primary CTA
   * and reads as aggressive monetization before any value is delivered. Industry
   * standard is an ad-free registration/onboarding flow — so we withhold the
   * script entirely until onboarding completes. (Onboarding mounts before the
   * consent-gated, afterInteractive adsbygoogle.js would load on first run, so in
   * practice the script never injects during the FTUE.)
   */
  onboardingActive?: boolean;
}): boolean {
  return (
    ctx.enabled &&
    ctx.hasAdConsent &&
    !ctx.isNative &&
    !ctx.isCrazyGames &&
    !ctx.suppressedByTier &&
    !ctx.onboardingActive
  );
}
