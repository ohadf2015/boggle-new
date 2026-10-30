/**
 * Direct Google AdSense (web) — load policy + site-ownership meta.
 *
 * HISTORY: this module used to drive a React Auto-Ads loader
 * (components/ads/AdSenseLoader.tsx). That loader was DELETED 2026-09-15
 * (kanban t_79e9fcc1): web AdSense was rejected, so adsbygoogle.js was 162 KiB
 * of first-paint main-thread cost with zero possible revenue. The rejected
 * publisher meta (`google-adsense-account` / ca-pub-1896836706464880) was then
 * stripped from app/layout.tsx (t_02e92b5a) — it was still in prod HTML with
 * zero revenue. Policy helpers remain so an approved NEW publisher id (env)
 * can reintroduce a loader without re-deriving the gates. Do not default to
 * the rejected pub. The live web ad path is ayeT / GameDistribution, not H5.
 *
 * Ships DARK: gated on `NEXT_PUBLIC_ADSENSE_ENABLED==='true'` so it cannot double-serve while
 * any legacy PurpleAds tag still exists. Flip on once PurpleAds is removed (GTM tag + ads.txt)
 * AND Auto-Ads is enabled in the AdSense dashboard. See docs/2026-06-08-web-adsense-direct-spec.md.
 *
 * Web only — native (Capacitor) uses AdMob; CrazyGames runs its own ads. Suppressed for the
 * child tier (Families/COPPA) and withheld entirely until advertising consent is granted
 * (Consent Mode v2: we fully gate the script, not just personalization).
 */
/**
 * The publisher whose *site review* for lexiclash.live was rejected ("Low value
 * content"). AdSense rejects a site, not the account: the re-review runs on this
 * same pub, so it is no longer filtered out of env (2026-10-30). It is still
 * never a code default — nothing ships unless env names a publisher.
 */
export const REJECTED_ADSENSE_PUBLISHER = 'ca-pub-1896836706464880';

const PUBLISHER_RE = /^ca-pub-\d{10,20}$/;

function sanitizeAdSenseClient(id: string | undefined): string {
  const v = id?.trim() ?? '';
  return PUBLISHER_RE.test(v) ? v : '';
}

/**
 * The AdSense client id (`ca-pub-…`). Env-only — no hardcoded publisher.
 * The previous default was REJECTED_ADSENSE_PUBLISHER (rejected account).
 *
 * Reads BOTH names: the deployment sets `NEXT_PUBLIC_ADSENSE_CLIENT_ID` while this module
 * originally read `NEXT_PUBLIC_ADSENSE_CLIENT`.
 */
export function getAdSenseClient(): string {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_ADSENSE_CLIENT) {
    return sanitizeAdSenseClient(process.env.NEXT_PUBLIC_ADSENSE_CLIENT);
  }
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID) {
    return sanitizeAdSenseClient(process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID);
  }
  return '';
}

/** What Auto-Ads actually placed on the page. */
export interface AdSenseFillSummary {
  /** Real `<ins class="adsbygoogle">` placements (Google's hidden anchor stub excluded). */
  units: number;
  /** Placements Google reported as `data-ad-status="filled"`. */
  filled: number;
  /** Placements that exist but carry no ad (unfilled, or still blank after the grace period). */
  unfilled: number;
}

/**
 * Audit what Auto-Ads placed. Loading `adsbygoogle.js` says nothing about whether a single
 * ad rendered — if the publisher id can't serve web inventory, or Auto-Ads is off for the
 * site, the script loads happily and places nothing. That failure mode is completely silent
 * and cost the web surface (~5x native session volume) two months of zero display revenue.
 *
 * `adsbygoogle-noablate` is Google's own hidden anchor placeholder (`display:none`), not a
 * placement — counting it would mask "zero ads" as "one unit".
 */
export function summarizeAdSenseFill(root: {
  querySelectorAll: (sel: string) => ArrayLike<Element>;
}): AdSenseFillSummary {
  const all = Array.from(root.querySelectorAll('ins.adsbygoogle'));
  const units = all.filter((el) => !el.classList.contains('adsbygoogle-noablate'));
  const filled = units.filter((el) => el.getAttribute('data-ad-status') === 'filled').length;
  return { units: units.length, filled, unfilled: units.length - filled };
}

/**
 * The `<meta name="google-adsense-account">` content if (and only if) env names a
 * publisher id. The root layout emits it only then: it is ~60 bytes of HTML and
 * loads no script, and it lets AdSense confirm site ownership for a re-review.
 * (t_02e92b5a removed a *hardcoded* meta; this one is env-only, off by default.)
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
  /**
   * The current route is an ad-free surface (education / teacher / student /
   * classroom lobby / admin — see `isAdFreeRoute`). Auto-Ads is page-wide once
   * the script is in the document, so the script must not be injected there.
   */
  adFreeRoute?: boolean;
}): boolean {
  return (
    ctx.enabled &&
    ctx.hasAdConsent &&
    !ctx.isNative &&
    !ctx.isCrazyGames &&
    !ctx.suppressedByTier &&
    !ctx.onboardingActive &&
    !ctx.adFreeRoute
  );
}
