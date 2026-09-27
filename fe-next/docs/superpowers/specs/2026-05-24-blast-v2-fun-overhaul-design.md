# Blast V2 Fun Overhaul — Design Spec

**Date:** 2026-05-24
**Mode:** Single-player Blast V2 progression (`lib/blast/v2/`, `useBlastV2`) — NOT multiplayer blast (`shared/types/blast.ts`).

## Problem (user)
1. Levels not sophisticated / monotonous.
2. Progress must save.
3. Result page shows too much data, weak UI.
4. Valid dictionary word NOT in the level's target set should COUNT (with visibility it was off-target), and only FAIL if not in the dictionary.
5. Improve fun/playability (game-designer + online research).

## Diagnosis (from code + research)
- **#4 already half-built but broken UX.** `validateSelection` (engine/validation.ts) returns `theme_match | bonus | reject`. Off-theme valid words ARE credited via async `/api/dictionary/check` → `onForceBonus` (NOT level-gated — the `bonusDict` empty-set path is gated to L25, but the `dictionaryCheck` predicate path is universal). BUG: synchronous validator rejects `'unknown'` → fires red `invalidShakeKey` shake immediately; only AFTER does the async check credit the word. Player sees "reject" then word silently appears.
- **#1/#5 monotony is the OBJECTIVE, not the curve.** Curve already scales 7 dims (word count, grid, mechanics unlocks). Every level's win condition is identical: "find all theme words." Research (Wordscapes/Word Cookies): engagement = small victories + variety + **star ratings** + **bonus-word goals**.
- **#3 result card** (`BlastLevelCompleteCard`, 466 lines) is dynamic but can stack coins + stars + highlight + 6 stat tiles + word chips when everything fires.
- **#2 save** works today (orientation-confirmed: `current_level`, `max_level_cleared`, coins, chest, `unlocks_seen` persist via `increment_blast_progress` RPC + clear-level POST + guest localStorage). Risk is regression, not absence.

## Design principle
**Additive meta-objectives, zero generator/win-condition change.** Stars + celebrated bonus words layer on top of the existing clear. Avoids the balance-pass risk of touching 30 curated JSON packs + the L31+ generator.

## Slice A — Bonus word visibility (#4, part of #5)
Make off-target valid words a celebrated Wordscapes-style "bonus word" feature.
- **Reducer**: split `'unknown'` rejection from deterministic rejections. `'unknown'` → new state `pendingDictWord` (cells+word), do NOT bump `invalidShakeKey`. Deterministic (`length|axis|gap|frozen|duplicate`) → shake immediately as today.
- **BlastGame effect**: on `pendingDictWord`, async `verifyDictionary`. Valid → `onForceBonus` (positive bonus feedback). Invalid → dispatch `rejectConfirmed` → NOW bump `invalidShakeKey` (real reject shake).
- **Feedback UI**: distinct positive "BONUS · not on the list +N" pill when `lastValidation.kind==='bonus'`; theme word keeps existing accept FX. Transient, neo-brutalist.
- **HUD**: bonus-word counter (`★ N bonus`) so finding off-target words feels rewarded.
- i18n: `blast.feedback.bonus`, `blast.feedback.checking`, `blast.hud.bonusWords` ×5.

## Slice B — Result card trim + UI (#3)
- Hero: coin reward + **stars** (from Slice C) as the focal point.
- Keep: chest progress delta, bonus words found count, ONE highlight badge, Next CTA.
- Cut from default view: redundant stat tiles (cap at 2-3 highest-signal; drop time/cascades unless they earned a star).
- Pure `pickResultSummary()` fn (TDD) decides what shows.

## Slice C — Star rating + sophistication (#1/#5, satisfies #2 for new state)
- Pure `computeLevelStars(run)` (TDD): 3 = clean (0 undos) AND (≥1 bonus word OR under par moves); 2 = clean clear (0 undos); 1 = cleared. Tunable thresholds.
- Persist **best stars per level**: local (guestProgress / localStorage) + server (extend clear-level payload; best-of via GREATEST, mirrors existing chest pattern). Display on complete card.
- Optional bonus-word goal chip per level ("find 1 bonus word ★").

## Out of scope (separate session)
- New level mechanics / generator changes / new win conditions.
- Multiplayer blast `target_word`/`color_power` (already shipped native v4073).
- Mid-level resume (board state); only level POSITION resumes (correct).

## Testing
TDD per slice. Reducer + pure fns unit-tested first. `npm run lint && test`; build via `tsc --noEmit` if `next build` OOMs (known). he/sv/ja/es strings need native review.
