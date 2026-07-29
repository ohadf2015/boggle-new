# Spec — "Make this avatar yours" gentle nudge

**Date:** 2026-06-04
**Goal:** Suggest to authenticated users who have **never deliberately customized** their avatar that they personalize it — to deepen connection to the game. Must be **gentle, non-annoying, dismissible, infrequent.**

## Problem / crux

On signup every user is assigned a **random** avatar (`getRandomAvatarConfig()`), not a single canonical default. `has_customized_profile` tracks the **name**, not the avatar. There is **no existing signal** distinguishing a user who deliberately chose their avatar from one still wearing the random starter.

So the avatar config can never tell us "is this theirs?" — we need a dedicated boolean set the moment the user saves from the builder.

## Detection (the load-bearing decision)

New column `profiles.avatar_customized boolean NOT NULL DEFAULT false`.

- **Backfill ALL existing rows → `true`** ("treat existing as already-customized"). No heuristic can tell an old real-customizer from an old random-holder — same config space — so any existing user defaulting to `false` would be wrongly nudged ("make it yours" to someone who spent 10 min on it months ago = broken-feeling). Backfilling `true` means **only genuinely-new accounts are ever eligible** — correct by construction.
- New `createProfile` inserts omit the column → DB default `false` → new users eligible.
- Flag flips to `true` at the **single chokepoint** `useProfileManagement.updateUserProfile`: when an update carries `avatar_config` and the caller didn't set the flag, also set `avatar_customized: true`.
  - Trap-safe: the two **non-deliberate** avatar_config writes (signup insert line 199; silent auto-assign line 284) use the **lower-level** `lib/supabase.ts` functions, NOT the hook — so they never trip the flag. Every deliberate builder save (ProfileHeader, LandingAvatarTeaser, Host/Join authed branch, HostPreGameView) routes through the hook.

## Surface

Rendered **at the avatar** (inside `ProfileHeader`), where "make it yours" is most contextually meaningful and interrupts nothing. **NOT** on the results screen (already fires `useSignupPrompt` @3500ms + `useMultiplayerSignupNudge` @2000ms — a third nudge there stacks/collides = annoying). Authenticated only (personalization-that-persists is an authed concept; guest builder fields are ephemeral).

## Gating (pure, testable)

`selectAvatarNudge({ isAuthenticated, avatarCustomized, enabled, dismissedUntil, now }) → boolean`:
- `false` if not authenticated
- `false` unless `avatarCustomized === false` **explicitly** (undefined → fail-safe suppress)
- `false` if kill-switch flag disabled
- `false` if within dismissal snooze window (`now < dismissedUntil`)
- else `true`

Dismissal persists 30 days via `storageHelpers` (`lc:avatar-nudge-dismissed-until`). Customizing flips the server flag → never shows again (durable).

Remote kill-switch: `usePostHogFlag<boolean>('avatar-customize-nudge-enabled', true)` — **default true** so it ships live, still remotely disableable / A/B-able. Telemetry: `avatar_nudge_shown | avatar_nudge_clicked | avatar_nudge_dismissed`.

## UI

`AvatarCustomizeHint` — quiet neo-brutalist dismissible callout (warmth, not loud motion): sparkle + title + one-line body + `Customize` CTA (→ opens existing `AvatarBuilderModal` via `setIsAvatarBuilderOpen(true)`) + soft "Not now" dismiss. One-shot entrance only.

## i18n (native ×5, no calque)

`avatar.nudge.{title,body,cta,dismiss}` in en/he(RTL)/sv/ja/es.

## Files

- `supabase/migrations/20260604200000_avatar_customized_flag.sql` (new)
- `contexts/auth/authTypes.ts` — `avatar_customized?: boolean`
- `lib/supabase.ts` — add column to `full` + `settings` projections
- `contexts/auth/hooks/useProfileManagement.ts` — chokepoint flag (pure helper `withAvatarCustomizedFlag`)
- `lib/avatar/avatarNudge.ts` (new, pure) + `avatarNudgeStorage.ts` (new)
- `hooks/useAvatarCustomizationNudge.ts` (new)
- `components/profile/AvatarCustomizeHint.tsx` (new) + mount in `ProfileHeader.tsx`
- `utils/growthTracking.ts` — 3 event names
- `translations/{en,he,sv,ja,es}.js`

## Tests

Pure `selectAvatarNudge` (all branches incl. undefined fail-safe), `withAvatarCustomizedFlag` (avatar_config→true; no avatar_config→untouched; explicit flag preserved), storage round-trip, hint render (CTA/dismiss wiring), i18n contract (4 keys ×5 langs present).
