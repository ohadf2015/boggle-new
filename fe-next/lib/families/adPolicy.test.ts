import { describe, it, expect } from 'vitest';
import {
  shouldSuppressAdsForTier,
  shouldSuppressInterstitialForTier,
  resolveChildDirectedAdInit,
} from './adPolicy';

/**
 * Families Policy — ad treatment.
 *
 * `shouldSuppressAdsForTier` is the ALL-FORMAT hard gate (zero ads). Only an
 * actual, declared child triggers it — banners + opt-in rewarded keep serving
 * unknown/adult (Families permits G-rated banners and opt-in rewarded).
 */
describe('shouldSuppressAdsForTier', () => {
  it('suppresses ALL ads for a known child (actual knowledge of under-13)', () => {
    expect(shouldSuppressAdsForTier('child')).toBe(true);
  });

  it('serves ads to adults', () => {
    expect(shouldSuppressAdsForTier('adult')).toBe(false);
  });

  it('still serves banners/rewarded to unknown-age users (G-rated, non-personalized)', () => {
    expect(shouldSuppressAdsForTier('unknown')).toBe(false);
  });
});

/**
 * Families Ad Format Requirements: interstitials (and IAP offers) must not reach
 * a user who might be a child. Only KNOWN adults see them; an undeclared guest
 * ('unknown') is treated as a child for this format — matching how socialPolicy
 * already treats 'unknown' for every social surface. This is the gap that caused
 * the v5740 rejection.
 */
describe('shouldSuppressInterstitialForTier', () => {
  it('suppresses interstitials for a known child', () => {
    expect(shouldSuppressInterstitialForTier('child')).toBe(true);
  });

  it('suppresses interstitials for undeclared guests (could be a child)', () => {
    expect(shouldSuppressInterstitialForTier('unknown')).toBe(true);
  });

  it('serves interstitials to known adults (declared 13+)', () => {
    expect(shouldSuppressInterstitialForTier('adult')).toBe(false);
  });
});

/**
 * Child-directed SDK config passed to AdMob.initialize() — the
 * "Families Self-Certified Ads SDK" half of the rejection. Every user we don't
 * KNOW is an adult is treated as child-directed (non-personalized, TFUA).
 * `maxAdContentRating` follows the tier: G for anyone who might be a child, Teen
 * for known adults. The app EXITED the Families program on 2026-06-08 (Play
 * target age is 13-15 / 16-17 / 18+, AdMob console is capped at TEEN account-wide
 * — see .claude/notes/android-release-status.md), so a blanket G cap no longer
 * matches the listing and only starves the auction.
 */
describe('resolveChildDirectedAdInit', () => {
  it('tags child-directed + under-age-of-consent for a known child', () => {
    expect(resolveChildDirectedAdInit('child')).toEqual({
      tagForChildDirectedTreatment: true,
      tagForUnderAgeOfConsent: true,
      maxAdContentRating: 'General',
    });
  });

  it('tags child-directed + under-age-of-consent for undeclared guests', () => {
    expect(resolveChildDirectedAdInit('unknown')).toEqual({
      tagForChildDirectedTreatment: true,
      tagForUnderAgeOfConsent: true,
      maxAdContentRating: 'General',
    });
  });

  it('does NOT child-direct known adults and caps their content rating at Teen', () => {
    expect(resolveChildDirectedAdInit('adult')).toEqual({
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
      maxAdContentRating: 'Teen',
    });
  });
});
