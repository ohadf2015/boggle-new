/**
 * Families Policy — ad treatment derived from the user's social tier.
 *
 * Shares the same tier vocabulary as lib/families/socialPolicy.ts so ad gating
 * and social-feature gating can never drift apart.
 *
 * COPPA "actual knowledge": once a user self-declares an under-13 birth year we
 * have actual knowledge of a child on the device. Serving that child
 * (personalized) ads is a violation regardless of the Play Console target-
 * audience declaration. We suppress ads outright for that tier — the simplest
 * unambiguously-compliant treatment, and one that needs no native init flags
 * (important: this app is a remote-URL Capacitor shell, so the lever is JS).
 *
 * We deliberately do NOT suppress for 'unknown': an undeclared guest is not
 * actual knowledge of a child, so general ad treatment stays correct and the
 * 15-40 revenue core is untouched. Blanket app-level child-directed tagging
 * would instead falsely signal the WHOLE app is child-directed, contradicting
 * the listing — see docs/2026-06-04-families-policy-ads.md.
 */

import type { SocialTier } from './socialPolicy';

/** True when we must NOT serve ads to this tier (actual knowledge of a child). */
export function shouldSuppressAdsForTier(tier: SocialTier): boolean {
  return tier === 'child';
}
