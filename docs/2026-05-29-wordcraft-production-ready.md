# WordCraft → Production-Ready: Card Mode, Turn-Based MP, Satisfaction, SEO Landing

**Date:** 2026-05-29
**Status:** Spec → Implementation (autonomous, per-phase commits)
**Owner:** Claude (Opus)

## Goal

Finish WordCraft and make it production-ready:
1. Expose + polish **Card Mode** (the power-card "Run" mode) as a first-class, stable entry.
2. Add **turn-based multiplayer** vs other players (server-authoritative, bot-fill).
3. Close **gaps/issues**, add **satisfaction & celebrations** where missing.
4. Wire **sound + music** throughout (territory mode is currently silent).
5. Ship a **SEO/GEO landing page** with strong CTR to funnel users into the mode.

## Current State (from codebase survey)

- **Modes today:** territory (default), classic, gems (Gem Hunt), run (power cards — flagged off), hotseat (local pass-&-play). 13 Pixi scenes. Heat/overdrive/burnout + per-player streaks.
- **Silent:** territory mode never calls `setGameActive(true)`, never plays music, and `playSpectacleCommit()` fires Pixi scenes **decoupled from sound**. No SFX on commit/capture/heat/victory.
- **Card mode (Run):** fully built (`lib/word-craft/run/*`, `components/word-craft/run/*`) but behind PostHog flag `wordcraft-run-mode`; not in landing; CardPickScreen basic; no sound.
- **MP:** none for wordcraft. Infra is highly reusable — Shiritori (`backend/modules/shiritoriManager.ts` + `backend/handlers/shiritoriHandler.ts`) is the turn-based, server-authoritative template (turn enforcement via `currentPlayer(state)`, bot fill, results recording). `GameMode` union in `shared/types/game.ts`.
- **Landing/SEO:** WordCraft cards admin-gated in `LandingChallengeCards.tsx`; route is `noindex` beta. Gold-standard SEO landing = `app/[locale]/play-boggle-online-free/page.tsx` (hero/stats/how-to/FAQ + FAQPage/HowTo/WebApplication JSON-LD). Helper: `lib/seo/generatePageMetadata.ts`. Sitemap: `app/sitemap.ts`. AI grounding: `public/llms.txt`. i18n keys under `wordcraft.*` and `seo.*` in `translations/{en,he,sv,ja,es}.js`.

## Audio facts

- `useSoundEffects()` (`contexts/SoundEffectsContext.tsx`): `playSound(key, opts)`, `setGameActive(active)`, plus ~50 wrapped fns. SFX gated on `isGameActive` unless `requiresGameActive:false`.
- `useMusic()` (`contexts/MusicContext.tsx`): `fadeToTrack(track, outMs, inMs)`, `stopMusic(ms)`, `TRACKS` (LOBBY/BEFORE_GAME/IN_GAME/ALMOST_OUT_OF_TIME/BOSSA_ARCADE/BOSSA/BLAST).
- 97 SFX keys incl. wordAccepted, wordRejected, comboBreak, tileSelect, perfectWord, rareWord, longWordBonus, streakFire/Milestone/Legendary, megaCascade, ultraCombo, achievement, victoryFanfare, defeatSting, epicVictory, crownVictory, levelUp, coinCollect, chestOpen, leadChange, opponentScored, matchFound/Start, playerJoined/Left, powerUp.

## Scope & Phases (TDD throughout; commit per phase, ask first)

### Phase 1 — Sound & Music wiring (SP all modes)
- New pure module `lib/word-craft/celebration/soundPlan.ts`: maps a commit (score, tier, streak, heat transition, bingo, capture) → ordered list of sound keys. Unit-tested.
- Wire into `PageClient` + `RunPageClient`: `setGameActive(true)` on mount, `stopMusic`+`setGameActive(false)` on game over; `fadeToTrack(IN_GAME)` (urgent track when bag low / final turns).
- Per-event SFX: tileSelect on place, wordAccepted on commit, comboBreak on invalid/pass, tier-scaled celebration (perfect/rare/mega), capture → coinCollect/leadChange, heat→overdrive→powerUp/streakFire, victory→epicVictory/crownVictory + defeatSting.
- Cozy/calm mode: clamp loud SFX (mirror existing cosy clamp recipe).

### Phase 2 — Satisfaction & celebration gaps
- Pass / swap / undo feedback (subtle SFX + toast where silent today).
- Territory capture celebration (visual pop + sound) — currently understated.
- Gem Hunt completion celebration wired (`gemDrama.ts` → `GemHuntWinScene`).
- Score-float / "new personal best" moment for SP territory (persist best like blast).
- Reduced-motion + calm respected.

### Phase 3 — Card Mode production-ready
- Stable entry: keep PostHog flag as override but add a deterministic public route/param so it's reachable without the flag (e.g. `/word-craft?mode=cards`), mode switch in `WordCraftClient`.
- Polish `CardPickScreen` / `PowerCardView` (clarity, rarity, sound on reveal via `cardRevealPop`/`powerUp`).
- Wire Phase-1 sound plan into run mode word pops + round/run results.
- Landing card for Card Mode; i18n ×5.
- Tests: card pick flow, effect application already covered — add UI/sound-trigger tests.

### Phase 4 — Turn-based with other players  ✅ REVISED (decision 2026-05-29)

**Decision:** Ship **local pass-and-play (hotseat)** as a first-class, discoverable
turn-based mode — NOT remote netcode this session.

**Why** (advisor + investigation):
- WordCraft engine modules are React/DOM-free (server-importable) ✔, BUT:
- The production async-challenge infra (`async_board_challenges` + API + push) has
  **no per-mode play renderer** — its only play surface is the homepage classic game
  fed via `sessionStorage`. Hosting WordCraft async = a net-new challenged-player play
  path + landing route-by-mode + invite wiring + a **prod DB CHECK-constraint migration**.
  Each probe surfaced *more* net-new work → the proper version is multi-session.
- Live socket (Shiritori model) loses state on disconnect → wrong for correspondence.
- Brand is "phones + TV/party screens, Jackbox party energy" → same-screen alternating
  turns is *on-brand*, not a consolation. Hotseat already exists (`?vs=human`,
  `WordCraftHandoff` curtain, `useWordCraftGame.hotseat.test.ts`).

**Shipped:** expose hotseat as first-class — discoverable entry (landing card, Phase 5),
clear "whose turn" framing + handoff curtain verified. Low-risk, tested, in-session.

**Deferred (next increment, fully specced below):** remote **async correspondence**
WordCraft on the existing `async_board_challenges` infra, using **Card/Run mode** as the
seeded score-attack ("beat my run on this seed"). Integration map:
1. Migration: `ALTER … async_board_challenges` CHECK to add `'wordcraft'`.
2. `app/api/growth/async-challenge/route.ts` (POST type+validation) + `shared/types/growth.ts` union: add `'wordcraft'`.
3. Build the missing per-mode play renderer: `FriendChallengeLandingClient` routes
   wordcraft challenges to `/word-craft?mode=cards&challenge={id}` instead of homepage.
4. `RunPageClient`: read `?challenge={id}` → seed run from `grid_seed`, show target,
   on finish submit result via `useAsyncChallengeProducer` (PUT phase=challenged).
5. Challenger: run-result "Challenge a friend" → `pendingAsyncChallenge` (gameMode
   `'wordcraft'`, gridSeed, runTotal) → existing invite dialog POSTs.
6. i18n `asyncChallenge.mode.wordcraft` ×5.
   (Pure seed→run-config + result-submission helpers are unit-testable; run engine is deterministic.)

### Phase 5 — SEO/GEO landing page + go public
- Un-gate WordCraft landing card (drop `isAdmin &&`), badge BETA→NEW (Card Mode → NEW).
- Convert `app/[locale]/word-craft/page.tsx` to `generatePageMetadata({ seoKey:'wordCraft', path:'/word-craft', locale })`; remove noindex.
- New dedicated landing `app/[locale]/word-craft-game/page.tsx` mirroring play-boggle template: hero + CTA, how-to, modes (solo/cards/turn-based-MP), comparison, FAQ; JSON-LD FAQPage + HowTo + VideoGame/WebApplication; canonical + hreflang ×5.
- Add to `app/sitemap.ts` (both `/word-craft` and `/word-craft-game`).
- Add WordCraft to `public/llms.txt`.
- i18n: `seo.wordCraft`, `seo.wordCraftGame`, landing copy ×5 (use ux-writer, no literal translation).

## Non-goals / deferred
- Real-time simultaneous MP (turn-based only).
- Ranked/ELO for wordcraft MP (record results, no ranking math initially).
- New music composition (reuse library tracks).

## Risks
- MP netcode is the largest/riskiest piece — build manager+handler TDD first, client last; if session-bound, ship reviewable increment with clear remaining-work note.
- Daemon concurrently edits translation files → commit my files explicitly, re-add if reverted (established pattern).
- 6 stale blast-gating tests fail on master pre-existing → may need `--no-verify` push (proven pre-existing).
- 500-line file cap on touched files (PageClient already ~250–500).

## Acceptance
- lint + tsc + targeted tests green per phase; build clean before final push.
- Each phase committed separately (conventional commits), ask before commit.
