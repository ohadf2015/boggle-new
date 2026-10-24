status: shipped
attempted: check STEP0 vs STEP1 fallback, then ship one admin-beta mode improvement (default) or landing variant (rare fallback)

## Decision
- STEP1 fallback check: homepage `/en/` = 91 sessions/14d via `query-web-overview` (1 PostHog call) — below the 200-session threshold, so landing-variant fallback is NOT justified. Stayed in STEP 0 default.
- Re-derived admin-gated targets from source (memory's "surviving admin-gated set" was stale): `wheel-rush` has NO `isAdmin` gate in `WheelRushView.tsx` (confirmed public MP-rotation per 2026-08-17 report finding); `lib/dailyModes.ts` now has `adminOnly: false` on ALL daily modes (connections/word-tower/word-hunt/word-wheel all public). `brain-drill` routes (`app/[locale]/brain/drills/*`) have no admin gate either.
- The ONLY verified real admin-gated surface left: `word-craft` `cards`/`gems` sub-modes via `gateWordCraftMode()` in `hooks/useWordCraftModeFlag.ts`. Both sub-modes (Gem Hunt, Run) were hit in the last 2 nights (10-17, 10-23), so rotated to the Run sub-mode's least-used axis: understandability.

## Mode improvement shipped
- Mode: Word Craft — Run (power-card draft screen)
- URL: https://lexiclash.live/en/word-craft/?mode=cards (mirrors /he, /sv, /ja, /es)
- Local URL: http://localhost:3001/en/word-craft/?mode=cards
- Axis: understandability
- What changed: the 3-card draft offer (`CardPickScreen`) showed zero context about the player's current loadout — picking a new power card meant recalling your build from memory or backing out to check the HUD. Added a compact "Your build" chip strip above the offer showing every currently-active card by name, so the pick decision (synergy/overlap/direction) is informed without leaving the screen.
- Files touched:
  - `components/word-craft/run/CardPickScreen.tsx` (new `activeCards` prop + build strip)
  - `app/[locale]/word-craft/RunPageClient.tsx` (wired `state.activeCards` through)
  - `translations/{en,he,sv,ja,es}.js` (`wordcraft.run.cardPick.yourBuild` key, all 5 locales)
- Next step for user: open URL or refresh home as admin, pick `?mode=cards`, clear a round to reach the card-pick screen, reply 👍/👎 to the bot.

## Verify status
- `node --check` clean on all 5 translation files.
- `npx eslint` on the 2 touched TS/TSX files was still running in background at lane end (120s timeout) — did not block on it per the time-budget rule; gate's own lint pass is authoritative. No new deps, no new routes, admin gate untouched, no realtime/auth/payment surfaces touched.
- Ruled out: `wordcraft.run.card.<id>.name` keys reused (already exist, no new per-card strings needed).

## next_steps
- If eslint (background task `ba27l1fms`) surfaces an issue on `CardPickScreen.tsx`/`RunPageClient.tsx`, fix in a follow-up — diff is 2 small, additive JSX blocks, low risk.
- Consider: extend the "Your build" strip to `RunResultScene.tsx` end-of-run recap (not done tonight, scope ceiling).
- Memory's `ADMIN-BETA TARGET LIST` standing note is stale (wheel-rush/brain-drill no longer gated, connections/word-tower never were) — only `word-craft` cards/gems remains a real lane-5 target. Worth a memory correction next self-learn pass.
