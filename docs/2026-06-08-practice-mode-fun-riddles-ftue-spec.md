# Practice Mode: Fun, Random, Riddles + On-Screen Helper (FTUE)

**Date:** 2026-06-08
**Goal (verbatim):** make practice mode more fun (random and not-too-easy puzzles), show riddles, make it feel like the game itself and reuse the real game logic, add an on-screen helper (FTUE), and just make it fun.

## Problem (what's broken today)

- **Practice boards are HARDCODED.** `PracticeClassicSandbox` mounts a static per-locale `BOARDS` dict (one fixed 4×4 per language). Replaying = identical board every time. Deliberately trivial ("≥3 simple findable words"). No randomness, no difficulty, no surprise.
- **No riddles / objectives.** Nothing to chase. The only goal is "find 3 of any words." Feels like a worksheet, not a game.
- **Helper is passive.** `PracticeCoachTip` / `PracticeMistakeCoach` fire on first mistake but nothing actively guides a stuck beginner toward a real word.
- The canonical practice surface IS the sandbox (`/practice/[mode]` → `PageClient` renders it inline). The `?practice=1` real-game route is only a "graduate" escape-hatch CTA, not the entry.

## Design thesis

Upgrade the sandbox **in place** (it already renders the REAL `GridComponent`). One unified generator satisfies four of the five asks at once via **clue-then-embed**:

1. Pick a **riddle target** word (+ its real clue) from the curated pool.
2. **Embed** it on a fresh random board via the real `generateRandomTable(rows, cols, language, [target])` (verifies solvability).
3. Pick the **richest of k=6** such boards via `pickRichestBoardClient` (vowel-balance / dup heuristic).
4. The riddle answer is therefore **guaranteed findable**, the board is **random**, the embedded mid-length word makes it **not-too-easy**, and it's all **real game logic**.

The FTUE on-screen helper is the enabler that lets us raise difficulty without losing beginners: after idle, it nudges, then highlights the first tile of the (known) riddle answer — a real, always-correct hint.

## Scope

**Flagship = Classic practice** (`PracticeClassicSandbox`). That's the default mode and the boggle core; all five asks land cleanly there. Wheel/WordHunt keep their current behavior this pass (WordHunt is already clue-driven; wheel board-randomization is a fast-follow).

### In scope
1. **Random, not-too-easy board** — new `lib/practice/practicePuzzle.ts` composing the real generators. Replaces `BOARDS` lookup in `PracticeClassicSandbox`.
2. **Riddles** — curated short-word riddle pools extracted from the real clue banks: `lib/practice/data/practiceRiddles.{en,he}.json` (3–5 letter common words + real clue). New `PracticeRiddleCard` shows the clue + masked answer; solving it = headline celebration. Gates to EN/HE; absent → no card.
3. **On-screen helper (FTUE)** — new `PracticeHelperBubble` (mascot): idle-nudge → after more idle, highlight the riddle answer's first cell. Pure hint-timing logic is TDD'd.
4. **Completion redesign (preserve beginner flow)** — complete when riddle solved **OR** 3 words found (whichever first). Never harder than today; keeps the `markPracticeMode` chain + progress + popups intact.
5. **i18n ×5** for all new UI strings (`t('key')`, no hardcoded text). Riddle clue TEXT is data (curated EN/HE), not a translation key.

### Out of scope (this pass)
- Wheel/WordHunt board randomization (fast-follow).
- sv/ja/es riddle authoring (no clue bank; quality/native-feel risk — board randomization + helper still apply).
- Multiplayer / leaderboard / XP (practice is stakes-free by design).

## Key reused real-game APIs

| API | File | Use |
|---|---|---|
| `generateRandomTable(rows, cols, language, wordsToEmbed)` → `string[][]` | `utils/utils.ts` | random board + embed riddle target |
| `pickRichestBoardClient(gen, language, k)` | `lib/boardSelection.ts` | best-of-6 quality |
| `isWordOnBoard(word, grid, language)` | `utils/utils.ts` | locate riddle answer's first cell for hint |
| `GridComponent` | `components/GridComponent` | the real board (already used) |
| `usePracticeValidator(language)` | `lib/practice/usePracticeValidator.ts` | word validation (already used) |

**Deviation from initial advisor steer:** `useSurvivalClues`/`SurvivalClueBoxes` are Wordle-position-based (green/yellow letters from attempts), NOT arbitrary text-clue. Primary-source evidence → build a small dedicated `PracticeRiddleCard` instead of generalizing that hook.

## New files

- `lib/practice/practicePuzzle.ts` — pure puzzle assembly: `pickRiddleTarget(language, rng)`, `generatePracticePuzzle(language, opts)` → `{ board, riddle: {word, clue} | null }`. Injectable generator + rng for deterministic tests.
- `lib/practice/data/practiceRiddles.en.json`, `practiceRiddles.he.json` — `{ word, clue }[]` extracted from clue banks (len 3–5, top-by-score).
- `lib/practice/riddleMask.ts` — pure: `maskAnswer(word, revealedCount)` → display tokens; `isRiddleSolved(answer, foundWords)`.
- `lib/practice/practiceHint.ts` — pure: `nextHintStage(idleMs, drags, wordsFound)` → `'none' | 'nudge' | 'reveal-tile'`; `firstCellOf(word, grid, language)`.
- `components/practice/PracticeRiddleCard.tsx` — clue + masked-answer UI + solved state.
- `components/practice/PracticeHelperBubble.tsx` — idle-driven mascot helper + tile-highlight hint.

## Modified files

- `components/practice/PracticeClassicSandbox.tsx` — swap `BOARDS[language]` for `generatePracticePuzzle`; mount riddle card + helper; riddle-solved celebration; OR-completion.
- `translations/{en,he,sv,ja,es}.js` — new `practice.riddle.*` / `practice.helper.*` keys.

## Test plan (TDD, RED→GREEN)

Pure-logic first (no Math.random in assertions — inject):
- `practicePuzzle`: riddle target is len 3–5; embedded word is on the returned board (`isWordOnBoard`); `riddle: null` for sv/ja/es; richest-of-k path called.
- `riddleMask`: masking reveals correct count; solved detection case-insensitive; solved when answer ∈ foundWords.
- `practiceHint`: stage progression (none→nudge→reveal) by idle/drag thresholds; `firstCellOf` returns a valid coordinate on the board.
- Component smoke: riddle card renders clue, hides when `riddle` null; helper shows nudge after idle.

## Verification (feel — blocks done-ness)

`/practice` is a PUBLIC route (unlike admin-gated crossword) → screenshottable. After green tests: `npx next dev -p <port>` + playwright screenshot of EN + HE practice, play a board, confirm riddle renders, helper nudges, board varies on reload. "Passed tests, didn't play it" = NOT done for this goal.
