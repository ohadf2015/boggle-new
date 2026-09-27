# Crossword: Real Lexicon-Driven Clues + Visual Overhaul

**Date:** 2026-06-07
**Status:** Spec
**Author:** Claude (with advisor review)

## Problem

The crossword mode "still doesn't feel or look like a real crossword" — third report.
Prior attempts (`753bfdb22`, `9dc648c78`) were **structurally valid** (every white cell
checked both ways, across≠down, blocks present, browser-verified) and were **still
rejected**. Structural validity was never the gap.

**Two real gaps:**

1. **Clue feel.** Clues are hand-typed prose strings, decoupled from any lexicon. There
   are only 19 fixed puzzles. Clues don't read like clues a solver expects, and the bank
   is tiny.
2. **Look.** The grid/clue UI is functional but not NYT-Mini-grade polished.

## Root insight (advisor-confirmed)

**A dictionary definition is NOT a crossword clue.** Baking Datamuse `defs`
(`"(countable) One of the large bodies of water separating the continents."`) straight
in would make it feel *more* fake. The load-bearing component is a **def → clue
transform**, not a def lookup.

The pipeline that attacks the real complaint:

```
word + Datamuse definition + POS + synonyms + frequency
  → LLM crafts a tight crossword clue
  → judge gate (quality)
  → commit to clue bank JSON
```

This reuses the repo's existing dual-judge dictionary-improvement pattern.

## Scope decisions (explicit)

- **English gets the full real-lexicon overhaul.** Datamuse (Wiktionary-backed, no key,
  build-time only) supplies definitions + POS + frequency `score`.
- **Hebrew stays best-effort curated.** Datamuse is English-only. HE keeps its 6 curated
  puzzles with hand clues (improved structurally if cheap). This is a *known deferral*,
  not a silent gap. sv/es/ja continue to fall back to EN.
- **Grid size is NOT the complaint.** A 5×5 NYT Mini feels completely real; the rejected
  attempt was already 5×5-with-blocks. Levers are **clue quality + volume + look**, not
  dimensions. We add a few 7×7 "midi" puzzles only because the larger clue bank now makes
  clean fills possible — not to chase size.
- **Frequency bias.** The filler must bias hard toward high-frequency answers. This is the
  second-biggest "feels real" lever after clue quality. Datamuse `score` drives it.
- **Admin-only gate stays.** Do not ship public as part of this work.
- **Runtime stays fully offline.** Clues + puzzles are baked into committed JSON at build
  time. No lexicon shipped to client. Matches existing build→commit→serve pattern.

## Architecture

### Part A — Clue Bank (the core deliverable)

**Build-time Node pipeline** under `fe-next/scripts/crossword/clues/`:

1. **Source words** = the cluable common-word pool. Expand the existing ~800-word EN pool
   (`commonWords.ts`) toward a **frequency-ranked ~2500+ pool** so the filler has room
   (advisor + prior memory: ~300 words → zero fills; ~2500 needed for clean fills).
   Pull candidates from `an-array-of-english-words` filtered by Datamuse frequency
   `score`, lengths 3–7.
2. **Enrich** each word via Datamuse `md=dp` → `{ word, defs[], pos, score }`. Cache raw
   responses to disk (`scripts/crossword/clues/.cache/`) so reruns are free and offline.
3. **Craft clue** via LLM: given word + defs + POS + frequency, produce ONE tight
   crossword clue. Rules baked into the prompt: never contain the answer or a derivative;
   ≤ ~60 chars; no leading article; strip parentheticals; definitional or synonym style;
   sentence-case; solver-friendly register. Optionally a fill-in-the-blank variant.
4. **Judge gate** (dual-judge, both ≥ threshold): "Is this a clue a crossword solver
   would accept for this answer? Is it unambiguous, concise, non-circular?" Reject &
   regenerate (bounded retries) on fail.
5. **Output** committed `lib/crossword/data/clueBank.en.json`:
   ```json
   { "ocean": { "clue": "Atlantic or Pacific", "pos": "n", "score": 150088, "alts": ["Vast body of saltwater"] } }
   ```

**Pure, unit-tested helpers** (no network, TDD):
- `cleanDefinition(rawDef): string` — strip POS prefix, parentheticals, trailing space.
- `isCircularClue(clue, answer): boolean` — answer/stem appears in clue.
- `clueLengthOk`, `clueRegisterOk` — gate predicates.
- `selectClue(entry): ClueEntry` — pick best of crafted candidates.

The LLM/Datamuse calls are isolated behind thin async adapters so the pure logic is
testable without network.

### Part B — Puzzle Generation

Extend `scripts/crossword/build.ts`:

1. Constrain the CSP filler (`generate.core.ts`) to words **present in clueBank** (so every
   answer is guaranteed cluable). Bias candidate ordering by `score` (common first).
2. Symmetric block templates: existing 5×5 set + a small 7×7 midi set (180° symmetric, no
   run < 3).
3. Auto-clue every slot answer from clueBank. **Reject any puzzle where an answer lacks a
   clue.** (Structural gates from prior work stay — they're necessary, not sufficient.)
4. Generate a bank of ~60–120 EN puzzles across difficulty tiers (tier by avg answer
   frequency + grid size). Commit as `lib/crossword/data/puzzles.en.json`.
5. Daily picker selects by date+locale, rotating size/difficulty.

### Part C — Visual Overhaul

Apply `impeccable:impeccable` + `frontend-design:frontend-design` + GSAP (`gsap-core`,
`gsap-react`):

- **NYT-Mini-grade grid**, brand-skinned (neo-brutalist: hard pixel shadows, solid
  borders, electric accents, Fredoka/Rubik): crisp cells, bold corner numbers,
  active-clue highlight + cross-highlight, smooth GSAP focus motion.
- **Clue list**: Across/Down columns, active clue synced + auto-scrolled, click-to-jump;
  mobile current-clue bar with prev/next/toggle.
- **Solved celebration**: timer, GSAP/Pixi burst, share. `useReducedMotion`-gated.
- **RTL-correct** Hebrew (display-only mirroring already exists). Responsive phone + TV.

## Data model changes

- New: `lib/crossword/data/clueBank.en.json`, `lib/crossword/data/puzzles.en.json`.
- `SeedPuzzle.clues` shape unchanged (`Record<slotId, string>`) — generated puzzles emit
  the same shape, so runtime/UI consume identically. HE seeds unchanged.
- Loader merges generated EN bank + curated HE seeds into the daily pool.

## Testing

- **Pure clue helpers**: TDD (cleanDefinition, isCircularClue, length/register gates,
  selectClue). RED→GREEN.
- **Generator gates**: every emitted puzzle answer has a clueBank clue; structural
  invariants (reuse existing `quality.test.ts`) hold; frequency bias measurable
  (avg score above floor).
- **Loader**: EN bank + HE seeds both selectable; daily deterministic.
- **Visual**: `useReducedMotion` gating tests; browser-verify EN + HE (LTR + RTL).

## Verification bar (CHANGED — this is what catches the prior rejections)

Structural validity is the bar the rejected attempts already cleared. NOT sufficient.
New bar, required before declaring done:

1. **Generate ONE puzzle through the full clue pipeline and read every clue by hand.**
   They must read like clues a human solver would accept — NOT like Wiktionary. If they
   read like definitions, fix the pipeline *before* scaling to the full bank or touching
   visuals.
2. **Actually play a puzzle** end-to-end in the browser (EN + HE).
3. Lint + typecheck + full test suite + build all green.

## Out of scope

- Hebrew real-lexicon clues (deferred — curated stays).
- 15×15 full-size crosswords (cluable-pool-bound; not the complaint).
- Making the mode public (stays admin-only).
- Non-EN/HE locales beyond EN fallback.

## Phases

0. Spec (this doc).
1. **Clue bank infra** — pool expansion, Datamuse enrich (cached), LLM craft + judge,
   pure helpers (TDD), commit `clueBank.en.json`. **Gate: eyeball one batch of clues.**
2. **Puzzle generation** — clue-constrained + frequency-biased filler, auto-clue, gates,
   commit `puzzles.en.json`. **Gate: read one full puzzle's clues.**
3. **Runtime wiring** — loader merges EN bank + HE seeds, daily selection, difficulty.
4. **Visual overhaul** — impeccable + frontend-design + GSAP grid/clue/celebration.
5. **Validate** — lint/test/build, browser play-test EN + HE (LTR + RTL).

One commit per phase (ask before committing).
