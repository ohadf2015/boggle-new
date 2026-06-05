/**
 * Families Policy — ad treatment derived from the user's social tier.
 *
 * Shares the same tier vocabulary as lib/families/socialPolicy.ts so ad gating
 * and social-feature gating can never drift apart. socialPolicy already treats
 * 'unknown' identically to 'child' for every social surface; this module brings
 * ad treatment into line after the v5740 Families Ad Format rejection.
 *
 * Three levers, by format:
 *
 *  1. shouldSuppressAdsForTier — the ALL-FORMAT hard gate. Only a declared child
 *     (COPPA "actual knowledge" of under-13) gets ZERO ads. Banners + opt-in
 *     rewarded keep serving unknown/adult (Families permits G-rated banners and
 *     opt-in rewarded), so the revenue core is intact.
 *
 *  2. shouldSuppressInterstitialForTier — interstitials (and IAP offers) are the
 *     format the rejection cites. They must not reach a user who MIGHT be a
 *     child, so only KNOWN adults see them; undeclared guests ('unknown') are
 *     treated as children here. The age gate flips a guest to 'adult' the moment
 *     they declare 13+, restoring interstitials.
 *
 *  3. resolveChildDirectedAdInit — the "Families Self-Certified Ads SDK" half of
 *     the rejection: child-directed treatment + TFUA for anyone not known to be
 *     an adult, and a G content-rating cap for the whole (children-inclusive)
 *     app. Passed to AdMob.initialize() — JS-deployable on this remote-URL
 *     Capacitor app because the v8 native plugin reads these options off the
 *     bridge.
 *
 * See docs/2026-06-05-families-ad-format-fix-spec.md and
 * docs/2026-06-04-families-policy-ads.md.
 */

// Type-only import keeps this module free of any runtime AdMob dependency
// (so it stays pure + trivially testable in node). The returned string value
// 'General' is exactly the enum's runtime value.
import type { MaxAdContentRating } from '@capacitor-community/admob';
import type { SocialTier } from './socialPolicy';

/** True when we must serve NO ads of any format (actual knowledge of a child). */
export function shouldSuppressAdsForTier(tier: SocialTier): boolean {
  return tier === 'child';
}

/**
 * True when interstitials (and IAP offers) must NOT be shown. Only a KNOWN adult
 * (declared 13+) may see them; child and undeclared-guest tiers are suppressed.
 */
export function shouldSuppressInterstitialForTier(tier: SocialTier): boolean {
  return tier !== 'adult';
}

/** Child-directed options for AdMob.initialize(). */
export interface ChildDirectedAdInit {
  tagForChildDirectedTreatment: boolean;
  tagForUnderAgeOfConsent: boolean;
  maxAdContentRating: MaxAdContentRating;
}

/**
 * Resolve the child-directed AdMob init config for a tier. Anyone not KNOWN to
 * be an adult is treated as child-directed (non-personalized + TFUA); the
 * content-rating cap is always General (G) since the Play listing includes
 * children.
 */
export function resolveChildDirectedAdInit(tier: SocialTier): ChildDirectedAdInit {
  const treatAsChild = tier !== 'adult';
  return {
    tagForChildDirectedTreatment: treatAsChild,
    tagForUnderAgeOfConsent: treatAsChild,
    // Runtime value of MaxAdContentRating.General; cast lets us stay type-only.
    maxAdContentRating: 'General' as MaxAdContentRating,
  };
}
