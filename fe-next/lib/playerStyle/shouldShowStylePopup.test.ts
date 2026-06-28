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

  it('never traps a search-engine crawler behind the blocking modal (SEO)', () => {
    // Googlebot/Bingbot render with empty localStorage on deep routes, so every
    // other gate resolves "fresh visitor → show". Without this guard the crawler
    // indexes the full-screen style overlay instead of the page content.
    expect(shouldShowStylePopup({ ...base, isCrawler: true })).toBe(false);
    expect(
      shouldShowStylePopup({ ...base, isAuthenticated: true, isCrawler: true }),
    ).toBe(false);
    // Sanity: the same input WITHOUT the crawler flag would have shown.
    expect(shouldShowStylePopup({ ...base, isCrawler: false })).toBe(true);
  });

  it('never shows once the account already has a style, even if auth reads false transiently', () => {
    // The chosen style on `profiles.player_style` must suppress the popup in
    // EITHER auth state, not only the authenticated branch. During session
    // restore / token refresh / cross-tab sync `isAuthenticated` can briefly
    // read false while the profile object still holds the chosen style (the same
    // value the "current" badge renders from). If the profileStyle check only
    // lived in the authed branch, the gate would fall into the guest branch,
    // ignore the chosen style, and re-open the popup over a user who already
    // picked — the exact "modal opened after I chose my style" report.
    expect(shouldShowStylePopup({ ...base, isAuthenticated: false, profileStyle: 'hasidic' })).toBe(
      false,
    );
  });

  describe('first game gate (FTUE: never prompt a player who has not played a single game)', () => {
    // The style picker is a personalisation reward — surfacing it to a player who
    // has not yet played even one game (e.g. landing straight in the MP lobby)
    // interrupts them before they have any context for the choice. Hold it until
    // they have at least one game under their belt. Applies in either auth state.
    it('never shows before the player has played at least one game', () => {
      expect(shouldShowStylePopup({ ...base, hasPlayedAtLeastOneGame: false })).toBe(false);
      expect(
        shouldShowStylePopup({ ...base, isAuthenticated: true, hasPlayedAtLeastOneGame: false }),
      ).toBe(false);
    });

    it('shows once the player has played at least one game (gate is satisfied)', () => {
      expect(shouldShowStylePopup({ ...base, hasPlayedAtLeastOneGame: true })).toBe(true);
    });

    it('is backward-compatible: an undefined flag does not block (existing callers)', () => {
      // Optional gate — only an explicit `false` suppresses. Undefined keeps the
      // prior behaviour so unrelated call sites are unaffected.
      expect(shouldShowStylePopup({ ...base, hasPlayedAtLeastOneGame: undefined })).toBe(true);
    });
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

  describe('natural break points (never interrupt active play)', () => {
    it('never shows while a game is actively being played, in EITHER auth state', () => {
      // The popup is a full-screen blocking overlay. Opening it mid-game would
      // cover a live board and, in multiplayer, a running timer you cannot pause
      // — the "shows at the wrong moment" report. Suppress whenever a game runs.
      expect(shouldShowStylePopup({ ...base, gameActive: true })).toBe(false);
      expect(
        shouldShowStylePopup({ ...base, isAuthenticated: true, gameActive: true }),
      ).toBe(false);
    });

    it('does not show on a gameplay route until the game is over (skips pre-game/lobby)', () => {
      // On /practice, /multiplayer, … the moments BEFORE a game ends — pre-game
      // setup, lobby, countdown — are still the wrong moment. Wait for results.
      expect(
        shouldShowStylePopup({ ...base, onGameplayRoute: true, resultsShowing: false }),
      ).toBe(false);
    });

    it('shows on a gameplay route once the results screen is up (after the game)', () => {
      expect(
        shouldShowStylePopup({ ...base, onGameplayRoute: true, resultsShowing: true }),
      ).toBe(true);
    });

    it('still shows on a non-gameplay in-app screen when idle (menu/home), no results needed', () => {
      // Off gameplay routes (leaderboard, profile, …) the user is already at rest,
      // so there is nothing to interrupt — the results gate does not apply.
      expect(
        shouldShowStylePopup({ ...base, onGameplayRoute: false, resultsShowing: false }),
      ).toBe(true);
    });
  });

  it('never re-shows once the device-level "shown" flag is set, in EITHER auth state', () => {
    // `guestShown` is the localStorage marker, written the moment the popup is
    // shown (any auth state). It is a DEVICE-level "shown once" flag, so it must
    // suppress globally — not just in the guest branch. The re-pop it closes: a
    // guest sees the popup, dismisses, then logs into an account whose
    // `player_style_modal_shown_at` is still null → the authed branch would
    // ignore the localStorage flag and re-prompt on the next page load. This is
    // the "some pages still show it another time" report.
    expect(shouldShowStylePopup({ ...base, guestShown: true })).toBe(false);
    expect(
      shouldShowStylePopup({
        ...base,
        isAuthenticated: true,
        guestShown: true,
        profileShownAt: null,
      }),
    ).toBe(false);
  });
});
