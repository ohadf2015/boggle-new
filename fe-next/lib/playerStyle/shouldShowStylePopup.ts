export interface StylePopupGateInput {
  isMounted: boolean;
  /**
   * Auth/session restore has finished (`!useAuth().loading`). Until this is true
   * `isAuthenticated` is unreliable (starts false, flips true on restore), so a
   * returning authed user would be routed through the guest branch and flash the
   * popup. Gate everything on it. False → never decide yet.
   */
  authSettled: boolean;
  /** Feature gate (admin-only during testing). False → never show. */
  featureEnabled: boolean;
  isAuthenticated: boolean;
  /** True while the post-OAuth profile-customization modal is pending. */
  needsProfileCustomization: boolean;
  /**
   * Profile object has been fetched (authed). False → don't decide yet: an
   * unloaded profile has null shownAt+style which would wrongly resolve to show.
   */
  profileLoaded: boolean;
  /** profiles.player_style_modal_shown_at (authed). */
  profileShownAt: string | null;
  /**
   * profiles.player_style — already chose a style on the account. Suppresses the
   * popup in EITHER auth state (a transient `isAuthenticated === false` during
   * session restore must not route a user who already picked through the guest
   * branch and re-prompt them).
   */
  profileStyle: string | null;
  /**
   * Device-level one-time flag (localStorage `boggle_player_style_modal_shown`).
   * Written at SHOW-time for guest AND authed users, so it suppresses the popup
   * globally on this device — surviving the guest→login transition, the abandon
   * path (closed without dismissing), and a failed profile-column write.
   */
  guestShown: boolean;
  /** Guest has finished onboarding (don't nag fresh visitors). */
  guestOnboardingDone: boolean;
  /**
   * A style is already stored locally (`boggle_player_style`). This is the
   * source of truth the moment a style is picked — it precedes the async sync
   * to `profiles.player_style`, and survives a guest→authed transition. Once
   * set, the user has chosen, so never prompt — covers the authed path where
   * `profileStyle` still reads null (FTUE pick before login / sync lag).
   */
  localStyleChosen: boolean;
  /**
   * Session latch: the popup has already been shown once this mount. True →
   * never show again. Closes the authed reopen window where `profileShownAt`
   * still reads null until the async profile refetch lands after dismiss,
   * which would otherwise re-resolve to `true` and re-pop the modal.
   */
  alreadyShownThisSession: boolean;
  /**
   * The current client is a JS-rendering search-engine crawler (Googlebot/
   * Bingbot). True → never show. The popup is a full-screen `fixed inset-0`
   * blocking overlay that mounts on every deep route (/practice, /daily, …) for
   * fresh visitors; a crawler renders with empty localStorage so it would index
   * the modal instead of the page. Skipping it lets the bot reach the real page
   * content — the same content humans see once dismissed. See lib/seo/isCrawler.
   */
  isCrawler?: boolean;
  /**
   * A game is actively being played right now (`useGameActive()`). The popup is
   * a full-screen blocking overlay, so opening it mid-game covers a live board —
   * and in multiplayer a running timer the player cannot pause. Never the right
   * moment. True → never show; the popup waits for a natural break.
   */
  gameActive?: boolean;
  /**
   * The current route is an active-gameplay screen (`isGameplayPath()`:
   * /practice, /multiplayer, /daily, …). On these routes the only acceptable
   * moment to prompt is AFTER the game (`resultsShowing`) — the pre-game setup,
   * lobby and countdown are still mid-flow. Off these routes (menus, profile,
   * leaderboard) the user is already idle, so no results gate applies.
   */
  onGameplayRoute?: boolean;
  /**
   * A game has finished and its results/game-over screen is up. Gates the prompt
   * on a gameplay route to the post-game moment the user explicitly chose.
   */
  resultsShowing?: boolean;
}

/**
 * Whether to show the one-time style-choice popup for existing users.
 *
 * Pure so the gating rules are unit-tested. Defers to the profile-customization
 * modal, never double-shows, and skips guests still in onboarding.
 */
export function shouldShowStylePopup(input: StylePopupGateInput): boolean {
  if (!input.isMounted) return false;
  // Search-engine crawlers must reach the page content, never a blocking modal.
  if (input.isCrawler) return false;
  // Once shown this session, never show again — even if the persisted "shown"
  // marker hasn't caught up yet (authed profile refetch lag after dismiss).
  if (input.alreadyShownThisSession) return false;
  // Wait for auth to settle before deciding — otherwise the transient
  // "not-yet-authenticated" window flashes the popup at returning users.
  if (!input.authSettled) return false;
  // Never interrupt active play. The full-screen overlay would cover a live
  // board (and a running, unpausable multiplayer timer). Only surface the popup
  // at a natural break — the "showing at the wrong moment" fix.
  if (input.gameActive) return false;
  // On a gameplay route, hold the popup until the game is over (results screen).
  // Pre-game setup / lobby / countdown are still mid-flow. Off gameplay routes
  // (menus, profile, leaderboard) the user is already idle, so this gate is moot.
  if (input.onGameplayRoute && !input.resultsShowing) return false;
  if (!input.featureEnabled) return false;
  if (input.needsProfileCustomization) return false;
  // Already picked a style (local truth) → never prompt, in either auth state.
  // Catches the authed gap where `profileStyle` lags behind the local choice
  // (guest picked in FTUE then logged in, or the profile sync hasn't landed).
  if (input.localStyleChosen) return false;
  // Already picked a style on the ACCOUNT → never prompt, in either auth state.
  // Global (not just the authed branch): during session restore / token refresh
  // / cross-tab sync `isAuthenticated` can read false for a tick while the
  // profile object still holds the chosen style — the same value the "current"
  // badge renders from. If this lived only in the authed branch, that tick would
  // fall into the guest branch, ignore the chosen style, and re-open the popup
  // over a user who already picked ("modal opened after I chose my style").
  if (input.profileStyle) return false;
  // Already shown once ON THIS DEVICE (localStorage marker, written the moment
  // the popup is shown — see the wrapper's mark-on-show). Global, not just the
  // guest branch: a guest who saw the popup then logs into an account whose
  // `player_style_modal_shown_at` is still null must not be re-prompted. Without
  // this the authed branch would ignore the localStorage flag and re-pop on the
  // next page load ("some pages still show it another time"). The flag also
  // survives the abandon path (closed the tab without dismissing) because it is
  // written at show-time, not on dismiss.
  if (input.guestShown) return false;

  if (input.isAuthenticated) {
    if (!input.profileLoaded) return false; // profile not fetched yet → don't guess
    return !input.profileShownAt;
  }
  return input.guestOnboardingDone;
}
