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

### Phase 4 — Turn-based multiplayer (server-authoritative)
- Add `'wordcraft'` to `GameMode` (`shared/types/game.ts`); weight 0 in selector (opt-in, not auto-rotated) initially.
- `backend/modules/wordCraftManager.ts`: pure turn state — players[], currentPlayerIndex, shared board, bag/rack-per-player or shared pool, scores, passesInARow, finished/winner. Reuse SP scoring (`lib/word-craft/scoring.ts`) where shareable; validation mirrors SP `moveValidator`. Functions: `initWordCraftMpState`, `currentPlayer`, `validateMpMove`, `applyMpMove`, `passTurn`, `isGameOver`, `finalScores`.
- `backend/handlers/wordCraftHandler.ts`: `submitWordCraftMove` (reject if `currentPlayer!==username`), `passWordCraftTurn`; broadcast `wordCraftMoveAccepted`/`Rejected`/`turnChanged`/`gameOver`. Mirror shiritoriHandler.
- Bot fill: `backend/services/gameLifecycle/botWordCraft.ts` — schedule bot move on its turn using SP `findBestBotMove`.
- Reconnect branch + results recording (`recordGameResultsToSupabase`, already mode-agnostic).
- Client: turn-based MP play surface (reuse board/rack components; "your turn / waiting" state; opponent move reveal via existing `botMoveReveal` scene). Lobby mode entry.
- Tests: manager (turn advance, out-of-turn reject, scoring, game-over), handler (turn enforcement, pass, bot), client turn-state.

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
