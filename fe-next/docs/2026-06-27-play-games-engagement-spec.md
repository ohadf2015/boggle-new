# Play Games Services — make it live + fun (engagement spec)

**Date:** 2026-06-27
**Goal:** "Better integration with Google Play Games — improve it and make it fun and engaging."
**Status of prior work:** PGS bridge + award dispatch shipped at JS level (2026-06-07), Console project published (2 leaderboards + 6 achievements). See `.claude/notes/android-release-status.md`.

## The actual problem (root cause, not symptom)

The integration is **inert and invisible**:

1. **No sign-in ever happens.** `NativePGSInitializer` warms the plugin but deliberately does NOT sign in, and **no UI anywhere calls `signInPlayGames()`**. The plugin uses `play-services-games-v2` (PGS v2). Without an authenticated Games session, every `submitScore` / `unlockAchievement` no-ops on device. → **Zero achievements can fire today.** (Class 4 silent failure: "shipped" but dead.)
2. **No entry point.** On Android the user has no way to see their PGS achievements/leaderboards. The native overlays (`showAchievements`, `showLeaderboard`) are wired in the bridge but nothing opens them. → zero engagement value.

The root-cause fix and the "fun/engaging" ask are the **same change**: a visible Play Games surface that triggers sign-in and opens the native overlays.

## Scope (lazy, root-cause, verifiable here)

### 1. Resurrect the award path — trigger PGS sign-in (Android)
- Add a best-effort **silent sign-in at app start** in `NativePGSInitializer` after the bridge warms. PGS v2 sign-in is automatic/silent for returning (consented) users; first launch shows Google's one-time consent — standard PGS behavior. This makes `awardGameEnd` submits/unlocks register. `awardGameEnd` is already written to retry one-time achievements until a submit succeeds, so this alone backfills First Word/Victory/etc. on the next game.
- Orthogonality preserved: signing into Games does NOT touch the Supabase session — no tokens routed. Update the stale "does NOT auto-sign-in" comment.

### 2. Visible Play Games entry point (the engagement surface)
- New component `components/playGames/PlayGamesCard.tsx` — **Android-only** (gated on `usePlayGamesServices().available`), rendered on the **profile page**.
- Content:
  - Signed in → show player name (from sign-in result) + two neo-brutalist buttons: **Achievements** (`showAchievements`) and **Leaderboards** (`showLeaderboard(highScore)`).
  - Not signed in → a single **Connect to Play Games** button (`signIn`).
- Use Google's **native overlays** for the actual achievement/leaderboard lists. Do NOT build custom PGS list UI (over-building; Google's overlay is the canonical surface).
- Neo-brutalist styling: reuse existing card/button primitives. Trophy iconography, lime/cyan family.
- 5-language `t()` copy (en/he/sv/ja/es), RTL-safe.

### 3. Tests (TDD, mandatory)
- `PlayGamesCard.test.tsx`: renders nothing when `available=false`; shows Connect CTA when signed-out; shows player name + Achievements/Leaderboards buttons when signed-in; buttons call the right bridge fns.
- Sign-in-at-start: a unit test on the initializer's new behavior (Android → calls signIn best-effort; non-Android → no-op).

## Out of scope (deferred — documented, not silently dropped)

- **Net-new achievements / mode-specific chases.** Adding achievements is an outward-facing Play Console action and published achievements are un-deletable. The existing 8 don't even fire yet — make them live first. Follow-up: design mode achievements (Word Hunt streaks, Blast clears, Brain Drill milestones) once the path is proven on device.
- **Custom PGS unlock celebration.** Google fires its own native toast on unlock. Building our own would triple-fire alongside the existing Supabase `AchievementQueue`/`UnlockNotifier` (Class 1 dual-source). Leave celebrations to Google's native layer.
- **Saved games / cloud save / friends.** Native, unverifiable here, and Supabase already persists progress. Redundant.

## Verification boundary (honest status)

- **Verified here (DONE):**
  - `npx cap sync android` → plugin syncs (19 Capacitor plugins found incl. `@openforge/capacitor-game-connect@5.0.2`).
  - **Native compile CLEARED:** `./gradlew :openforge-capacitor-game-connect:compileDebugJavaWithJavac` → `BUILD SUCCESSFUL`. The Cap-5-plugin-on-Cap-8 fear the prior memo called "the open risk a device build must clear" is a *manifest* warning, not a compile break — the plugin uses a modern `namespace` gradle block, inherits root `compileSdk`, and its Java only touches stable Capacitor APIs.
  - `npm run lint` (touched files) = 0, `tsc --noEmit` (touched files) = 0, vitest 8/8 new + 23 existing PGS tests green, all 5 translation files parse.
- **Needs device QA (cannot verify here):** actual Google sign-in dialog/consent on first launch, on-device achievement unlock + native overlay rendering, leaderboard submit landing in Console. This is the deliverable's true status, not a footnote — the path is now *wired and compiles*, but the runtime handshake with Google requires a signed build on a device.

## Files

- `components/NativePGSInitializer.tsx` — add best-effort sign-in.
- `components/playGames/PlayGamesCard.tsx` — new entry-point card.
- `hooks/usePlayGamesServices.ts` — expose sign-in state if needed for the card (or card holds local state).
- `<profile component>` — mount the card (Android-only).
- `translations/*` — `playGames.*` keys ×5 langs.
- Tests alongside each.
