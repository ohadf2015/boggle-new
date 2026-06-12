export interface StylePopupGateInput {
  isMounted: boolean;
  /** Feature gate (admin-only during testing). False → never show. */
  featureEnabled: boolean;
  isAuthenticated: boolean;
  /** True while the post-OAuth profile-customization modal is pending. */
  needsProfileCustomization: boolean;
  /** profiles.player_style_modal_shown_at (authed). */
  profileShownAt: string | null;
  /** profiles.player_style (authed) — already chose a style elsewhere. */
  profileStyle: string | null;
  /** localStorage one-time flag (guest). */
  guestShown: boolean;
  /** Guest has finished onboarding (don't nag fresh visitors). */
  guestOnboardingDone: boolean;
}

/**
 * Whether to show the one-time style-choice popup for existing users.
 *
 * Pure so the gating rules are unit-tested. Defers to the profile-customization
 * modal, never double-shows, and skips guests still in onboarding.
 */
export function shouldShowStylePopup(input: StylePopupGateInput): boolean {
  if (!input.isMounted) return false;
  if (!input.featureEnabled) return false;
  if (input.needsProfileCustomization) return false;

  if (input.isAuthenticated) {
    return !input.profileShownAt && !input.profileStyle;
  }
  return input.guestOnboardingDone && !input.guestShown;
}
