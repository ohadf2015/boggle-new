import { describe, it, expect } from 'vitest';
import { shouldSuppressAdsForTier } from './adPolicy';

/**
 * Families Policy — ad treatment.
 *
 * COPPA "actual knowledge" rule: the moment a user self-declares an under-13
 * birth year we KNOW we have a child on the device, so we must not serve them
 * (personalized) ads. We suppress ads entirely for that tier — the simplest
 * unambiguously-compliant treatment, and it needs no native init flags.
 *
 * We do NOT suppress for the 'unknown' tier: an undeclared guest is not actual
 * knowledge of a child, so general ad treatment (matching a mixed-audience
 * Play declaration) stays correct and the 15-40 revenue core is untouched.
 */
describe('shouldSuppressAdsForTier', () => {
  it('suppresses ads for a known child (actual knowledge of under-13)', () => {
    expect(shouldSuppressAdsForTier('child')).toBe(true);
  });

  it('serves ads to adults', () => {
    expect(shouldSuppressAdsForTier('adult')).toBe(false);
  });

  it('serves ads to unknown-age users (no actual knowledge of a child)', () => {
    expect(shouldSuppressAdsForTier('unknown')).toBe(false);
  });
});
