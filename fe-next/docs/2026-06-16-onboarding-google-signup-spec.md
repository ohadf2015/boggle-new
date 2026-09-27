# Spec: Fun Google signup in onboarding + reload-on-signin

**Goal:** In the FTUE profile step, offer a delightful "Sign up with Google" option
(guest "Let's Go" stays the default). Carry the just-crafted avatar + name into the
new account. On ANY fresh sign-in, hard-reload so every page re-renders authenticated.

## Behavior
- Profile step (`QuickProfileSetup`) shows a secondary, optional Google signup panel
  below the primary CTA. Hidden in the invite flow (`hasPendingInvite`) where joining
  the room is the priority.
- The crafted avatar + name persist eagerly (effect-driven) so they survive whichever
  Google path fires — GSI in-page (web) is a cross-origin iframe we cannot hook on click.
- Success → `SIGNED_IN` → global hard-reload → FTUE gate (`hasSupabaseSession()`) skips
  onboarding → lands on the authed home. The reload subsumes onboarding completion.

## Carry-forward (verified gaps)
- `createNewProfile` (useProfileManagement.ts) hardcodes a random avatar → change to
  `getStoredCustomAvatar() ?? getRandomAvatarConfig()`. Runs only on PGRST116 (new accts).
- Display name carries via the `lexiclash_onboarding_data` blob + `nameEdited:true`
  (decideDisplayName precedence). Persist the blob WITHOUT the COMPLETED flag, else a
  user who abandons mid-profile is wrongly marked done.

## Global reload gate
`shouldReloadAfterSignIn(event, { wasUnauthenticated, pathname })`:
- only `event === 'SIGNED_IN'` (session restore is `INITIAL_SESSION` → no loop)
- only `wasUnauthenticated` (guest → authed; token-refresh/refocus keep same id)
- skip on `/auth/callback` (it does its own `router.replace`)
- skip when a pending classroom redirect already navigated away

## Files
1. `utils/onboardingStorage.ts` — `savePendingOnboardingProfile()` (blob only, no COMPLETED).
2. `contexts/auth/reloadOnSignIn.ts` — pure `shouldReloadAfterSignIn()`.
3. `contexts/auth/hooks/useAuthInitialization.ts` — call reload after `fetchUserData` in SIGNED_IN.
4. `contexts/auth/hooks/useProfileManagement.ts` — avatar carry-forward.
5. `components/onboarding/OnboardingGoogleSignup.tsx` — fun panel: GSI (web) / redirect (native).
6. `components/onboarding/QuickProfileSetup.tsx` — render the panel.
7. `translations/{en,he,sv,ja,es}.js` — `onboarding.google.*` keys (native copy).

## Verification
- TDD pure units: storage, reload decision, avatar carry, component persistence.
- GSI cannot run on localhost (origin unauthorized) → full Google flow is prod-verify-only.
