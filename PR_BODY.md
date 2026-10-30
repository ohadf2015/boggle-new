## Why

The signup-first-game A/B (#1503) collected **0 exposures in both arms in its first ~16h** (Growth Radar `get_experiment lexiclash/signup-first-game`, 10-30 ~03:10 IST) while the goal kept firing (10 `growth:account_first_game` events). The experiment that is supposed to move "45% of new student accounts never play" could not see anyone.

Root cause: eligibility required `lexiclash_post_signup_home`, set **only** by `auth/callback` when the redirect was the default home. But:

1. **Google signups (42 of 48 real signups 10-23..10-29 = 88%) never pass through `/auth/callback`** — `GoogleSignInButton`/`GoogleOneTapInitializer` use the in-page ID-token flow (`signInWithIdToken`), success propagates via `SIGNED_IN`.
2. **Redirect providers always carry `next=<current page>`** (`appendNextParam`), so `isDefault` was true only for signups started exactly on `/{locale}`.

## What changed

Eligibility is now decided from the **fresh-signup mark AuthProvider already writes** on every guest → authed flip (`FRESH_SIGNUP_KEY`, with `signup_surface`) plus the **current route** — never the callback redirect:

- **Home** keeps the #1503 inline slot (`ReturningHome`).
- **Every other non-game page** (SEO landings, leaderboard, blog…) gets the same "Play your first game, {name}" card as a small floating card under the header — `SignupFirstGameGlobalCard` mounted in `SiteExtras`, suppressed on home so it never doubles.
- **Active game / room / daily-in-progress / auth routes stay out** (`isSignupFirstGamePath`; SEO landings like `/sv/swedish-multiplayer-word-game` stay eligible — they are content pages).
- Teachers, room-invite pending, pending daily result, game-context surfaces stay out, as before.
- **Exposure is logged in both arms** the moment eligibility is true (`useGrowthRadarFlag` gate unchanged — the `getFlag` call *is* the exposure).
- **Anonymous sessions are excluded from `markFreshSignup`** (it now takes the user object and skips `is_anonymous`) — anon classroom students were arming the once-per-account goal (sibling UR card: signup-event-anon-guard).
- Dead code removed: `POST_SIGNUP_HOME_KEY` / `markPostSignupHomeLanding`.

## Tests

- Google ID-token signup on `/sv/swedish-multiplayer-word-game` → exposure logged, floating card renders.
- Discord redirect with `next=/en/play-boggle-online-free` → exposure logged.
- Teacher → none. Anonymous → none (even with a stale mark). Room invite pending → none. Game route → none. Home → floating card defers to the inline slot.
- Control arm logs the exposure and renders nothing.
- `vitest`: 19/19 in the two touched suites; 607/607 across `components/landing` + `app/[locale]/auth`; 2995/2995 across `contexts`/`hooks`/`lib/retention`. Lint clean on all touched files. (`app/[locale]/__tests__/layout.test.tsx` fails on this worktree for a missing generated `messagesManifest.json` — pre-existing, reproduces on the base commit.)

## Success (48h after deploy)

`get_experiment signup-first-game` shows exposures in both arms at roughly the rate of eligible student signups (~2-4/day), SRM not flagged. Original metric unchanged: no-game-in-24h for new student accounts 38-45% → ≤ 30% (`fe-next/supabase/reports/signup_first_game.sql`).

Kanban: t_5ebe9081 (UR P2). Moat improver merges.

GR-Intervention: surface=post-signup-home kind=feature metric=funnel_conversion hypothesis="Arming the first-game card from the fresh-signup mark instead of the callback redirect exposes the ~88% of signups the experiment could never see; no-game-in-24h for new student accounts drops from 38-45% toward <=30%"
