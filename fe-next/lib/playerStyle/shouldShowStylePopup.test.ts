import { describe, it, expect } from 'vitest';
import { shouldShowStylePopup } from './shouldShowStylePopup';

const base = {
  isMounted: true,
  authSettled: true,
  featureEnabled: true,
  isAuthenticated: false,
  needsProfileCustomization: false,
  profileLoaded: true,
  profileShownAt: null as string | null,
  profileStyle: null as string | null,
  guestShown: false,
  guestOnboardingDone: true,
  localStyleChosen: false,
  alreadyShownThisSession: false,
};

describe('shouldShowStylePopup', () => {
  it('never shows before mount (hydration safety)', () => {
    expect(shouldShowStylePopup({ ...base, isMounted: false })).toBe(false);
  });

  it('never shows before auth has settled (kills the flash on session restore)', () => {
    // A returning authed user is transiently routed through the guest branch
    // while `loading` is still true; deciding then → setShow(true) → vanish.
    expect(shouldShowStylePopup({ ...base, authSettled: false })).toBe(false);
    expect(shouldShowStylePopup({ ...base, authSettled: false, isAuthenticated: true })).toBe(false);
  });

  it('never shows when the feature is disabled (non-admin during testing)', () => {
    expect(shouldShowStylePopup({ ...base, featureEnabled: false })).toBe(false);
    expect(shouldShowStylePopup({ ...base, featureEnabled: false, isAuthenticated: true })).toBe(false);
  });

  it('defers to the profile-customization modal when that is pending', () => {
    expect(shouldShowStylePopup({ ...base, needsProfileCustomization: true })).toBe(false);
  });

  it('never shows twice in a session once the latch is set (kills the reopen-after-dismiss jump)', () => {
    // The authed source-of-truth (profileShownAt) lags the async profile refetch
    // after dismiss, so the gate would otherwise still resolve `true` and the
    // wrapper would re-open the modal. The session latch short-circuits that.
    expect(shouldShowStylePopup({ ...base, alreadyShownThisSession: true })).toBe(false);
    expect(
      shouldShowStylePopup({ ...base, isAuthenticated: true, alreadyShownThisSession: true }),
    ).toBe(false);
  });

  it('never shows once a style is stored locally, regardless of auth state', () => {
    // The chosen style lives in localStorage (`boggle_player_style`) before it
    // syncs to `profiles.player_style`. A guest who picks a style in the FTUE
    // StylePicker, or one who then logs in, has a local style but a null profile
    // column / unset guest-shown flag — without this guard the popup re-pops on
    // the next in-app route (e.g. /daily). One short-circuit covers both paths.
    expect(shouldShowStylePopup({ ...base, localStyleChosen: true })).toBe(false);
    expect(
      shouldShowStylePopup({ ...base, isAuthenticated: true, localStyleChosen: true }),
    ).toBe(false);
  });

  describe('authenticated', () => {
    const authed = { ...base, isAuthenticated: true };
    it('shows once when the popup was never shown and no style chosen', () => {
      expect(shouldShowStylePopup(authed)).toBe(true);
    });
    it('does not decide before the profile has loaded (kills the flash)', () => {
      // profile still null right after auth settles → both shownAt+style read as
      // null, which would wrongly resolve to `true`. Wait for the real profile.
      expect(shouldShowStylePopup({ ...authed, profileLoaded: false })).toBe(false);
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
