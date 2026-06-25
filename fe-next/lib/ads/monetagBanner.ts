/**
 * Monetag WEB banner — the web-surface analog of the native AdMob anchored
 * banner (see components/ads/AnchoredNativeBanner.tsx). On web we can't composite
 * a native view, so we use Monetag's own "In-Page Push (Banner)" native-style
 * format. In-Page Push uses a DIFFERENT loader than the rewarded path (rewarded =
 * libtl.com/sdk.js + show_<id>(); In-Page Push = a per-zone smart-domain
 * /tag.min.js that auto-displays). It positions the overlay itself, so unlike
 * the native banner there is NO reserved-space CSS var — a floating overlay
 * occupies no layout.
 *
 * Ships DARK until a real banner zone id is configured (the popunder/MultiTag
 * rewarded zone is NOT a banner — wiring it here would fire popunders on click).
 * Create a banner/in-page zone in the Monetag dashboard and set
 * NEXT_PUBLIC_MONETAG_BANNER_ZONE_ID to go live.
 *
 * Gating (defense-in-depth, all must hold):
 *   - enabled        — NEXT_PUBLIC_MONETAG_ADS_ENABLED=true AND a zone id is set
 *   - surfaceAllowed — web top-frame only (never native app / portal iframe)
 *   - routeAllowed   — same allowlist as the native banner (no gameplay routes)
 *   - !suppressed    — no open drawer / modal / onboarding / in-game lock
 *   - !childTier     — declared under-13 get ZERO ads (Families policy)
 */

import { isNative } from '@/utils/platform';

const SCRIPT_ID = 'monetag-banner-sdk';
// In-Page Push uses a per-zone "smart" domain loader (NOT libtl.com/sdk.js — that's
// the rewarded path). The domain rotates to dodge adblock; if Monetag rotates it,
// update this AND the CSP script-src in next.config.mjs. Override via env if needed.
const SCRIPT_SRC =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_MONETAG_BANNER_SRC) ||
  'https://nap5k.com/tag.min.js';

/** Resolve the configured Monetag BANNER zone id. Empty = stay dark. */
export function getMonetagBannerZoneId(): string {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_MONETAG_BANNER_ZONE_ID) {
    return process.env.NEXT_PUBLIC_MONETAG_BANNER_ZONE_ID;
  }
  return '';
}

/** Master web-ads enable flag (shared with the rewarded path). */
export function isMonetagAdsEnabled(): boolean {
  return typeof process !== 'undefined' && process.env.NEXT_PUBLIC_MONETAG_ADS_ENABLED === 'true';
}

/** True iff the banner is configured to run at all (flag + zone id present). */
export function isMonetagBannerConfigured(): boolean {
  return isMonetagAdsEnabled() && getMonetagBannerZoneId() !== '';
}

export interface MonetagBannerGateInput {
  /** flag + zone id present (isMonetagBannerConfigured) */
  enabled: boolean;
  /** web top-frame only (isMonetagAllowedSurface) */
  surfaceAllowed: boolean;
  /** route permits a banner (isAllowedAdBannerRoute) */
  routeAllowed: boolean;
  /** an open drawer / modal / onboarding / in-game lock hides the banner */
  suppressed: boolean;
  /** declared under-13 → zero ads (Families policy, shouldSuppressAdsForTier) */
  childTier: boolean;
}

/**
 * The single source of truth for whether the web banner may render right now.
 * Pure — all environment/DOM signals are passed in so it's trivially testable.
 */
export function shouldShowMonetagWebBanner(i: MonetagBannerGateInput): boolean {
  return i.enabled && i.surfaceAllowed && i.routeAllowed && !i.suppressed && !i.childTier;
}

let loadPromise: Promise<void> | null = null;

/**
 * Idempotent: inject the In-Page Push tag for the BANNER zone once (its own script
 * id, independent of the rewarded zone's `monetag-sdk` tag — different loader
 * domains, so they coexist). Resolves on load. The In-Page Push format auto-displays
 * on load; no `show_<id>()` call is required.
 */
export function loadMonetagBannerSdk(zoneId: string = getMonetagBannerZoneId()): Promise<void> {
  if (typeof window === 'undefined' || isNative() || !zoneId) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = SCRIPT_SRC;
    script.dataset.zone = zoneId;
    // In-Page Push auto-displays on load — no data-sdk / show_<id>() call.
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => {
      loadPromise = null;
      reject(new Error('monetag-banner-script-error'));
    }, { once: true });
    (document.body || document.documentElement).appendChild(script);
  });

  return loadPromise;
}

/** Reset module state. Test-only. */
export function __resetMonetagBannerForTests(): void {
  loadPromise = null;
}
