import { describe, it, expect } from 'vitest';
import { shouldShowStylePopup } from './shouldShowStylePopup';

const base = {
  isMounted: true,
  featureEnabled: true,
  isAuthenticated: false,
  needsProfileCustomization: false,
  profileShownAt: null as string | null,
  profileStyle: null as string | null,
  guestShown: false,
  guestOnboardingDone: true,
};

describe('shouldShowStylePopup', () => {
  it('never shows before mount (hydration safety)', () => {
    expect(shouldShowStylePopup({ ...base, isMounted: false })).toBe(false);
  });

  it('never shows when the feature is disabled (non-admin during testing)', () => {
    expect(shouldShowStylePopup({ ...base, featureEnabled: false })).toBe(false);
    expect(shouldShowStylePopup({ ...base, featureEnabled: false, isAuthenticated: true })).toBe(false);
  });

  it('defers to the profile-customization modal when that is pending', () => {
    expect(shouldShowStylePopup({ ...base, needsProfileCustomization: true })).toBe(false);
  });

  describe('authenticated', () => {
    const authed = { ...base, isAuthenticated: true };
    it('shows once when the popup was never shown and no style chosen', () => {
      expect(shouldShowStylePopup(authed)).toBe(true);
    });
    it('does not show after it was already shown', () => {
      expect(shouldShowStylePopup({ ...authed, profileShownAt: '2026-06-12T00:00:00Z' })).toBe(false);
    });
    it('does not show if the user already has a style (chose elsewhere)', () => {
      expect(shouldShowStylePopup({ ...authed, profileStyle: 'rock' })).toBe(false);
    });
  });

  describe('guest', () => {
    it('shows once after onboarding is complete', () => {
      expect(shouldShowStylePopup(base)).toBe(true);
    });
    it('does not nag a brand-new visitor mid-onboarding', () => {
      expect(shouldShowStylePopup({ ...base, guestOnboardingDone: false })).toBe(false);
    });
    it('does not show after it was already shown', () => {
      expect(shouldShowStylePopup({ ...base, guestShown: true })).toBe(false);
    });
  });
});
