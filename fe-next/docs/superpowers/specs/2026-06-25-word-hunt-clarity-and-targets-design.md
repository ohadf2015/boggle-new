# Word Hunt: Clearer Mechanic + Better Target Words — Design

**Date:** 2026-06-25
**Status:** Approved-by-directive (autonomy mode — no approval gate)

## Problem (from user)

1. **Mechanic is hard to grasp / hard to explain.** Players struggle with the core loop.
2. **Target words are wrong difficulty.** Sometimes jargon/unknown, sometimes 4 letters, sometimes
   recurring. Want **5–7 letters**, fun to reveal, not too simple, not obscure.
3. **Players waste their opening trying to find a word the *same length* as the target.**

## Root-cause findings (verified, not assumed)

### Why targets are short (the crux)
- The board embedder `tryEmbedWord` (`utils/utils.ts:350`) places words only along **straight lines**
  (8 directions). On a 4×4 board the longest straight line is 4 cells, so
  `attemptGenerateBoard` (line 276) and `generateVerifiedBoard` (line 310) **skip any word longer
  than `Math.max(rows,cols)` = 4.**
- Consequence: **every daily target pool is 3–4 letters** — `wordHuntTargets.{en,he,sv,es}.json`:
  en = 120× len-4; he = 79× len-3 + 41× len-4; sv = 24/96; es = 16/104. Not a design choice — a
  generator limitation.
- MP (`gameStartHandler.ts:658`) selects targets from board-findable words with
  `HUNT_TARGET_MIN_LENGTH=4 … MAX=5` (`wordHuntMultiplayerConstants.ts:32`). So MP also serves 4–5.

### Richness experiment (ran, then deleted — results below)
Measured discovery-word count for 25–30 sampled targets per length on real `pickRichestBoard` 4×4
boards, en, against `an-array-of-english-words`:

| embed | len 4 | len 5 | len 6 | len 7 |
|-------|-------|-------|-------|-------|
| **straight (current)** | embeds ok, avg 86 words | **100% embed FAIL** | **FAIL** | **FAIL** |
| **snake (bent path)**  | avg 115 | avg 107 (min 30) | avg 143 (min 57) | avg 165 (min 34) |

**Conclusion:** A self-avoiding "snake" embedder fits 5–7 letter targets on the existing 4×4 with
100% success, and yields *richer* boards (more discovery words) than today's 4-letter boards. No
board-size change needed. This is the unlock.

### Why the mechanic is confusing (problems 1 + 3, same root)
Word Hunt is dual-natured and the distinction is **invisible until after you submit**:
- word == target → **win**
- word **same length** as target (not target) → a **guess**: Wordle feedback **but costs 1 of 10
  tries + life** (`useSurvivalWordSubmission.ts:260`)
- word **different length** → **discovery**: free, gains life/tokens, reveals clue letters
  (`handleDiscoveryFeedback`, line 152)

So a new player who hunts a same-length word first is making the *worst* opening move — the game
punishes it. The good explanation **already exists** in the full onboarding modal
(`onboarding.wordHunt.triesRule`: "Only words matching the target length use your 10 tries… find
shorter words freely to gain life"). But the always-present in-game `modeCoach` floating coach is
too thin (`modeCoach.wordHunt`: "Tap letters to guess" / "Colors show how close") and omits the key
insight. And `matchesTargetLength` (already computed, drives a reactive pink warning in
`SurvivalClueBoxes.tsx:116`) is **not surfaced at submit time**.

## Approach (chosen)

**Clarify the mechanic; do NOT redesign it.** Three workstreams, independent:

### A. Snake embedder → unlock 5–7 letter targets
- Add bent-path (self-avoiding walk) embedding to the shared embedder as a **fallback after
  straight-line placement fails**, and raise the per-word skip cap from `Math.max(rows,cols)` to
  `rows*cols`. Straight-line behavior for short words is unchanged (zero regression risk for
  classic/practice); longer words that previously got skipped now embed via snake.
- File: `utils/utils.ts` (`tryEmbedWord` + the two `word.length > Math.max(rows,cols)` guards).
- TDD: assert 5/6/7-letter words embed + are findable on 4×4; assert short-word straight-line
  placement still works.

### B. Better target words (5–7 letters, fun, not jargon/recurring)
- **Daily pools** `wordHuntTargets.{en,he,sv,es}.json`: regenerate to **5–7 letter** common,
  imageable, fun-to-reveal words. Size **~300–400 words/language** so daily repeats are rare across
  a year ("recurring" interpreted as *same target reappearing* — large pool is the lazy fix; no
  recently-used tracking).
  - **Generation: Opus + dual-judge validation** (per user). Pipeline per language:
    1. Opus generates candidate 5–7 letter words (native words for he/sv/es, not translations).
    2. **Hard filters (code, not LLM):** length 5–7; passes `isWordHuntQuality`; **exists in the
       game dictionary** for that language (en: `an-array-of-english-words`+approved; he/sv/es:
       `*_words*.txt`) — else daily validation breaks; he: no final-form letters
       (mirrors existing test); snake-embeddable (any ≤16 is, so trivially true).
    3. **Dual-judge:** two independent Opus personas (e.g. "is this a common, recognizable word a
       casual player knows?" + "is this fun/satisfying to reveal, not jargon/clinical/boring?").
       Both must approve → survivor.
  - Update `wordHuntPuzzle.test.ts` length assertion (currently "only 3–4 letters") → **5–7**.
- **MP**: bump `HUNT_TARGET_MIN_LENGTH=5`, `HUNT_TARGET_MAX_LENGTH=7`. Apply `isWordHuntQuality` on
  the `commonOnly` path too (`wordHuntManager.ts:134` currently returns from the common pool
  *before* the quality filter at line 146 — raising the cap surfaces previously-unreachable jargon).
- **JA**: deferred — its generator can't embed (kanji-compound path); keeps the さくら fallback.
  Noted, not addressed.

### C. Clarity — coach copy + length-aware submit affordance (covers daily + MP)
- **`modeCoach.wordHunt`** captions rewritten to teach the loop in ≤6 words each, e.g.
  step1 "Spell any word — get free clues", step2 "🟩🟨 reveal the hidden word", scoreTip keeps
  "guess it first". (Final copy via `fe-next:ux-writer`, all 5 langs, non-literal.)
- **Length-aware submit affordance:** reuse the already-plumbed `matchesTargetLength` signal to label
  the submit action *before* submit — e.g. when the formed word equals target length, the
  submit/forge control reads **"GUESS · costs a try"** (pink); otherwise **"FIND · free clue"**
  (lime). This makes the invisible distinction visible at decision time — directly fixing #1 and #3.
  - Daily surface: `WordHuntGameLayout` / word-forming control + `SurvivalClueBoxes`.
  - Verify the word-forming/submit UI is shared with MP (`wordHuntHandler` path) or apply to both.
- New i18n keys for the affordance, all 5 langs via `fe-next:ux-writer`.

## Out of scope / deferred (do NOT build)
- Making all non-target words free discovery / adding an explicit "Guess" action — a mechanic
  redesign touching MP + scoring + the Wordle identity. Beyond "make it clearer."
- Board-size change (5×5) — snake embedder makes it unnecessary.
- Japanese 5–7 targets (generator can't embed).
- Recently-used target exclusion — large pool covers "recurring" lazily.

## Addendum — the DAILY surface (found during implementation)

Word Hunt has THREE target surfaces, not one:
- **Practice** (`PracticeWordHuntSandbox` → `generateWordHuntPuzzle`, 4×4) — uses `wordHuntTargets.*.json`. Fixed by the pool regen.
- **MP** (`gameStartHandler` → `selectTargetWordWithFallback`) — uses `common_hunt_words*.txt` + `HUNT_TARGET_*`. Fixed by constants + filter.
- **Daily** (`DailyChallenge` → server `generateDailyPuzzleAsync` / client `generateDailyPuzzle`, **6×6 board**) — was a *separate* path using its own `TARGET_WORD_LISTS` (small: en83/he53/sv33/es60) + dictionary noun enrichment, capped at `MAX_TARGET_WORD_LENGTH=6`, `MIN_ANSWER_LENGTH=5`. The small lists = "recurring"; the noun enrichment = "jargon/unknown". This is the primary surface and was missed in the first cut.

Daily fixes applied:
- Merged the validated 5-7 pools into `TARGET_WORD_LISTS` (`wordLists.ts`), unifying all three surfaces onto one large validated source. Also enriches `getSameLengthWords` decoys.
- `MAX_TARGET_WORD_LENGTH` 6→7 (`constants.ts`). Verified on the 6×6 board: a 40-seed × 4-language experiment showed **40/40 puzzles get ≥5 same-length decoys even at length 7** (decoy min 18-96 ≫ the threshold of 5) — the feasibility risk is disproven.
- Admin word-bank generator `WORD_LENGTH_RANGE` 4-6 → 5-7 (`bulk-generate/route.ts`) so pre-selected daily targets are also 5-7 (the `min:4` was a direct source of 4-letter daily targets).

**Out-of-repo follow-up:** the live daily target is often a *pre-selected* word chosen by the Supabase edge function `daily-word-selector` (Gemini-based), which is NOT in this repo. Its length range / word source should be aligned to 5-7 + the new pools in a separate Supabase deploy. Until then, the in-repo fallback + word-bank ranges are 5-7; the edge function governs pre-selected words.

## Testing
- Snake embed: 5/6/7-letter embed-and-findable on 4×4; short-word straight-line unchanged.
- **Pool invariant test (mandatory):** every pool word is 5–7 letters AND exists in that language's
  game dictionary. Fails loudly if a regen slips a bad word back in.
- MP target selection: returns 5–7, quality-filtered on common path.
- Coach/affordance: snapshot/length-branch unit tests; i18n key presence ×5.
- `npm run lint && npm run test && npm run build`.
