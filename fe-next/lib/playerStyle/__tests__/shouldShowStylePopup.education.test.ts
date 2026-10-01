import { describe, it, expect } from 'vitest';
import { shouldShowStylePopup } from '../shouldShowStylePopup';

const eligibleGuest = {
  isMounted: true,
  authSettled: true,
  featureEnabled: true,
  isAuthenticated: false,
  needsProfileCustomization: false,
  profileLoaded: true,
  profileShownAt: null,
  profileStyle: null,
  guestShown: false,
  guestOnboardingDone: true,
  localStyleChosen: false,
  alreadyShownThisSession: false,
};

describe('shouldShowStylePopup on education routes', () => {
  it('given an eligible guest, when the route is outside education, then it may prompt', () => {
    expect(shouldShowStylePopup({ ...eligibleGuest, onEducationRoute: false })).toBe(true);
  });

  it('given an eligible guest, when the route is a student/join/teacher page, then it never prompts', () => {
    expect(shouldShowStylePopup({ ...eligibleGuest, onEducationRoute: true })).toBe(false);
  });
});
