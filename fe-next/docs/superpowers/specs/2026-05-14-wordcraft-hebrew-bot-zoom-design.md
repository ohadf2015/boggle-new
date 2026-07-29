# WordCraft — Hebrew final letters, bot validity, cinematic zoom

**Date:** 2026-05-14
**Status:** Approved, implementing

## Problem

Three issues surfaced from Hebrew playtest (screenshot 2026-05-14):

1. **Hebrew final letters are broken.** `tileBags/he.ts` puts *both* regular and
   final forms (`ך ם ן ף ץ`) in the bag, while `hebrewDisplay.ts` *separately*
   swaps regular→final at word-end for rendering. Two systems doing the same
   job. A player or bot can draw a literal `ם` tile and place it mid-word.
2. **WORDBOT plays impossible words.** Root cause is #1: the bot permutes its
   rack (which may hold final-form tiles), and `dictionary.ts` normalizes
   final→regular on lookup, so a word with a final letter mid-word *validates*.
3. **Zoom feels abrupt.** `WordCraftZoomShell` uses `transform 180ms ease-out`
   with no depth cue.

## Design

### 1. Hebrew bag → regular forms only

**File:** `lib/word-craft/tileBags/he.ts`

Remove `ך ם ן ף ץ` from both `values` and `distribution`. Redistribute the
removed counts onto the regular forms so `TOTAL_TILES` stays 100:

| Regular | Was | New | Absorbs |
|---|---|---|---|
| כ | 2 | 4 | ך (2) |
| מ | 3 | 5 | ם (2) |
| נ | 3 | 5 | ן (2) |
| פ | 2 | 3 | ף (1) |
| צ | 2 | 3 | ץ (1) |

`hebrewDisplay.ts` is untouched — it still renders the final glyph at
word-end. `dictionary.ts` is untouched — it already normalizes. No new
placement rule is needed: with no final-form tile able to exist on the board,
"a final letter must not connect to a continuation" is structurally
guaranteed.

### 2. Bot validity

Root cause is resolved by #1. Two defensive changes:

- **`botMove.ts`** — `BotMove.word` currently returns the *rack-permutation*
  word, which is wrong when the bot's tiles extend through existing board
  tiles. Return the actual main word from `validateAndScoreMove`.
- **Regression tests** — for every locale (`en/he/sv/es/ja`): every bot move's
  word passes `isWordValid`; the Hebrew bot never emits a final-form
  character. If a test surfaces dictionary junk, scope widens then — not now.

### 3. Cinematic zoom

**File:** `components/word-craft/WordCraftZoomShell.tsx` (343 lines → stays
under 500).

- **Easing:** `180ms ease-out` → `~320ms cubic-bezier(0.65, 0, 0.35, 1)`
  (true ease-in-out).
- **Depth blur:** new `isTransitioning` state, set when scale/tx/ty change,
  cleared on `transitionend`. The board gets `filter: blur(4px)` easing to
  `blur(0)` over the transition — "sharpening as it settles."
- **Vignette:** a `pointer-events-none` overlay, radial-gradient (transparent
  centre → semi-opaque `neo-navy` edges), opacity fades in while `isZoomed`,
  out on reset. Persistent camera-depth feel while panning around zoomed in.
- **Reduced motion:** `prefers-reduced-motion` skips blur, drops to a
  short/instant transition, and skips the vignette fade.

The vignette tracks `isZoomed` (persistent); the blur tracks `isTransitioning`
(transient) so the expensive filter only runs during the ~320ms camera move.

## Scope

Three source files: `tileBags/he.ts`, `botMove.ts`, `WordCraftZoomShell.tsx`,
plus their test files. No migrations, no API changes, no new translation
strings. TDD per project rules.
