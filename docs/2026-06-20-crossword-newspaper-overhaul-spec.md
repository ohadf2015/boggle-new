# Crossword "Newspaper Daily" Overhaul — Spec (2026-06-20)

## Goal
Make crossword mode (a) **feel like a real newspaper crossword** — UX/UI + gameplay — and
(b) **generate endless, fun-to-solve puzzles** rather than cycling a finite static pool.

## Current state (from exploration)
- **Engine**: `lib/crossword/generate.core.ts` `fillGrid` is a pure, seedable CSP backtracker
  (MRV heuristic, frequency-biased via `prefer` set). Zero I/O → **runtime-capable**.
- **Clue bank**: `data/clueBank.{en,he}.json` — 2,400 EN / ~1,100 HE words, **3–5 letters only**.
  Each entry `{ clue, pos, score, alts? }`. This is the established reason 5×5 is the ceiling.
- **Puzzle pool**: build-time baked — 73 EN (13 authored + 60 generated 5×5) / 26 HE (4×4).
  `getDailyPuzzle(date, locale)` picks deterministically; **freeplay reuses the same small pool**
  → exhaustible, repetitive. Non-EN locales (sv/es/ja) fall back to EN.
- **UI**: already newspaper-leaning — cream paper cells, the 1px gap is the gridline, serif clue
  numbers, sky-blue active cell + pale-yellow active word, Across/Down rail (desktop) + pinned
  ClueBar (mobile), on-screen keyboard. Solve = 🎉 + confetti + SoloRewardCard.

## Gaps to "real newspaper" + "endless"
1. **Finite pool** — the headline problem. No true endless generation; daily + freeplay both
   draw from ~73/26 baked puzzles.
2. **No masthead / edition identity** — real papers have a title, date, edition #, byline. Today
   it's a generic neo header.
3. **Party-vs-paper tension** — 140-piece confetti + GSAP cascade fight the restraint a paper
   grid wants. Keep brand energy for the *solve moment*, quiet the grid surround.
4. **No endless/freeplay loop** — solve → "Play Again" reshuffles the same pool. No "next puzzle",
   no streak, no difficulty pick.
5. **Hint UI buried** in a generic toolbar; difficulty badge tiny.

## Decisions
### D1 — Endless via runtime generation (pure, offline, deterministic)
New `lib/crossword/generate.runtime.ts`:
```
generatePuzzle(opts: { seed: number; locale; size?; difficulty? }): CrosswordPuzzle | null
```
Wraps `fillGrid` + clue lookup from the bundled clue bank, applies the existing `isRealCrossword`
quality gates, returns a fully-built `CrosswordPuzzle`. Deterministic from `seed`.
- **Daily**: `seed = fnv1aHash(date+locale)`, with **deterministic retry** (seed→seed+1, capped)
  so a daily is identical worldwide and never blanks; fall back to the static pool if all retries
  fail (defense-in-depth — should never hit).
- **Freeplay/Endless**: incrementing seed → infinite fresh puzzles, fully offline.
- Runs client-side; CSP fills a 5×5 in << the maxStep cap (measured). If a size is slow it gets a
  small precomputed fallback bank, never blocks the UI.

### D2 — Grid size  → **DECIDED BY EXPERIMENT** (`scripts/crossword/experiment-sizes.ts`)
Run before building: fill-rate / obscurity / latency per template.
- If **7×7 (interior blocks, all runs 3–5)** fills well with low obscurity → add a **"midi" 7×7**
  (≈14 words) for more meat alongside the 5×5 "mini".
- Else stay **5×5 mini** (canonical NYT-Mini format — small ≠ un-newspapery) and get variety from
  more symmetric templates + the full common pool.
- *(Result + final call recorded below once the experiment lands.)*

### D3 — Newspaper presentation
- **Masthead**: paper-style title (serif), today's date, edition label ("Daily Mini" / "Midi" /
  "Freeplay #N"), difficulty as a clear chip. Restrained — cream/ink, not neon.
- Quiet the grid surround; keep the brand celebration on solve.
- Across/Down rail stays (it's the strongest "this is a crossword" signal).

### D4 — Gameplay loop
- Solve → **Next puzzle** (fresh generated) + keep SoloRewardCard for the daily claim.
- **Daily streak** (consecutive solved days) surfaced in masthead.
- **Difficulty pick** for freeplay (easy/medium/hard → common-pool tiers + size).
- Clean **pencil toolbar** (check / reveal letter / reveal word / restart) — clearer hinting.

### D5 — Locale
Ship EN + HE generation. SV/ES/JA keep EN fallback (no clue bank) — conscious, logged, not a
silent surprise. Clue-bank expansion for those locales is out of scope (separate pipeline).

## Phasing (commit per phase — ask before each commit)
1. **Infra** — `generate.runtime.ts` + templates + daily/freeplay seeding + TDD. Commit.
2. **UX/UI** — masthead, endless loop, streak, difficulty, quieter surround, i18n ×5. Commit.
3. Push (SHA-direct technique per nightly-collision memory).

## Non-goals
- 15×15 American grids (impossible with a 3–5 letter bank — would need 6–8 letter words + clues).
- Clue-bank expansion for sv/es/ja.
- Server-side generation / new DB tables.
