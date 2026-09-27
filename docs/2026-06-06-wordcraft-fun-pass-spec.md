# WordCraft Fun-Pass Spec — Ending · Bot Balance · Clues · Modifiers · Juice

**Date:** 2026-06-06
**Game:** WordCraft (SOLO vs bot; not socket-gated). Entry `app/[locale]/word-craft/PageClient.tsx`, core hook `lib/word-craft/useWordCraftGame.ts`.

## Problem (user report)
1. "WordCraft has no ending."
2. "Bot is too good."
3. "Should have 2 clues each game; more clues = watch an ad."
4. "Add more effects / make it more fun / celebrations / cool animations."
5. "Improve the randomness factor with modifiers."

## Diagnosis (verified, not assumed)
- **Ending is NOT a soft-lock.** Reducer ends on `newRack.length===0` (bag+rack drained) or 2 consecutive `PASS` (`useWordCraftGame.ts:175,266`); bot correctly `PASS`es when `findBestBotMove` returns null (`:532,:535`). No infinite-bot bug.
- **Two real causes of "no ending":**
  - Bag is large: phone `bagSize:78`, tablet `100` (`boardDimensions.ts:10-11`) → ~10 rounds = *feels* endless on a phone.
  - **`WordCraftGameOverScene` (56 lines) is a floating badge with NO play-again, and nothing ever calls `game.reset()`** — no closure/replay loop.
- **Bot too good:** dispatch uses full `maxLength:7` (bingo-capable) at `useWordCraftGame.ts:511`; `skillVariance:2.5` default is NOT the effective lever — exhaustive 7-letter placement search is. `findBestBotMove` already accepts `{ maxLength, skillVariance, rng }` (`botMove.ts:11-31`).
- **No clue system** exists. Rewarded-ad infra ready: `useAdMob().showRewarded(onReward,onError,{surface})` (`hooks/useAdMob.ts:53`). Rewarded ads are **native-only** → web needs a no-dead-button fallback.
- Scoring is a clean pure module: `scoring.ts scoreTurn(words, tilesPlaced)` (`BINGO_BONUS=50`, `BINGO_THRESHOLD=7`), called at `moveValidator.ts:253` → modifier hook point.
- Celebration infra: `celebration/commitTier.ts resolveCommitTier` (soft/nice/great/huge/bingo + cosy clamp), `playSpectacleCommit`, Pixi `scoreConfetti.ts`/`gameOverBurst.ts`, `useWordCraftJuice` (10 FX methods).

## Phases (each = one TDD commit; logic in hook/lib, not PageClient which is already ~1167 lines)

### Phase 1 — Satisfying ending
- Tighten solo bag: PHONE `78→54`, TABLET `100→70` (`boardDimensions.ts`). ~6–8 rounds.
- `WordCraftGameOverScene`: add **Play Again** (new seed) + **Home** CTAs, on-brand neo styling, fire `gameOverBurst` on win (cosy/reduced-motion gated). Wire `game.reset()` consumer in PageClient (handler builds fresh seed, keeps locale/board).
- Endgame cue: when `tilesRemaining<=10` show "Final tiles!" pill.
- Tests: bag-size values; reset clears score/clues/heat/modifier; tier unaffected.

### Phase 2 — Bot balance (default weaker)
- New pure `lib/word-craft/botDifficulty.ts`: `BotDifficulty='easy'|'medium'|'hard'` → `{ maxLength, skillVariance, missChance }`.
  - easy(DEFAULT): `maxLength:4, skillVariance:4, missChance:0.35`
  - medium: `maxLength:5, skillVariance:2.5, missChance:0.15`
  - hard: `maxLength:7, skillVariance:1, missChance:0`
- `missChance`: with seeded prob, pick deliberately weak move (lowest-ranked pool word) — applied inside bot dispatch using `state.bag.rng` or a derived rng.
- `useWordCraftGame` gains `difficulty` option + state; persisted `localStorage('wordcraft.difficulty')`; default `easy`. Topbar selector (3-segment).
- Tests: difficulty map; bot move respects maxLength cap; missChance picks weaker with seeded rng; default is easy.

### Phase 3 — Clues (2 free + watch-ad)
- State `cluesRemaining` (init 2); reset on RESET/Play-Again.
- `requestClue()`: `findBestBotMove(board, player.rack, isWordValid, {maxLength:5})` → reveal **word text + pulse the start cell** (NOT auto-place — preserves challenge). Decrement.
- At 0: button → "Watch ad +1". `grantClueViaAd()` calls `showRewarded`; **web/no-AdMob fallback = free-grant +1** (wordlists are public; no dead button).
- `WordCraftControls`: optional `onClue`, `cluesRemaining`, labels. Cyan tone (yellow reserved for celebration/warning per design system). Lightbulb icon.
- i18n ×5: `wordcraft.clue.{button,left,watchAd,reveal,none}`.
- Personal-best: clue-assisted games still count (limited + ad-gated; low stakes).
- Tests: decrement, solver returns valid playable word, ad-grant increments, reset restores 2.

### Phase 4 — Game modifiers (randomness)
- New pure `lib/word-craft/modifiers.ts`: `rollModifier(seed)` → one weighted modifier/game.
  - `none` (baseline), `vowel_rush` (vowels +1 val), `bingo_bonanza` (bingo 50→90), `capture_fever` (territory bonus ×2), `high_roller` (bag weighted high-value), `wild_card` (player +1 blank at start).
  - Pure appliers: `applyScoreModifier(modifier, {wordTiles, tilesPlaced, baseTurn})`, `modifierBingoBonus`, `modifierCaptureMult`, `modifierStartRackBonus`, `modifierBagBias`.
- Thread into `scoreTurn`/commit/capture/buildInitial. Re-roll on RESET.
- Reveal banner at game start (pop + small confetti, gated).
- Tests: deterministic roll by seed; each modifier's numeric effect; reset re-rolls.

### Phase 5 — Effects & celebrations polish (wiring)
- Bingo & tier `huge`/`bingo` → `scoreConfetti` + brief flash.
- Win → `gameOverBurst` (Phase 1 hook).
- Clue → `jokerSparkle` on start cell.
- Modifier reveal banner FX.
- Streak milestones (3/5/7) escalate.
- **ALL new FX gated by `cosyMode`/`useReducedMotion`** (a11y). Couple of reduced-motion gate tests.

## Constraints
- TDD mandatory (RED→GREEN→REFACTOR). Logic in `lib/`/hook, tested. No file >500 lines; PageClient already large → minimize additions.
- All UI text `t()` ×5 langs (en/he/sv/ja/es). RTL-safe.
- `npm run lint && test && build` green per phase. Commit per phase (ask first).
